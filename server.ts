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

        socket.join(userId);


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

        socket.on("joinRoom", async(data) => {
            const {allChats, userId} = data;
            allChats.forEach(async(chat: any) => {
                socket.join(chat.chatId);
                const newCount = await pubClient.get(`unread:${userId}:${chat.chatId}`);

                console.log("callled with count ", newCount);


                    io.to(userId).emit('unreadCountUpdate', {
                        chatId: chat.chatId,
                        count: newCount,
                    });
            });
        });

        socket.on("newMessage", async (data) => {
            console.log(`Broadcasting new message to room ${data}`);

            const chat = await prisma.chats.findFirst({
                where: { id: data.chatId },
                include: { participants: true }
            })

            for (const participant of chat?.participants!) {
                const user_id = participant.user_id;
                if (user_id != data.senderId) {
                    const newCount = await pubClient.incr(`unread:${user_id}:${data.chatId}`);

                    console.log(user_id);

                    io.to(user_id).emit('unreadCountUpdate', {
                        chatId: data.chatId,
                        count: newCount,
                    });
                }
            }

            io.to(data.chatId).emit("newMessage", { data });
        });


        socket.on("markAsRead", async (data) => {
            const { userId, chatId } = data;
            await pubClient.del(`unread:${userId}:${chatId}`);
            socket.emit("unreadCountUpdate", { chatId, count: 0 });
        });
        
        
        socket.on("video call has been started" , async(data)=>{
            const participants = await prisma.chats.findFirst({
                where : {id : data.chatId},
                include : {participants : true}
            })

            if(participants) {
                participants.participants.forEach(p => {
                    if(p.user_id !== data.org){
                        socket.to(p.user_id).emit("friend started video call", data);
                    }
                });
            }
        })

      socket.on("sdp-offer", async (data) => {
    const { chatId, senderId } = data;

    try {
      const chat = await prisma.chats.findFirst({
        where: { id: chatId },
        include: { participants: true },
      });

      if (chat) {
        for (const p of chat.participants) {
          if (p.user_id !== senderId) {
            io.to(p.user_id).emit("sdp-offer", data);
          }
        }
      }
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  });

  // Handle SDP Answer
  socket.on("sdp-answer", async (data) => {
    const { chatId, senderId } = data;

    try {
      const chat = await prisma.chats.findFirst({
        where: { id: chatId },
        include: { participants: true },
      });

      if (chat) {
        for (const p of chat.participants) {
          if (p.user_id !== senderId) {
            io.to(p.user_id).emit("sdp-answer", data);
          }
        }
      }
    } catch (err) {
      console.error("Error handling answer:", err);
    }
  });

  // Handle ICE Candidate
  socket.on("ice-candidate", async (data) => {
    const { chatId, senderId } = data;

    try {
      const chat = await prisma.chats.findFirst({
        where: { id: chatId },
        include: { participants: true },
      });

      if (chat) {
        for (const p of chat.participants) {
          if (p.user_id !== senderId) {
            io.to(p.user_id).emit("ice-candidate", data);
          }
        }
      }
    } catch (err) {
      console.error("Error handling ICE candidate:", err);
    }
  });
// Backend socket handler
socket.on("end-call", async(data) => {
  const { chatId, senderId } = data;

  console.log("call ended");

  try {
      const chat = await prisma.chats.findFirst({
        where: { id: chatId },
        include: { participants: true },
      });

      if (chat) {
        for (const p of chat.participants) {
            io.to(p.user_id).emit("call-end");
        }
      }
    } catch (err) {
      console.error("Error handling ICE candidate:", err);
    }
  
  // Broadcast to all users in the chat except the sender
});

        

    });

    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at http://${hostname}:${port}`);
    });
});

