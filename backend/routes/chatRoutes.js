const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createChat,
  sendMessage,
  getMessages,
  getAllChats,
  uploadFile, // <-- new
} = require("../controllers/chatController");
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/chat", protect, createChat); // POST   /api/chat
router.get("/chat", protect, getAllChats); // GET    /api/chat
router.post("/message", protect, sendMessage); // POST   /api/message
router.get("/messages/:chatId", protect, getMessages); // GET /api/messages/:chatId
router.post('/message/upload', protect, upload.single('file'), uploadFile); // POST   /api/message/upload

module.exports = router;