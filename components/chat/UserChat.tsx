import React, { useEffect, useState, useRef } from 'react'
import { Search, Send, Loader2, X, UserPlus, UserMinus, Shield, LogOut } from 'lucide-react'
import { userChatStore } from '@/store/chatStore';
import axios from 'axios'
import SettingModal from '../modals/SettingModal';
import AddMemberModal from '../modals/AddMemberModal';
import VideoPlayer from './VideoPlayer';
import VideoCall from '../VideoCall/page';

import IncomingCallModal from '../modals/IncomingCallModal';

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
  fileUrl?: string | null;
}

function UserChat() {
  const { currentChatId, prevChatId, setPrevChatId, currentUserId, cursor, setCursor, currentChatName, currentStatus, socket, recentMessages, setRecentMessages,
    accepting, videoCall, setVideoCall
  } = userChatStore();
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);


  const handleEndCall = () => {
    console.log("baby");
    socket?.emit('end-call', { chatId: currentChatId });
    setVideoCall(false);
  }

  useEffect(() => {
    if (!socket) return;

    // Handle incoming end-call event
    const handleEndCall = () => {
      console.log("Received end-call event from remote user");
      setVideoCall(false);
    };

    socket.on('end-call', handleEndCall);

    // Cleanup
    return () => {
      socket.off('end-call', handleEndCall);
    };
  }, [socket, setVideoCall]);

  const VideoCallHandler = () => {
    socket?.emit("video call has been started", { chatId: currentChatId, org: currentUserId });
    setVideoCall(!videoCall);
  }


  useEffect(() => {
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
    e.preventDefault();
    if (!messageInput.trim() && !file) return;

    try {
      setIsSending(true);

      let fileControl = null;



      if (file) {
        console.log("went into the file sending part");
        const fileData = new FormData();
        fileData.append("file", file);

        const fileRes = await axios.post(`/api/image_upload`, fileData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        fileControl = fileRes.data;
        console.log("file Contorl : ", fileControl);
      }



      const res = await axios.post(`/api/chats/${currentChatId}`, {
        content: messageInput,
        senderId: currentUserId,
        fileControl: fileControl,
      });


      socket?.emit("newMessage", { message: res.data.messageData, chatId: currentChatId, senderId: currentUserId });

      setMessageInput("");
      setFile(null);
      setPreview(null);

    } catch (error) {
      console.error(error);
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
            onClick={VideoCallHandler}
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
                      className={`${isCurrentUser
                        ? 'bg-blue-600 text-white rounded-lg rounded-tr-none'
                        : 'bg-white text-gray-800 rounded-lg rounded-tl-none border border-gray-200'
                        } px-4 py-2 shadow-sm`}
                    >
                      {message.content?.trim() && (
                        <p className="text-sm break-words leading-relaxed">{message.content}</p>
                      )}

                      {message.fileUrl && (
                        <div className="mt-2">
                          {message.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img
                              src={message.fileUrl}
                              alt="sent image"
                              className="rounded-xl border border-gray-200 
                   max-w-[70vw] sm:max-w-[250px] md:max-w-[350px] 
                   max-h-[250px] sm:max-h-[250px] md:max-h-[350px] 
                   object-cover"
                            />
                          ) : message.fileUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                            //           <video
                            //             src={message.fileUrl}
                            //             controls
                            //             className="rounded-xl border border-gray-200 
                            //  max-w-[80vw] sm:max-w-[300px] md:max-w-[400px] 
                            //  max-h-[250px] sm:max-h-[300px] md:max-h-[400px] 
                            //  object-contain"
                            //           />

                            <VideoPlayer
                              src={message.fileUrl}
                              className="rounded-xl border border-gray-200 
    max-w-[80vw] sm:max-w-[300px] md:max-w-[400px] 
    max-h-[250px] sm:max-h-[300px] md:max-h-[400px]"
                            />
                          ) : null}
                        </div>
                      )}



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
                      className={`${isCurrentUser
                        ? 'bg-blue-500 text-white rounded-lg rounded-tr-none'
                        : 'bg-gray-50 text-gray-800 rounded-lg rounded-tl-none border border-gray-200'
                        } px-4 py-2 shadow-sm`}
                    >
                      {message.content?.trim() && (
                        <p className="text-sm break-words leading-relaxed">{message.content}</p>
                      )}


                      {message.fileUrl && (
                        <div className="mt-2">
                          {message.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img
                              src={message.fileUrl}
                              alt="sent image"
                              className="rounded-xl border border-gray-200 
                   max-w-[70vw] sm:max-w-[250px] md:max-w-[350px] 
                   max-h-[250px] sm:max-h-[250px] md:max-h-[350px] 
                   object-cover"
                            />
                          ) : message.fileUrl.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                            <video
                              src={message.fileUrl}
                              controls
                              className="rounded-xl border border-gray-200 
                   max-w-[80vw] sm:max-w-[300px] md:max-w-[400px] 
                   max-h-[250px] sm:max-h-[300px] md:max-h-[400px] 
                   object-contain"
                            />
                          ) : null}
                        </div>
                      )}
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
      {/* <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
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
      </div> */}
      {/* Message Input Section */}
      <div className="border-t border-gray-200 bg-white p-4 shadow-lg">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          {/* File Upload Button */}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setFile(e.target.files[0]);
                setPreview(URL.createObjectURL(e.target.files[0]));
              }
            }}
            className="hidden"
            id="file-input"
            disabled={!!messageInput.trim()} // disable file input if text exists
          />
          <label
            htmlFor="file-input"
            className={`p-2 rounded-lg cursor-pointer transition ${messageInput.trim()
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-200 hover:bg-gray-300"
              }`}
          >
            📎
          </label>

          {/* Text Input */}
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Type a message..."
            disabled={!!file} // disable text input if file selected
            className={`flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-sm ${file ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
              }`}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!messageInput.trim() && !file}
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

        {/* Optional File Preview */}
        {preview && (
          <div className="mt-3 relative">
            <button
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
              className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>

            {file?.type.startsWith("image") ? (
              <img src={preview} alt="preview" className="max-h-40 rounded-lg border" />
            ) : (
              <video src={preview} controls className="max-h-40 rounded-lg border" />
            )}
          </div>
        )}
      </div>



      {/* Settings Modal */}
      {showModal && (
        <SettingModal loading={loading} setShowModal={setShowModal} setShowAddMemberModal={setShowAddMemberModal}
          members={members} currentUserId={currentUserId ?? ""} currentChatId={currentChatId} setMembers={setMembers}
        />

      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          searchLoading={searchLoading}
          searchQuery={searchQuery}
          setMembers={setMembers}
          setSearchQuery={setSearchQuery}
          setSearchUsers={setSearchUsers}
          searchUsers={searchUsers}
          setShowAddMemberModal={setShowAddMemberModal}
          members={members}
        />
      )}




      {(videoCall || accepting) && (
        <div className="fixed inset-0 z-50 bg-black">
          <VideoCall onEndCall={handleEndCall} />
        </div>
      )}


    </div>
  );
}

export default UserChat