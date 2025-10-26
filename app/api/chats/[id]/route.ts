import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{id: string }> }) {
    const { id } = await context.params; // This is chatId
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    

    try {
        const messages = await prisma.messages.findMany({
            where: { chatId: id },
            take: limit,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { createdAt: "asc" },
            include: {
                sender: {
                    select: { id: true, name: true, avatar: true }
                }
            }
        })

        console.log(messages.length)
        return NextResponse.json({
            messages,
            nextCursor:
                messages.length === limit
                    ? messages[messages.length - 1].id
                    : null,
        });

    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}

export async function POST(req: NextRequest, context: { params: Promise<{id: string }> }) {
    const { id: recipientId } = await context.params; // This is recipientId
    console.log("recipientId : ", recipientId);
    
    try {
        const { content, senderId } = await req.json();

        if (!senderId || !content) {
            return NextResponse.json({ error: "Missing Fields" }, { status: 400 });
        }

        // Your existing POST logic here...
        let chat = await prisma.chats.findFirst({
            where: {
                isGroupChat: false,
                participants: {
                    every: {
                        user_id: { in: [senderId, recipientId] }
                    }
                }
            },
        });

       let actualChatId: string | undefined = chat?.id;

        if (!chat) {  // chatId is actually recipient user ID, create new chat
            console.log("theere does not eexist a chat betweeen these users")
            try {
                const newChat = await prisma.chats.create({
                    data: {
                        isGroupChat: false,
                        participants: {
                            create: [
                                { user: { connect: { id: recipientId } } }, // recipient user ID
                                { user: { connect: { id: senderId } } }
                            ]
                        },
                    },
                });

                actualChatId = newChat.id;

            } catch (createChatError) {
                console.error("Failed to create chat:", createChatError);
                return NextResponse.json({ error: "Failed to create chat" }, { status: 500 });
            }
        }

        if (!actualChatId) {
            return NextResponse.json({ error: "Chat ID could not be determined" }, { status: 500 });
        }

        // Create the message
        try {
            const message = await prisma.messages.create({
                data: {
                    chat: { connect: { id: actualChatId } },
                    sender: { connect: { id: senderId } },
                    content,
                },
                include: {
                    sender: {
                        select: { id: true, name: true, avatar: true }
                    }
                }
            });

            return NextResponse.json({
                message: "Message has been sent to the user",
                chatId: actualChatId,
                messageData: message
            }, { status: 200 });

        } catch (createMessageError) {
            console.error("Failed to send message:", createMessageError);
            return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
        }
        
    } catch (error) {
        console.error("Error in POST request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}