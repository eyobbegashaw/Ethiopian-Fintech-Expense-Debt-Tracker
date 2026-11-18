const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getFinancialReport,
  exportFinancialData,
} = require('../controllers/reportController');

router.get('/overview', protect, getFinancialReport);
router.get('/export', protect, exportFinancialData);

module.exports = router;
