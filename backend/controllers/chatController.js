const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const path = require('path');
const fs = require('fs');

// ---------- CREATE CHAT ----------
const createChat = async (req, res) => {
  try {
    const { participants, isGroup, name } = req.body;

    if (!participants || participants.length < 2) {
      return res.status(400).json({ msg: 'At least 2 participants required' });
    }

    // prevent duplicate 1-on-1 chats
    if (!isGroup) {
      const existing = await Chat.findOne({
        isGroup: false,
        participants: { $all: participants, $size: participants.length },
      });
      if (existing) return res.json(existing);
    }

    const chat = new Chat({
      participants,
      isGroup: !!isGroup,
      name: isGroup ? name : undefined,
    });
    await chat.save();
    await chat.populate('participants', 'name username profilePic online');

    res.status(201).json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ---------- GET ALL USER CHATS ----------
const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'name username profilePic online publicKey')
      .sort({ updatedAt: -1 });

    // attach last message preview
    const enriched = await Promise.all(
      chats.map(async (c) => {
        const last = await Message.findOne({ chatId: c._id })
          .sort({ createdAt: -1 })
          .select('content type createdAt');
        return { ...c.toObject(), lastMessage: last };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ---------- SEND MESSAGE ----------
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, type = 'text', iv, senderPublicKey } = req.body;

    if (!chatId || !content) {
      return res.status(400).json({ msg: 'chatId and content are required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ msg: 'Chat not found' });

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    // === CRITICAL: Build message object with `type` FIRST ===
    const messageData = {
      chat: chatId,
      sender: req.user._id,
      content,
      type, // ← Set type FIRST
    };

    // Now add E2EE fields only if type is encrypted
    if (type === 'encrypted') {
      if (!iv || !senderPublicKey) {
        return res.status(400).json({ msg: 'iv and senderPublicKey required for encrypted messages' });
      }
      messageData.iv = iv;
      messageData.senderPublicKey = senderPublicKey;
    }

    const message = new Message(messageData);
    await message.save();
    await message.populate('sender', 'name username profilePic publicKey');

    chat.updatedAt = Date.now();
    await chat.save();

    if (req.io) {
      req.io.to(chatId).emit('message', message);
    }

    res.json(message);
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ---------- GET MESSAGES ----------
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chat: chatId })  // ← use 'chat'
      .populate('sender', 'name username profilePic publicKey')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ---------- FILE UPLOAD ----------
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'aegischat_files', resource_type: 'auto' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Upload failed' });
  }
};

module.exports = {
  createChat,
  getAllChats,
  sendMessage,
  getMessages,
  uploadFile,
};