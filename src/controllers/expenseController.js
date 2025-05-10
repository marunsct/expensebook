const { pool } = require('../db');
const { Expense } = require('../models/Expenses');



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


module.exports = {
    createExpense,
    getAllExpenses,
    settleUpExpenses,
};