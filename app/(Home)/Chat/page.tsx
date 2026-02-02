/* eslint-disable @typescript-eslint/no-unused-vars */
'use client'

import { Input } from "@/components/ui/input"
import { Search, Menu, Loader2, Users } from "lucide-react"
import { useSidebarStore } from "@/store/sideBarStore"
import Friends from "@/components/chat/Friends"
import UserChat from "@/components/chat/UserChat"
import { useEffect, useState } from "react"
import { userChatStore } from "@/store/chatStore"
import { useSession } from "next-auth/react"
import axios from "axios"

interface SearchUser {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
}

interface SearchGroup {
    id: string;
    name: string;
    isGroupChat: boolean;
    participantCount: number;
    participants: Array<{
        id: string;
        name: string;
        avatar: string | null;
    }>;
}

export default function Chats() {
    const { isSidebarOpen, toggleSidebar, closeSidebar } = useSidebarStore();
    const { 
        chats, 
        fetchRecentChats, 
        setCurrentUserId, 
        setCurrentChatId, 
        currentUserId, 
        setCurrentChatName, 
        currentChatName, 
        createSocket ,

    } = userChatStore();
    const { data: session, status } = useSession();

    const [query, setQuery] = useState('');
    const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
    const [searchGroups, setSearchGroups] = useState<SearchGroup[]>([]);
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

        if (response.status === 200) {
            setCurrentChatId(response.data.chatId);
            setCurrentChatName(response.data.chatName);
            console.log("currentChatName : ", currentChatName);
        }
    }



    useEffect(() => {
        console.log("current status of user is : ", status);

        if (status === "authenticated") {
            const loadChats = async () => {
                try {
                    if (!session?.user?.email) return;
                    setCurrentUserId(session.user.id || "");
                    createSocket(session.user.id || "");
                    await fetchRecentChats(session.user.email);

                } catch (error) {
                    console.error('Failed to fetch chats:', error);
                }
            };
            loadChats();
        }
    }, [status]);

   
    // Debounced search
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (query.trim() === '') {
                setSearchUsers([]);
                setSearchGroups([]);
                return;
            }

            try {
                setLoading(true);

                const res = await axios.get("/api/user/search", {
                    params: {
                        query,
                        limit: 10,
                        userId: currentUserId,
                    },
                });

                const data = await res.data;
                setSearchUsers(data.users || []);
                setSearchGroups(data.groups || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 400); // debounce time

        return () => clearTimeout(delayDebounce);
    }, [query, currentUserId]);

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
                            placeholder="Search users and groups..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="pl-10 h-10 w-full text-sm"
                        />
                    </div>
                </div>

                {/* Search results or friends list */}
                {query.trim() ? (
                    <div className="p-2 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="animate-spin h-5 w-5 text-gray-500" />
                            </div>
                        ) : (
                            <>
                                {searchGroups.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                                            Groups
                                        </h3>
                                        <ul>
                                            {searchGroups.map((group) => (
                                                <li
                                                    key={group.id}
                                                    onClick={() => loadChat(group.id)}
                                                    className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                                                >
                                                    <div className="w-8 h-8 rounded-full mr-3 bg-blue-500 flex items-center justify-center">
                                                        <Users className="h-4 w-4 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{group.name}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {group.participantCount} {group.participantCount === 1 ? 'member' : 'members'}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Users Section */}
                                {searchUsers.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">
                                            Users
                                        </h3>
                                        <ul>
                                            {searchUsers.map((user) => (
                                                <li
                                                    key={user.id}
                                                    onClick={() => loadChat(user.id)}
                                                    className="flex items-center p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                                                >
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
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{user.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* No results */}
                                {searchUsers.length === 0 && searchGroups.length === 0 && (
                                    <p className="text-center text-sm text-gray-500 py-4">
                                        No users or groups found
                                    </p>
                                )}
                            </>
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