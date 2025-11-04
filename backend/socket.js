const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: 'http://localhost:3000' },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded.user;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('joinChat', (chatId) => socket.join(chatId));
    socket.on('leaveChat', (chatId) => socket.leave(chatId));

    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(chatId).emit('typing', { userId: socket.user.id, isTyping });
    });
  });

  return io; // Return io so we can attach it in server.js
};

module.exports = { initSocket };