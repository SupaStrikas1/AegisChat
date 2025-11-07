const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");
const path = require("path");
const fs = require("fs");

// ---------- CREATE CHAT ----------
const createChat = async (req, res) => {
  try {
    const { participants, isGroup, name } = req.body;

    if (!participants || participants.length < 2) {
      return res.status(400).json({ msg: "At least 2 participants required" });
    }

    // prevent duplicate 1-on-1 chats
    if (!isGroup) {
      const existing = await Chat.findOne({
        isGroup: false,
        participants: { $all: participants, $size: participants.length },
      });
      if (existing) return res.json(existing);
    }

    // === 2. Generate groupKey only for group chats ===
    let groupKey;
    if (isGroup) {
      if (!name?.trim()) {
        return res.status(400).json({ msg: "Group name is required" });
      }
      const keyRaw = crypto.getRandomValues(new Uint8Array(32));
      groupKey = btoa(String.fromCharCode(...keyRaw));
    }

    // === 3. Create chat ===
    const chat = new Chat({
      participants,
      isGroup: !!isGroup,
      name: isGroup ? name : undefined,
      groupKey: isGroup ? groupKey : undefined,
      createdBy: req.user._id,
      admins: isGroup ? [req.user._id] : undefined,
    });

    await chat.save();
    await chat.populate("participants", "name username profilePic online");

    res.status(201).json(chat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ---------- GET ALL USER CHATS ----------
const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate("participants", "name username profilePic online publicKey")
      .sort({ updatedAt: -1 });

    // attach last message preview
    const enriched = await Promise.all(
      chats.map(async (c) => {
        const last = await Message.findOne({ chatId: c._id })
          .sort({ createdAt: -1 })
          .select("content type createdAt");
        return { ...c.toObject(), lastMessage: last };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ---------- SEND MESSAGE ----------
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, type = "text", iv, senderPublicKey } = req.body;

    if (!chatId || !content) {
      return res.status(400).json({ msg: "chatId and content are required" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ msg: "Chat not found" });

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ msg: "Not authorized" });
    }

    // === CRITICAL: Build message object with `type` FIRST ===
    const messageData = {
      chat: chatId,
      sender: req.user._id,
      content,
      type, // ← Set type FIRST
    };

    // Now add E2EE fields only if type is encrypted
    if (type === "encrypted") {
      if (!chat.isGroup && (!iv || !senderPublicKey)) {
        return res
          .status(400)
          .json({
            msg: "iv and senderPublicKey required for 1-1 encrypted messages",
          });
      }
      if (chat.isGroup && !iv) {
        return res.status(400).json({ msg: "iv required for group messages" });
      }
      messageData.iv = iv;
      if (senderPublicKey) messageData.senderPublicKey = senderPublicKey;
    }

    const message = new Message(messageData);
    await message.save();
    await message.populate("sender", "name username profilePic publicKey");

    chat.updatedAt = Date.now();
    await chat.save();

    if (req.io) {
      req.io.to(chatId).emit("message", message);
    }

    res.json(message);
  } catch (err) {
    console.error("sendMessage error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// ---------- GET MESSAGES ----------
const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chat: chatId }) // ← use 'chat'
      .populate("sender", "name username profilePic publicKey")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ---------- FILE UPLOAD ----------
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "aegischat_files", resource_type: "auto" },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Upload failed" });
  }
};

// Add to chatController.js
const createGroup = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    if (!name || !participantIds?.length) {
      return res.status(400).json({ msg: "Name and participants required" });
    }

    // Generate group key
    const groupKeyRaw = crypto.getRandomValues(new Uint8Array(32));
    const groupKey = btoa(String.fromCharCode(...groupKeyRaw));

    const chat = new Chat({
      name,
      participants: [...participantIds, req.user._id],
      isGroup: true,
      groupKey,
      createdBy: req.user._id,
    });

    await chat.save();
    await chat.populate("participants", "name username profilePic");

    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// === ADD MEMBER ===
const addMember = async (req, res) => {
  try {
    const { id:chatId } = req.params;
    const { userId } = req.body;
    const chat = await Chat.findById(chatId);
    
    if (!chat || !chat.isGroup) return res.status(404).json({ msg: 'Group not found' });
    if (!chat.admins.includes(req.user._id)) return res.status(403).json({ msg: 'Admin only' });
    if (chat.participants.includes(userId)) return res.status(400).json({ msg: 'Already in group' });

    chat.participants.push(userId);
    await chat.save();
    await chat.populate('participants', 'name username profilePic publicKey');
    await chat.populate('admins', 'name');

    if (req.io) req.io.to(chatId).emit('memberAdded', { userId });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// === REMOVE MEMBER ===
const removeMember = async (req, res) => {
  try {
    const { id:chatId } = req.params;
    const { userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ msg: 'Group not found' });
    if (!chat.admins.includes(req.user._id)) return res.status(403).json({ msg: 'Admin only' });
    if (!chat.participants.includes(userId)) return res.status(400).json({ msg: 'Not in group' });

    chat.participants.pull(userId);
    chat.admins.pull(userId);
    await chat.save();
    await chat.populate('participants', 'name username profilePic publicKey');
    await chat.populate('admins', 'name');

    if (req.io) req.io.to(chatId).emit('memberRemoved', { userId });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// === MAKE ADMIN ===
const makeAdmin = async (req, res) => {
  try {
    const { id:chatId } = req.params;
    const { userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ msg: 'Group not found' });
    if (!chat.admins.includes(req.user._id)) return res.status(403).json({ msg: 'Admin only' });
    if (!chat.participants.includes(userId)) return res.status(400).json({ msg: 'Not in group' });
    if (chat.admins.includes(userId)) return res.status(400).json({ msg: 'Already admin' });

    chat.admins.push(userId);
    await chat.save();
    await chat.populate('admins', 'name');

    if (req.io) req.io.to(chatId).emit('adminAdded', { userId });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// === LEAVE GROUP ===
const leaveGroup = async (req, res) => {
  try {
    const { id:chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ msg: 'Group not found' });
    if (!chat.participants.includes(req.user._id)) return res.status(400).json({ msg: 'Not in group' });

    // Last admin check
    if (chat.admins.includes(req.user._id) && chat.admins.length === 1) {
      return res.status(400).json({ msg: 'Last admin must transfer admin role first' });
    }

    chat.participants.pull(req.user._id);
    chat.admins.pull(req.user._id);
    await chat.save();

    if (req.io) req.io.to(chatId).emit('memberRemoved', { userId: req.user._id });
    res.json({ msg: 'Left group' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  createChat,
  getAllChats,
  sendMessage,
  getMessages,
  uploadFile,
  createGroup,
  addMember,
  removeMember,
  makeAdmin,
  leaveGroup,
};
