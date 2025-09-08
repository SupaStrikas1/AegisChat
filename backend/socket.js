const socketIo = require('socket.io');
const User = require('./models/User');

let io;

const initSocket = (server) => {
  io = socketIo(server, { cors: { origin: '*' } });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = await User.findById(decoded.id);
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    await User.findByIdAndUpdate(socket.user._id, { online: true });

    socket.join(socket.user._id.toString());  // For private notifications

    // Join all chats
    const chats = await Chat.find({ participants: socket.user._id });
    chats.forEach(chat => socket.join(chat._id.toString()));

    // Online status
    socket.on('online', (userId) => {
      io.to(userId).emit('onlineStatus', { userId: socket.user._id, online: true });
    });

    // Typing indicator
    socket.on('typing', ({ chatId }) => {
      socket.to(chatId).emit('typing', { userId: socket.user._id });
    });

    // New message (broadcast encrypted message)
    socket.on('newMessage', (message) => {
      io.to(message.chat).emit('newMessage', message);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      await User.findByIdAndUpdate(socket.user._id, { online: false, lastSeen: new Date() });
    });
  });
};

const getIo = () => io;

module.exports = { initSocket, getIo };