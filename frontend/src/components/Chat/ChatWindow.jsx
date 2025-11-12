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
import {
  decryptGroupMessage,
  decryptMessage,
  encryptGroupMessage,
  encryptMessage,
} from "../../utils/crypto";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

const SOCKET_URL = "http://localhost:5000";

const ChatWindow = ({ chat }) => {
  const chatId = chat._id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState([]);

  const myPrivateKey = localStorage.getItem("privateKey"); // set on login
  const myPublicKey = localStorage.getItem("publicKey"); // set on login

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // === FETCH MESSAGES ===
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", chatId],
    queryFn: () => api.get(`/messages/${chatId}`).then((r) => r.data),
    enabled: !!chatId,
  });

  const uniqueMessages = messages.filter(
    (m, i, arr) => arr.findIndex((x) => x._id === m._id) === i
  );

  // === SEND MESSAGE (TEXT / IMAGE / FILE) ===
  const sendMessage = useMutation({
    mutationFn: async ({ content, type }) => {
      // Determine if content is text or file URL
      const isFile = type === "image" || type === "file";
      const isEncryptedText = type === "text" && content.trim();

      if (isEncryptedText) {
        // Encrypt text
        if (chat.isGroup) {
          const encrypted = await encryptGroupMessage(content, chat.groupKey);
          return api.post("/message", {
            chatId,
            content: encrypted.ciphertext,
            iv: encrypted.iv,
            senderPublicKey: myPublicKey,
            type: "encrypted",
          });
        } else {
          const recipient = chat.participants.find((p) => p._id !== user._id);
          const encrypted = await encryptMessage(
            content,
            recipient.publicKey,
            myPrivateKey
          );
          return api.post("/message", {
            chatId,
            content: encrypted.ciphertext,
            iv: encrypted.iv,
            senderPublicKey: myPublicKey,
            type: "encrypted",
          });
        }
      } else {
        // Send file/image URL directly
        return api.post("/message", {
          chatId,
          content,
          type,
        });
      }
    },
    onSuccess: (res, variables) => {
      const newMsg = {
        ...res.data,
        plaintext: variables.type === "text" ? variables.content : undefined,
      };
      queryClient.setQueryData(["messages", chatId], (old = []) => [
        ...old,
        newMsg,
      ]);
      setMessage("");
      setFile(null);
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
      const url = res.data.url;
      const type = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "image" : "file";
      sendMessage.mutate({ content: url, type });
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
      sendMessage.mutate({ content: message, type: "text" });
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

  const EncryptedMessageContent = ({
    msg,
    myPrivateKey,
    senderPublicKey,
    userId,
  }) => {
    const [decrypted, setDecrypted] = useState("Decrypting...");

    useEffect(() => {
      const decrypt = async () => {
        try {
          if (msg.sender._id === userId) {
            try {
              const receiverPublicKey = chat.participants.find(
                (u) => u._id !== userId
              )?.publicKey;

              const text = await decryptMessage(
                { content: msg.content, iv: msg.iv },
                receiverPublicKey,
                myPrivateKey
              );
              setDecrypted(text);
            } catch (e) {
              // If decryption fails, assume it's already plaintext
              setDecrypted(msg.content);
            }
            return;
          }

          const text = await decryptMessage(
            { content: msg.content, iv: msg.iv },
            senderPublicKey,
            myPrivateKey
          );
          setDecrypted(text);
        } catch (err) {
          setDecrypted("Failed to decrypt");
        }
      };
      if (myPrivateKey && senderPublicKey) {
        decrypt();
      }
    }, [msg, myPrivateKey, senderPublicKey]);

    return (
      <p className="break-all text-sm sm:text-base text-white">{decrypted}</p>
    );
  };

  const GroupEncryptedMessage = ({ msg, groupKey }) => {
    const [text, setText] = useState("Decrypting...");

    useEffect(() => {
      const decrypt = async () => {
        try {
          const decrypted = await decryptGroupMessage(msg, groupKey);
          setText(decrypted);
        } catch (err) {
          setText("[Failed]");
        }
      };
      if (groupKey) decrypt();
    }, [msg, groupKey]);

    return <p className="break-all text-sm sm:text-base text-white">{text}</p>;
  };

  // Fetch friends once
  useEffect(() => {
    if (chat.isGroup && chat.admins?.includes(user._id)) {
      api.get("/user/friends").then((r) => setFriends(r.data));
    }
  }, [chat.isGroup, user._id]);

  // Filter friends not in group
  const filteredFriends = (friends || []).filter(
    (f) =>
      !chat.participants.some((p) => p._id === f._id) &&
      f?.username?.toLowerCase?.().includes(searchQuery.toLowerCase())
  );

  // Add member
  const handleAddMember = async (friendId) => {
    try {
      await api.post(`/chat/${chatId}/add`, { userId: friendId });
      queryClient.invalidateQueries(["chats"]);
      setSearchQuery("");
    } catch (err) {
      alert(err.response?.data?.msg || "Failed to add");
    }
  };

  if (!chat) return <div className="p-4 text-center">Loading...</div>;

  const otherUser = chat.isGroup
    ? null
    : chat.participants.find((p) => p._id !== user._id);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-[#0a0a0a] border-b border-[#262626] px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center flex-1 min-w-0">
          <div className="relative">
            <img
              src={
                otherUser?.profilePic
                  ? otherUser.profilePic
                  : "/placeholder.svg"
              }
              alt={otherUser?.name || chat.name}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover mr-3"
            />
            <div className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-[#fafafa] text-sm sm:text-base truncate">
              {otherUser?.name || chat.name}
            </h3>
            <p className="text-xs text-[#a1a1a1]">
              <span className="flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-[#a1a1a1] rounded-full animate-pulse" />
                {typing
                  ? "typing..."
                  : otherUser?.online
                  ? "Online"
                  : "Offline"}
              </span>
            </p>
          </div>
        </div>
        {chat.isGroup && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowLeaveModal(true)}
              className="p-2 bg-gradient-to-r from-[#e7000b] to-[#e7000b]/80 text-[#0a0a0a] font-medium rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 active:scale-95 text-sm sm:text-base"
            >
              Leave
            </button>
            {/* Manage Button (existing) */}
            <button
              onClick={() => setShowAdminModal(true)}
              className="p-2 bg-gradient-to-r from-[#009a83] to-[#009a83]/80 text-[#0a0a0a] font-medium rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 active:scale-95 text-sm sm:text-base"
            >
              Manage
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {uniqueMessages.map((msg) => {
          const isMine = msg.sender._id === user._id;
          const isEncrypted = msg.type === "encrypted";

          return (
            <div
              key={msg._id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex gap-2 max-w-xs sm:max-w-md lg:max-w-lg xl:max-w-xl ${
                  isMine ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Sender name for others */}
                {!isMine && (
                  <img
                    src={msg.sender.profilePic || "/placeholder.svg"}
                    alt={msg.sender.name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                )}

                <div
                  className={`flex flex-col ${
                    isMine ? "items-end" : "items-start"
                  }`}
                >
                  {!isMine && (
                    <p className="text-xs font-medium text-[#a1a1a1] mb-1">
                      {msg.sender.name}
                    </p>
                  )}
                  {/* ==== AUTO-DECRYPT ==== */}
                  <div
                    className={`px-4 py-3 rounded-2xl break-words ${
                      isMine
                        ? "bg-[#365db7] text-[#fafafa] rounded-br-none"
                        : "bg-[#262626] text-[#fafafa] rounded-bl-none"
                    }`}
                  >
                    {isEncrypted ? (
                      chat.isGroup ? (
                        <GroupEncryptedMessage
                          msg={msg}
                          groupKey={chat.groupKey}
                        />
                      ) : (
                        <EncryptedMessageContent
                          msg={msg}
                          myPrivateKey={myPrivateKey}
                          senderPublicKey={msg.senderPublicKey}
                          userId={user._id}
                        />
                      )
                    ) : msg.type === "image" ? (
                      <img
                        src={msg.content}
                        alt=""
                        className="rounded max-w-full"
                      />
                    ) : msg.type === "file" ? (
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
                      <p className="break-all text-sm sm:text-base text-white">
                        {msg.content}
                      </p>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {file && (
        <div className="mx-4 sm:mx-6 mb-4 p-3 bg-[#262626] rounded-lg flex items-center justify-between border border-[#a1a1a1]">
          <span className="text-sm text-[#fafafa] truncate">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
          <button
            onClick={() => {
              setFile(null);
              fileInputRef.current.value = "";
            }}
            className="text-[#e7000b] hover:text-[#e7000b]/60 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#0a0a0a] border-t border-[#262626] px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFile}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-[#262626] text-[#a1a1a1] hover:text-[#fafafa] rounded-full transition-all"
          >
            <PaperClipIcon className="h-6 w-6" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 sm:py-3 bg-[#262626] border border-[#262626] rounded-full text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-[#365db7] transition-all text-sm sm:text-base"
          />
          <button
            onClick={handleSend}
            disabled={sendMessage.isPending || uploadFileMut.isPending}
            className="p-2.5 sm:p-3 bg-[#365db7] text-[#fafafa] rounded-full hover:bg-[#365db7]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626]/50 rounded-lg shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#82181a]/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-[#82181a]" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-[#fafafa]">Leave Group?</h2>
                <p className="text-sm text-[#a1a1a1] mt-1">
                  You will be removed from this group and lose access to messages.
                </p>
              </div>
            </div>
            {chat.admins.includes(user._id) && chat.admins.length === 1 && (
              <div className="bg-[#82181a]/10 border border-[#82181a]/30 rounded-lg p-4 mt-1">
                <p className="text-sm text-[#82181a] font-medium">
                  You are the last admin. Please transfer admin role to another member before leaving.
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 px-4 py-2.5 bg-[#0a0a0a] text-[#a1a1a1] hover:bg-muted/80 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  api.post(`/chat/${chatId}/leave`).then(() => {
                    queryClient.invalidateQueries(["chats"]);
                    navigate("/chats");
                  })
                }
                disabled={
                  chat.admins.includes(user._id) && chat.admins.length === 1
                }
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#82181a] to-[#82181a]/80 text-[#e7000b] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-all"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg w-full max-w-md p-6 sm:p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-white">
              Group Members
            </h3>

            {/* === ADD MEMBER INPUT === */}
            {chat.admins?.includes(user._id) && (
              <div className="mb-4 p-3 bg-[#0a0a0a] border border-[#262626] rounded-md">
                <input
                  type="text"
                  placeholder="Search friends by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#262626] rounded-lg text-[#fafafa] placeholder-[#a1a1a1] focus:outline-none focus:border-[#009a83] focus:ring-2 focus:ring-[#009a83]/20 transition-all duration-300"
                />
                {searchQuery && filteredFriends.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend._id}
                        className="w-full flex items-center justify-between p-3 hover:bg-[#0a0a0a]/50 transition-colors text-left border-b border-[#262626]/50 last:border-0 bg-[#0a0a0a]"
                        onClick={() => handleAddMember(friend._id)}
                      >
                        <div>
                          <p className="font-medium text-sm text-white">
                            {friend.name}
                          </p>
                          <p className="text-xs text-[#a1a1a1]">
                            @{friend.username}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[#009a83] bg-[#009a83]/10 px-2 py-1 rounded">
                          Add
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* === MEMBER LIST === */}
            {chat.participants.map((p) => {
              const isAdmin = chat.admins?.includes(p._id);
              const isMe = p._id === user._id;
              const isCreator = chat.createdBy === p._id;

              return (
                <div
                  key={p._id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <img
                      src={p.profilePic || "/placeholder.svg"}
                      alt={p.name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                    <span className="font-medium text-sm truncate text-white">
                      {p.name}
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-200 px-2 py-1 rounded-full border border-blue-500/30">
                        Admin
                      </span>
                    )}
                    {isCreator && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 px-2 py-1 rounded-full border border-purple-500/30">
                        Creator
                      </span>
                    )}
                  </div>
                  {chat.admins.includes(user._id) && !isMe && (
                    <div className="flex space-x-1">
                      {!isAdmin && (
                        <button
                          onClick={() =>
                            api
                              .post(`/chat/${chatId}/make-admin`, {
                                userId: p._id,
                              })
                              .then(() =>
                                queryClient.invalidateQueries(["chats"])
                              )
                          }
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          Make Admin
                        </button>
                      )}
                      <button
                        onClick={() =>
                          api
                            .post(`/chat/${chatId}/remove`, { userId: p._id })
                            .then(() =>
                              queryClient.invalidateQueries(["chats"])
                            )
                        }
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => {
                setShowAdminModal(false);
                setSearchQuery("");
              }}
              className="flex-1 w-full px-4 py-2 sm:py-3 bg-[#262626] hover:bg-[#262626]/80 text-[#fafafa] rounded-lg font-medium transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
