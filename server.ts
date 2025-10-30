import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import axios from 'axios';

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
        io.emit('userStatusUpdate', { userId, status: 'online' });

        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            console.log('user disconnected: ', userId);
        });
    });


    httpServer.listen(port, () => {
        console.log(`🚀 Server ready at http://${hostname}:${port}`);
    });
});
