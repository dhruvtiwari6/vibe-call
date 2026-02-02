/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, UserPlus, Users } from 'lucide-react';
import axios from 'axios';

interface SearchUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface CreateGroupModalProps {
  onClose: () => void;
  currentUserId: string;
  onGroupCreated: () => void;
}

export default function CreateGroupModal({ onClose, currentUserId, onGroupCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchUsers, setSearchUsers] = useState<SearchUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Search users with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        setSearchUsers([]);
        return;
      }

      try {
        setSearchLoading(true);
        const res = await axios.get('/api/user/search', {
          params: {
            query: searchQuery,
            limit: 10,
            userId: currentUserId,
          }
        });

        const data = await res.data;
        setSearchUsers(data.users || []);
      } catch (error: any) {
        console.error('Error searching users:', error);
        if (error.response?.data?.error) {
          alert(error.response.data.error);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUserId]);

  const handleAddMember = (user: SearchUser) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
      setSearchQuery('');
      setSearchUsers([]);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Please add at least one member');
      return;
    }

    try {
      setCreating(true);
      const memberIds = selectedMembers.map(m => m.id);
      
      const res = await axios.post('/api/chats/GroupCreate', {
        chatName: groupName.trim(),
        chatMembers: [...memberIds], 
        AdminId: currentUserId,
      });

      if (res.status === 200 || res.status === 201) {
        alert('Group created successfully!');
        onGroupCreated();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      alert(error.response?.data?.error || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Create Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              {groupName.length}/50 characters
            </p>
          </div>

          {/* Search Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Search Results */}
            {searchLoading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            )}

            {!searchLoading && searchUsers.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                {searchUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleAddMember(user)}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <UserPlus className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Members ({selectedMembers.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-semibold">
                            {getInitials(member.name)}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1 hover:bg-blue-100 rounded-full transition"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={creating || !groupName.trim() || selectedMembers.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}