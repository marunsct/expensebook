const express = require('express');
const validateApiKey = require('../middleware/apiKeyAuth');
const authenticateToken = require('../middleware/auth');
const loginController = require('../controllers/authentication');
const apiController = require('../controllers/apiController');
const apiKeyController = require('../controllers/apiKeyController');
const { deleteUserFromGroup } = require('../controllers/apiController');

const router = express.Router();

// Public routes (no API key required)
router.post('/register', loginController.registerUser);
router.post('/login', loginController.loginUser);
router.post('/generate-api-key', apiKeyController.generateApiKey);
router.put('/users/:userId/password',  loginController.changePassword);
// Protected routes (require API key and JWT authentication)
router.use(validateApiKey); // Apply API key validation middleware to all routes below

//API For Users
router.post('/users/invite', authenticateToken, loginController.inviteUserByEmail);
router.get('/users/:userId/details', authenticateToken, apiController.getUserDetails);
router.get('/users/:userId/balances', authenticateToken, apiController.getUserBalances);
router.put('/users/:userId', authenticateToken, apiController.updateUserDetails);
router.delete('/users/:userId/close-account', authenticateToken, loginController.closeAccount);
//API For Groups
router.post('/groups', authenticateToken, apiController.createGroup);
router.post('/groups/:groupId/users', authenticateToken, apiController.addUserToGroup);
router.post('/groups/:groupId/images', authenticateToken, apiController.uploadGroupImage);
router.get('/groups/:groupId/images', authenticateToken, apiController.getGroupImages);
router.delete('/groups/:groupId/users/:userId', authenticateToken, deleteUserFromGroup);

//API For Expenses
router.post('/expenses', authenticateToken, apiController.createExpense);
router.get('/expenses', authenticateToken, apiController.getAllExpenses);
router.post('/expenses/settle-up', authenticateToken, apiController.settleUpExpenses);


module.exports = router;