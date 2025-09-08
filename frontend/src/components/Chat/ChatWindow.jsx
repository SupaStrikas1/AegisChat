import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { getSocket } from '../../services/socketService';
import { encryptMessage, decryptMessage, encryptGroupMessage, decryptGroupMessage, deriveSharedKey } from '../../utils/cryptoUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

const ChatWindow = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const socket = getSocket();

  // Fetch messages
  const { data } = useQuery(['messages', chatId], () => api.get(`/messages/${chatId}`).then(res => res.data));

  // Fetch chat details for participants and public keys
  const { data: chat } = useQuery(['chat', chatId], () => api.get(`/chat/${chatId}`).then(res => res.data));

  useEffect(() => {
    if (data) {
      // Decrypt messages
      const decryptAll = async () => {
        const decrypted = await Promise.all(data.map(async msg => {
          try {
            if (msg.type !== 'text') return msg;  // Media not encrypted here (for simplicity)
            let sharedKey;
            if (!chat.isGroup) {
              // 1-1: Derive with sender or recipient
              const otherId = msg.sender._id === localStorage.getItem('userId') ? chat.participants[1].publicKey : msg.sender.publicKey;
              const salt = [localStorage.getItem('userId'), msg.sender._id].sort().join(':');
              sharedKey = await deriveSharedKey(otherId, salt);
              const text = await decryptMessage(msg.content, msg.iv, sharedKey);
              return { ...msg, content: text };
            } else {
              // Group
              const text = await decryptGroupMessage(msg.content, msg.iv, msg.encryptedSymKeys, msg.senderPublicKey);
              return { ...msg, content: text };
            }
          } catch (err) {
            return { ...msg, content: '[Decryption Failed]' };
          }
        }));
        setMessages(decrypted);
      };
      decryptAll();
    }
  }, [data, chat]);

  // Real-time
  useEffect(() => {
    socket.on('newMessage', (msg) => {
      // Decrypt and add
      // Similar to above...
      setMessages(prev => [...prev, msg]);  // Placeholder: add decryption
    });

    socket.on('typing', () => setTyping(true));

    return () => {
      socket.off('newMessage');
      socket.off('typing');
    };
  }, [socket]);

  // Send message mutation
  const sendMutation = useMutation(async ({ type, content, iv, encryptedSymKeys }) => {
    const res = await api.post('/message', { chatId, type, content, iv, encryptedSymKeys });
    socket.emit('newMessage', res.data);
  });

  const handleSend = async () => {
    if (!input) return;
    let payload;
    if (!chat.isGroup) {
      // 1-1
      const otherParticipant = chat.participants.find(p => p._id !== localStorage.getItem('userId'));
      const salt = [localStorage.getItem('userId'), otherParticipant._id].sort().join(':');
      const sharedKey = await deriveSharedKey(otherParticipant.publicKey, salt);
      const { ciphertext, iv } = await encryptMessage(input, sharedKey);
      payload = { type: 'text', content: ciphertext, iv, encryptedSymKeys: null };
    } else {
      // Group
      const publicKeys = new Map(chat.participants.map(p => [p._id, p.publicKey]));
      const { content, iv, encryptedSymKeys } = await encryptGroupMessage(input, chat.participants, publicKeys);
      payload = { type: 'text', content, iv, encryptedSymKeys };
    }
    sendMutation.mutate(payload);
    setInput('');
  };

  // File upload (image/file)
  const handleFile = async (e) => {
    const file = e.target.files[0];
    const storageRef = ref(storage, `media/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    // For E2EE media: Could encrypt file client-side, but for simplicity, store URL (assume Firebase security rules protect)
    sendMutation.mutate({ type: file.type.startsWith('image') ? 'image' : 'file', content: url, iv: null, encryptedSymKeys: null });
  };

  // Typing
  const handleTyping = () => {
    socket.emit('typing', { chatId });
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(msg => (
          <div key={msg._id} className="mb-2">
            <span>{msg.sender.name}: </span>
            {msg.type === 'text' ? msg.content : <a href={msg.content}>Download</a>}
          </div>
        ))}
        {typing && <div>Typing...</div>}
      </div>
      <input type="file" onChange={handleFile} />
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleTyping}
        className="border p-2"
      />
      <button onClick={handleSend} className="bg-blue-500 text-white p-2">Send</button>
    </div>
  );
};

export default ChatWindow;