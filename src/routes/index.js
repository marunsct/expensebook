// This file defines the API routes for the application.
// Import the Express.js framework
const express = require('express');
// Import middleware functions for API key validation and JWT authentication
const validateApiKey = require('../middleware/apiKeyAuth');
const authenticateToken = require('../middleware/auth');
// Import controller functions for handling requests
const loginController = require('../controllers/authentication');
const apiKeyController = require('../controllers/apiKeyController');
// Import the userController for user-related operations
const userController = require('../controllers/userController');
const expenseController = require('../controllers/expenseController');
// Import the groupController for group-related operations
const groupController = require('../controllers/groupController');


// Create a new Express router instance
const router = express.Router();

// Public routes (no API key required)
// Register a new user
router.post('/register', loginController.registerUser);

// Login an existing user
router.post('/login', loginController.loginUser);

// Generate a new API key
router.post('/generate-api-key', apiKeyController.generateApiKey);

// Update a user's password
router.put('/users/:userId/password', loginController.changePassword);

// Retrieve an API key by consumer name (requires JWT authentication)
router.post('/api-keys/retrieve', authenticateToken, apiKeyController.getApiKey);

// Protected routes (require API key and JWT authentication)
// Apply API key validation middleware to all routes below
router.use(validateApiKey);

// Invite a new user to join the platform
router.post('/users/invite', authenticateToken, loginController.inviteUserByEmail);

// Get a user's details
router.get('/users/:userId/details', authenticateToken, userController.getUserDetails);

// Get all users update or created after a specific date
router.get('/users/updated-after/:date', authenticateToken, userController.getUsersAfterDate);

// Get a user's balances
router.get('/users/:userId/balances', authenticateToken, userController.getUserBalances);

// Update a user's details
router.put('/users/:userId', authenticateToken, userController.updateUserDetails);

// Close a user's account
router.delete('/users/:userId/close-account', authenticateToken, loginController.closeAccount);

// API For Groups
// Create a new group
router.post('/groups', authenticateToken, groupController.createGroup);

// Add a user to a group
router.post('/groups/:groupId/users', authenticateToken, groupController.addUserToGroup);

// Upload an image for a group
router.post('/groups/:groupId/images', authenticateToken, groupController.uploadGroupImage);

// Get images for a group
router.get('/groups/:groupId/images', authenticateToken, groupController.getGroupImages);

// Remove a user from a group
router.delete('/groups/:groupId/users/:userId', authenticateToken, groupController.deleteUserFromGroup);

// Get all groups for a user
router.get('/groups/:userId', authenticateToken, groupController.getUserGroups);

// API For Expenses
// Create a new expense
router.post('/expenses', authenticateToken, expenseController.createExpense);

// Get all expenses
router.get('/expenses', authenticateToken, expenseController.getAllExpenses);

// Settle up expenses
router.post('/expenses/settle-up', authenticateToken, expenseController.settleUpExpenses);

// Get all expenses for a specific user
router.get('/expenses/unsettled/:userId', expenseController.getUnsettledExpenses);

// Get all expenses for a specific user after a specific date
router.get('/expenses/unsettledAfter/:userId/:date', expenseController.getUnsettledExpensesAfterDate);

// Export the router instance
module.exports = router;