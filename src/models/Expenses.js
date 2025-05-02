class Expense {
    constructor(id, description, currency, amount, groupId, splitMethod, paidByUser) {
        this.id = id;
        this.description = description;
        this.currency = currency;
        this.amount = amount;
        this.groupId = groupId;
        this.splitMethod = splitMethod;
        this.paidByUser = paidByUser;
    }

    static async create(client, description, currency, amount, groupId, splitMethod, paidByUser, splits) {
        // If a group is provided, check if the group exists
        if (groupId) {
            const groupRes = await client.query('SELECT * FROM groups WHERE id = $1', [groupId]);
            if (groupRes.rows.length === 0) {
                throw new Error(`Group with ID ${groupId} does not exist.`);
            }

            // Check if all involved users are part of the group
            const userCheckPromises = splits.map(async (split) => {
                const userRes = await client.query(
                    'SELECT * FROM group_users WHERE group_id = $1 AND user_id = $2',
                    [groupId, split.userId]
                );
                if (userRes.rows.length === 0) {
                    throw new Error(`User with ID ${split.userId} is not assigned to group ${groupId}.`);
                }
            });

            await Promise.all(userCheckPromises);
        }

        // Insert the expense into the expenses table
        const expenseRes = await client.query(
            `INSERT INTO expenses (description, currency, amount, group_id, split_method, paid_by_user)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [description, currency, amount, groupId || null, splitMethod, paidByUser]
        );

        const expenseId = expenseRes.rows[0].id;

        // Insert the splits into the expense_users table
        const splitPromises = splits.map((split) => {
            return client.query(
                `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share)
                 VALUES ($1, $2, $3, $4)`,
                [expenseId, split.userId, paidByUser, split.share]
            );
        });

        await Promise.all(splitPromises);

        return new Expense(
            expenseRes.rows[0].id,
            expenseRes.rows[0].description,
            expenseRes.rows[0].currency,
            expenseRes.rows[0].amount,
            expenseRes.rows[0].group_id,
            expenseRes.rows[0].split_method,
            expenseRes.rows[0].paid_by_user
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
            `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.created_at,
                    json_agg(json_build_object('user_id', eu.user_id, 'paid_to_user', eu.paid_to_user, 'share', eu.share)) AS splits
             FROM expenses e
             LEFT JOIN expense_users eu ON e.id = eu.expense_id
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
            createdAt: row.created_at,
            splits: row.splits || [],
        }));
    }
}

module.exports = {
    Expense
};