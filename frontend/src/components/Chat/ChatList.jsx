import { useQuery } from "@tanstack/react-query"
import api from "../../services/api"
import { ChatBubbleLeftIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline"
import { useState, useMemo } from "react"

const ChatList = ({ onSelectChat, selectedChatId }) => {
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: () => api.get("/chat").then((res) => res.data),
  })

  const user = JSON.parse(localStorage.getItem("user"))

  const [searchQuery, setSearchQuery] = useState("")

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats

    return chats.filter((chat) => {
      const other = chat.isGroup ? null : chat.participants.find((p) => p._id !== user._id)
      const title = chat.isGroup ? chat.name : other?.name || "Unknown"
      return title.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [chats, searchQuery, user._id])

  return (
    <>
      <div className="border-b border-[#262626] bg-[#0a0a0a] p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-[#365db7]/20">
            <ChatBubbleLeftIcon className="h-5 w-5 text-[#365db7]" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#fafafa]">Chats</h2>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#a1a1a1]" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0a0a0a] border border-[#262626] rounded-lg text-[#fafafa] text-sm placeholder-[#a1a1a1] focus:outline-none focus:ring-2 focus:ring-[#365db7]/50 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {isLoading ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#262626] border-t-[#365db7] mb-3"></div>
            <p className="text-[#a1a1a1] text-sm">Loading chats...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <ChatBubbleLeftIcon className="h-12 w-12 text-[#262626] mb-3" />
            <p className="text-[#a1a1a1] text-sm">{searchQuery ? "No chats found" : "No chats yet"}</p>
            <p className="text-[#a1a1a1] text-xs mt-1">Start a conversation to begin</p>
          </div>
        ) : (
          <ul className="space-y-2 p-3 sm:p-4">
            {filteredChats.map((chat) => {
              const other = chat.isGroup ? null : chat.participants.find((p) => p._id !== user._id)
              const title = chat.isGroup ? chat.name : other?.name || "Unknown"
              const avatar =
                other?.profilePic ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=0066ff&color=fff`

              const isSelected = selectedChatId === chat._id

              return (
                <li
                  key={chat._id}
                  onClick={() => onSelectChat(chat)}
                  className={`group relative p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "bg-[#365db7]/20 border border-[#365db7]/30 shadow-lg shadow-[#365db7]/10"
                      : "border border-[#262626] bg-[#0a0a0a]/40 hover:bg-[#0a0a0a]/30 hover:border-[#365db7]/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      <img
                        src={avatar || "/placeholder.svg"}
                        alt={title}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-[#262626]/50"
                      />
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-[#009a83] rounded-full border-2 border-[#0a0a0a]"></div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[#fafafa] truncate text-sm sm:text-base">{title}</h3>
                        <span className="text-xs text-[#a1a1a1] flex-shrink-0">Just now</span>
                      </div>

                      {chat.lastMessage && (
                        <p className="text-xs sm:text-sm text-[#a1a1a1] truncate">
                          {chat.lastMessage.type === "image" ? (
                            <span className="flex items-center gap-1">
                              📷 <span>Image</span>
                            </span>
                          ) : (
                            chat.lastMessage.content
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 h-2 w-2 bg-[#365db7] rounded-full animate-pulse"></div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

export default ChatList
