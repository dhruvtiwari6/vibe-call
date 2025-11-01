import { Loader2 } from "lucide-react";
import { Search , X} from "lucide-react";
import axios from "axios";
import { useState } from "react";
import { userChatStore } from "@/store/chatStore";

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

interface AddMemberModalProps {
    searchLoading: boolean;
    searchQuery: string;
    setMembers: React.Dispatch<React.SetStateAction<User[]>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setSearchUsers: React.Dispatch<React.SetStateAction<SearchUser[]>>;
    setShowAddMemberModal: React.Dispatch<React.SetStateAction<boolean>>;
    members: Array<{ id: string; name: string; role: string }>;
    searchUsers: SearchUser[];
}





const AddMemberModal = ({
    searchLoading,
    searchQuery,
    setMembers,
    setSearchQuery,
    setSearchUsers,
    searchUsers,
    setShowAddMemberModal,
    members

}: AddMemberModalProps) => {

    const [addingMemberId, setAddingMemberId] = useState<string | null>(null);
    const {currentChatId, currentUserId} = userChatStore();


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
    return (
        <>
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
        </>
    )
}

export default AddMemberModal;

