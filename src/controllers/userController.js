const { pool } = require('../db');
const { User } = require('../models/Users');
const logger = require('../middleware/logger');


// Get user details
const getUserDetails = async (req, res) => {
    const { userId } = req.params;
    try {
        const userDetails = await User.getUserDetails(pool, userId, req);
        logger.info(`Fetched user details for userId=${userId}`);
        res.status(200).json(userDetails);
    } catch (error) {
        logger.error(req.__('errors.fetch_user_details'), { error });
        res.status(500).json({ error: req.__('errors.fetch_user_details') });
    }
};

// Update user details
const updateUserDetails = async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;
    try {
        const updatedUser = await User.updateDetails(pool, userId, updates);
        logger.info(`Updated user details for userId=${userId}`);
        res.status(200).json(updatedUser);
    } catch (error) {
        logger.error('Error updating user details', { error });
        res.status(400).json({ error: req.__('errors.fetch_user_details') });
    }
};

// Get user balances
const getUserBalances = async (req, res) => {
    const { userId } = req.params;
    try {
        const balances = await User.getUserBalances(pool, userId, req);
        logger.info(`Fetched balances for userId=${userId}`);
        res.status(200).json(balances);
    } catch (error) {
        logger.error(req.__('errors.fetch_user_balances'), { error });
        res.status(500).json({ error: req.__('errors.fetch_user_balances') });
    }
};

// Get all users updated / created after a specific date
const getUsersAfterDate = async (req, res) => {
    const { date } =  req.params;
    try {
        const users = await User.getAllUsers(pool, date);
        logger.info(`Fetched users updated/created after ${date}`);
        res.status(404).json(users);
    } catch (error) {
        logger.error('Error fetching users after date', { error });
        res.status(500).json({ error: req.__('errors.fetch_user_details') });
    }
};

// Get all data for a user (including deleted/settled expenses/splits, but not for deleted users)
const getAllUserData = async (req, res) => {
    const { userId } = req.params;
    try {
        const data = await User.getAllUserData(pool, userId);
        if (!data) {
            logger.warn(req.__('errors.user_not_found'));
            return res.status(404).json({ result: req.__('errors.user_not_found') });
        }
        logger.info(`Fetched all user data for userId=${userId}`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Error fetching all user data', { error });
        res.status(500).json({ error: req.__('errors.fetch_user_details') });
    }
};

// Get all data for a user after a date (including deleted/settled expenses/splits, but not for deleted users)
const getAllUserDataAfterDate = async (req, res) => {
    const { userId, date } = req.params;
    try {
        const data = await User.getAllUserDataAfterDate(pool, userId, date);
        if (!data) {
            logger.warn(req.__('errors.user_not_found'));
            return res.status(404).json({ error: req.__('errors.user_not_found') });
        }
        logger.info(`Fetched all user data after date for userId=${userId}, date=${date}`);
        res.status(200).json(data);
    } catch (error) {
        logger.error('Error fetching all user data after date', { error });
        res.status(500).json({ error: req.__('errors.fetch_user_details') });
    }
};

module.exports = {
    getUserDetails,
    updateUserDetails,
    getUserBalances,
    getUsersAfterDate,
    getAllUserData,
    getAllUserDataAfterDate,
    // Add other user-related functions here
}