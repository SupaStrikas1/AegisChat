const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "file", "encrypted"],
      default: "text",
    },
    content: { type: String, required: true }, // Ciphertext (base64) for text; URL for media (encrypted if needed, but for simplicity, media URLs are public in Firebase)
    iv: {
      type: String,
      required: function () {
        return this.type === "encrypted";
      },
    }, // Base64 IV for AES-GCM
    senderPublicKey: {
      type: String,
      required: function () {
        return this.type === "encrypted";
      },
    }, // Base64, for verification
    encryptedSymKeys: { type: Map, of: String }, // For groups: userId -> base64 encrypted sym key
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
