class User {
    constructor(id, name, email, phone) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.phone = phone;
    }

    static async findById(client, id) {
        const res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        return res.rows[0] ? new User(res.rows[0].id, res.rows[0].name, res.rows[0].email, res.rows[0].phone) : null;
    }

    static async create(client, name, email, phone, password) {
        const res = await client.query(
            'INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING *',
            [name || null, email || null, phone || null, password]
        );
        return new User(res.rows[0].id, res.rows[0].name, res.rows[0].email, res.rows[0].phone);
    }

    // Add image handling for expenses and group images
    static async getUserDetails(client, userId) {
        try {
            // Fetch all groups the user is assigned to
            const groupsRes = await client.query(
                `SELECT g.id, g.name, g.currency, g.created_at
                 FROM groups g
                 INNER JOIN group_users gu ON g.id = gu.group_id
                 WHERE gu.user_id = $1`,
                [userId]
            );

            const groups = groupsRes.rows;

            // Fetch all group images
            const groupImagesRes = await client.query(
                `SELECT gi.group_id, gi.image_url
                 FROM group_images gi
                 WHERE gi.group_id IN (
                     SELECT g.id
                     FROM groups g
                     INNER JOIN group_users gu ON g.id = gu.group_id
                     WHERE gu.user_id = $1
                 )`,
                [userId]
            );

            const groupImages = groupImagesRes.rows;

            // Fetch all expenses the user is involved in
            const expensesRes = await client.query(
                `SELECT e.id, e.description, e.currency, e.amount, e.group_id, e.split_method, e.paid_by_user, e.image, e.created_at
                 FROM expenses e
                 INNER JOIN expense_users eu ON e.id = eu.expense_id
                 WHERE eu.user_id = $1`,
                [userId]
            );

            const expenses = expensesRes.rows;

            // Fetch all expense splits for all expenses
            const splitsRes = await client.query(
                `SELECT eu.expense_id, eu.user_id, eu.paid_to_user, eu.share
                 FROM expense_users eu
                 WHERE eu.expense_id IN (
                     SELECT e.id
                     FROM expenses e
                     INNER JOIN expense_users eu ON e.id = eu.expense_id
                     WHERE eu.user_id = $1
                 )`,
                [userId]
            );

            const splits = splitsRes.rows;

            // Organize expenses into groups and non-grouped expenses
            const groupExpense = groups.map((group) => {
                const groupExpenses = expenses
                    .filter((expense) => expense.group_id === group.id)
                    .map((expense) => ({
                        ...expense,
                        expense_split: splits.filter((split) => split.expense_id === expense.id),
                    }));

                const images = groupImages
                    .filter((image) => image.group_id === group.id)
                    .map((image) => image.image_url);

                return {
                    group: {
                        ...group,
                        images,
                        expenses: groupExpenses,
                    },
                };
            });

            const nonGroupExpense = expenses
                .filter((expense) => expense.group_id === null)
                .map((expense) => ({
                    ...expense,
                    expense_split: splits.filter((split) => split.expense_id === expense.id),
                }));

            return {
                groupExpense,
                nonGroupExpense,
            };
        } catch (error) {
            console.error('Error fetching user details:', error);
            throw new Error('Error fetching user details.');
        }
    }

    static async getUserBalances(client, userId) {
        try {
            // Query to calculate how much the user owes to others, grouped by currency
            const owesRes = await client.query(
                `SELECT eu.paid_to_user AS user_id, e.currency, SUM(eu.share) AS total
                 FROM expense_users eu
                 INNER JOIN expenses e ON eu.expense_id = e.id
                 WHERE eu.user_id = $1 AND e.flag = FALSE AND eu.flag = FALSE
                 GROUP BY eu.paid_to_user, e.currency`,
                [userId]
            );

            const owes = owesRes.rows;

            // Query to calculate how much others owe to the user, grouped by currency
            const owedRes = await client.query(
                `SELECT eu.user_id AS user_id, e.currency, SUM(eu.share) AS total
                 FROM expense_users eu
                 INNER JOIN expenses e ON eu.expense_id = e.id
                 WHERE eu.paid_to_user = $1 AND e.flag = FALSE AND eu.flag = FALSE
                 GROUP BY eu.user_id, e.currency`,
                [userId]
            );

            const owed = owedRes.rows;

            // Combine the results to calculate the net balance by currency
            const balances = {};

            // Process amounts the user owes to others
            owes.forEach((row) => {
                const key = `${row.user_id}-${row.currency}`;
                if (!balances[key]) {
                    balances[key] = { user_id: row.user_id, currency: row.currency, balance: 0 };
                }
                balances[key].balance -= parseFloat(row.total);
            });

            // Process amounts others owe to the user
            owed.forEach((row) => {
                const key = `${row.user_id}-${row.currency}`;
                if (!balances[key]) {
                    balances[key] = { user_id: row.user_id, currency: row.currency, balance: 0 };
                }
                balances[key].balance += parseFloat(row.total);
            });

            // Format the result
            const result = Object.values(balances).filter((entry) => entry.balance !== 0);

            return result;
        } catch (error) {
            console.error('Error fetching user balances:', error);
            throw new Error('Error fetching user balances.');
        }
    }
}

module.exports = {
    User
};