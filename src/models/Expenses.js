class Expense {
    constructor(id, description, currency, amount, group_id, split_method, paid_by_user, image, created_by) {
        this.id = id;
        this.description = description;
        this.currency = currency;
        this.amount = amount;
        this.group_id = group_id;
        this.split_method = split_method;
        this.paid_by_user = paid_by_user;
        this.image = image;
        this.created_by = created_by;
    }

    static async create(client, description, currency, amount, group_id, split_method, paid_by_user, image, created_by, splits) {
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
            `INSERT INTO expenses (description, currency, amount, group_id, split_method, paid_by_user, image, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [description, currency, amount, group_id || null, split_method, paid_by_user, image || null, created_by]
        );

        const expenseId = expenseRes.rows[0].id;

        // Insert the splits into the expense_users table
        const splitPromises = splits.map((split) => {
            return client.query(
                `INSERT INTO expense_users (expense_id, user_id, paid_to_user, share)
                 VALUES ($1, $2, $3, $4)`,
                [expenseId, split.userId, paid_by_user, split.share]
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
            expenseRes.rows[0].paid_by_user,
            expenseRes.rows[0].image,
            expenseRes.rows[0].created_by
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
            `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image, e.created_by, e.created_at,
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
            image: row.image,
            createdBy: row.created_by,
            createdAt: row.created_at,
            splits: row.splits || [],
        }));
    }
}

module.exports = {
    Expense
};