/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { prisma } from "@/app/lib/db";
import { NextResponse, NextRequest } from "next/server";

type Method = "add" | "remove";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const method = searchParams.get("method") as Method;

        const body: { memberId: string, chatId: string, operation_perf_id: string } = await req.json();
        const { memberId, chatId, operation_perf_id } = body;

        if (method === "add") {
            const _new_member = await prisma.chatParticipant.create({
                data: {
                    chat_id: chatId,
                    user_id: memberId
                }
            });

            return NextResponse.json({ message: "new member added successfully" }, { status: 200 });
        }

        if (method === "remove") {
            const ownership = await prisma.chatParticipant.findFirst({
                where: {
                    chat_id: chatId,
                    user_id: operation_perf_id
                }
            });

            if (!ownership) {
                return NextResponse.json({ message: "Participant not found" }, { status: 404 });
            }

            if (ownership.role === "superAdmin" || ownership.role === "admin") {
                await prisma.chatParticipant.delete({
                    where: {
                        chat_id_user_id: {
                            chat_id: chatId,
                            user_id: memberId
                        }
                    }
                });

                return NextResponse.json({ message: "Member leaved successfully" }, { status: 200 });
            } else {
                return NextResponse.json({ message: "Insufficient permissions to remove member" }, { status: 403 });
            }
        }

        if (method === "leave") {
            const { count } = await prisma.chatParticipant.deleteMany({
                where: {
                    chat_id: chatId,
                    user_id: memberId,
                },
            });

            if (count > 0) {
                return NextResponse.json(
                    { message: "Member leaved successfully" },
                    { status: 200 }
                );
            }

            return NextResponse.json(
                { message: "User is not part of this chat" },
                { status: 404 }
            );
        }


        return NextResponse.json({ message: "Invalid method. Use 'add' or 'remove'" }, { status: 400 });

    } catch (error) {
        console.error("Error in POST /api/chat-participants:", error);
        return NextResponse.json({
            message: "An unexpected error occurred. Please try again later."
        }, { status: 500 });
    }
}