const express = require('express');
const path = require('path');
const { updateProfile, sendFriendRequest, acceptFriendRequest, getFriends, searchUsers, getRecommendations, getFriendRequests, rejectFriendRequest } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier'); // Add streamifier for buffer streaming

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put('/profile', protect, updateProfile);
router.post('/friend/request', protect, sendFriendRequest);
router.post('/friend/accept', protect, acceptFriendRequest);
router.get('/friends', protect, getFriends);
router.get('/search/:query', protect, searchUsers);  // New: Search by username query
router.get('/recommendations', protect, getRecommendations);  // New: Recommendations
router.get('/friend/requests', protect, getFriendRequests); // New
router.post('/friend/reject', protect, rejectFriendRequest);
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder: 'aegischat_profiles' },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ msg: 'Upload failed' });
        }
        res.json({ url: result.secure_url });
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  } catch (err) {
    console.error('Upload route error:', err.message, err.stack);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;