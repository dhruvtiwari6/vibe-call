import React, { useEffect, useState, useRef } from 'react'
import { Search, Send, Loader2 } from 'lucide-react'
import { userChatStore } from '@/store/chatStore';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  avatar: string | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  sender: User;
}

function UserChat() {
  const { currentChatId, prevChatId, setPrevChatId, currentUserId, cursor, setCursor } = userChatStore();
  const [page, setPage] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  console.log("current chat id in userchat : ", currentChatId);
  console.log("prev chat id in userchat : ", prevChatId);

  useEffect(() => {
    if (prevChatId !== currentChatId) {
      setPage(0);
      setMessages([]);
      setCursor("");
      setPrevChatId(currentChatId || "");
    }
  }, [currentChatId, prevChatId, setPrevChatId]);

useEffect(() => {
  const fetchChatData = async () => {
    if (!currentChatId || (page > 0 && !cursor)) return; // <- stop if no more data

    try {
      setLoading(true);
      const res = await axios.get(`/api/chats/${currentChatId}`, {
        params: {
          limit: 10,
          cursor: cursor === "" ? null : cursor,
        },
      });

      const newMessages = res.data.messages || []
      setMessages((prevMessages) => 

       [...prevMessages, ...newMessages]);

      setCursor(res.data.nextCursor || null);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchChatData();
}, [page, currentChatId]);


  const handleScroll = () => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    const scrollHeight = scrollContainerRef.current?.scrollHeight ?? 0;
    const clientHeight = scrollContainerRef.current?.clientHeight ?? 0;

    if (scrollTop + clientHeight + 2 >= scrollHeight!) {
      setPage((prevPage) => prevPage + 1);
    }
  }


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    console.log("Sending message:", messageInput);
    setMessageInput('');
  };

  if (!currentChatId) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50">
        <div className="text-center px-4">
          <div className="mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
              <Search className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
            Select a conversation
          </h3>
          <p className="text-sm sm:text-base text-gray-600 max-w-sm mx-auto">
            Choose a chat from the sidebar to start messaging
          </p>
          <p className="text-xs text-gray-500 mt-4 md:hidden">
            Tap the menu button to see conversations
          </p>
        </div>
      </div>
    );
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {messages.length > 0 ? (
          messages.map((message) => {
            const isCurrentUser = message.senderId === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 animate-fadeIn ${isCurrentUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar - only show for other users */}
                {!isCurrentUser && (
                  <div className="flex-shrink-0">
                    {message.sender.avatar ? (
                      <img
                        src={message.sender.avatar}
                        alt={message.sender.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-white shadow-sm">
                        <span className="text-white text-sm font-semibold">
                          {message.sender.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className={`flex-1 min-w-0 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-gray-900 text-sm">
                      {isCurrentUser ? 'You' : message.sender.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className={`${isCurrentUser
                      ? 'bg-blue-600 text-white rounded-lg rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-lg rounded-tl-none border border-gray-200'
                    } px-4 py-2 shadow-sm`}>
                    <p className="text-sm break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm"
          />
          <button
            type="submit"
            disabled={!messageInput.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserChat