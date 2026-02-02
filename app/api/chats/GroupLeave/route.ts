/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { prisma } from "@/app/lib/db";
import { NextResponse, NextRequest } from "next/server";

type Method = "groupLeave";

interface _QueryParams {
    method: Method
}

export async function POST(req: NextRequest) {
    const { searchParams }  = new URL(req.url);
    const method = searchParams.get("method");
    
    const body : {memberId : string, chatId: string, operation_perf_id: string} = await req.json();
    const {memberId, chatId, operation_perf_id} = body;


    if(method === "groupLeave" && operation_perf_id === memberId) {
        const participant = await prisma.chatParticipant.findFirst({
            where:{
                chat_id : chatId,
                user_id: memberId
            }
        })

        if (!participant) {
            return NextResponse.json({ message: "Participant not found" }, { status: 404 });
        }

        await prisma.chatParticipant.delete({
            where : {
                id : participant.id
            }
        })

        
    }
}