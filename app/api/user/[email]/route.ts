/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { prisma } from '@/app/lib/db';
import { NextResponse } from 'next/server';
// import { authOptions } from '@/auth';

interface Params {
  params: {
    email: string;
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ email: string }> }) {
  try {

    const { email } = await params;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { createdAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ createdAt: user.createdAt });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
