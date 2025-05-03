const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Import controllers
const loginController = require('../controllers/authentication');
const apiController = require('../controllers/apiController');

// Define routes

router.post('/register', loginController.registerUser);
router.post('/login', loginController.loginUser);

router.post('/groups', apiController.createGroup);
router.post('/groups/:groupId/users', apiController.addUserToGroup); // Add user to group
router.get('/users/:userId/details', apiController.getUserDetails);
router.get('/users/:userId/balances', apiController.getUserBalances);

// Expense routes
router.post('/expenses', apiController.createExpense);
router.get('/expenses', apiController.getAllExpenses);

// Group image routes
router.post('/groups/:groupId/images', apiController.uploadGroupImage);
router.get('/groups/:groupId/images', apiController.getGroupImages);

// Export the router
module.exports = router;