'use client'

import { Input } from "@/components/ui/input"
import { Search, Menu } from "lucide-react"
import { useSidebarStore } from "@/store/sideBarStore"
import Friends from "@/components/chat/Friends"
import UserChat from "@/components/chat/UserChat"
import { useEffect } from "react"
import { userChatStore } from "@/store/chatStore"
import { useSession } from "next-auth/react"

export default function Chats() {
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebarStore();
    const {chats, message, fetchRecentChats, setCurrentUserId} = userChatStore();
    const {data: session, status} = useSession();


    useEffect(() => {
        const loadChats = async () => {
            try {
                if (!session?.user?.email) {
                    console.warn("User email not found");
                    return;
                }
                
                setCurrentUserId(session.user.id || "");
                await fetchRecentChats(session.user.email);
            } catch (error) {
                console.error('Failed to fetch chats:', error);
            }
        };
        
        loadChats();
    }, [status]);

    return (
        <div className="flex flex-row h-screen relative">
            <button 
                onClick={toggleSidebar} 
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
            >
                <Menu className="h-5 w-5" />
            </button>

            {isSidebarOpen && (
                <div 
                    className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={closeSidebar}
                />
            )}

            <div className={`
                flex-none w-80 sm:w-72 md:w-80 lg:w-96
                border-r border-gray-300 bg-white shadow-sm
                fixed md:relative inset-y-0 left-0 z-40
                transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 transition-transform duration-300 ease-in-out
            `}>
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            type="text" 
                            placeholder="Search conversations..." 
                            className="pl-10 h-10 w-full text-sm"
                        />
                    </div>
                </div>

                <Friends />
            </div>

            <div className='flex-1 bg-gray-50 flex items-center justify-center p-4 md:ml-0 '>
                <UserChat />
            </div>
        </div>
    );
}