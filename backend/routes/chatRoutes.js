const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createChat,
  sendMessage,
  getMessages,
  getAllChats,
  uploadFile,
  addMember,
  removeMember,
  makeAdmin,
  leaveGroup,
} = require("../controllers/chatController");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/chat", protect, createChat); // POST   /api/chat
router.get("/chat", protect, getAllChats); // GET    /api/chat
router.post("/message", protect, sendMessage); // POST   /api/message
router.get("/messages/:chatId", protect, getMessages); // GET /api/messages/:chatId
router.post("/message/upload", protect, upload.single("file"), uploadFile); // POST   /api/message/upload
router.post("/chat/:id/add", protect, addMember);
router.post("/chat/:id/remove", protect, removeMember);
router.post("/chat/:id/make-admin", protect, makeAdmin);
router.post("/chat/:id/leave", protect, leaveGroup);

module.exports = router;
