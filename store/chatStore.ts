// import { create } from 'zustand'
// import axios from 'axios'
// import { io, Socket } from 'socket.io-client'

// interface Chats {
//     chatId: string,
//     latestMessage: string,
//     chatName: string,
//     updatedAt: Date
// }

// interface User {
//     id: string;
//     name: string;
//     avatar: string | null;
//     role: string
// }

// interface Message {
//     id: string;
//     content: string;
//     createdAt: string;
//     senderId: string;
//     sender: User;
//     fileUrl?: string | null;
// }

// interface UserChats {
//     chats: Chats[]
//     message: string
//     isLoading: boolean
//     fetchRecentChats: (email: string) => Promise<void>
//     setCurrentChatId: (id: string) => void
//     setPrevChatId: (id: string) => void
//     setCurrentUserId: (id: string) => void
//     setCursor: (id: string | null) => void
//     setCurrentChatName: (name: string) => void
//     createSocket: (id: string) => void
//     requestStatus: (chatId: string) => void
//     setRecentMessages: () => void
//     currentStatus: string
//     socket?: Socket
//     currentChatName?: string,
//     currentChatId?: string
//     prevChatId: string
//     currentUserId?: string
//     cursor?: string | null
//     recentMessages: Array<Message>
//     count?: Map<string, number>
//     accepting: Boolean;
//     videoCall: Boolean,
//     setVideoCall : (data : boolean)=> void
//     setAccepting : (data : boolean)=> void




// }

// export const userChatStore = create<UserChats>((set, get) => ({
//     chats: [],
//     message: "",
//     isLoading: false,
//     currentChatId: undefined,
//     prevChatId: "",
//     currentUserId: undefined,
//     cursor: undefined,
//     currentChatName: "",
//     currentStatus: "offline",
//     socket: undefined,
//     recentMessages: [],
//     count: undefined,
//     accepting: false,
//     videoCall: false,



//     fetchRecentChats: async (email: string) => {
//         set({ isLoading: true });
//         try {
//             if (!email) throw new Error("email not found");
//             const response = await axios.get('/api/chats/recent', { params: { email } });
//             set((state) => ({
//                 chats: [...state.chats, ...response.data.chats],
//                 isLoading: false
//             }));

//             const socket = get().socket;
//             socket?.emit('joinRoom', { allChats: response.data.chats, userId: get().currentUserId });

//             console.log("all participants: ", response.data.chats);
//         } catch (error) {
//             set({ isLoading: false });
//             throw error;
//         }
//     },

//     createSocket: (id: string) => {
//         const socketInstance = io(`http://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT}`, {
//             transports: ['websocket', 'polling'],
//             query: { userId: id }
//         });

//         console.log("creating socket");

//         socketInstance.on('connect', () => {
//             console.log('✅ connected to the socket server');
//             set({ socket: socketInstance });
//         });

//         socketInstance.on('disconnect', () => {
//             console.log('❌ disconnected from the socket server');
//             set({ socket: undefined });
//         });

//         socketInstance.on('newMessage', (data) => {
//             const chatId = data.data.chatId;
//             const currentChatId = get().currentChatId;

//             if (chatId === currentChatId) {
//                 if (get().prevChatId !== currentChatId) {
//                     set({ recentMessages: [] });
//                 }
//                 set((state) => ({
//                     recentMessages: [...state.recentMessages, data.data.message],
//                 }));
//                 console.log(get().recentMessages);
//                 console.log("New message for current chat received:", data.data.messsage);
//             }
//         });


//         socketInstance.on('unreadCountUpdate', (data) => {
//             const { chatId, count } = data;
//             console.log(`📩 Unread count update: ${chatId} => ${count}`);

//             if (chatId !== get().currentChatId) {
//                 const newCount = new Map(get().count);
//                 newCount.set(chatId, count);
//                 set({ count: newCount });
//             }
//         });

//         // Listen for status updates - SET UP ONCE
//         socketInstance.on('Status', (data) => {
//             console.log("Status update received:", data.status);
//             set({ currentStatus: data.status });
//         });

//         // Listen for user status changes
//         socketInstance.on('userStatusUpdate', (data) => {
//             const currentChatId = get().currentChatId;
//             if (currentChatId) {
//                 // Re-request status when any user status changes
//                 get().requestStatus(currentChatId);
//             }
//         });

//         socketInstance.on('joinRoom', (data) => {
//             console.log("joined the room: ", data);
//         });


//         socketInstance.on("friend started video call", (data) => {
//             console.log("i am accepting the call")
//             set({
//                accepting: true
//             });
//         });

//     },
  



//     // NEW: Separate function to request status
//     requestStatus: (chatId: string) => {
//         const socket = get().socket;
//         const userId = get().currentUserId;

//         if (socket && userId && chatId) {
//             console.log("Requesting status for chatId:", chatId);
//             socket.emit("Status", { id: userId, chatId });
//         } else {
//             console.warn("⚠️ Cannot request status - missing socket, userId, or chatId");
//         }
//     },

//     setCurrentChatId: (id: string) => {
//         set({ currentChatId: id });
//         // Request status when chat changes
//         get().requestStatus(id);
//     },

//     setPrevChatId: (id: string) => set({ prevChatId: id }),
//     setCurrentUserId: (id: string) => set({ currentUserId: id }),
//     setCursor: (id: string | null) => set({ cursor: id }),
//     setCurrentChatName: (name: string) => set({ currentChatName: name }),
//     setRecentMessages: () => set({ recentMessages: [] }),
//     setVideoCall: (data : boolean) => set({ videoCall:data }),
//     setAccepting: (data : boolean) => set({ accepting: data }),

// }));


import { create } from 'zustand'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'

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
    cursor?: string | null
    recentMessages: Array<Message>
    count?: Map<string, number>
    incomingCall: boolean;
    videoCall: boolean;
    callerName?: string;
    setVideoCall: (data: boolean) => void
    setIncomingCall: (data: boolean) => void
    setCallerName: (name: string) => void
    groupCreationFetching : (email: string) => Promise<void>
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
    incomingCall: false,
    videoCall: false,
    callerName: undefined,

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
                isLoading: false
            }));

            const socket = get().socket;
            socket?.emit('joinRoom', { allChats: response.data.chats, userId: get().currentUserId });

            console.log("all participants: ", response.data.chats);
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },


    createSocket: (id: string) => {
        const socketInstance = io(`http://localhost:${process.env.NEXT_PUBLIC_SOCKET_PORT}`, {
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
            console.log("Incoming video call from:", data.callerName);
            set({
                incomingCall: true,
                callerName: data.callerName
            });
        });

        // Listen for call acceptance
        socketInstance.on("call was accepted", (data) => {
            console.log("Call was accepted by the other user");
            set({ videoCall: true });
        });

        // Listen for call rejection
        socketInstance.on("call was rejected", (data) => {
            console.log("Call was rejected by the other user");
            set({ videoCall: false });
            // You can add a notification here
            alert("Call was declined");
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
}));