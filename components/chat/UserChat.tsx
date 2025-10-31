import React, { useEffect, useState, useRef } from 'react'
import { Search, Send, Loader2, X, UserPlus, UserMinus, Shield, LogOut } from 'lucide-react'
import { userChatStore } from '@/store/chatStore';
import axios from 'axios';
import { queryObjects } from 'v8';

interface User {
  id: string;
  name: string;
  avatar: string | null;
  role: string
}

interface SearchUser {
  id: string;
  name: string;
  email: string;
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
  const { currentChatId, prevChatId, setPrevChatId, currentUserId, cursor, setCursor, currentChatName , currentStatus, socket, count, recentMessages, setRecentMessages} = userChatStore();
  const [page, setPage] = useState<number>(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([])
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);



  // console.log("current chat id in userchat : ", currentChatId);
  // console.log("prev chat id in userchat : ", prevChatId);

  useEffect(()=>{
    setRecentMessages();
  }, [currentChatId])



  useEffect(() => {
    const fetchMembers = async () => {
      if (showModal && currentChatId) {
        try {
          setLoading(true);
          const res = await axios.get(`/api/chats/${currentChatId}/members`);
          console.log("members : ", res.data);
          setMembers(res.data.members);
        } catch (err) {
          console.error("Error fetching members:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchMembers();
  }, [showModal, currentChatId]);

  


  const handleAddMember = async (userId: string) => {
    try {
      setAddingMemberId(userId);
      const res = await axios.post(`/api/chats/Add_Remove?method=add`, {
        memberId: userId,
        chatId: currentChatId,
        operation_perf_id: currentUserId
      });

      if (res.data.message === "new member added successfully") {
        const userToAdd = searchUsers.find(u => u.id === userId);

        if (userToAdd) {
          setMembers(prev => [...prev, {
            id: userToAdd.id,
            name: userToAdd.name,
            avatar: userToAdd.avatar,
            role: "member" 
          }]);
        }

        alert('Member added successfully!');
      }
    } catch (error: any) {
      console.error("Error adding member:", error);
      alert(error.response?.data?.message || "Failed to add member. Please try again.");
    } finally {
      setAddingMemberId(null); // ✅ hide loader
    }
  };


  const handleRemoveMember = async (memberId: string, chatId: string, operation_perf_id: string | undefined) => {
    try {
      const res = await axios.post(`/api/chats/Add_Remove?method=remove`, {
        memberId, chatId, operation_perf_id
      })

      if (res.data.message === "Member removed successfully") {
        setMembers(prev => prev.filter(m => m.id !== memberId));
        alert('Member removed');
      } else if (res.data.message === "Insufficient permissions to remove member") {
        alert("don't have suffficient permission");
      }
    } catch (error: any) {
      console.error("Error removing member:", error);
      alert(error.response?.data?.message || "Failed to remove member. Please try again.");
    }
  };

  const handleUpgradeRole = async (memberId: string, chatId: string, operation_perf_id: string | undefined) => {
    try {
      const res = await axios.post(`/api/chats/groupRoleUpdation?method=update`, {
        memberId, chatId, operation_perf_id
      })

      if (res.data.message === "Member promoted to admin") {
        setMembers(prev => prev.map(m =>
          m.id === memberId ? { ...m, role: "admin" } : m
        ));
        alert(`Role updated to admin`);
      } else if (res.data.message === "You cannot promote this member") {
        alert(`yDon't have sufficient authority`);
      }
    } catch (error: any) {
      console.error("Error upgrading member role:", error);
      alert(error.response?.data?.message || "Failed to update role. Please try again.");
    }
  };

  const handleLeaveGroup = () => {
    if (confirm("Leave this group?")) {
      setShowModal(false);
      alert('You left the group');
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isInitialLoad = page === 0 && messages.length > 0;
    const shouldScrollToBottom = isInitialLoad || isSending;

    if (shouldScrollToBottom) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [messages, page, isSending]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Wait for messages to load before scrolling
    const timeout = setTimeout(() => {
      if (messages.length > 0) {
        container.scrollTop = container.scrollHeight;
      }
    }, 150); // Slightly longer delay to ensure DOM is updated

    return () => clearTimeout(timeout);
  }, [currentChatId]);


  useEffect(() => {
    if (prevChatId !== currentChatId) {
      setPage(0);
      setMessages([]);
      setCursor("");
      setPrevChatId(currentChatId || "");
      setIsFetching(false);
    }
  }, [currentChatId]);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setSearchUsers([]);
        return;
      }

      try {
        setSearchLoading(true);
        const res = await axios.get('/api/chats/isthisChat', {
          params: {
            chatId: currentChatId,
            searchQuery,
            limit: 10,
            userId: currentUserId,
          }
        })


        console.log(res);

        const data = await res.data;
        setSearchUsers(data.users || []);

      } catch (error: any) {
        console.log("sadhfasd")

        if (error.response?.data?.error) {
          console.log("yes hhh")
          alert(error.response.data.error)
        }
        console.error(error);
      } finally {
        setSearchLoading(false);
      }

    }, 400);

    return () => clearTimeout(delayDebounce);

  }, [searchQuery])


  useEffect(() => {
    const fetchChatData = async () => {

      if (!currentChatId || (page > 0 && !cursor) || isFetching) return;

      console.log("page change kia haaa");

      try {
        setIsFetching(true);
        setLoading(true);
        console.log("kya hua");
        const res = await axios.get(`/api/chats/${currentChatId}`, {
          params: {
            limit: 20,
            cursor: cursor === "" ? null : cursor,
          },
        });

        const newMessages = res.data.messages.reverse() || [];
        console.log(newMessages);

        setMessages((prevMessages) => {
          const existingIds = new Set(prevMessages.map(m => m.id));
          const uniqueNewMessages = newMessages.filter((msg: Message) => !existingIds.has(msg.id));
          return [...uniqueNewMessages, ...prevMessages];
        });

        setCursor(res.data.nextCursor || null);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
        setIsFetching(false);
      }
    };

    fetchChatData();
  }, [page, currentChatId]);


  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || isFetching) return;

    const scrollTop = container.scrollTop;

    if (scrollTop <= 100 && cursor) {
      const previousScrollHeight = container.scrollHeight;

      setPage(prev => prev + 1);

      setTimeout(() => {
        const newScrollHeight = container.scrollHeight;
        const heightDiff = newScrollHeight - previousScrollHeight;
        container.scrollTop = scrollTop + heightDiff;
      }, 50);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    try {
      e.preventDefault();
      if (!messageInput.trim()) return;
      setIsSending(true);

      console.log(`${socket?.id}`);

      const res = await axios.post(`/api/chats/${currentChatId}`, { content: messageInput, senderId: currentUserId });

      if(res.data.message === "Message has been sent to the user"){
        socket?.emit('newMessage', { message: res.data.messageData, chatId: currentChatId });
      }

      setMessageInput('');
    } catch (error) {
      console.log("error in sending message ", error)
    } finally {
      setIsSending(false);
    }
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
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Placeholder for chat name or avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            U
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">{currentChatName}</h2>
            <p className="text-xs text-gray-500">{currentStatus}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-600">
          <button
            className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition"
            title="Start Video Call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 8h6a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4a2 2 0 012-2z" />
            </svg>
          </button>

          <button
            className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 transition"
            title="Chat Settings"
            onClick={() => setShowModal(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317a1 1 0 011.35 0l.622.62a1 1 0 00.708.293h.902a1 1 0 01.986.836l.115.693a1 1 0 00.293.708l.62.622a1 1 0 010 1.35l-.62.622a1 1 0 00-.293.708l-.115.693a1 1 0 01-.986.836h-.902a1 1 0 00-.708.293l-.622.62a1 1 0 01-1.35 0l-.622-.62a1 1 0 00-.708-.293H8.093a1 1 0 01-.986-.836l-.115-.693a1 1 0 00-.293-.708l-.62-.622a1 1 0 010-1.35l.62-.622a1 1 0 00.293-.708l.115-.693a1 1 0 01.986-.836h.902a1 1 0 00.708-.293l.622-.62zM12 15a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </button>


        </div>
      </div>
 <div
  ref={scrollContainerRef}
  className="flex-1 overflow-y-auto p-4 space-y-4"
  onScroll={handleScroll}
>
  {messages.length > 0 ? (
    <>
      {/* --- OLD / STORED MESSAGES --- */}
      {messages.map((message) => {
        const isCurrentUser = message.senderId === currentUserId;

        return (
          <div
            key={message.id}
            className={`flex items-start gap-3 animate-fadeIn ${isCurrentUser ? 'flex-row-reverse' : ''}`}
          >
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

            <div className={`flex-1 min-w-0 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-baseline gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                <span className="font-semibold text-gray-900 text-sm">
                  {isCurrentUser ? 'You' : message.sender.name}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`${
                  isCurrentUser
                    ? 'bg-blue-600 text-white rounded-lg rounded-tr-none'
                    : 'bg-white text-gray-800 rounded-lg rounded-tl-none border border-gray-200'
                } px-4 py-2 shadow-sm`}
              >
                <p className="text-sm break-words leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      {/* --- SEPARATOR (optional) --- */}
      {recentMessages.length > 0 && (
        <div className="flex justify-center my-4">
          <div className="text-gray-400 text-xs font-medium bg-gray-100 px-3 py-1 rounded-full">
            New Messages
          </div>
        </div>
      )}

      {/* --- RECENT / REAL-TIME MESSAGES --- */}
      {recentMessages.map((message) => {
        const isCurrentUser = message.senderId === currentUserId;

        return (
          <div
            key={`recent-${message.id}`}
            className={`flex items-start gap-3 animate-fadeIn ${isCurrentUser ? 'flex-row-reverse' : ''}`}
          >
            {!isCurrentUser && (
              <div className="flex-shrink-0">
                {message.sender.avatar ? (
                  <img
                    src={message.sender.avatar}
                    alt={message.sender.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center ring-2 ring-white shadow-sm">
                    <span className="text-white text-sm font-semibold">
                      {message.sender.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className={`flex-1 min-w-0 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-baseline gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                <span className="font-semibold text-gray-900 text-sm">
                  {isCurrentUser ? 'You' : message.sender.name}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div
                className={`${
                  isCurrentUser
                    ? 'bg-blue-500 text-white rounded-lg rounded-tr-none'
                    : 'bg-gray-50 text-gray-800 rounded-lg rounded-tl-none border border-gray-200'
                } px-4 py-2 shadow-sm`}
              >
                <p className="text-sm break-words leading-relaxed">{message.content}</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
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
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}

          </button>
        </form>
      </div>


      {/* Settings Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Chat Settings</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Members List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Members ({members.length})</h3>
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add
                    </button>
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {member.id === currentUserId ? 'You' : member.name}
                            </p>
                            <p className="text-xs text-gray-500">{member.role}</p>
                          </div>
                        </div>

                        {member.id !== currentUserId && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpgradeRole(member.id, currentChatId, currentUserId)}
                              className="p-1.5 hover:bg-gray-200 rounded"
                              title="Change Role"
                            >
                              <Shield className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id, currentChatId, currentUserId)}
                              className="p-1.5 hover:bg-gray-200 rounded"
                              title="Remove"
                            >
                              <UserMinus className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t space-y-2">
                  <button
                    onClick={() => setShowAddMemberModal(true)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded transition"
                  >
                    <UserPlus className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Add Members</span>
                  </button>

                  <button
                    onClick={() => { }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded transition"
                  >
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">Manage Roles</span>
                  </button>

                  <button
                    onClick={handleLeaveGroup}
                    className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded transition"
                  >
                    <LogOut className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-600">Leave Chat</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add Member</h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSearchQuery("");
                  setSearchUsers([]);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                ) : searchQuery.trim() === "" ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>Start typing to search for users</p>
                  </div>
                ) : searchUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <p>No users found</p>
                  </div>
                ) : (
                  <div className="px-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                      Users
                    </h3>
                    <ul className="space-y-1">
                      {searchUsers.map((user) => {
                        const isAlreadyMember = members.some(m => m.id === user.id);

                        return (
                          <li
                            key={user.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-gray-700">
                                    {user.name
                                      ? user.name
                                        .split(' ')
                                        .map((n: string) => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2)
                                      : '?'}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {user.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                              </div>
                            </div>

                            {isAlreadyMember ? (
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">Already a member</span>
                            ) : (
                              <button
                                onClick={() => handleAddMember(user.id)}
                                disabled={addingMemberId === user.id}
                                className={`ml-2 px-3 py-1.5 rounded text-sm flex items-center justify-center gap-2 flex-shrink-0 
    ${addingMemberId === user.id
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white transition'}`}
                              >
                                {addingMemberId === user.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Adding...</span>
                                  </>
                                ) : (
                                  'Add'
                                )}
                              </button>

                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserChat