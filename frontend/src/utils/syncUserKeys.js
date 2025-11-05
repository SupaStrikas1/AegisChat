// utils/syncUserKeys.js
import { generateKeyPair } from "./crypto";
import api from "../services/api";

export const syncUserKeys = async (user) => {
  let publicKey = localStorage.getItem("publicKey");
  let privateKey = localStorage.getItem("privateKey");

  // If keys already exist locally
  if (publicKey && privateKey) {
    // Ensure DB public key matches
    if (user.publicKey !== publicKey) {
      await api.put("/user/profile", { publicKey });
    }
    return { publicKey, privateKey };
  }

  // Else generate new ones
  const { publicKey: newPub, privateKey: newPriv } = await generateKeyPair();

  await api.put("/user/profile", { publicKey: newPub });

  localStorage.setItem("publicKey", newPub);
  localStorage.setItem("privateKey", newPriv);

  return { publicKey: newPub, privateKey: newPriv };
};
