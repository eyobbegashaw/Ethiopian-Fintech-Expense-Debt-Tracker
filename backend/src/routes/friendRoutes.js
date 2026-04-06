const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getPendingRequests
} = require('../controllers/friendController');

router.post('/request', protect, sendFriendRequest);
router.put('/request/:id/accept', protect, acceptFriendRequest);
router.get('/', protect, getFriends);
router.get('/requests', protect, getPendingRequests);

module.exports = router;