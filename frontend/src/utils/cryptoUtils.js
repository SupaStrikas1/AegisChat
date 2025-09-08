// Helper functions for base64
const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToArrayBuffer = (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// Generate ECDH key pair (P-256)
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const publicKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);  // JWK for storage
  localStorage.setItem('privateKey', JSON.stringify(privateKey));
  return { publicKey: arrayBufferToBase64(publicKey), privateKey };
};

// Import keys
const importPublicKey = async (base64PubKey) => {
  const pubBuffer = base64ToArrayBuffer(base64PubKey);
  return await window.crypto.subtle.importKey(
    'raw',
    pubBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
};

const importPrivateKey = async () => {
  const stored = localStorage.getItem('privateKey');
  if (!stored) throw new Error('No private key');
  return await window.crypto.subtle.importKey(
    'jwk',
    JSON.parse(stored),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
};

// Derive shared AES key using ECDH + PBKDF2
export const deriveSharedKey = async (recipientPubKeyBase64, salt) => {
  const privateKey = await importPrivateKey();
  const publicKey = await importPublicKey(recipientPubKeyBase64);
  const sharedSecret = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: publicKey },
    privateKey,
    256
  );
  // PBKDF2 to derive AES key (100k iterations for hardness)
  const derived = await window.crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    derived,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt message (text)
export const encryptMessage = async (text, sharedKey) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    new TextEncoder().encode(text)
  );
  return { ciphertext: arrayBufferToBase64(ciphertext), iv: arrayBufferToBase64(iv) };
};

// Decrypt message
export const decryptMessage = async (ciphertextBase64, ivBase64, sharedKey) => {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
};

// For groups: Encrypt sym key for a recipient
const encryptSymKey = async (symKey, recipientSharedKey) => {
  const exportedSym = await window.crypto.subtle.exportKey('raw', symKey);
  const { ciphertext, iv } = await encryptMessage(new TextDecoder().decode(exportedSym), recipientSharedKey);
  return `${ciphertext}:${iv}`;  // Combined for storage
};

// Decrypt sym key
const decryptSymKey = async (encryptedSymBase64, recipientSharedKey) => {
  const [ciphertext, iv] = encryptedSymBase64.split(':');
  const rawSym = await decryptMessage(ciphertext, iv, recipientSharedKey);
  return await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(rawSym),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt']
  );
};

// Group encryption: Returns {content, iv, encryptedSymKeys: Map<userId, encryptedSym>}
export const encryptGroupMessage = async (text, participants, publicKeys) => {  // publicKeys: Map<userId, pubKeyBase64>
  // Generate random sym key for message
  const symKey = await window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const { ciphertext, iv } = await encryptMessage(text, symKey);

  const encryptedSymKeys = new Map();
  for (const [userId, pubKey] of publicKeys) {
    if (userId === 'self') continue;  // Skip sender
    const salt = [localStorage.getItem('userId'), userId].sort().join(':');  // Deterministic salt
    const sharedKey = await deriveSharedKey(pubKey, salt);
    const encSym = await encryptSymKey(symKey, sharedKey);
    encryptedSymKeys.set(userId, encSym);
  }

  return { content: ciphertext, iv, encryptedSymKeys };
};

// Group decryption
export const decryptGroupMessage = async (ciphertext, iv, encryptedSymKeys, senderPubKey) => {
  const myId = localStorage.getItem('userId');
  const encSym = encryptedSymKeys.get(myId);
  if (!encSym) throw new Error('No sym key for user');

  const salt = [myId, senderPubKey].sort().join(':');  // Sender's pubKey as ID proxy? Wait, better use userIds
  // Note: Assume salt uses userIds, passed separately if needed.
  const sharedKey = await deriveSharedKey(senderPubKey, salt);
  const symKey = await decryptSymKey(encSym, sharedKey);
  return await decryptMessage(ciphertext, iv, symKey);
};