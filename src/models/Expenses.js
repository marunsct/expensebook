const e = require("express");

class Expense {
    constructor(id, description, currency, amount, group_id, split_method, paid_by_user, image, created_by, splits) {
        this.id = id;
        this.description = description;
        this.currency = currency;
        this.amount = amount;
        this.group_id = group_id;
        this.split_method = split_method;
        this.paid_by_user = paid_by_user;
        this.image = image;
        this.created_by = created_by;
        this.splits = splits;
    }

    static async create(client, description, currency, amount, group_id, split_method, contributors, image, created_by, splits) {
        // Check if any contributor is marked as deleted
        const contributorIds = contributors.map((contributor) => contributor.userId);
        const res = await client.query(
            `SELECT id FROM users WHERE id = ANY($1::int[]) AND delete_flag = TRUE`,
            [contributorIds]
        );

        if (res.rows.length > 0) {
            throw new Error('Cannot add deleted users to an expense.');
        }

        // If a group is provided, check if the group exists
        if (group_id) {
            const groupRes = await client.query('SELECT * FROM groups WHERE id = $1', [group_id]);
            if (groupRes.rows.length === 0) {
                throw new Error(`Group with ID ${group_id} does not exist.`);
            }

            // Check if all involved users are part of the group
            const userCheckPromises = splits.map(async (split) => {
                const userRes = await client.query(
                    'SELECT * FROM group_users WHERE group_id = $1 AND user_id = $2',
                    [group_id, split.userId]
                );
                if (userRes.rows.length === 0) {
                    throw new Error(`User with ID ${split.userId} is not assigned to group ${group_id}.`);
                }
            });

            await Promise.all(userCheckPromises);
        }

        // Insert the expense into the expenses table
        const expenseRes = await client.query(
            `INSERT INTO expenses (description, currency, amount, group_id, split_method, image_url, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [description, currency, amount, group_id || null, split_method, image || null, created_by]
        );

        const expenseId = expenseRes.rows[0].id;

        // Calculate balances for contributors and users
        const balances = {};

        // Add contributions to balances
        contributors.forEach((contributor) => {
            balances[contributor.userId] = (balances[contributor.userId] || 0) + contributor.amount;
        });

        // Subtract amounts owed by each user
        splits.forEach((split) => {
            balances[split.userId] = (balances[split.userId] || 0) - split.amountToRepay;
        });

        // Insert the splits into the expense_users table
        const splitPromises = [];
        Object.keys(balances).forEach((userId) => {
            const balance = balances[userId];
            if (balance > 0) {
                // This user gets back money
                Object.keys(balances).forEach((otherUserId) => {
                    if (balances[otherUserId] < 0) {
                        const amountToSettle = Math.min(balance, Math.abs(balances[otherUserId]));
                        splitPromises.push(
                            client.query(
                                `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share)
                                 VALUES ($1, $2, $3, $4)`,
                                [expenseId, otherUserId, userId, amountToSettle]
                            )
                        );
                        balances[userId] -= amountToSettle;
                        balances[otherUserId] += amountToSettle;
                    }
                });
            }
        });

        await Promise.all(splitPromises);

        return new Expense(
            expenseRes.rows[0].id,
            expenseRes.rows[0].description,
            expenseRes.rows[0].currency,
            expenseRes.rows[0].amount,
            expenseRes.rows[0].group_id,
            expenseRes.rows[0].split_method,
            null, // No single paid_by_user since multiple contributors are allowed
            expenseRes.rows[0].image_url,
            expenseRes.rows[0].created_by,
            splitPromises
        );
    }

    static async addSplit(client, expenseId, userId, paidToUser, share) {
        await client.query(
            `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share)
             VALUES ($1, $2, $3, $4)`,
            [expenseId, userId, paidToUser, share]
        );
    }

    // Method to get all expenses
    static async getAll(client) {
        const res = await client.query(
            `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_by, e.created_at,
                    json_agg(
                        json_build_object(
                            'user_id', eu.user_id,
                            'paid_to_user', eu.paid_to_user,
                            'share', eu.share
                        )
                    ) AS splits
             FROM expenses e
             LEFT JOIN expense_users eu ON e.id = eu.expense_id
             WHERE e.flag = FALSE AND e.delete_flag = FALSE
             GROUP BY e.id`
        );

        return res.rows.map((row) => ({
            id: row.id,
            description: row.description,
            currency: row.currency,
            amount: row.amount,
            groupId: row.group_id,
            splitMethod: row.split_method,
            paidByUser: row.paid_by_user,
            image: row.image_url,
            createdBy: row.created_by,
            createdAt: row.created_at,
            splits: row.splits || [],
        }));
    }

    /**
     * Settle up all expenses between two users.
     * @param {Object} client - The database client.
     * @param {Number} userId - The ID of the user initiating the settlement.
     * @param {Number} otherUserId - The ID of the other user involved in the settlement.
     */
    static async settleUp(client, userId, otherUserId) {
        try {
            // Mark all relevant entries in the expense_users table as settled (flag = true)
            await client.query(
                `UPDATE expense_users
                 SET flag = true
                 WHERE (user_id = $1 AND paid_to_user = $2)
                    OR (user_id = $2 AND paid_to_user = $1)`,
                [userId, otherUserId]
            );

            // Check if all entries for each expense in expense_users are settled
            const expensesToUpdate = await client.query(
                `SELECT e.id
                 FROM expenses e
                 LEFT JOIN expense_users eu ON e.id = eu.expense_id
                 WHERE eu.flag = false
                 GROUP BY e.id
                 HAVING COUNT(eu.id) = 0`
            );

            // Mark the corresponding expenses as settled (flag = true)
            const expenseIds = expensesToUpdate.rows.map((row) => row.id);
            if (expenseIds.length > 0) {
                await client.query(
                    `UPDATE expenses
                     SET flag = true
                     WHERE id = ANY($1::int[])`,
                    [expenseIds]
                );
            }

            return { message: 'Expenses settled successfully.' };
        } catch (error) {
            console.error('Error settling up expenses:', error);
            throw new Error('Error settling up expenses.');
        }
    }

    /**
     * Retrieves all unsettled expenses for a given user.
     * @param {Object} client - The database client.
     * @param {Number} userId - The ID of the user whose unsettled expenses to fetch.
     * @returns {Promise<Object[]>} A promise that resolves to an array of unsettled expenses.
     *  Each expense is an object with the following properties:
     *  - expense_id (Number)
     *  - description (String)
     *  - currency (String)
     *  - amount (Number)
     *  - groupId (Number|null)
     *  - splitMethod (String)
     *  - paidByUser (Number)
     *  - image (String|null)
     *  - createdBy (Number)
     *  - splits (Object[])
     *    - user_id (Number)
     *    - paid_to_user (Number)
     *    - share (Number)
     */
    static async getUnsettledExpenses(client, userId) {
        const res = await client.query(
            `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_by,
                    json_agg(
                        json_build_object(
                            'user_id', eu.user_id,
                            'paid_to_user', eu.paid_to_user,
                            'share', eu.share
                        )
                    ) AS splits
             FROM expenses e
             LEFT JOIN expense_users eu ON e.id = eu.expense_id
             WHERE (eu.user_id = $1 OR eu.paid_to_user = $1) AND eu.flag = false and e.delete_flag = false
             GROUP BY e.id`,
            [userId]
        );

        return res.rows.map((row) => ({
            expense_id: row.id,
            description: row.description,
            currency: row.currency,
            amount: row.amount,
            groupId: row.group_id,
            splitMethod: row.split_method,
            paidByUser: row.paid_by_user,
            image: row.image_url? true : false, // TODO: check if image is present ,
            createdBy: row.created_by,
            splits: row.splits || [],
        }));
    }

    static async getUnsettledExpensesAfterDate(client, userId, date) {
            const res = await client.query(
                `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image_url, e.created_by,
                        json_agg(
                            json_build_object(
                                'user_id', eu.user_id,
                                'paid_to_user', eu.paid_to_user,
                                'share', eu.share
                            )
                        ) AS splits
                 FROM expenses e
                 LEFT JOIN expense_users eu ON e.id = eu.expense_id
                 WHERE (eu.user_id = $1 OR eu.paid_to_user = $1) AND eu.flag = false and e.delete_flag = false and (e.created_at > $1 or e.updated_at > $1 or e.updated_at or eu.created_at > $1 or eu.updated_at > $1) 
                 GROUP BY e.id`,
                [userId, date]
            );

        return res.rows.map((row) => ({
            expense_id: row.id,
            description: row.description,
            currency: row.currency,
            amount: row.amount,
            groupId: row.group_id,
            splitMethod: row.split_method,
            paidByUser: row.paid_by_user,
            image: row.image_url ? true : false, // TODO: check if image is present 
            createdBy: row.created_by,
            splits: row.splits || [],
        }));
    }
}

module.exports = {
    Expense,
};