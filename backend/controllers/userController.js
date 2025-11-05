const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");
const admin = require("firebase-admin"); // For notifications
require("dotenv").config();

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { name, username, bio, interests, profilePic, fcmToken, publicKey } =
      req.body;
    const updates = { name, username, bio, interests, profilePic, fcmToken, publicKey };

    // Remove undefined fields
    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key]
    );

    // Check for username uniqueness
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        return res.status(400).json({ msg: "Username already exists" });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Update profile error:", err.message, err.stack);
    if (err.code === 11000) {
      return res.status(400).json({ msg: "Username already exists" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

// Send friend request
const sendFriendRequest = async (req, res) => {
  const { toId } = req.body;
  if (toId === req.user._id.toString())
    return res.status(400).json({ msg: "Cannot send to self" });

  try {
    const toUser = await User.findById(toId);
    if (!toUser) return res.status(404).json({ msg: "User not found" });

    if (req.user.friends.includes(toId))
      return res.status(400).json({ msg: "Already friends" });

    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user._id, to: toId, status: "pending" },
        { from: toId, to: req.user._id, status: "pending" },
      ],
    });
    if (existing) return res.status(400).json({ msg: "Request pending" });

    const request = new FriendRequest({ from: req.user._id, to: toId });
    await request.save();

    // Notify via Firebase
    if (toUser.fcmToken) {
      admin.messaging().send({
        token: toUser.fcmToken,
        notification: {
          title: "Friend Request",
          body: `${req.user.name} sent a friend request`,
        },
      });
    }

    res.json(request);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

const searchUsers = async (req, res) => {
  const { query } = req.params; // Changed to query for flexibility
  try {
    const users = await User.find({
      username: { $regex: query, $options: "i" },
      _id: { $ne: req.user._id },
    })
      .select("name username profilePic interests")
      .limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

const getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("interests friends");
    if (!user.interests.length) return res.json([]);

    const recommended = await User.aggregate([
      {
        $match: {
          _id: { $ne: user._id },
          friends: { $nin: [user._id] },
          interests: { $in: user.interests },
        },
      },
      {
        $addFields: {
          commonInterests: {
            $size: { $setIntersection: ["$interests", user.interests] },
          },
        },
      },
      { $sort: { commonInterests: -1 } },
      { $limit: 10 },
      { $project: { name: 1, username: 1, profilePic: 1, interests: 1 } },
    ]);

    res.json(recommended);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Accept friend request
const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== req.user._id.toString())
      return res.status(400).json({ msg: "Invalid" });

    request.status = "accepted";
    await request.save();

    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: req.user._id },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: request.from },
    });

    res.json({ msg: "Accepted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

// Get friends list
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "name email profilePic online"
    );
    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({ to: req.user._id })
      .populate("from", "name username profilePic")
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

const rejectFriendRequest = async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await FriendRequest.findById(requestId);
    if (!request || request.to.toString() !== req.user._id.toString()) {
      return res.status(400).json({ msg: "Invalid request" });
    }
    request.status = "rejected";
    await request.save();
    res.json({ msg: "Request rejected" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  updateProfile,
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
  searchUsers,
  getRecommendations,
  getFriendRequests,
  rejectFriendRequest,
};
