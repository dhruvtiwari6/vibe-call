import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/app/lib/db";

export async function PUT(req: NextRequest) {
    try{
        const body = await req.json();
        const {image_public_url , user_id} = body;

        console.log("Updating avatar for user:", user_id, "with URL:", image_public_url);

        const isUpdated = await prisma.user.update({
            where: { id: user_id },
            data: { image: image_public_url }
        })

        if(!isUpdated){
            return NextResponse.json({ error: "Failed to update avatar" }, { status: 500 });
        }

        return NextResponse.json({ message: "Avatar updated successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error updating avatar:", error);
        return NextResponse.json({ message: "Failed to update avatar" }, { status: 500 });
    }
}