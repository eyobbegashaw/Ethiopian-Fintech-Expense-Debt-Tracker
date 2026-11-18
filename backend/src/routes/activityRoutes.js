const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getActivities,
  getGroupActivities,
  getUserActivities
} = require('../controllers/activityController');

router.use(protect);

router.get('/', getActivities);
router.get('/group/:groupId', getGroupActivities);
router.get('/user/:userId', getUserActivities);

module.exports = router;
