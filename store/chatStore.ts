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

import {create} from 'zustand'
import axios from 'axios'

interface Chats {
    chatId : string,
    latestMessage : string,
    chatName: string,
    updatedAt: Date
    
}

interface UserChats {
    chats : Chats[]
    message: string
    isLoading: boolean
    fetchRecentChats : (email: string) => Promise<void>
    setCurrentChatId: (id :string) => void
    setPrevChatId: (id: string) => void
    setCurrentUserId: (id: string) => void
    setCursor: (id: string) => void
    currentChatId?: string
    prevChatId: string
    currentUserId?: string
    cursor?: string | null,
    
}

export const userChatStore = create<UserChats>((set) => ({
    chats : [],
    message: "",
    isLoading: false,
    currentChatId: undefined,
    prevChatId: "",
    currentUserId: undefined,
    cursor: undefined,
    
    fetchRecentChats : async(email: string) => {
        set({ isLoading: true });
        try {
            if(!email) throw new Error("email not found");
            const response = await axios.get('/api/chats/recent' , {params : {email}});
            set((state)=>({
                chats: [...state.chats, ...response.data.chats],
                isLoading: false
            }));             
        } catch (error) {
            set({ isLoading: false });
            throw error;
        }
    }
    ,

    setCurrentChatId: (id :string) => set({ currentChatId: id }),
    setPrevChatId: (id: string) => set({ prevChatId: id }),
    setCurrentUserId: (id: string) => set({ currentUserId: id}),
    setCursor: (id: string | null) => set({ cursor: id }),
}))