
import { create } from 'zustand'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

interface Chats {
    chatId: string,
    latestMessage: string,
    chatName: string,
    isGroupChat: boolean,
    updatedAt: Date,
    _allParticipants?: string[]
}

interface User {
    id: string;
    name: string;
    avatar: string | null;
    role: string
}

interface Message {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    sender: User;
    fileUrl?: string | null;
}

interface UserChats {
    chats: Chats[]
    message: string
    isLoading: boolean
    fetchRecentChats: (email: string) => Promise<void>
    setCurrentChatId: (id: string) => void
    setPrevChatId: (id: string) => void
    setCurrentUserId: (id: string) => void
    setCursor: (id: string | null) => void
    setCurrentChatName: (name: string) => void
    createSocket: (id: string) => void
    requestStatus: (chatId: string) => void
    setRecentMessages: () => void
    currentStatus: string
    socket?: Socket
    currentChatName?: string,
    currentChatId?: string
    prevChatId: string
    currentUserId?: string
    currentEmail?: string
    cursor?: string | null
    recentMessages: Array<Message>
    count?: Map<string, number>
    incomingCall: boolean;
    videoCall: boolean;
    callerName?: string;
    incomingCallChatId?: string;
    setVideoCall: (data: boolean) => void
    setIncomingCall: (data: boolean) => void
    setCallerName: (name: string) => void
    acceptCall: () => void
    rejectCall: () => void
    groupCreationFetching : (email: string) => Promise<void>
}

export const userChatStore = create<UserChats>((set, get) => ({
    chats: [],
    message: "",
    isLoading: false,
    currentChatId: undefined,
    prevChatId: "",
    currentUserId: undefined,
    currentEmail: undefined,
    cursor: undefined,
    currentChatName: "",
    currentStatus: "offline",
    socket: undefined,
    recentMessages: [],
    count: undefined,
    incomingCall: false,
    videoCall: false,
    callerName: undefined,
    incomingCallChatId: undefined,

    fetchRecentChats: async (email: string) => {
        set({ isLoading: true });
        try {
            if (!email) throw new Error("email not found");
            const response = await axios.get('/api/chats/recent', { params: { email } });
            set((state) => ({
                chats: [...state.chats, ...response.data.chats],
                isLoading: false,
                currentEmail: email
            }));

            const socket = get().socket;
            socket?.emit('joinRoom', { allChats: response.data.chats, userId: get().currentUserId });

            console.log("all participants: ", response.data.chats);
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    groupCreationFetching: async (email: string) => {
        set({ isLoading: true });
        try {
            if (!email) throw new Error("email not found");
            const response = await axios.get('/api/chats/recent', { params: { email } });
            set((state) => ({
                chats: [...response.data.chats],
                isLoading: false,
                currentEmail: email
            }));

            // console.log("all chats : " , )

            const socket = get().socket;
            socket?.emit('joinRoom', { allChats: response.data.chats, userId: get().currentUserId });

            console.log("all participants: ", response.data.chats);
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },


    createSocket: (id: string) => {
        const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_PORT ? `http://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT}` : undefined, {
            transports: ['websocket', 'polling'],
            query: { userId: id }
        });

        console.log("creating socket");

        socketInstance.on('connect', () => {
            console.log('✅ connected to the socket server');
            set({ socket: socketInstance });

            const chats = get().chats;
            if (chats && chats.length > 0) {
                socketInstance.emit('joinRoom', { allChats: chats, userId: id });
            }

            const currentChatId = get().currentChatId;
            if (currentChatId) {
                socketInstance.emit("Status", { id, chatId: currentChatId });
            }
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ disconnected from the socket server');
            set({ socket: undefined });
        });

        socketInstance.on('newMessage', (data) => {
            const chatId = data.data.chatId;
            const currentChatId = get().currentChatId;

            if (chatId === currentChatId) {
                if (get().prevChatId !== currentChatId) {
                    set({ recentMessages: [] });
                }
                set((state) => ({
                    recentMessages: [...state.recentMessages, data.data.message],
                }));
                console.log(get().recentMessages);
                console.log("New message for current chat received:", data.data.messsage);
            }
        });

        socketInstance.on('unreadCountUpdate', (data) => {
            const { chatId, count } = data;
            console.log(`📩 Unread count update: ${chatId} => ${count}`);

            if (chatId !== get().currentChatId) {
                const newCount = new Map(get().count);
                newCount.set(chatId, count);
                set({ count: newCount });
            }
        });

        socketInstance.on('Status', (data) => {
            console.log("Status update received:", data.status);
            set({ currentStatus: data.status });
        });

        socketInstance.on('addedToGroup', (data) => {
            console.log("Added to new group:", data.chatId);
            const email = get().currentEmail;
            if (email) {
                get().groupCreationFetching(email);
            }
        });

        socketInstance.on('userStatusUpdate', (data) => {
            const currentChatId = get().currentChatId;
            if (currentChatId) {
                get().requestStatus(currentChatId);
            }
        });

        socketInstance.on('joinRoom', (data) => {
            console.log("joined the room: ", data);
        });

        // Listen for incoming video calls
        socketInstance.on("friend started video call", (data) => {
            console.log("Incoming video call from:", data.callerName, "for chat:", data.chatId);
            set({
                incomingCall: true,
                callerName: data.callerName,
                incomingCallChatId: data.chatId
            });
        });

        // Listen for call acceptance
        socketInstance.on("call was accepted", (data) => {
            console.log("Call was accepted by the other user");
            set({ videoCall: true });
        });

        // Listen for call rejection
        socketInstance.on("call was rejected", (data: { chatId: string; rejectedBy: string }) => {
            console.log("Call was rejected by:", data.rejectedBy);
            const { chatId, rejectedBy } = data;
            const chat = get().chats.find(c => c.chatId === chatId);
            const isGroup = chat ? chat.isGroupChat : false;
            
            if (!isGroup) {
                set({ 
                    videoCall: false, 
                    incomingCall: false, 
                    incomingCallChatId: undefined 
                });
                alert("Call was declined");
            } else {
                console.log(`Group call declined by user: ${rejectedBy}`);
            }
        });
    },

    requestStatus: (chatId: string) => {
        const socket = get().socket;
        const userId = get().currentUserId;

        if (socket && userId && chatId) {
            console.log("Requesting status for chatId:", chatId);
            socket.emit("Status", { id: userId, chatId });
        } else {
            console.warn("⚠️ Cannot request status - missing socket, userId, or chatId");
        }
    },

    setCurrentChatId: (id: string) => {
        set({ currentChatId: id });
        get().requestStatus(id);
    },

    setPrevChatId: (id: string) => set({ prevChatId: id }),
    setCurrentUserId: (id: string) => set({ currentUserId: id }),
    setCursor: (id: string | null) => set({ cursor: id }),
    setCurrentChatName: (name: string) => set({ currentChatName: name }),
    setRecentMessages: () => set({ recentMessages: [] }),
    setVideoCall: (data: boolean) => set({ videoCall: data }),
    setIncomingCall: (data: boolean) => set({ incomingCall: data }),
    setCallerName: (name: string) => set({ callerName: name }),

    acceptCall: () => {
        const socket = get().socket;
        const chatId = get().incomingCallChatId;
        const userId = get().currentUserId;
        if (socket && chatId && userId) {
            console.log("Accepting call for chatId:", chatId);
            socket.emit("call accepted", { chatId, userId });
            set({
                incomingCall: false,
                videoCall: true,
                currentChatId: chatId
            });
        }
    },

    rejectCall: () => {
        const socket = get().socket;
        const chatId = get().incomingCallChatId;
        const userId = get().currentUserId;
        if (socket && chatId && userId) {
            console.log("Rejecting call for chatId:", chatId);
            socket.emit("call rejected", { chatId, userId });
        }
        set({
            incomingCall: false,
            incomingCallChatId: undefined
        });
    },
}));