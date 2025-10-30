import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/db';


export async function PUT(req: NextRequest) {
    try {

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('cs');
        const user_id = searchParams.get('id') as string;


        const updatedUser = await prisma.user.update({
            where: { id: user_id },
            data: {
                status: status
            }
        });

        return NextResponse.json({ message: `Status updated to ${status}` }, { status: 200 });
    }

    catch (error) {
        console.error('Error in changeStatus route:', error);
        return NextResponse.json({ error: 'Server crashed', details: String(error) }, { status: 500 });
    }
}
