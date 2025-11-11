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

  // === SEND TEXT MESSAGE ===

  const sendText = useMutation({
    mutationFn: async (content) => {
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
    },
    onSuccess: (res, sentMessage) => {
      const newMsg = {
        ...res.data,
        plaintext: sentMessage,
      };
      queryClient.setQueryData(["messages", chatId], (old = []) => [
        ...old,
        newMsg,
      ]);
      setMessage("");
    },
  });

  // const sendText = useMutation({
  //   mutationFn: (content) =>
  //     api.post("/message", { chatId, content, type: "text" }),
  //   onSuccess: (res) => {
  //     queryClient.setQueryData(["messages", chatId], (old) => [
  //       ...old,
  //       res.data,
  //     ]);
  //     setMessage("");
  //   },
  // });

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

    return <p className="break-all text-sm sm:text-base text-white">{decrypted}</p>;
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
                      <p className="break-all text-sm sm:text-base text-white">{msg.content}</p>
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
            disabled={sendText.isPending || uploadFileMut.isPending}
            className="p-2.5 sm:p-3 bg-[#365db7] text-[#fafafa] rounded-full hover:bg-[#365db7]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
            <p>Leave group?</p>
            {chat.admins.includes(user._id) && chat.admins.length === 1 && (
              <p className="text-red-500 text-sm">
                You are the last admin. Transfer admin role first.
              </p>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2"
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
                className="px-4 py-2 bg-red-500 text-white rounded-md disabled:opacity-50"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Group Members</h3>

            {/* === ADD MEMBER INPUT === */}
            {chat.admins?.includes(user._id) && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                <input
                  type="text"
                  placeholder="Search friends by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full p-2 border rounded dark:bg-gray-600 dark:border-gray-500"
                />
                {searchQuery && filteredFriends.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded">
                    {filteredFriends.map((friend) => (
                      <div
                        key={friend._id}
                        className="flex items-center justify-between p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer"
                        onClick={() => handleAddMember(friend._id)}
                      >
                        <span>
                          {friend.name} (@{friend.username})
                        </span>
                        <span className="text-green-500 text-xs">Add</span>
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
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-300 mr-2" />
                    <span>{p.name}</span>
                    {isAdmin && (
                      <span className="ml-1 text-xs text-green-600">Admin</span>
                    )}
                    {isCreator && (
                      <span className="ml-1 text-xs text-purple-600">
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
                          className="text-xs text-blue-500"
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
                        className="text-xs text-red-500"
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
              className="mt-4 w-full py-2 bg-gray-300 rounded-md"
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
