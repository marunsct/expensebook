const { pool } = require('../db');
const { User } = require('../models/Users');
const { Group } = require('../models/Groups');
const { Expense } = require('../models/Expenses');

// Create a group
const createGroup = async (req, res) => {
    const { name, currency, created_by } = req.body;

    try {
        const group = await Group.create(pool, name, currency, created_by);
        res.status(201).json(group);
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Error creating group' });
    }
};

// Get user details
const getUserDetails = async (req, res) => {
    const { userId } = req.params;

    try {
        const userDetails = await User.getUserDetails(pool, userId);
        res.status(200).json(userDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.user_details_error') });
    }
};

// Get user balances
const getUserBalances = async (req, res) => {
    const { userId } = req.params;

    try {
        const balances = await User.getUserBalances(pool, userId);
        res.status(200).json(balances);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.user_details_error') });
    }
};


// Create an expense
const createExpense = async (req, res) => {
    const { description, currency, amount, group_id, split_method, paid_by_user, image, created_by, splits } = req.body;

    try {
        const expense = await Expense.create(
            pool,
            description,
            currency,
            amount,
            group_id,
            split_method,
            paid_by_user,
            image,
            created_by,
            splits
        );
        res.status(201).json(expense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Error creating expense' });
    }
};

// View all expenses
const getAllExpenses = async (req, res) => {
    try {
        const expenses = await Expense.getAll(pool);
        res.status(200).json(expenses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.expense_fetch_error') });
    }
};

// Add a user to a group
const addUserToGroup = async (req, res) => {
    const { groupId } = req.params;
    const { userId, created_by } = req.body;

    if (!groupId || !userId) {
        return res.status(400).json({ error: req.__('errors.missing_group_or_user') });
    }

    try {
// Use the Group model to add the user to the group
        await Group.addUser(pool, groupId, userId, created_by);
        res.status(201).json({ message: req.__('messages.user_added_to_group') });
    } catch (error) {
        console.error('Error adding user to group:', error);
        res.status(500).json({ error: req.__('errors.add_user_to_group_error') });
    }
};

// Upload a group image
const uploadGroupImage = async (req, res) => {
    const { groupId } = req.params;
    const { image_url } = req.body;

    try {
        const groupImage = await Group.addImage(pool, groupId, image_url);
        res.status(201).json(groupImage);
    } catch (error) {
        console.error('Error uploading group image:', error);
        res.status(500).json({ error: req.__('errors.upload_group_image_error') });
    }
};

// Fetch all images for a group
const getGroupImages = async (req, res) => {
    const { groupId } = req.params;

    try {
        const images = await Group.getImages(pool, groupId);
        res.status(200).json(images);
    } catch (error) {
        console.error('Error fetching group images:', error);
        res.status(500).json({ error: 'Error fetching group images' });
    }
};

module.exports = {
    createGroup,
    getUserDetails,
    getUserBalances,
    createExpense,
    getAllExpenses,
    addUserToGroup,
    uploadGroupImage,
    getGroupImages,
};