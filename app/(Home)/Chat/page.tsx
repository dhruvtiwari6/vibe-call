'use client'

import { Input } from "@/components/ui/input"
import { Search, Menu, Loader2 } from "lucide-react"
import { useSidebarStore } from "@/store/sideBarStore"
import Friends from "@/components/chat/Friends"
import UserChat from "@/components/chat/UserChat"
import { useEffect, useState } from "react"
import { userChatStore } from "@/store/chatStore"
import { useSession } from "next-auth/react"
import axios from "axios"

export default function Chats() {
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebarStore();
    const { chats, fetchRecentChats, setCurrentUserId, setCurrentChatId, currentUserId} = userChatStore();
    const { data: session, status } = useSession();

    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadChat = async (id: string) => {
        console.log("chat loaded");
        closeSidebar();

        const response = await axios.get('/api/chats/getChatId', {
            params: {
                user1Id: currentUserId ?? "",
                user2Id: id
            }
        });

        console.log("current chaat id : ", response.data.chatId)
        setCurrentChatId(response.data.chatId);
    }


    useEffect(() => {
        const loadChats = async () => {
            try {
                if (!session?.user?.email) return;
                setCurrentUserId(session.user.id || "");
                await fetchRecentChats(session.user.email);
            } catch (error) {
                console.error('Failed to fetch chats:', error);
            }
        };
        loadChats();
    }, [status]);

    // Debounced search
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (query.trim() === '') {
                setSearchResults([]);
                return;
            }

            try {
                setLoading(true);
                const res = await fetch(`/api/user/search?query=${encodeURIComponent(query)}&limit=10`);
                const data = await res.json();
                setSearchResults(data.users || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 400); // debounce time

        return () => clearTimeout(delayDebounce);
    }, [query]);

    return (
        <div className="flex flex-row h-screen relative">
            {/* Mobile sidebar toggle */}
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

            {/* Sidebar */}
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
                            placeholder="Search users..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 h-10 w-full text-sm"
                        />
                    </div>
                </div>

                {/* Search results or friends list */}
                {query.trim() ? (
                    <div className="p-2">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <ul>
                                {searchResults.map((user) => (
                                    <li key={user.id} onClick={() => loadChat(user.id)} className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                                        {user.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="w-8 h-8 rounded-full mr-3 object-cover"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full mr-3 bg-gray-300 flex items-center justify-center">
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

                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-gray-500 py-4">No users found</p>
                        )}
                    </div>
                ) : (
                    <Friends />
                )}
            </div>

            {/* Chat area */}
            <div className='flex-1 bg-gray-50 flex items-center justify-center p-4 md:ml-0'>
                <UserChat />
            </div>
        </div>
    );
}
