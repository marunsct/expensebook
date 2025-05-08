const { pool } = require('../db');
const { ApiKey } = require('../models/ApiKey');

const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key']; // API key is expected in the `x-api-key` header

    if (!apiKey) {
        return res.status(401).json({ error: 'Access denied. No API key provided.' });
    }

    try {
        const isValid = await ApiKey.validate(pool, apiKey);
        if (!isValid) {
            return res.status(403).json({ error: 'Invalid API key.' });
        }
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Error validating API key:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = validateApiKey;