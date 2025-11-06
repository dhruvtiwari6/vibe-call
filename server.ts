import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import { prisma } from './app/lib/db';
import Redis from 'ioredis';
import { createAdapter } from "@socket.io/redis-adapter";

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const pubClient = new Redis();
  const subClient = pubClient.duplicate();


  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST'],
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  const ONLINE_USERS_KEY = 'onlineUsers';

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (!userId) return;

    pubClient.sadd(ONLINE_USERS_KEY, userId);
    io.emit('userStatusUpdate', { userId, status: 'online' });


    socket.on('disconnect', () => {
      pubClient.srem(ONLINE_USERS_KEY, userId);
      console.log('user disconnected: ', userId);

      io.emit('userStatusUpdate', { userId, status: 'offline' });

    });

    socket.on('Status', async (data) => {
      const participants = await prisma.chats.findFirst({
        where: { id: data.chatId },
        include: { participants: true },
      });

      if (!participants) return;

      const groupParticipants = participants.participants
        .filter(p => p.user_id !== data.id)
        .map(p => p.user_id);

      const onlineUsers = await pubClient.smembers(ONLINE_USERS_KEY);
      const onlineCount = groupParticipants.filter(id => onlineUsers.includes(id)).length;

      socket.emit('Status', { status: `${onlineCount} online` });
    });

    socket.on("joinRoom", (allChats) => {
      allChats.forEach((chat: any) => {
        socket.join(chat.chatId);
        console.log(`User ${userId} joined chat room: ${chat.chatId}`);
      });
    });

    socket.on("newMessage", (data) => {
      console.log(`Broadcasting new message to room ${data.chatId}`);
      io.to(data.chatId).emit("newMessage", { data });
    });
  });

  httpServer.listen(port, () => {
    console.log(`🚀 Server ready at http://${hostname}:${port}`);
  });
});
