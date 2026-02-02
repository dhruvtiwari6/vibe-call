import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { parse } from 'url';
import { prisma } from './app/lib/db';
import Redis from 'ioredis';
import * as mediasoup from 'mediasoup';
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

  // Mediasoup setup
  const mediaCodecs: any[] = [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } }
  ];

  let worker: mediasoup.types.Worker;
  let router: mediasoup.types.Router;

  // Map socketId -> { transports, producers, consumers }
  interface PeerData {
    transports: Map<string, mediasoup.types.Transport>;
    producers: Map<string, mediasoup.types.Producer>;
    consumers: Map<string, mediasoup.types.Consumer>;
  }
  const peers = new Map<string, PeerData>();

  (async () => {
    try {
      worker = await mediasoup.createWorker({ logLevel: "warn" });
      // @ts-ignore
      router = await worker.createRouter({ mediaCodecs });
      console.log('✅ Mediasoup Router Ready');
    } catch (error) {
      console.error("Failed to create Mediasoup worker/router:", error);
    }
  })();



  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    if (!userId) return;

    pubClient.sadd(userId, socket.id);

    // Initialize peer data for Mediasoup
    peers.set(socket.id, { transports: new Map(), producers: new Map(), consumers: new Map() });


    socket.join(userId);


    pubClient.sadd(ONLINE_USERS_KEY, userId);
    io.emit('userStatusUpdate', { userId, status: 'online' });


    socket.on('disconnect', () => {
      pubClient.srem(ONLINE_USERS_KEY, userId);

      // Cleanup Mediasoup resources
      const peerData = peers.get(socket.id);
      if (peerData) {
        peerData.producers.forEach(p => socket.broadcast.emit('peer-left', { producerId: p.id }));
        peerData.transports.forEach(t => t.close());
      }
      peers.delete(socket.id);

      socket.on("disconnect", async () => {
        await pubClient.srem(userId, socket.id);
      });

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

    socket.on("joinRoom", async (data) => {
      const { allChats, userId } = data;

      console.log("wtf is this allChats: ", allChats);
      allChats.forEach(async (chat: any) => {
        socket.join(chat.chatId);
        const newCount = await pubClient.get(`unread:${userId}:${chat.chatId}`);
        await pubClient.sadd(`userJoinedRoom:${userId}`, chat.chatId);

        console.log("callled with count ", newCount);


        io.to(userId).emit('unreadCountUpdate', {
          chatId: chat.chatId,
          count: newCount,
        });
      });
    });

    socket.on("memberRemove",
      async (
        { memberId, chatId },
        cb: (res: { success: boolean; message?: string }) => void
      ) => {
        const isInChat = await pubClient.sismember(
          `userJoinedRoom:${memberId}`,
          chatId
        );

        if (!isInChat) {
          return cb({ success: false, message: "User not in chat" });
        }

        const socketIds = await pubClient.smembers(memberId);

        for (const sid of socketIds) {
          io.sockets.sockets.get(sid)?.leave(chatId);
        }

        await pubClient.srem(`userJoinedRoom:${memberId}`, chatId);

        // notify others
        socket.to(chatId).emit("memberRemoved", { memberId, chatId });

        cb({ success: true });
      }
    );



    socket.on("newMessage", async (data) => {
      console.log(`Broadcasting new message to room ${data}`);

      const chat = await prisma.chats.findFirst({
        where: { id: data.chatId },
        include: { participants: true }
      })

      if (!chat || !chat.participants.some(p => p.user_id === data.senderId)) return;

      console.log("participants : ", chat);

      for (const participant of chat?.participants!) {
        const user_id = participant.user_id;
        if (user_id != data.senderId) {
          const newCount = await pubClient.incr(`unread:${user_id}:${data.chatId}`);

          console.log("messsage jaa rha hai user id : ", user_id);

          io.to(user_id).emit('unreadCountUpdate', {
            chatId: data.chatId,
            count: newCount,
          });
        }
      }

      console.log("allsocket in the particular rooom",)

      io.to(data.chatId).emit("newMessage", { data });
    });


    socket.on("markAsRead", async (data) => {
      const { userId, chatId } = data;
      await pubClient.del(`unread:${userId}:${chatId}`);
      socket.emit("unreadCountUpdate", { chatId, count: 0 });
    });


    // socket.on("video call has been started", async (data) => {
    //   const participants = await prisma.chats.findFirst({
    //     where: { id: data.chatId },
    //     include: { participants: true }
    //   })

    //   if (participants) {
    //     participants.participants.forEach(p => {
    //       if (p.user_id !== data.org) {
    //         socket.to(p.user_id).emit("friend started video call", data);
    //       }
    //     });
    //   }
    // })

    // --- Mediasoup Signaling ---

    socket.on('get-router-rtp-capabilities', (cb) => {
      if (!router) {
        cb(null);
        return;
      }
      cb(router.rtpCapabilities);
    });

    socket.on('create-transport', async ({ sender }, cb) => {
      if (!router) return;
      try {
        const transport = await router.createWebRtcTransport({
          listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }], // Adjust announcedIp for production
          enableUdp: true,
          enableTcp: true,
          preferUdp: true
        });

        const peer = peers.get(socket.id);
        if (peer) peer.transports.set(transport.id, transport);

        cb({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });
      } catch (error) {
        console.error("create-transport error:", error);
        cb({ error: error });
      }
    });

    socket.on('transport-connect', async ({ transportId, dtlsParameters }, cb) => {
      const peer = peers.get(socket.id);
      if (!peer) return;
      const transport = peer.transports.get(transportId);
      if (transport) {
        await transport.connect({ dtlsParameters });
      }
      cb();
    });

    socket.on('transport-produce', async ({ transportId, kind, rtpParameters }, cb) => {
      const peer = peers.get(socket.id);
      if (!peer) return;
      const transport = peer.transports.get(transportId);
      if (transport) {
        const producer = await transport.produce({ kind, rtpParameters });
        peer.producers.set(producer.id, producer);

        // Tell everyone else to watch this producer (broadcasting to all for now, logic can be scoped to chat room)
        // Ideally, you should only broadcast to users in the same chatId
        // But adhering to the reference implementation simplicity for now, or relying on client to filter?
        // The reference implementation broadcasts to everyone. We should probably stick to that or try to scope it.
        // Let's scope it to the chat rooms the user is in IF we have that info, otherwise global broadcast might perform poorly.
        // For now, let's just broadcast to everyone connected to socket.io as per the basic example, but we can improve this.
        socket.broadcast.emit('new-producer', { producerId: producer.id, producerSocketId: socket.id });

        cb({ id: producer.id });
      }
    });

    socket.on('get-producers', (cb) => {
      let producerList: { producerId: string; producerSocketId: string }[] = [];
      peers.forEach((peerData, peerId) => {
        if (peerId !== socket.id) {
          peerData.producers.forEach(p => producerList.push({ producerId: p.id, producerSocketId: peerId }));
        }
      });
      cb(producerList);
    });

    socket.on('consume', async ({ rtpCapabilities, transportId, producerId }, cb) => {
      if (!router) return;
      let producerToConsume: mediasoup.types.Producer | undefined;

      peers.forEach(p => {
        if (p.producers.has(producerId)) {
          producerToConsume = p.producers.get(producerId);
        }
      });

      if (producerToConsume && router.canConsume({ producerId: producerToConsume.id, rtpCapabilities })) {
        const peer = peers.get(socket.id);
        if (!peer) return;
        const transport = peer.transports.get(transportId);
        if (transport) {
          try {
            const consumer = await transport.consume({
              producerId: producerToConsume.id,
              rtpCapabilities,
              paused: true
            });
            peer.consumers.set(consumer.id, consumer);

            consumer.on('transportclose', () => {
              peer.consumers.delete(consumer.id);
            });

            consumer.on('producerclose', () => {
              peer.consumers.delete(consumer.id);
              socket.emit('consumer-closed', { consumerId: consumer.id });
            });

            cb({
              id: consumer.id,
              producerId: producerToConsume.id,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters
            });
          } catch (error) {
            console.error("consume error", error);
            cb({ error });
          }
        }
      }
    });

    socket.on('consumer-resume', async ({ consumerId }) => {
      const peer = peers.get(socket.id);
      if (peer) {
        const consumer = peer.consumers.get(consumerId);
        if (consumer) await consumer.resume();
      }
    });

    // Backend socket handler
    socket.on("end-call", async (data) => {
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


    // In your socket server file

    socket.on("video call has been started", (data) => {
      const { chatId, org, callerName } = data;

      // Emit to all users in the chat EXCEPT the caller
      socket.to(chatId).emit("friend started video call", {
        chatId,
        callerId: org,
        callerName
      });
    });

    socket.on("call accepted", (data) => {
      const { chatId, userId } = data;

      // Notify the caller that the call was accepted
      socket.to(chatId).emit("call was accepted", {
        chatId,
        acceptedBy: userId
      });
    });

    socket.on("call rejected", (data) => {
      const { chatId, userId } = data;

      // Notify the caller that the call was rejected
      socket.to(chatId).emit("call was rejected", {
        chatId,
        rejectedBy: userId
      });
    });



  });

  httpServer.listen(port, () => {
    console.log(`🚀 Server ready at http://${hostname}:${port}`);
  });
});

