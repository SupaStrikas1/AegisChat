const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const admin = require('firebase-admin');

// Create chat (1-1 or group)
const createChat = async (req, res) => {
  const { participants, isGroup, name } = req.body;  // participants: array of userIds
  try {
    // Ensure requester is included
    const allParticipants = [...new Set([req.user._id, ...participants])];

    // Check if 1-1 chat exists
    if (!isGroup && allParticipants.length === 2) {
      const existing = await Chat.findOne({
        isGroup: false,
        participants: { $all: allParticipants, $size: allParticipants.length },
      });
      if (existing) return res.json(existing);
    }

    const chat = new Chat({ isGroup, name, participants: allParticipants });
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Send message (server receives encrypted data)
const sendMessage = async (req, res) => {
  const { chatId, type, content, iv, encryptedSymKeys } = req.body;  // content, iv, encryptedSymKeys are base64
  try {
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.participants.includes(req.user._id)) return res.status(400).json({ msg: 'Invalid chat' });

    const message = new Message({
      chat: chatId,
      sender: req.user._id,
      type,
      content,  // ciphertext
      iv,
      senderPublicKey: req.user.publicKey,
      encryptedSymKeys,  // Map for groups
    });
    await message.save();

    chat.lastMessage = message._id;
    await chat.save();

    // Notify recipients via Firebase (if offline)
    const recipients = chat.participants.filter(id => id.toString() !== req.user._id.toString());
    for (const recId of recipients) {
      const recUser = await User.findById(recId);
      if (recUser.fcmToken && !recUser.online) {  // Only if offline
        admin.messaging().send({
          token: recUser.fcmToken,
          notification: { title: 'New Message', body: `${req.user.name}: [Encrypted Message]` },
          data: { chatId: chatId.toString() },
        });
      }
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Get chat messages
const getMessages = async (req, res) => {
  const { chatId } = req.params;
  try {
    const messages = await Message.find({ chat: chatId }).populate('sender', 'name profilePic');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { createChat, sendMessage, getMessages };