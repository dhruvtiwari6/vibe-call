/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
// import { Chathura } from "next/font/google";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("chatId");
    const userId = searchParams.get("userId");

    console.log("userId andd id  : ", userId, " -> ", id);

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Missing required query params: user1Id and user2Id" },
        { status: 400 }
      );
    }

    let user2Details;



    const chatById = await prisma.chats.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (chatById) console.log("chatById exists");

    if (chatById && chatById.participants.length === 2 && chatById.isGroupChat === false) {
      // Find the other participant (not the current user)
      const otherParticipant = chatById.participants.find(p => p.user_id !== userId);

      // console.log(chatById.participants);

      if (!otherParticipant) {
        return NextResponse.json({ error: "Other participant not found" }, { status: 404 });
      }

      user2Details = await prisma.user.findUnique({
        where: { id: otherParticipant.user_id },
      });

      // if(otherParticipant) console.log(otherParticipant);

      return NextResponse.json(
        { chatName: user2Details?.name },
        { status: 200 }
      );
    }
    return NextResponse.json({ chatName: chatById?.ChatName }, { status: 200 });

  } catch (err) {
    console.error("GET /api/chats error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
