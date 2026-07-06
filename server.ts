
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import { prisma } from './app/lib/db';
import Redis from 'ioredis';
import * as mediasoup from 'mediasoup';
import { createAdapter } from '@socket.io/redis-adapter';

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

    console.log("REDIS_URL =", process.env.REDIS_URL);
  const pubClient = new Redis(process.env.REDIS_URL!);
  const subClient = pubClient.duplicate();

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.adapter(createAdapter(pubClient, subClient));

  // ---------------------------------------------------------------------------
  // Mediasoup setup
  // ---------------------------------------------------------------------------
  const mediaCodecs: any[] = [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: { 'x-google-start-bitrate': 1000 },
    },
  ];

  let worker: mediasoup.types.Worker;
  let router: mediasoup.types.Router;

  (async () => {
    try {
      worker = await mediasoup.createWorker({ logLevel: 'warn' });
      router = await worker.createRouter({ mediaCodecs });
      console.log('✅ Mediasoup Worker + Router Ready');
    } catch (error) {
      console.error('Failed to create Mediasoup worker/router:', error);
    }
  })();

  // ---------------------------------------------------------------------------
  // In-memory state
  // ---------------------------------------------------------------------------
interface PeerData {
  transports: Map<string, mediasoup.types.WebRtcTransport>;
  producers: Map<string, mediasoup.types.Producer>;
  consumers: Map<string, mediasoup.types.Consumer>;
}

// Modify producers map - remove chatId


  // socketId  ->  peer data
  const peers = new Map<string, PeerData>();

  // producerId  ->  { socketId, producer, chatId }
  const producers = new Map<
    string,
    { socketId: string; producer: mediasoup.types.Producer; chatId: string }
  >();

  const ONLINE_USERS_KEY = 'onlineUsers';

 

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string;
  if (!userId) return;

  pubClient.sadd(userId, socket.id);
  socket.join(userId);
  pubClient.sadd(ONLINE_USERS_KEY, userId);
  io.emit('userStatusUpdate', { userId, status: 'online' });

  // Register peer - no chatId needed
  peers.set(socket.id, {
    transports: new Map(),
    producers: new Map(),
    consumers: new Map(),
  });

  // *** NEW: Send existing producers immediately on connection ***
  socket.on(
    'get-producers',
    (
      { chatId }: { chatId: string },
      cb: (res: { 
        existingProducers: Array<{ producerId: string, socketId: string }> 
      }) => void
    ) => {
      const existingProducers: Array<{ producerId: string, socketId: string }> = [];
      
      producers.forEach((p, id) => {
        // Don't send your own producers, and filter by chatId
        if (p.socketId !== socket.id && p.chatId === chatId) {
          existingProducers.push({ 
            producerId: id, 
            socketId: p.socketId 
          });
        }
      });

      console.log(`Socket ${socket.id} requested producers for chat ${chatId}. Found: ${existingProducers.length}`);
      cb({ existingProducers });
    }
  );

  // Disconnect handler
  socket.on('disconnect', async () => {
    console.log('user disconnected:', userId, socket.id);

    await pubClient.srem(userId, socket.id);
    const activeConnections = await pubClient.scard(userId);
    if (activeConnections === 0) {
      await pubClient.srem(ONLINE_USERS_KEY, userId);
      io.emit('userStatusUpdate', { userId, status: 'offline' });
    }

    const peer = peers.get(socket.id);
    if (peer) {
      // Notify everyone that this user's producers are gone
      peer.producers.forEach((_producer, producerId) => {
        const prodData = producers.get(producerId);
        const chatId = prodData?.chatId;
        producers.delete(producerId);
        
        if (chatId) {
          socket.to(chatId).emit('producer-closed', { 
            producerId,
            producerSocketId: socket.id
          });
        } else {
          socket.broadcast.emit('producer-closed', { 
            producerId,
            producerSocketId: socket.id
          });
        }
      });

      peer.transports.forEach((t) => t.close());
      peers.delete(socket.id);
    }
  });

  // Chat / messaging handlers
  socket.on('Status', async (data) => {
    try {
      const chat = await prisma.chats.findFirst({
        where: { id: data.chatId },
        include: { participants: true },
      });
      if (!chat) return;

      const groupParticipants = chat.participants
        .filter((p) => p.user_id !== data.id)
        .map((p) => p.user_id);

      const onlineUsers = await pubClient.smembers(ONLINE_USERS_KEY);
      const onlineCount = groupParticipants.filter((id) =>
        onlineUsers.includes(id)
      ).length;

      let statusText = '';
      if (chat.isGroupChat) {
        statusText = `${onlineCount} online`;
      } else {
        statusText = onlineCount > 0 ? 'online' : 'offline';
      }

      socket.emit('Status', { status: statusText });
    } catch (error) {
      console.error('Error handling Status event:', error);
    }
  });

  socket.on('addedToGroup', (data) => {
    try {
      const { chatId, members } = data;
      if (Array.isArray(members)) {
        members.forEach((memberId) => {
          io.to(memberId).emit('addedToGroup', { chatId });
        });
      }
    } catch (error) {
      console.error('Error handling addedToGroup event:', error);
    }
  });

  socket.on('joinRoom', async (data) => {
    try {
      const { allChats, userId: joinUserId } = data;

      allChats.forEach(async (chat: any) => {
        socket.join(chat.chatId);
        const newCount = await pubClient.get(
          `unread:${joinUserId}:${chat.chatId}`
        );
        await pubClient.sadd(`userJoinedRoom:${joinUserId}`, chat.chatId);

        io.to(joinUserId).emit('unreadCountUpdate', {
          chatId: chat.chatId,
          count: newCount ? parseInt(newCount, 10) : 0,
        });
      });
    } catch (error) {
      console.error('Error handling joinRoom event:', error);
    }
  });

  socket.on(
    'memberRemove',
    async (
      { memberId, chatId },
      cb: (res: { success: boolean; message?: string }) => void
    ) => {
      try {
        const isInChat = await pubClient.sismember(
          `userJoinedRoom:${memberId}`,
          chatId
        );
        if (!isInChat)
          return cb({ success: false, message: 'User not in chat' });

        const socketIds = await pubClient.smembers(memberId);
        for (const sid of socketIds) {
          io.sockets.sockets.get(sid)?.leave(chatId);
        }
        await pubClient.srem(`userJoinedRoom:${memberId}`, chatId);
        socket.to(chatId).emit('memberRemoved', { memberId, chatId });
        cb({ success: true });
      } catch (error) {
        console.error('Error handling memberRemove event:', error);
        cb({ success: false, message: 'Internal server error' });
      }
    }
  );

  socket.on('newMessage', async (data) => {
    try {
      const chat = await prisma.chats.findFirst({
        where: { id: data.chatId },
        include: { participants: true },
      });
      if (
        !chat ||
        !chat.participants.some((p) => p.user_id === data.senderId)
      )
        return;

      for (const participant of chat.participants) {
        const uid = participant.user_id;
        if (uid !== data.senderId) {
          const newCount = await pubClient.incr(
            `unread:${uid}:${data.chatId}`
          );
          io.to(uid).emit('unreadCountUpdate', {
            chatId: data.chatId,
            count: newCount,
          });
        }
      }

      io.to(data.chatId).emit('newMessage', { data });
    } catch (error) {
      console.error('Error handling newMessage event:', error);
    }
  });

  socket.on('markAsRead', async (data) => {
    try {
      const { userId: readUserId, chatId } = data;
      await pubClient.del(`unread:${readUserId}:${chatId}`);
      socket.emit('unreadCountUpdate', { chatId, count: 0 });
    } catch (error) {
      console.error('Error handling markAsRead event:', error);
    }
  });

  // Call signaling handlers
  socket.on('video call has been started', (data) => {
    const { chatId, org, callerName } = data;
    socket.to(chatId).emit('friend started video call', {
      chatId,
      callerId: org,
      callerName,
    });
  });

  socket.on('call accepted', (data) => {
    const { chatId, userId: acceptUserId } = data;
    socket.to(chatId).emit('call was accepted', {
      chatId,
      acceptedBy: acceptUserId,
    });
  });

  socket.on('call rejected', (data) => {
    const { chatId, userId: rejectUserId } = data;
    socket.to(chatId).emit('call was rejected', {
      chatId,
      rejectedBy: rejectUserId,
    });
  });

  socket.on('end-call', async (data) => {
    const { chatId } = data;
    console.log('call ended in chatId:', chatId);
    try {
      const chat = await prisma.chats.findFirst({
        where: { id: chatId },
        include: { participants: true },
      });
      if (chat) {
        for (const p of chat.participants) {
          io.to(p.user_id).emit('call-end');
        }
      }
    } catch (err) {
      console.error('Error handling end-call:', err);
    }
  });

  // Mediasoup handlers
  socket.on(
    'routerCapability',
    (cb: (res: { rtpCapabilities: mediasoup.types.RtpCapabilities }) => void) => {
      cb({ rtpCapabilities: router.rtpCapabilities });
    }
  );

  socket.on(
    'create-transport',
    async (
      { sender }: { sender: boolean },
      cb: (res: {
        id: string;
        iceParameters: mediasoup.types.IceParameters;
        iceCandidates: mediasoup.types.IceCandidate[];
        dtlsParameters: mediasoup.types.DtlsParameters;
      }) => void
    ) => {
      try {
        const transport = await router.createWebRtcTransport({
          listenInfos: [
            {
              protocol: 'udp',
              ip: '0.0.0.0',
              announcedAddress: '127.0.0.1',
              portRange: { min: 40000, max: 40100 },
            },
            {
              protocol: 'tcp',
              ip: '0.0.0.0',
              announcedAddress: '127.0.0.1',
              portRange: { min: 40000, max: 40100 },
            },
          ],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true,
          initialAvailableOutgoingBitrate: 1_000_000,
        });

        const peer = peers.get(socket.id);
        if (peer) peer.transports.set(transport.id, transport);

        cb({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
      } catch (error) {
        console.error('Error creating transport:', error);
      }
    }
  );

  socket.on(
    'transport-connect',
    async (
      {
        dtlsParameters,
        transportId,
      }: {
        dtlsParameters: mediasoup.types.DtlsParameters;
        transportId: string;
      },
      cb: () => void
    ) => {
      try {
        const peer = peers.get(socket.id);
        const transport = peer?.transports.get(transportId);
        if (!transport) {
          console.error('Transport not found:', transportId);
          return;
        }
        await transport.connect({ dtlsParameters });
        cb();
      } catch (error) {
        console.error('Error connecting send transport:', error);
      }
    }
  );

  socket.on(
    'transport-recv-connect',
    async (
      {
        dtlsParameters,
        transportId,
      }: {
        dtlsParameters: mediasoup.types.DtlsParameters;
        transportId: string;
      },
      cb: () => void
    ) => {
      try {
        const peer = peers.get(socket.id);
        const transport = peer?.transports.get(transportId);
        if (!transport) {
          console.error('Transport not found:', transportId);
          return;
        }
        await transport.connect({ dtlsParameters });
        cb();
      } catch (error) {
        console.error('Error connecting recv transport:', error);
      }
    }
  );

  socket.on(
    'transport-produce',
    async (
      {
        kind,
        rtpParameters,
        transportId,
        chatId,
      }: {
        kind: 'audio' | 'video';
        rtpParameters: mediasoup.types.RtpParameters;
        transportId: string;
        chatId: string;
      },
      cb: (res: { id: string }) => void
    ) => {
      try {
        const peer = peers.get(socket.id);
        const transport = peer?.transports.get(transportId);
        if (!transport) {
          console.error('Transport not found:', transportId);
          return;
        }

        const producer = await transport.produce({ kind, rtpParameters });

        // Store with chatId
        producers.set(producer.id, { socketId: socket.id, producer, chatId });
        peer?.producers.set(producer.id, producer);

        console.log(
          'Producer created:',
          producer.id,
          'kind:',
          kind,
          'by',
          socket.id,
          'in chat:',
          chatId
        );

        // Broadcast ONLY to the chat room
        socket.to(chatId).emit('new-producer', { 
          producerId: producer.id,
          producerSocketId: socket.id
        });

        cb({ id: producer.id });
      } catch (error) {
        console.error('Error producing:', error);
      }
    }
  );

  socket.on(
    'consume',
    async (
      {
        rtpCapabilities,
        producerId,
        transportId,
      }: {
        rtpCapabilities: mediasoup.types.RtpCapabilities;
        producerId: string;
        transportId: string;
      },
      cb: (res: {
        id: string;
        producerId: string;
        kind: 'audio' | 'video';
        rtpParameters: mediasoup.types.RtpParameters;
      }) => void
    ) => {
      try {
        const producerData = producers.get(producerId);
        if (!producerData) {
          console.error('Producer not found:', producerId);
          return;
        }

        if (!router.canConsume({ producerId, rtpCapabilities })) {
          console.error('Cannot consume producer:', producerId);
          return;
        }

        const peer = peers.get(socket.id);
        const transport = peer?.transports.get(transportId);
        if (!transport) {
          console.error('Transport not found:', transportId);
          return;
        }

        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: true,
        });

        peer?.consumers.set(consumer.id, consumer);
        console.log(
          'Consumer created:',
          consumer.id,
          'for producer:',
          producerId
        );

        cb({
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (error) {
        console.error('Error consuming:', error);
      }
    }
  );

  socket.on(
    'consumer-resume',
    async ({ consumerId }: { consumerId: string }) => {
      try {
        const peer = peers.get(socket.id);
        const consumer = peer?.consumers.get(consumerId);
        if (!consumer) {
          console.error('Consumer not found:', consumerId);
          return;
        }
        await consumer.resume();
        console.log('Consumer resumed:', consumerId);
      } catch (error) {
        console.error('Error resuming consumer:', error);
      }
    }
  );
});

  // ---------------------------------------------------------------------------
  httpServer.listen(port, () => {
    console.log(`🚀 Server ready at http://${hostname}:${port}`);
  });
});