const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createChat, sendMessage, getMessages } = require('../controllers/chatController');

const router = express.Router();

router.post('/chat', protect, createChat);
router.post('/message', protect, sendMessage);
router.get('/messages/:chatId', protect, getMessages);

module.exports = router;