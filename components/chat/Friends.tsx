"use client"

import { userChatStore } from "@/store/chatStore";
import { useSidebarStore } from "@/store/sideBarStore";
import axios from "axios";
import { useState } from "react";
import { UserPlus } from 'lucide-react';
import CreateGroupModal from '../modals/CreateGroupModal';
import { useSession } from "next-auth/react";

export default function Friends() {
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebarStore();
    const { chats, fetchRecentChats, isLoading, setCurrentChatId, currentChatId, setCurrentChatName, currentUserId, socket, count, groupCreationFetching } = userChatStore();
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const { data: session, status } = useSession()

    
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const loadChat = async (id: string) => {
        closeSidebar();
        console.log("Loading chat with ID: ", id);
        socket?.emit("markAsRead", { userId: currentUserId, chatId: id })
        { count && count.delete(id) }

        try {
            const res = await axios.get('/api/chats/chatName', {
                params: {
                    chatId: id,
                    userId: currentUserId
                }
            });

            if (res.status === 200) {
                setCurrentChatName(res.data.chatName);
                setCurrentChatId(id);
            } else {
                console.warn("Request completed but returned non-200 status:", res.status);
            }
        } catch (error: any) {
            console.error("Error in request setup:", error);
        }
    };

    const handleGroupCreated = () => {
        // Refresh the chat list after creating a group
        groupCreationFetching(session?.user?.email!);
    };

    return (
        <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
            {/* Create Group Button */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md font-medium"
                >
                    <UserPlus className="h-5 w-5" />
                    Create Group
                </button>
            </div>

            <div className="p-2">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                        <p className="text-sm text-gray-500 mt-4">Loading chats...</p>
                    </div>
                ) : chats && chats.length > 0 ? (
                    chats.map((chat) => (
                        <div
                            key={chat.chatId}
                            className="rounded-lg p-3 hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => loadChat(chat.chatId)}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-semibold text-xs sm:text-sm`}>
                                    {getInitials(chat.chatName || 'User')}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                                            {chat.chatName || 'Unknown User'}
                                        </h3>
                                        <span className="text-xs text-gray-500">
                                            {chat.updatedAt ? new Date(chat.updatedAt).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            }) : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                                            No messages yet
                                        </p>

                                        {count && count.get(chat.chatId) && count.get(chat.chatId)! > 0 && (
                                            <span className="ml-2 bg-red-500 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full min-w-[18px] text-center">
                                                {count.get(chat.chatId)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                        <p className="text-sm">No chats available</p>
                        <p className="text-xs text-gray-400 mt-2">Create a group to get started!</p>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateGroupModal && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroupModal(false)}
                    currentUserId={currentUserId || ''}
                    onGroupCreated={handleGroupCreated}
                />
            )}
        </div>
    );
}