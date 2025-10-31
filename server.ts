import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import { prisma } from './app/lib/db';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    });


    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: dev ? 'http://localhost:3000' : 'https://your-domain.com',
            methods: ['GET', 'POST'],
        },
    });

    const onlineUsers = new Set();

    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;
        onlineUsers.add(userId);

        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            console.log('user disconnected: ', userId);
        });

        socket.on('Status', async (data) => {
            // console.log("Status event received for id: ", data.id);

            const participants = await prisma.chats.findFirst({
                where: { id: data.chatId },
                include: {
                    participants: true
                }
            })

            const isGroupChat = await prisma.chats.findFirst({
                where: { id: data.chatId }
            });

            if (isGroupChat?.isGroupChat === true) {
                const groupParticipants = participants?.participants
                    .filter(p => p.user_id !== data.id)
                    .map(p => p.user_id);

                const onlineCount = groupParticipants?.filter(id => onlineUsers.has(id)).length || 0;

                socket.emit('Status', { status: `${onlineCount} online` });

            } else {

                const otherParticipant = participants?.participants.find(participant => participant.user_id !== data.id)!;
                // console.log("online users set: ", onlineUsers);

                if (onlineUsers.has(otherParticipant.user_id)) {
                    // console.log("User is online: ", otherParticipant.id);
                    socket.emit('Status', { status: 'online' });
                } else {
                    // console.log("User is offline: ", otherParticipant.id);
                    socket.emit('Status', { status: 'offline' });
                }
            }
        });

        socket.on("joinRoom", (allChats) => {
            allChats.forEach((chat: any) => {
                chat.allParticipants.forEach((participantId: string) => {
                    if (onlineUsers.has(participantId)) {
                        socket.join(chat.chatId);
                        console.log(`User ${participantId} joined chat room: ${chat.chatId}`);
                    }
                });
            });
        });


        socket.on("newMessage", (data) => {
            console.log("Message received from client:", data);

            // Broadcast to everyone in that chat room (including sender)
            console.log(`Broadcasting new message to chat room ${data.chatId}`);
            io.to(data.chatId).emit("newMessage", {
                data,
            });

            // Or if you want to send to everyone EXCEPT sender:
            // socket.broadcast.to(data.chatId).emit("newMessage", data);
        });

    });




    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at http://${hostname}:${port}`);
    });
});
