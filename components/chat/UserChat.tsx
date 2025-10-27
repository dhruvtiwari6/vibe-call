import React, { useEffect, useState, useRef } from 'react'
import { Search, Send, Loader2, X, UserPlus, UserMinus, Shield, LogOut } from 'lucide-react'
import { userChatStore } from '@/store/chatStore';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  avatar: string | null;
  role: string
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
  const [showModal, setShowModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [members, setMembers] = useState<User[]>([]);


  console.log("current chat id in userchat : ", currentChatId);
  console.log("prev chat id in userchat : ", prevChatId);


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


  const handleAddMember = () => {
    const email = prompt("Enter email of user to add:");
    if (email) {
      console.log('Adding member:', email);
      alert('Member added successfully!');
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


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const res = await axios.post(`/api/chats/${currentChatId}`, { content: messageInput, senderId: currentUserId });
    console.log(res);
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
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Placeholder for chat name or avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            U
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800">User Name</h2>
            <p className="text-xs text-gray-500">Online</p>
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
                      onClick={handleAddMember}
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
                    onClick={handleAddMember}
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
    </div>
  );
}

export default UserChat