const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  transferFunds,
} = require('../controllers/accountController');

router.route('/')
  .get(protect, getAccounts)
  .post(protect, createAccount);

router.post('/transfer', protect, transferFunds);

router.route('/:id')
  .get(protect, getAccountById)
  .put(protect, updateAccount)
  .delete(protect, deleteAccount);

module.exports = router;
