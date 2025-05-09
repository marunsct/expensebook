const crypto = require('crypto');

class ApiKey {
    constructor(id, consumer_name, api_key, created_at) {
        this.id = id;
        this.consumer_name = consumer_name;
        this.api_key = api_key;
        this.created_at = created_at;
    }

    static async generate(client, consumer_name) {
        const apiKey = crypto.randomBytes(32).toString('hex'); // Generate a random API key
        const res = await client.query(
            'INSERT INTO api_keys (consumer_name, api_key) VALUES ($1, $2) RETURNING *',
            [consumer_name, apiKey]
        );
        return new ApiKey(res.rows[0].id, res.rows[0].consumer_name, res.rows[0].api_key, res.rows[0].created_at);
    }

    static async validate(client, apiKey) {
        const res = await client.query('SELECT * FROM api_keys WHERE api_key = $1', [apiKey]);
        return res.rows.length > 0; // Return true if the API key exists
    }

    static async getByConsumerName(client, consumerName) {
        const res = await client.query(
            'SELECT api_key FROM api_keys WHERE consumer_name = $1',
            [consumerName]
        );

        if (res.rows.length === 0) {
            throw new Error('API key not found for the provided consumer name.');
        }

        return res.rows[0].api_key;
    }
}

module.exports = {
    ApiKey,
};