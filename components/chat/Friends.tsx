"use client"

import { userChatStore } from "@/store/chatStore";
import { useSidebarStore } from "@/store/sideBarStore";
import axios from "axios";

export default function Friends() {
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebarStore();
    const { chats, fetchRecentChats, isLoading ,  setCurrentChatId, currentChatId } = userChatStore();

    // Function to get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const loadChat = async(id : string) => {
        closeSidebar();
        const response = await axios.get(`/api/chats/${id}`);
        setCurrentChatId(id);
        console.log(currentChatId)
    }

    return (
        <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
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
                            className="rounded-lg p-3 hover:bg-gray-100 cursor-pointer"
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
                                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                                        {'No messages yet'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                        <p className="text-sm">No chats available</p>
                    </div>
                )}
            </div>
        </div>
    )
}