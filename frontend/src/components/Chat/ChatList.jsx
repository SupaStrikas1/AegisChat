import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/solid';

const ChatList = () => {
  const navigate = useNavigate();

  // Fetch chats (v5 syntax)
  const { data: chats, isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.get('/chat').then((res) => res.data),
  });

  return (
    <div className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <ChatBubbleLeftIcon className="h-8 w-8 text-blue-500 mr-2" />
          <h2 className="text-2xl font-bold">Chats</h2>
        </div>
        {isLoading ? (
          <p>Loading...</p>
        ) : chats?.length ? (
          <ul className="space-y-4">
            {chats.map((chat) => (
              <li
                key={chat._id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200"
                onClick={() => navigate(`/chat/${chat._id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {chat.isGroup
                        ? chat.name
                        : chat.participants.find((p) => p._id !== localStorage.getItem('userId'))
                            ?.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {chat.lastMessage ? (
                        chat.lastMessage.content.startsWith('http') ? (
                          '[Media]'
                        ) : (
                          chat.lastMessage.content.length > 30
                            ? chat.lastMessage.content.substring(0, 30) + '...'
                            : chat.lastMessage.content
                        )
                      ) : (
                        'No messages yet'
                      )}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(chat.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No chats yet. Start a new one!</p>
        )}
      </div>
    </div>
  );
};

export default ChatList;