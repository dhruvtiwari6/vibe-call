import { prisma } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface Data {
    chatName: string;
    chatMembers: string[];
    AdminId: string;
};

export async function POST(req: NextRequest) {

    try {
        const body: Data = await req.json();
        const { chatName, chatMembers, AdminId } = body;

        //create a chat Room
        const new_chat = await prisma.chats.create({
            data: {
                ChatName: chatName,
                isGroupChat: true,
            }
        })


        //add admin as participants
        await prisma.chatParticipant.create({
            data: {
                chat_id: new_chat.id,
                user_id: AdminId,
                role: "superAdmin"
            }
        })

        // add members as participants
        await prisma.chatParticipant.createMany({
            data: chatMembers.map((userId) => ({
                chat_id: new_chat.id,
                user_id: userId,
                role: "member",
            })),
        });
        return NextResponse.json({ success: true, chat: new_chat });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: "Failed to create chat" }, { status: 500 });
    }

}