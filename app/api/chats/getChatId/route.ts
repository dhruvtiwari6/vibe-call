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

    // 🧠 Step 1: Check if user2Id is actually a chatId
    const chatById = await prisma.chats.findUnique({
      where: { id: user2Id },
      include: { participants: true },
    });

    if (chatById) {
      console.log("Found chat by ID");
      return NextResponse.json({ chatId: chatById.id }, { status: 200 });
    }

    // 🧠 Step 2: Check if a 1:1 chat already exists between the two users
    const existingChat = await prisma.chats.findFirst({
      where: {
        isGroupChat: false,
        AND: [
          { participants: { some: { user_id: user1Id } } },
          { participants: { some: { user_id: user2Id } } },
          { participants: { every: { user_id: { in: [user1Id, user2Id] } } } },
        ],
      },
      include: { participants: true },
    });

    if (existingChat) {
      console.log("Found existing chat between users");
      return NextResponse.json({ chatId: existingChat.id }, { status: 200 });
    }

    // 🧠 Step 3: Create a new chat between them
    console.log("No chat found — creating new one");
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

    return NextResponse.json({ chatId: newChat.id }, { status: 201 });
  } catch (err) {
    console.error("GET /api/chats error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
