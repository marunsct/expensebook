const { pool } = require('../db');
const { User } = require('../models/Users');
const { Group } = require('../models/Groups'); // Assuming Group model exists
const { Expense } = require('../models/Expenses'); // Assuming Expense model exists

// Create a group
const createGroup = async (req, res) => {
    const { name, currency } = req.body;
    try {
        const group = await Group.create(pool, name, currency);
        res.status(201).json(group);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.group_creation_error') });
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
        res.status(500).json({ error: req.__('errors.user_balances_error') });
    }
};

// Create an expense
const createExpense = async (req, res) => {
    const { description, currency, amount, groupId, splitMethod, paidByUser, splits } = req.body;

    if (!description || !currency || !amount || !paidByUser || !splits) {
        return res.status(400).json({ error: req.__('errors.missing_expense_fields') });
    }

    try {
        const expense = await Expense.create(pool, description, currency, amount, groupId, splitMethod, paidByUser, splits);
        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.expense_creation_error') });
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
    const { userId } = req.body;

    if (!groupId || !userId) {
        return res.status(400).json({ error: req.__('errors.missing_group_or_user') });
    }

    try {
        // Use the Group model to add the user to the group
        await Group.addUser(pool, groupId, userId);
        res.status(201).json({ message: req.__('messages.user_added_to_group') });
    } catch (error) {
        console.error('Error adding user to group:', error);
        res.status(500).json({ error: req.__('errors.add_user_to_group_error') });
    }
};

module.exports = {
    createGroup,
    getUserDetails,
    getUserBalances,
    createExpense,
    getAllExpenses,
    addUserToGroup,
};