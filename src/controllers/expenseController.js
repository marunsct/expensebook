const { pool } = require('../db');
const { Expense } = require('../models/Expenses');
const logger = require('../middleware/logger');



// Create an expense
const createExpense = async (req, res) => {
    const { description, currency, amount, group_id, split_method, contributors, image, created_by, splits } = req.body;
    if (!description || !currency || !amount || !contributors || !splits) {
        logger.warn(req.__('errors.missing_expense_fields'));
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
        logger.info('Expense created');
        res.status(201).json(expense);
    } catch (error) {
        logger.error(req.__('errors.expense_creation_error'), { error });
        res.status(500).json({ error: req.__('errors.expense_creation_error') });
    }
};

// View all expenses
const getAllExpenses = async (req, res) => {
    try {
        const expenses = await Expense.getAll(pool);
        const formattedExpenses = expenses.map((expense) => ({
            ...expense,
            splits: expense.splits.map((split) => ({
                userId: split.user_id,
                paidToUser: split.paid_to_user,
                share: split.share,
            })),
        }));
        logger.info('Fetched all expenses');
        res.status(200).json(formattedExpenses);
    } catch (error) {
        logger.error(req.__('errors.expense_fetch_error'), { error });
        res.status(500).json({ error: req.__('errors.expense_fetch_error') });
    }
};

// Settle up expenses
const settleUpExpenses = async (req, res) => {
    const { userId, otherUserId } = req.body;
    try {
        const result = await Expense.settleUp(pool, userId, otherUserId);
        logger.info(`Expenses settled between userId=${userId} and otherUserId=${otherUserId}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(req.__('errors.expense_settle_error') || 'Error settling up expenses', { error });
        res.status(500).json({ error: req.__('errors.expense_settle_error') || 'Error settling up expenses.' });
    }
};

const getUnsettledExpenses = async (req, res) => {
  try {
    const userId = req.params.userId;
    const expenses = await Expense.getUnsettledExpenses(pool,userId);
    logger.info(`Fetched unsettled expenses for userId=${userId}`);
    res.json(expenses);
  } catch (err) {
    logger.error(req.__('errors.expense_fetch_error'), { error: err });
    res.status(500).json({ error: req.__('errors.expense_fetch_error') });
  }
};

const getUnsettledExpensesAfterDate = async (req, res) => {
  try {
    const userId = req.params.userId;
    const date = req.params.date;
    const expenses = await Expense.getUnsettledExpensesAfterDate(pool,userId, date);
    logger.info(`Fetched unsettled expenses for userId=${userId} after date=${date}`);
    res.json(expenses);
  } catch (err) {
    logger.error(req.__('errors.expense_fetch_error'), { error: err });
    res.status(500).json({ error: req.__('errors.expense_fetch_error') });
  }
};

module.exports = {
    createExpense,
    getAllExpenses,
    settleUpExpenses,
    getUnsettledExpenses,
    getUnsettledExpensesAfterDate
};