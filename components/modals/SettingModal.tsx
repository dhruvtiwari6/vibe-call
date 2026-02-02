/* eslint-disable @typescript-eslint/no-explicit-any */
import { Loader2 } from "lucide-react";
import { Shield } from "lucide-react";
import { UserPlus } from "lucide-react";
import { LogOut } from "lucide-react";
import axios from "axios";
import { UserMinus } from "lucide-react";
import { X } from "lucide-react";
import { ShieldOff } from "lucide-react";
import { userChatStore } from "@/store/chatStore";

interface SettingModalProps {
    setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowAddMemberModal: React.Dispatch<React.SetStateAction<boolean>>;
    members: Array<{ id: string; name: string; role: string }>;
    currentUserId: string;
    currentChatId: string;
    loading: boolean;
    setMembers: React.Dispatch<React.SetStateAction<User[]>>;
}



interface User {
    id: string;
    name: string;
    avatar: string | null;
    role: string
}



const SettingModal = ({
    setShowModal,
    setShowAddMemberModal,
    members,
    currentUserId,
    currentChatId,
    loading,
    setMembers,
}: SettingModalProps) => {
    const { socket } = userChatStore();


    const handleRemoveMember = async (memberId: string, chatId: string, operation_perf_id: string | undefined) => {
        try {
            const res = await axios.post(`/api/chats/Add_Remove?method=remove`, {
                memberId, chatId, operation_perf_id
            })

            if (res.data.message === "Member removed successfully") {
                setMembers(prev => prev.filter(m => m.id !== memberId));

                //remove the member also from socket room
                socket?.emit(
                    "memberRemove",
                    { memberId , chatId},
                    (result: { success: boolean; message?: string }) => {
                        if (result.success) {
                            alert("Member removed");
                        } else {
                            alert(result.message || "Failed to remove member");
                        }
                    }
                );

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

    const handleDemoteRole = async (memberId: string, chatId: string, operation_perf_id: string | undefined) => {
        try {
            const res = await axios.post(`/api/chats/groupRoleUpdation?method=demote`, {
                memberId, chatId, operation_perf_id
            })

            if (res.data.message === "Member demoted to member") {
                setMembers(prev => prev.map(m =>
                    m.id === memberId ? { ...m, role: "member" } : m
                ));
                alert(`Role updated to member`);
            } else if (res.data.message === "You cannot promote this member") {
                alert(`Don't have sufficient authority`);
            }
        } catch (error: any) {
            console.error("Error demoting member role:", error);
            alert(error.response?.data?.message || "Failed to update role. Please try again.");
        }
    };

    const handleLeaveGroup = async (memberId: string, chatId: string, operation_perf_id: string | undefined) => {
       try {
            const res = await axios.post(`/api/chats/Add_Remove?method=leave`, {
                memberId, chatId, operation_perf_id
            })

            if (res.data.message === "Member leaved successfully") {
                setMembers(prev => prev.filter(m => m.id !== memberId));

                //remove the member also from socket room
                socket?.emit(
                    "memberRemove",
                    { memberId , chatId},
                    (result: { success: boolean; message?: string }) => {
                        if (result.success) {
                            alert("you left out");
                        } else {
                            alert(result.message || "Failed to leave");
                        }
                    }
                );

            } 
        } catch (error: any) {
            console.error("leaving error:", error);
            alert("you left the group");
        }
    };
    return (
        <>
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
                                                        title="Promote to Admin"
                                                    >
                                                        <Shield className="h-4 w-4 text-gray-600" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDemoteRole(member.id, currentChatId, currentUserId)}
                                                        className="p-1.5 hover:bg-gray-200 rounded"
                                                        title="Demote to Member"
                                                    >
                                                        <ShieldOff className="h-4 w-4 text-gray-600" />
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
                                     onClick={() => handleLeaveGroup(currentUserId, currentChatId, currentUserId)}
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
        </>
    )
}

export default SettingModal;

