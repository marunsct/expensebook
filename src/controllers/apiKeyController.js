const { pool } = require('../db');
const { ApiKey } = require('../models/ApiKey');

const generateApiKey = async (req, res) => {
    const { consumer_name } = req.body;

    if (!consumer_name) {
        return res.status(400).json({ error: 'Consumer name is required.' });
    }

    try {
        const apiKey = await ApiKey.generate(pool, consumer_name);
        res.status(201).json({
            message: 'API key generated successfully.',
            apiKey: apiKey.api_key,
        });
    } catch (error) {
        console.error('Error generating API key:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = {
    generateApiKey,
};