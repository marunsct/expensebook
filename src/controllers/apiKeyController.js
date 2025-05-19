const { pool } = require('../db');
const { ApiKey } = require('../models/ApiKey');
const logger = require('../middleware/logger');

const generateApiKey = async (req, res) => {
    const { consumer_name } = req.body;

    if (!consumer_name) {
        logger.warn(req.__('errors.consumer_name_required') || 'Consumer name is required.');
        return res.status(400).json({ error: req.__('errors.consumer_name_required') || 'Consumer name is required.' });
    }

    try {
        const apiKey = await ApiKey.generate(pool, consumer_name);
        logger.info(`API key generated for consumer: ${consumer_name}`);
        res.status(201).json({
            message: req.__('messages.api_key_generated_successfully') || 'API key generated successfully.',
            apiKey: apiKey.api_key,
        });
    } catch (error) {
        logger.error(req.__('errors.api_key_generation_error') || 'Error generating API key', { error });
        res.status(500).json({ error: req.__('errors.api_key_generation_error') || 'Internal server error.' });
    }
};

const getApiKey = async (req, res) => {
    const { consumer_name } = req.body;

    if (!consumer_name) {
        logger.warn(req.__('errors.consumer_name_required') || 'Consumer name is required.');
        return res.status(400).json({ error: req.__('errors.consumer_name_required') || 'Consumer name is required.' });
    }

    try {
        const apiKey = await ApiKey.getByConsumerName(pool, consumer_name);
        logger.info(`API key retrieved for consumer: ${consumer_name}`);
        res.status(200).json({
            message: req.__('messages.api_key_retrieved_successfully') || 'API key retrieved successfully.',
            apiKey,
        });
    } catch (error) {
        logger.error(req.__('errors.api_key_retrieval_error') || 'Error retrieving API key', { error });
        res.status(404).json({ error: req.__('errors.api_key_retrieval_error') || error.message });
    }
};

module.exports = {
    generateApiKey,
    getApiKey,
};