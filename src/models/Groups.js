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
}

module.exports = {
    Group
};