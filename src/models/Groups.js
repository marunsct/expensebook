class Group {
    constructor(id, name, currency) {
        this.id = id;
        this.name = name;
        this.currency = currency;
    }

    static async create(client, name, currency) {
        const res = await client.query('INSERT INTO groups (name, currency) VALUES ($1, $2) RETURNING *', [name, currency]);
        return new Group(res.rows[0].id, res.rows[0].name, res.rows[0].currency);
    }

    static async addUser(client, groupId, userId) {
        await client.query('INSERT INTO group_users (group_id, user_id) VALUES ($1, $2)', [groupId, userId]);
    }
}


module.exports = {
    Group
};