const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  updatePushToken,
  sendDebtReminder
} = require('../controllers/notificationController');

router.use(protect);

router.route('/')
  .get(getNotifications);

router.put('/read-all', markAllAsRead);
router.post('/push-token', updatePushToken);
router.post('/remind', sendDebtReminder);

router.route('/:id')
  .delete(deleteNotification);

router.put('/:id/read', markAsRead);

module.exports = router;
