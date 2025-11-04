import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import ChatList from "../components/Chat/ChatList";
import ChatWindow from "../components/Chat/ChatWindow";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const ChatsPage = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const isDesktop = useMediaQuery({ query: "(min-width: 768px)" }); // md

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Chat List */}
      <div
        className={`${
          isDesktop
            ? "w-80 border-r border-gray-300 dark:border-gray-700"
            : selectedChat
            ? "hidden"
            : "w-full"
        } bg-white dark:bg-gray-800 flex flex-col`}
      >
        <ChatList
          onSelectChat={handleSelectChat}
          selectedChatId={selectedChat?._id}
        />
      </div>

      {/* Chat Window */}
      <div
        className={`${
          isDesktop ? "flex-1" : selectedChat ? "w-full" : "hidden"
        } flex flex-col`}
      >
        {!isDesktop && selectedChat && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 p-4 flex items-center">
            <button onClick={handleBack} className="mr-3">
              <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
            <h3 className="font-semibold text-lg">
              {selectedChat.isGroup
                ? selectedChat.name
                : selectedChat.participants.find(
                    (p) =>
                      p._id !== JSON.parse(localStorage.getItem("user"))._id
                  )?.name}
            </h3>
          </div>
        )}
        {selectedChat ? (
          <ChatWindow chat={selectedChat} /> // ← Pass full chat
        ) : isDesktop ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ChatsPage;
