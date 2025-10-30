import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const user1Id = searchParams.get("user1Id");
    const user2Id = searchParams.get("user2Id");

    if (!user1Id || !user2Id) {
      return NextResponse.json(
        { error: "Missing required query params: user1Id and user2Id" },
        { status: 400 }
      );
    }

    let user2Details;



    // 🧠 Step 1: Check if user2Id is actually a chatId
    const chatById = await prisma.chats.findUnique({
      where: { id: user2Id },
      include: { participants: true },
    });

    if (chatById && chatById.participants.length === 2 && chatById.isGroupChat === false) {
      // Find the other participant (not the current user)
      const otherParticipant = chatById.participants.find(p => p.user_id !== user1Id);

      if (!otherParticipant) {
        return NextResponse.json({ error: "Other participant not found" }, { status: 404 });
      }

      // Fetch the user details
      user2Details = await prisma.user.findUnique({
        where: { id: otherParticipant.id },
      });

      return NextResponse.json(
        { chatId: chatById.id, chatName: user2Details?.name },
        { status: 200 }
      );
    }

    console.log("its actual group chat");
    if (chatById) {
      console.log("Found chat by ID");
      return NextResponse.json({ chatId: chatById.id, chatName: chatById.ChatName }, { status: 200 });
    }

    //if it is user id and they are already being in a chat
    const existingChat = await prisma.chats.findFirst({
      where: {
        isGroupChat: false,
        AND: [
          { participants: { some: { user_id: user1Id } } },
          { participants: { some: { user_id: user2Id } } },
          // Ensure there are no extra participants
          {
            participants: {
              every: {
                user_id: { in: [user1Id, user2Id] },
              },
            },
          },
        ],
      },
      include: {
        participants: {
          include: { user: true },
        },
      },
    });

    user2Details = await prisma.user.findUnique({
      where: { id: user2Id },
    });

    if (existingChat) {
      return NextResponse.json({ chatId: existingChat.id, chatName: user2Details?.name }, { status: 200 });

    }

    console.log("No chat found — creating new one : ", user2Id);
    const newChat = await prisma.chats.create({
      data: {
        isGroupChat: false,
        participants: {
          create: [
            { user: { connect: { id: user1Id } } },
            { user: { connect: { id: user2Id } } },
          ],
        },
      },
    });

    return NextResponse.json({ chatId: newChat.id, chatName: user2Details?.name }, { status: 201 });
  } catch (err) {
    console.error("GET /api/chats error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
