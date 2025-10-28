// app/api/users/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/app/lib/db";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '0');
  const limit = parseInt(searchParams.get('limit') || '20');
  const currentUserId = searchParams.get('userId');

  // If no userId provided, return error since we need it for groups
  if (!currentUserId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // Search for users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true
      },
      skip: page * limit,
      take: limit,
      orderBy: { name: 'asc' }
    });

    // Search for group chats where the user is a participant
    const groups = await prisma.chats.findMany({
      where: {
        AND: [
          { isGroupChat: true },
          { ChatName: { contains: query, mode: 'insensitive' } },
          {
            participants: {
              some: {
                user_id: currentUserId
              }
            }
          }
        ]
      },
      select: {
        id: true,
        ChatName: true,
        isGroupChat: true,
        participants: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          },
          take: 3 // Show first 3 participants as preview
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      skip: page * limit,
      take: limit,
      orderBy: { ChatName: 'asc' }
    });

    // Format the response
    const formattedGroups = groups.map(group => ({
      id: group.id,
      name: group.ChatName,
      isGroupChat: group.isGroupChat,
      participantCount: group._count.participants,
      participants: group.participants.map(p => p.user)
    }));

    return NextResponse.json({ 
      users, 
      groups: formattedGroups 
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}