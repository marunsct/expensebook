class Group {
    constructor(id, name, currency, created_by) {
        this.id = id;
        this.name = name;
        this.currency = currency;
        this.created_by = created_by;
    }

    static async create(client, name, currency, created_by) {
        const res = await client.query(
            'INSERT INTO groups (name, currency, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name, currency, created_by]
        );
        return new Group(res.rows[0].id, res.rows[0].name, res.rows[0].currency, res.rows[0].created_by);
    }

    static async addUser(client, groupId, userId, created_by) {
        await client.query('INSERT INTO group_users (group_id, user_id) VALUES ($1, $2)', [groupId, userId, created_by]);
    }

    // Check if the user has open expenses in the group
    static async hasOpenExpenses(client, groupId, userId) {
        const res = await client.query(
            `SELECT e.id
             FROM expenses e
             INNER JOIN expense_users eu ON e.id = eu.expense_id
             WHERE e.group_id = $1 AND eu.user_id = $2 AND e.flag = FALSE AND e.delete_flag = FALSE`,
            [groupId, userId]
        );
        return res.rows.length > 0; // Return true if there are open expenses
    }

    // Mark the user as deleted in the group_users table
    static async deleteUserFromGroup(client, groupId, userId) {
        await client.query(
            `UPDATE group_users
             SET delete_flag = TRUE
             WHERE group_id = $1 AND user_id = $2`,
            [groupId, userId]
        );
    }
}

module.exports = {
    Group,
};