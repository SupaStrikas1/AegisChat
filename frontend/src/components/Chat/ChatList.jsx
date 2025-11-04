import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

const ChatList = ({ onSelectChat, selectedChatId }) => {
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: () => api.get('/chat').then(res => res.data),
  });

  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <>
      <div className="p-4 border-b border-gray-300 dark:border-gray-700">
        <h2 className="text-xl font-bold flex items-center">
          <ChatBubbleLeftIcon className="h-6 w-6 mr-2 text-blue-600" />
          Chats
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No chats yet</div>
        ) : (
          <ul>
            {chats.map((chat) => {
              const other = chat.isGroup
                ? null
                : chat.participants.find(p => p._id !== user._id);
              const title = chat.isGroup ? chat.name : other?.name || 'Unknown';
              const avatar = other?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=3b82f6&color=fff`;

              return (
                <li
                  key={chat._id}
                  onClick={() => onSelectChat(chat)}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition ${
                    selectedChatId === chat._id ? 'bg-blue-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <img
                      src={avatar}
                      alt={title}
                      className="w-12 h-12 rounded-full mr-3"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {title}
                      </h3>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage.type === 'image' ? '[Image]' : chat.lastMessage.content}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
};

export default ChatList;