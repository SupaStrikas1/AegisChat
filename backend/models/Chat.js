const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String }, // For group chats
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    groupKey: {
      type: String,
      required: function () {
        return this.isGroup;
      },
    }, // ← NEW: AES-GCM key (base64) for group
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chat", chatSchema);
