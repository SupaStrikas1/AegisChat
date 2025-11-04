const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const chatRoutes = require('./routes/chatRoutes');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = initSocket(server); // Get io instance

connectDB();

app.use(cors());
app.use(express.json());

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', chatRoutes);
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));