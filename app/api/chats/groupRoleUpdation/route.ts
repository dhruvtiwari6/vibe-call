import { prisma } from "@/app/lib/db";
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");

    const body: { memberId: string; chatId: string; operation_perf_id: string } = await req.json();
    const { memberId, chatId, operation_perf_id } = body;

    if (method === "update") {
      const ownership = await prisma.chatParticipant.findFirst({
        where: { chat_id: chatId, user_id: operation_perf_id },
      });

      const member_to_updation = await prisma.chatParticipant.findFirst({
        where: { chat_id: chatId, user_id: memberId },
      });

      if (!ownership || !member_to_updation) {
        return NextResponse.json(
          { message: "Participant not found or admin not found" },
          { status: 404 }
        );
      }

      if (
        (ownership.role === "superAdmin" || ownership.role === "admin") &&
        member_to_updation.role === "member"
      ) {
        await prisma.chatParticipant.update({
          where: { id: member_to_updation.id },
          data: { role: "admin" },
        });

        return NextResponse.json({ message: "Member promoted to admin" }, { status: 200 });
      } else {
        return NextResponse.json({ message: "You cannot promote this member" }, { status: 403 });
      }
    }else if (method === "demote") {
      const ownership = await prisma.chatParticipant.findFirst({
        where: { chat_id: chatId, user_id: operation_perf_id },
      });

      const member_to_updation = await prisma.chatParticipant.findFirst({
        where: { chat_id: chatId, user_id: memberId },
      });

      if (!ownership || !member_to_updation) {
        return NextResponse.json(
          { message: "Participant not found or admin not found" },
          { status: 404 }
        );
      }

      if (
        (ownership.role === "superAdmin") &&
        member_to_updation.role === "admin"
      ) {
        await prisma.chatParticipant.update({
          where: { id: member_to_updation.id },
          data: { role: "member" },
        });

        return NextResponse.json({ message: "Member demoted to member" }, { status: 200 });
      } else {
        return NextResponse.json({ message: "You cannot demote him/her" }, { status: 403 });
      }
    }

    return NextResponse.json({ message: "Invalid method" }, { status: 400 });
  } catch (error) {
    console.error("Error in POST /chatParticipant:", error);
    return NextResponse.json(
      { message: "Something went wrong", error: (error as Error).message },
      { status: 500 }
    );
  }
}
