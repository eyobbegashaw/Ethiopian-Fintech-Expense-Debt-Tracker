const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createSettlement,
  getPaymentOptions,
  getGroupSettlements
} = require('../controllers/settlementController');

router.route('/')
  .post(protect, createSettlement);

router.get('/payment-options/:groupId/:userId', protect, getPaymentOptions);
router.get('/group/:groupId', protect, getGroupSettlements);

module.exports = router;