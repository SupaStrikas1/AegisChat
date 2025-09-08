const crypto = require('crypto');

// Example: Derive key (but most crypto is client-side)
const deriveKey = (sharedSecret, salt) => {
  return crypto.pbkdf2Sync(sharedSecret, salt, 100000, 32, 'sha256');
};

module.exports = { deriveKey };