const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionSummary,
} = require('../controllers/transactionController');

router.get('/summary', protect, getTransactionSummary);

router.route('/')
  .get(protect, getTransactions)
  .post(protect, createTransaction);

router.route('/:id')
  .get(protect, getTransactionById)
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

module.exports = router;
