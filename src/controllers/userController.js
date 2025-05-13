const { pool } = require('../db');
const { User } = require('../models/Users');


// Get user details
const getUserDetails = async (req, res) => {
    const { userId } = req.params;

    try {
        const userDetails = await User.getUserDetails(pool, userId, req);
        res.status(200).json(userDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Update user details
const updateUserDetails = async (req, res) => {
    const { userId } = req.params;
    const updates = req.body;

    try {
        // Ensure the user is only updating allowed fields
        const updatedUser = await User.updateDetails(pool, userId, updates);
        res.status(200).json(updatedUser);
    } catch (error) {
        console.error('Error updating user details:', error);
        res.status(400).json({ error: error.message });
    }
};

// Get user balances
const getUserBalances = async (req, res) => {
    const { userId } = req.params;

    try {
        const balances = await User.getUserBalances(pool, userId, req);
        res.status(200).json(balances);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Get all users updated / created after a specific date
const getUsersAfterDate = async (req, res) => {
    const { date } =  req.params;

    try {
        const users = await User.getAllUsers(pool, date);
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getUserDetails,
    updateUserDetails,
    getUserBalances,
    getUsersAfterDate,
    // Add other user-related functions here
}