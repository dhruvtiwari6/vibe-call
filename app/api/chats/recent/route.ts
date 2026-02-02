/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/app/lib/db"

export async function GET(req: NextRequest) {
    try {

        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');
        const cursor = searchParams.get('cursor');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (email === undefined || email === null) {
            return NextResponse.json({ error: "email not found " },
                { status: 400 }
            )
        }

        // First, find the current user
        const currentUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        const userChats = await prisma.chatParticipant.findMany({
            where: {
                user_id: currentUser.id
            },
            include: {
                chat: {
                    select: {
                        id: true,
                        ChatName: true,
                        isGroupChat: true,
                        updatedAt: true,
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                },
            },
            orderBy: {
                chat: {
                    updatedAt: 'desc'
                }
            },
            take: limit,
            ...(cursor ? {
                skip: 1,
                cursor: {
                    id: cursor
                }
            } : {})
        });

        // Transform to simple format
        const chats = userChats.map(participant => {
            const chat = participant.chat;
            let chatName = chat.ChatName;
            const _allParticipants = chat.participants.map(p => p.user_id)


            // For direct messages, get the other user's name
            if (!chat.isGroupChat) {
                const otherUser = chat.participants.find(p => p.user_id !== currentUser.id);
                chatName = otherUser?.user.name || 'Unknown User';
            }

            return {
                id: participant.id, // ChatParticipant id for cursor
                chatId: chat.id,
                chatName: chatName,
                updatedAt: chat.updatedAt,
                _allParticipants: _allParticipants
            };
        });

        return NextResponse.json({
            success: true,
            chats: chats,
            nextCursor: chats.length === limit
                ? chats[chats.length - 1].id
                : null
        });

    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch chats properly" },
            { status: 500 }
        );
    }
}