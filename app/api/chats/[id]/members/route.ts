import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        
        const { id } = await context.params; // This is chatId
        const chat = await prisma.chats.findUnique({
            where: { id: id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })
    
        if(!chat) {
            return NextResponse.json({error : "chat not found"}, {status: 404});
        }
    
        //formatting the response
        const members = chat.participants.map((p)=> ({
            id : p.user.id,
            name: p.user.name,
            role: p.role
        }))
    
    
        return NextResponse.json({members}, { status: 200 });
    } catch (error) {
        console.error("Error fetching chat members:", error);
        return NextResponse.json(
        { error: "Failed to fetch chat members" },
        { status: 500 }
        );
    }
}
