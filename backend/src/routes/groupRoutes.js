const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  createGroup,
  getGroups,
  getGroup,
  addMember,
  leaveGroup
} = require('../controllers/groupController');

const createGroupValidation = [
  body('name').notEmpty().withMessage('Group name is required').isLength({ min: 2 }),
  body('category').optional().isIn(['Household', 'Trip', 'Event', 'Coffee Ceremony', 'Iddir', 'Equb', 'Other'])
];

router.route('/')
  .post(protect, createGroupValidation, validate, createGroup)
  .get(protect, getGroups);

router.route('/:id')
  .get(protect, getGroup);

const addMemberValidation = [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('nickname').optional().trim().escape().isLength({ max: 50 }),
];

router.post('/:id/members', protect, addMemberValidation, validate, addMember);
router.delete('/:id/leave', protect, leaveGroup);

module.exports = router;