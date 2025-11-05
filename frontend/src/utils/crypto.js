// utils/crypto.js
import { v4 as uuidv4 } from "uuid";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const fromB64 = (b64) => {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.error("Base64 decode failed:", b64, e);
    throw e;
  }
};

const toB64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Generate key pair (once on signup/login)
export const generateKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKey))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKey))),
  };
};

// Derive shared secret
const deriveSharedSecret = async (myPrivateKeyB64, theirPublicKeyB64) => {
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    fromB64(myPrivateKeyB64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );

  const publicKey = await crypto.subtle.importKey(
    "spki",
    fromB64(theirPublicKeyB64),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// Encrypt message
export const encryptMessage = async (
  text,
  recipientPublicKeyB64,
  myPrivateKeyB64
) => {
  const sharedKey = await deriveSharedSecret(
    myPrivateKeyB64,
    recipientPublicKeyB64
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = encoder.encode(text);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    data
  );

  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
};

// Decrypt message
export const decryptMessage = async (
  msg,
  senderPublicKeyB64,
  myPrivateKeyB64
) => {
  try {
    const sharedKey = await deriveSharedSecret(
      myPrivateKeyB64,
      senderPublicKeyB64
    );
    const iv = fromB64(msg.iv);
    const ciphertext = fromB64(msg.content);

    if (iv.length !== 12) throw new Error("Invalid IV length");

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      sharedKey,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  } catch (err) {
    console.error("decryptMessage failed:", err);
    return "[Failed to decrypt]";
  }
};
