import { useState, useEffect, useRef, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import io from "socket.io-client";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import {
  PaperClipIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  PhotoIcon,
  DocumentIcon,
} from "@heroicons/react/24/solid";

const SOCKET_URL = "http://localhost:5000";

const ChatWindow = ({ chat }) => {
  const chatId = chat._id;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // === FETCH MESSAGES ===
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: () => api.get(`/messages/${chatId}`).then((r) => r.data),
    enabled: !!chatId,
  });

  // === SEND TEXT MESSAGE ===
  const sendText = useMutation({
    mutationFn: (content) =>
      api.post("/message", { chatId, content, type: "text" }),
    onSuccess: (res) => {
      queryClient.setQueryData(["messages", chatId], (old) => [
        ...old,
        res.data,
      ]);
      setMessage("");
    },
  });

  // === UPLOAD FILE ===
  const uploadFileMut = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post("/message/upload", fd);
    },
    onSuccess: (res) => {
      sendText.mutate(res.data.url);
      setFile(null);
    },
  });

  // === SOCKET.IO ===
  useEffect(() => {
    const sk = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
    });

    sk.on("connect", () => sk.emit("joinChat", chatId));
    sk.on("message", (msg) => {
      queryClient.setQueryData(["messages", chatId], (old) => [...old, msg]);
    });
    sk.on("typing", ({ userId, isTyping }) => {
      if (userId !== user._id) setTyping(isTyping);
    });

    setSocket(sk);

    return () => {
      sk.emit("leaveChat", chatId);
      sk.disconnect();
    };
  }, [chatId, user._id, queryClient]);

  // === TYPING INDICATOR ===
  useEffect(() => {
    if (!socket || !message) return;
    socket.emit("typing", { chatId, isTyping: true });
    const timeout = setTimeout(
      () => socket.emit("typing", { chatId, isTyping: false }),
      1000
    );
    return () => clearTimeout(timeout);
  }, [message, socket, chatId]);

  const handleSend = () => {
    if (!message.trim() && !file) return;
    if (file) {
      uploadFileMut.mutate(file);
    } else {
      sendText.mutate(message);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f && f.size > 10 * 1024 * 1024) {
      alert("File must be < 10MB");
      return;
    }
    setFile(f);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!chat) return <div className="p-4 text-center">Loading...</div>;

  const otherUser = chat.isGroup
    ? null
    : chat.participants.find((p) => p._id !== user._id);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex items-center">
        <div className="flex items-center flex-1">
          {otherUser?.profilePic ? (
            <img
              src={otherUser.profilePic}
              alt=""
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3 text-sm">
              {otherUser?.name[0]}
            </div>
          )}
          <div>
            <h3 className="font-semibold">{otherUser?.name || chat.name}</h3>
            <p className="text-xs text-gray-500">
              {typing ? "typing..." : otherUser?.online ? "Online" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMine = msg.sender._id === user._id;
          const isImage = msg.type === "image";
          const isFile = msg.type === "file";

          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isMine
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                }`}
              >
                {!isMine && (
                  <p className="text-xs font-medium">{msg.sender.name}</p>
                )}
                {isImage ? (
                  <img
                    src={msg.content}
                    alt=""
                    className="rounded max-w-full"
                  />
                ) : isFile ? (
                  <a
                    href={msg.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-300 underline"
                  >
                    <DocumentIcon className="h-5 w-5 mr-1" />
                    {msg.content.split("/").pop()}
                  </a>
                ) : (
                  <p>{msg.content}</p>
                )}
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {file && (
        <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 flex items-center justify-between">
          <span className="text-sm truncate max-w-xs">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
          <button
            onClick={() => {
              setFile(null);
              fileInputRef.current.value = "";
            }}
            className="text-red-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFile}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-600 hover:text-blue-500"
          >
            <PaperClipIcon className="h-6 w-6" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 p-3 border rounded-full dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={sendText.isPending || uploadFileMut.isPending}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
