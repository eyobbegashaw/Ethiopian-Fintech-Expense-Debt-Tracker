const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  parseSmsPreview,
  importSms,
  getUnverifiedTransactions,
  confirmSmsTransaction,
  rejectSmsTransaction,
  deleteSmsTransaction,
} = require('../controllers/smsParserController');

router.post('/parse', protect, parseSmsPreview);
router.post('/import', protect, importSms);
router.get('/unverified', protect, getUnverifiedTransactions);

router.post('/:id/confirm', protect, confirmSmsTransaction);
router.post('/:id/reject', protect, rejectSmsTransaction);
router.delete('/:id', protect, deleteSmsTransaction);

module.exports = router;
