const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register user
const register = async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    // Validate input
    if (!name || !username || !email || !password) {
      return res
        .status(400)
        .json({ msg: "Name, username, email, and password are required" });
    }

    // Check for existing user
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({
        msg:
          user.email === email
            ? "Email already exists"
            : "Username already exists",
      });
    }

    // Let Mongoose pre('save') hash the password
    user = new User({ name, username, email, password }); // ← plain password
    await user.save();

    // Generate JWT
    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Register error:", err.message, err.stack);
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Email or username already exists" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password are required" });
    }

    // Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Generate JWT
    const payload = { user: { id: user._id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message, err.stack);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("GetMe error:", err.message, err.stack);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = { register, login, getMe };