const express = require('express');
const router = express.Router();
const { upload } = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/auth');
const {
  getIssues,
  createIssue,
  getIssue,
  updateIssue,
  deleteIssue,
  setResponsibility,
} = require('../controllers/issueController');

router.get('/', protect, getIssues);
router.post('/', protect, upload.array('images', 5), createIssue);
router.get('/:id', protect, getIssue);
router.put('/:id', protect, adminOnly, updateIssue);
router.put('/:id/responsibility', protect, adminOnly, setResponsibility);
router.delete('/:id', protect, adminOnly, deleteIssue);

module.exports = router;
