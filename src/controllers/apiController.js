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

// Create an expense
const createExpense = async (req, res) => {
    const { description, currency, amount, group_id, split_method, contributors, image, created_by, splits } = req.body;

    if (!description || !currency || !amount || !contributors || !splits) {
        return res.status(400).json({ error: req.__('errors.missing_expense_fields') });
    }

    try {
        const expense = await Expense.create(
            pool,
            description,
            currency,
            amount,
            group_id,
            split_method,
            contributors,
            image,
            created_by,
            splits
        );
        res.status(201).json(expense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: req.__('errors.expense_creation_error') });
    }
};

// View all expenses
const getAllExpenses = async (req, res) => {
    try {
        const expenses = await Expense.getAll(pool);

        // Format the response
        const formattedExpenses = expenses.map((expense) => ({
            ...expense,
            splits: expense.splits.map((split) => ({
                userId: split.user_id,
                paidToUser: split.paid_to_user,
                share: split.share,
            })),
        }));

        res.status(200).json(formattedExpenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
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

// Settle up expenses
const settleUpExpenses = async (req, res) => {
    const { userId, otherUserId } = req.body;

    try {
        const result = await Expense.settleUp(pool, userId, otherUserId);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error settling up expenses:', error);
        res.status(500).json({ error: 'Error settling up expenses.' });
    }
};

// Delete a user from a group
const deleteUserFromGroup = async (req, res) => {
    const { groupId, userId } = req.params;

    if (!groupId || !userId) {
        return res.status(400).json({ error: req.__('errors.missing_group_or_user') });
    }

    try {
        // Check if the user has open expenses in the group
        const hasOpenExpenses = await Group.hasOpenExpenses(pool, groupId, userId);
        if (hasOpenExpenses) {
            return res.status(400).json({ error: req.__('errors.user_has_open_expenses') });
        }

        // Mark the user as deleted in the group_users table
        await Group.deleteUserFromGroup(pool, groupId, userId);
        res.status(200).json({ message: req.__('messages.user_deleted_from_group') });
    } catch (error) {
        console.error('Error deleting user from group:', error);
        res.status(500).json({ error: req.__('errors.delete_user_from_group_error') });
    }
};

module.exports = {
    createGroup,
    getUserDetails,
    updateUserDetails,
    getUserBalances,
    createExpense,
    getAllExpenses,
    addUserToGroup,
    uploadGroupImage,
    getGroupImages,
    settleUpExpenses,
    deleteUserFromGroup,
};