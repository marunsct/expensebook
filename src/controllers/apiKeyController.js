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

const getApiKey = async (req, res) => {
    const { consumer_name } = req.body;

    if (!consumer_name) {
        return res.status(400).json({ error: 'Consumer name is required.' });
    }

    try {
        const apiKey = await ApiKey.getByConsumerName(pool, consumer_name);
        res.status(200).json({
            message: 'API key retrieved successfully.',
            apiKey,
        });
    } catch (error) {
        console.error('Error retrieving API key:', error);
        res.status(404).json({ error: error.message });
    }
};

module.exports = {
    generateApiKey,
    getApiKey,
};