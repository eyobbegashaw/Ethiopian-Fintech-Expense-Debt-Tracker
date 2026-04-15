const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  getPendingRequests
} = require('../controllers/friendController');

const friendRequestValidation = [
  body('phone').notEmpty().matches(/^[0-9]{9,12}$/).withMessage('Valid phone number is required'),
  body('message').optional().trim().escape().isLength({ max: 200 }),
];

router.post('/request', protect, friendRequestValidation, validate, sendFriendRequest);
router.put('/request/:id/accept', protect, acceptFriendRequest);
router.get('/', protect, getFriends);
router.get('/requests', protect, getPendingRequests);

module.exports = router;