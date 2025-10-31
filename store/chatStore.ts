import { create } from 'zustand'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { ScrollAreaThumb } from '@radix-ui/react-scroll-area'
import { count } from 'console'

interface Chats {
    chatId: string,
    latestMessage: string,
    chatName: string,
    updatedAt: Date
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
    setStatus: (id: string, chatId: string) => void
    currentStatus: string
    socket?: Socket
    currentChatName?: string
    currentChatId?: string
    prevChatId: string
    currentUserId?: string
    cursor?: string | null
    recentMessages: Array<void>
    count?: Map<string, number>

}

export const userChatStore = create<UserChats>((set, get) => ({
    chats: [],
    message: "",
    isLoading: false,
    currentChatId: undefined,
    prevChatId: "",
    currentUserId: undefined,
    cursor: undefined,
    currentChatName: "",
    currentStatus: "offline",
    socket: undefined,
    recentMessages: [],
    count: undefined,

    fetchRecentChats: async (email: string) => {
        set({ isLoading: true });
        try {
            if (!email) throw new Error("email not found");
            const response = await axios.get('/api/chats/recent', { params: { email } });
            set((state) => ({
                chats: [...state.chats, ...response.data.chats],
                isLoading: false
            }));

            const socket = get().socket;
            socket?.emit('joinRoom', response.data.chats);
            console.log("all participants: ", response.data.chats);
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    createSocket: (id: string,) => {
        const socketInstance = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            query: { userId: id }
        });

        console.log("creating socket");

        socketInstance.on('connect', () => {
            console.log('✅ connected to the socket server');
            set({ socket: socketInstance });
        });

        socketInstance.on('disconnect', () => {
            console.log('❌ disconnected from the socket server');
            set({ socket: undefined });
        });

        socketInstance.on('newMessage', (data) => {
            const chatId = data.data.chatId;
            const currentChatId = get().currentChatId;
            const count = new Map(get().count); 

            console.log("current chat id : " , chatId);

            if (chatId === currentChatId) {
              if(get().prevChatId !== currentChatId){
                set({recentMessages: []});
                get().setPrevChatId(currentChatId || '');
              }
                set((state) => ({
                    recentMessages: [...state.recentMessages, data],
                }));

                console.log("New message for current chat received:", data);
            } else {
                // Increment unread count for that chat
                const currentCount = count.get(chatId) || 0;
                count.set(chatId, currentCount + 1);
                set({ count }); // update Zustand store

                console.log("New message for other chat received. Updated count:", count.get(chatId));
            }
        });


        socketInstance.on('joinRoom', (data) => {
            console.log(" joined the room : ", data)
        });
    },

    setStatus: (id: string, chatId: string) => {
        const socket = get().socket;
        console.log("emitting status for id: ", id, " | socket: ", socket);

        if (socket) {
            socket.emit("Status", { id, chatId });

            socket.on("Status", (data) => {
                console.log("Status update received:", data.status);
                set({ currentStatus: data.status });
            });
        } else {
            console.warn("⚠️ Socket not connected, cannot emit status");
        }
    },

    setCurrentChatId: (id: string) => set({ currentChatId: id }),
    setPrevChatId: (id: string) => set({ prevChatId: id }),
    setCurrentUserId: (id: string) => set({ currentUserId: id }),
    setCursor: (id: string | null) => set({ cursor: id }),
    setCurrentChatName: (name: string) => set({ currentChatName: name })
}));
