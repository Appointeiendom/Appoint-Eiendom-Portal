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
router.post('/', protect, (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    upload.array('images', 5)(req, res, next);
  } else {
    next();
  }
}, createIssue);
router.get('/:id', protect, getIssue);
router.put('/:id', protect, adminOnly, updateIssue);
router.put('/:id/responsibility', protect, adminOnly, setResponsibility);
router.delete('/:id', protect, adminOnly, deleteIssue);

module.exports = router;
