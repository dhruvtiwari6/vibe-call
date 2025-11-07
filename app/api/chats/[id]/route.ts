import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params; // This is chatId
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "10");

    try {
        const messages = await prisma.messages.findMany({
            where: { chatId: id },
            take: limit,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { createdAt: "desc" },
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


// export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
//   const { id: recipientId } = await context.params;
//   console.log("recipientId : ", recipientId);

//   try {
//     const { content, senderId, fileUrl } = await req.json();

//     console.log("content:", content);
//     console.log("fileUrl:", fileUrl);

//     // Validation: senderId required AND either content OR fileUrl (not both)
//     if (!senderId || (!content && !fileUrl)) {
//         console.log("kjaaa");
//       return NextResponse.json({ error: "Missing Fields" }, { status: 400 });
//     }


//     if (content && fileUrl) {
//       return NextResponse.json({ error: "Cannot send text and file in the same message" }, { status: 400 });
//     }

//     // Find existing chat
//     let chat = await prisma.chats.findFirst({
//       where: { id: recipientId },
//     });

//     let actualChatId: string | undefined = chat?.id;

//     if (!chat) {
//       // Create new chat if it doesn't exist
//       const newChat = await prisma.chats.create({
//         data: {
//           isGroupChat: false,
//           participants: {
//             create: [
//               { user: { connect: { id: recipientId } } },
//               { user: { connect: { id: senderId } } },
//             ],
//           },
//         },
//       });

//       actualChatId = newChat.id;
//     }

//     if (!actualChatId) {
//       return NextResponse.json({ error: "Chat ID could not be determined" }, { status: 500 });
//     }


//     console.log("you reached here");

//     // Create the message
//     const message = await prisma.messages.create({
//       data: {
//         chat: { connect: { id: actualChatId } },
//         sender: { connect: { id: senderId } },
//         content: content || "",
//         fileUrl: fileUrl || null,
//       },
//       include: {
//         sender: { select: { id: true, name: true, avatar: true } },
//       },
//     });

//     return NextResponse.json(
//       {
//         message: "Message has been sent to the user",
//         chatId: actualChatId,
//         messageData: message,
//       },
//       { status: 200 }
//     );

//   } catch (error) {
//     console.error("Error in POST request:", error);
//     return NextResponse.json({ error: "Internal server error" }, { status: 500 });
//   }
// }



export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: recipientId } = await context.params;
  console.log("recipientId:", recipientId);

  try {
    // 👇 full request includes fileRes.data (the Cloudinary result)
    const { content, senderId, fileControl} = await req.json();

    console.log("content:", content);
    console.log("file:", fileControl);

    // ✅ Validation
    if (!senderId || (!content && !fileControl)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (content && fileControl) {
      return NextResponse.json(
        { error: "Cannot send text and file together" },
        { status: 400 }
      );
    }

    // 🧩 Find or create chat
    let chat = await prisma.chats.findFirst({
      where: { id: recipientId },
    });

    let actualChatId = chat?.id;

    if (!chat) {
      const newChat = await prisma.chats.create({
        data: {
          isGroupChat: false,
          participants: {
            create: [
              { user: { connect: { id: recipientId } } },
              { user: { connect: { id: senderId } } },
            ],
          },
        },
      });
      actualChatId = newChat.id;
    }

    if (!actualChatId) {
      return NextResponse.json({ error: "Chat ID could not be determined" }, { status: 500 });
    }

    // 🧠 Extract file info (if exists)
    let fileUrl = null;
    let resourceType = null;
    let duration = null;


    if (fileControl) {
      fileUrl = fileControl.url.url;
      resourceType = fileControl.url.resource_type || null; // "image" or "video"
      duration = fileControl.url.duration || null;

    }

    // 💾 Save message
    const message = await prisma.messages.create({
      data: {
        chat: { connect: { id: actualChatId } },
        sender: { connect: { id: senderId } },
        content: content || "",
        fileUrl,
        resourceType,
        duration,
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    return NextResponse.json(
      {
        message: "Message has been sent to the user",
        chatId: actualChatId,
        messageData: message,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ Error in POST request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
