// import {create} from 'zustand'
// import axios from 'axios'

// interface Chats {
//     chatId : string,
//     latestMessage : string,
//     chatName: string,
//     updatedAt: Date

// }

// // id: participant.id, // ChatParticipant id for cursor
// //             chatId: participant.chat.id,
// //             chatName: participant.chat.ChatName,
// //             updatedAt: participant.chat.updatedAt

// interface UserChats {
//     chats : Chats[]
//     message: string
//     fetchRecentChats : (email: string) => Promise<void>
// }

// export const userChatStore = create<UserChats>((set) => ({
//     // initial state
//     chats : [],
//     message: "",
//     fetchRecentChats : async(email: string) => {
//         try {

//             if(!email) throw new Error("email not found");
//             const response = await axios.get('/api/chats/recent' , {params : {email}});
//             set((state)=>({
//                 chats: [...state.chats, ...response.data.chats]
//             }));             
//         } catch (error) {
//             throw error;
//         }
//     }
// }))

import { create } from 'zustand'
import axios from 'axios'
import { io } from 'socket.io-client'
import { useSession } from "next-auth/react"


interface Chats {
    chatId: string,
    latestMessage: string,
    chatName: string,
    updatedAt: Date

}

interface UserChats {
    chats: Chats[]
    message: string
    isLoading: boolean
    fetchRecentChats: (email: string) => Promise<void>
    setCurrentChatId: (id: string) => void
    setPrevChatId: (id: string) => void
    setCurrentUserId: (id: string) => void
    setCursor: (id: string) => void
    setCurrentChatName: (name: string) => void
    createSocket: (id : string) => void,
    currentChatName?: string
    currentChatId?: string
    prevChatId: string
    currentUserId?: string
    cursor?: string | null,

}

export const userChatStore = create<UserChats>((set) => ({
    chats: [],
    message: "",
    isLoading: false,
    currentChatId: undefined,
    prevChatId: "",
    currentUserId: undefined,
    cursor: undefined,
    currentChatName: "",

    fetchRecentChats: async (email: string) => {
        set({ isLoading: true });
        try {
            if (!email) throw new Error("email not found");
            const response = await axios.get('/api/chats/recent', { params: { email } });
            set((state) => ({
                chats: [...state.chats, ...response.data.chats],
                isLoading: false
            }));
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    },

    createSocket(id) {

        console.log("creating socket");

        const socketInstance = io('http://localhost:3000', {
            transports: ['websocket', 'polling'],
            query: { userId: id }  
        });


        socketInstance.on('connect', () => {
            console.log('connected to the socket server')
        })

        socketInstance.on('disconnect', async () => {
            console.log('disconnected from the socket server')
        })
    },

    setCurrentChatId: (id: string) => set({ currentChatId: id }),
    setPrevChatId: (id: string) => set({ prevChatId: id }),
    setCurrentUserId: (id: string) => set({ currentUserId: id }),
    setCursor: (id: string | null) => set({ cursor: id }),
    setCurrentChatName: (name: string) => set({ currentChatName: name })
}))