"use client";

import React, { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, Image as ImageIcon } from "lucide-react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { userChatStore } from "@/store/chatStore";

const ProfileNavbar = () => {
    const [open, setOpen] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const { data: session, status } = useSession()
    const { currentUserId } = userChatStore();


    const name = session?.user?.name || "User";
    const email = session?.user?.email || " ";

    const user = { name, email };

    

    useEffect(() => {
        if (session?.user?.image) {
            setAvatar(session.user.image);
        }
    }, [status]);
    
    
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const handleLogout = () => {
        alert("Logged out successfully!");
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await axios.post("/api/image_upload", formData);

            if (res.data.message === "image uploaded") {
                const response = await axios.put('/api/image_upload/set_avatar', { image_public_url: res.data.url, user_id: currentUserId });

                if(response.data.message === "Avatar updated successfully") {
                    setAvatar(res.data.url);
                }
            }
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload avatar");
        } finally {
            setUploading(false);
        }
    };

    return (
        <nav className="bg-white shadow border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 flex justify-between items-center h-16">
                {/* Logo */}
                <h1 className="text-lg font-bold text-blue-900">Vibe Call</h1>

                {/* Profile */}
                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setOpen(!open)}
                        className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition"
                    >
                        {avatar ? (
                            <img
                                src={avatar}
                                alt="avatar"
                                className="w-9 h-9 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                                {initials}
                            </div>
                        )}
                        <ChevronDown
                            className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${open ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {open && (
                        <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-md z-50">
                            <div className="p-3 border-b">
                                <p className="font-medium text-gray-900">{user.name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>

                            {/* Change avatar */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 border-t transition"
                                disabled={uploading}
                            >
                                <ImageIcon className="h-4 w-4" />
                                {uploading ? "Uploading..." : "Change Avatar"}
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t transition"
                            >
                                <LogOut className="h-4 w-4" /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default ProfileNavbar;
