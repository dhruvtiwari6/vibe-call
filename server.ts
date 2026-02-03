// import { createServer } from 'http';
// import { Server as SocketIOServer } from 'socket.io';
// import next from 'next';
// import { parse } from 'url';
// import { prisma } from './app/lib/db';
// import Redis from 'ioredis';
// import * as mediasoup from 'mediasoup';
// import { createAdapter } from "@socket.io/redis-adapter";

// const dev = process.env.NODE_ENV !== 'production';
// const hostname = 'localhost';
// const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// const app = next({ dev, hostname, port });
// const handle = app.getRequestHandler();



// app.prepare().then(async () => {
//   const httpServer = createServer((req, res) => {
//     const parsedUrl = parse(req.url!, true);
//     handle(req, res, parsedUrl);
//   });

//   const pubClient = new Redis();
//   const subClient = pubClient.duplicate();


//   const io = new SocketIOServer(httpServer, {
//     cors: {
//       origin: '*',
//       methods: ['GET', 'POST'],
//     },
//   });

//   io.adapter(createAdapter(pubClient, subClient));



//   // Store data per peer
//   const peers = new Map(); // socketId -> { transports: Map, producers: Map, consumers: Map }
//   const producers = new Map(); // producerId -> { socketId, producer }

//   const ONLINE_USERS_KEY = 'onlineUsers';

//   // Mediasoup setup
//   const mediaCodecs: any[] = [
//     { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
//     { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } }
//   ];

//   let worker: mediasoup.types.Worker;
//   let router: mediasoup.types.Router;

//   // Map socketId -> { transports, producers, consumers }
//   interface PeerData {
//     transports: Map<string, mediasoup.types.Transport>;
//     producers: Map<string, mediasoup.types.Producer>;
//     consumers: Map<string, mediasoup.types.Consumer>;
//   }

//   (async () => {
//     try {
//       worker = await mediasoup.createWorker({ logLevel: "warn" });
//       // @ts-ignore
//       router = await worker.createRouter({ mediaCodecs });
//       console.log('✅ Mediasoup Router Ready');
//     } catch (error) {
//       console.error("Failed to create Mediasoup worker/router:", error);
//     }
//   })();



//   io.on('connection', (socket) => {
//     const userId = socket.handshake.query.userId as string;
//     if (!userId) return;

//     pubClient.sadd(userId, socket.id);

//     socket.join(userId);


//     pubClient.sadd(ONLINE_USERS_KEY, userId);
//     io.emit('userStatusUpdate', { userId, status: 'online' });


//     socket.on('disconnect', () => {
//       pubClient.srem(ONLINE_USERS_KEY, userId);

//       // Cleanup Mediasoup resources
//       const peerData = peers.get(socket.id);
//       // if (peerData) {
//       //   peerData.producers.forEach(p => socket.broadcast.emit('peer-left', { producerId: p.id }));
//       //   peerData.transports.forEach(t => t.close());
//       // }
//       peers.delete(socket.id);

//       socket.on("disconnect", async () => {
//         await pubClient.srem(userId, socket.id);
//       });

//       console.log('user disconnected: ', userId);

//       io.emit('userStatusUpdate', { userId, status: 'offline' });

//     });


//     socket.on('Status', async (data) => {
//       const participants = await prisma.chats.findFirst({
//         where: { id: data.chatId },
//         include: { participants: true },
//       });

//       if (!participants) return;

//       const groupParticipants = participants.participants
//         .filter(p => p.user_id !== data.id)
//         .map(p => p.user_id);

//       const onlineUsers = await pubClient.smembers(ONLINE_USERS_KEY);
//       const onlineCount = groupParticipants.filter(id => onlineUsers.includes(id)).length;

//       socket.emit('Status', { status: `${onlineCount} online` });
//     });

//     socket.on("joinRoom", async (data) => {
//       const { allChats, userId } = data;

//       console.log("wtf is this allChats: ", allChats);
//       allChats.forEach(async (chat: any) => {
//         socket.join(chat.chatId);
//         const newCount = await pubClient.get(`unread:${userId}:${chat.chatId}`);
//         await pubClient.sadd(`userJoinedRoom:${userId}`, chat.chatId);

//         console.log("callled with count ", newCount);


//         io.to(userId).emit('unreadCountUpdate', {
//           chatId: chat.chatId,
//           count: newCount,
//         });
//       });
//     });

//     socket.on("memberRemove",
//       async (
//         { memberId, chatId },
//         cb: (res: { success: boolean; message?: string }) => void
//       ) => {
//         const isInChat = await pubClient.sismember(
//           `userJoinedRoom:${memberId}`,
//           chatId
//         );

//         if (!isInChat) {
//           return cb({ success: false, message: "User not in chat" });
//         }

//         const socketIds = await pubClient.smembers(memberId);

//         for (const sid of socketIds) {
//           io.sockets.sockets.get(sid)?.leave(chatId);
//         }

//         await pubClient.srem(`userJoinedRoom:${memberId}`, chatId);

//         // notify others
//         socket.to(chatId).emit("memberRemoved", { memberId, chatId });

//         cb({ success: true });
//       }
//     );



//     socket.on("newMessage", async (data) => {
//       console.log(`Broadcasting new message to room ${data}`);

//       const chat = await prisma.chats.findFirst({
//         where: { id: data.chatId },
//         include: { participants: true }
//       })

//       if (!chat || !chat.participants.some(p => p.user_id === data.senderId)) return;

//       console.log("participants : ", chat);

//       for (const participant of chat?.participants!) {
//         const user_id = participant.user_id;
//         if (user_id != data.senderId) {
//           const newCount = await pubClient.incr(`unread:${user_id}:${data.chatId}`);

//           console.log("messsage jaa rha hai user id : ", user_id);

//           io.to(user_id).emit('unreadCountUpdate', {
//             chatId: data.chatId,
//             count: newCount,
//           });
//         }
//       }

//       console.log("allsocket in the particular rooom",)

//       io.to(data.chatId).emit("newMessage", { data });
//     });


//     socket.on("markAsRead", async (data) => {
//       const { userId, chatId } = data;
//       await pubClient.del(`unread:${userId}:${chatId}`);
//       socket.emit("unreadCountUpdate", { chatId, count: 0 });
//     });


//     // socket.on("video call has been started", async (data) => {
//     //   const participants = await prisma.chats.findFirst({
//     //     where: { id: data.chatId },
//     //     include: { participants: true }
//     //   })

//     //   if (participants) {
//     //     participants.participants.forEach(p => {
//     //       if (p.user_id !== data.org) {
//     //         socket.to(p.user_id).emit("friend started video call", data);
//     //       }
//     //     });
//     //   }
//     // })

//     // --- Mediasoup Signaling ---



//     console.log('New user connected:', socket.id);

//     // Initialize peer data
//     peers.set(socket.id, {
//       transports: new Map(),
//       producers: new Map(),
//       consumers: new Map()
//     });

//     socket.emit('existing-producers', {
//       producerIds: Array.from(producers.keys())
//     });

//     socket.on('routerCapability', cb => {
//       cb({ rtpCapabilities: router.rtpCapabilities });
//     });

//     socket.on('create-transport', async ({ sender }, cb) => {
//       try {
//         const transport = await router.createWebRtcTransport({
//           listenInfos: [
//             {
//               protocol: 'udp',
//               ip: '0.0.0.0',
//               announcedAddress: '13.127.222.231',
//               portRange: {
//                 min: 40000,
//                 max: 40100
//               }
//             },
//             {
//               protocol: 'tcp',
//               ip: '0.0.0.0',
//               announcedAddress: '13.127.222.231',
//               portRange: {
//                 min: 40000,
//                 max: 40100
//               }
//             }
//           ],
//           enableUdp: true,
//           enableTcp: true,
//           preferUdp: true,
//           initialAvailableOutgoingBitrate: 1_000_000
//         });


//         // Store transport for this peer
//         peers.get(socket.id).transports.set(transport.id, transport);

//         cb({
//           id: transport.id,
//           iceParameters: transport.iceParameters,
//           iceCandidates: transport.iceCandidates,
//           dtlsParameters: transport.dtlsParameters,
//         });
//       } catch (error) {
//         console.error('Error creating transport:', error);
//       }
//     });

//     socket.on('transport-connect', async ({ dtlsParameters, transportId }, cb) => {
//       try {
//         const transport = peers.get(socket.id).transports.get(transportId);
//         if (!transport) {
//           console.error('Transport not found:', transportId);
//           return;
//         }
//         await transport.connect({ dtlsParameters });
//         cb();
//       } catch (error) {
//         console.error('Error connecting transport:', error);
//       }
//     });

//     socket.on('transport-produce', async ({ kind, rtpParameters, transportId }, cb) => {
//       try {
//         const transport = peers.get(socket.id).transports.get(transportId);
//         if (!transport) {
//           console.error('Transport not found:', transportId);
//           return;
//         }

//         const producer = await transport.produce({ kind, rtpParameters });

//         producers.set(producer.id, { socketId: socket.id, producer });
//         peers.get(socket.id).producers.set(producer.id, producer);

//         console.log('Producer created:', producer.id, 'by', socket.id);

//         // Notify all OTHER clients about new producer
//         socket.broadcast.emit('new-producer', { producerId: producer.id });

//         cb({ id: producer.id });
//       } catch (error) {
//         console.error('Error producing:', error);
//       }
//     });

//     socket.on('transport-recv-connect', async ({ dtlsParameters, transportId }, cb) => {
//       try {
//         const transport = peers.get(socket.id).transports.get(transportId);
//         if (!transport) {
//           console.error('Transport not found:', transportId);
//           return;
//         }
//         await transport.connect({ dtlsParameters });
//         cb();
//       } catch (error) {
//         console.error('Error connecting recv transport:', error);
//       }
//     });

//     socket.on('consume', async ({ rtpCapabilities, producerId, transportId }, cb) => {
//       try {
//         const producerData = producers.get(producerId);
//         if (!producerData) {
//           console.error('Producer not found:', producerId);
//           return;
//         }

//         if (!router.canConsume({ producerId, rtpCapabilities })) {
//           console.error('Cannot consume');
//           return;
//         }

//         const transport = peers.get(socket.id).transports.get(transportId);
//         if (!transport) {
//           console.error('Transport not found:', transportId);
//           return;
//         }

//         const consumer = await transport.consume({
//           producerId,
//           rtpCapabilities,
//           paused: true,
//         });

//         peers.get(socket.id).consumers.set(consumer.id, consumer);

//         console.log('Consumer created:', consumer.id, 'for producer:', producerId);

//         cb({
//           id: consumer.id,
//           producerId,
//           kind: consumer.kind,
//           rtpParameters: consumer.rtpParameters,
//         });
//       } catch (error) {
//         console.error('Error consuming:', error);
//       }
//     });

//     socket.on('consumer-resume', async ({ consumerId }) => {
//       try {
//         const consumer = peers.get(socket.id).consumers.get(consumerId);
//         if (!consumer) {
//           console.error('Consumer not found:', consumerId);
//           return;
//         }
//         await consumer.resume();
//         console.log('Consumer resumed:', consumerId);
//       } catch (error) {
//         console.error('Error resuming consumer:', error);
//       }
//     });



//     // Backend socket handler
//     socket.on("end-call", async (data) => {
//       const { chatId, senderId } = data;

//       console.log("call ended");

//       try {
//         const chat = await prisma.chats.findFirst({
//           where: { id: chatId },
//           include: { participants: true },
//         });

//         if (chat) {
//           for (const p of chat.participants) {
//             io.to(p.user_id).emit("call-end");
//           }
//         }
//       } catch (err) {
//         console.error("Error handling ICE candidate:", err);
//       }

//       // Broadcast to all users in the chat except the sender
//     });


//     // In your socket server file

//     socket.on("video call has been started", (data) => {
//       const { chatId, org, callerName } = data;

//       // Emit to all users in the chat EXCEPT the caller
//       socket.to(chatId).emit("friend started video call", {
//         chatId,
//         callerId: org,
//         callerName
//       });
//     });

//     socket.on("call accepted", (data) => {
//       const { chatId, userId } = data;

//       // Notify the caller that the call was accepted
//       socket.to(chatId).emit("call was accepted", {
//         chatId,
//         acceptedBy: userId
//       });
//     });

//     socket.on("call rejected", (data) => {
//       const { chatId, userId } = data;

//       // Notify the caller that the call was rejected
//       socket.to(chatId).emit("call was rejected", {
//         chatId,
//         rejectedBy: userId
//       });
//     });



//   });

//   httpServer.listen(port, () => {
//     console.log(`🚀 Server ready at http://${hostname}:${port}`);
//   });
// });


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

  const pubClient = new Redis();
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
  const mediaCodecs: mediasoup.types.RtpCodecMetadata[] = [
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

  // ---------------------------------------------------------------------------
  // Socket.IO connection
  // ---------------------------------------------------------------------------
  // io.on('connection', (socket) => {
  //   const userId = socket.handshake.query.userId as string;
  //   if (!userId) return;

  //   pubClient.sadd(userId, socket.id);
  //   socket.join(userId);
  //   pubClient.sadd(ONLINE_USERS_KEY, userId);
  //   io.emit('userStatusUpdate', { userId, status: 'online' });

  //   // Register peer immediately; chatId is null until 'join-call'
  //   peers.set(socket.id, {
  //     chatId: null,
  //     transports: new Map(),
  //     producers: new Map(),
  //     consumers: new Map(),
  //   });

  //   // -------------------------------------------------------------------------
  //   // Disconnect  — single, flat handler (no nesting)
  //   // -------------------------------------------------------------------------
  //   socket.on('disconnect', async () => {
  //     console.log('user disconnected:', userId, socket.id);

  //     // --- Redis ---
  //     await pubClient.srem(userId, socket.id);
  //     await pubClient.srem(ONLINE_USERS_KEY, userId);
  //     io.emit('userStatusUpdate', { userId, status: 'offline' });

  //     // --- Mediasoup ---
  //     const peer = peers.get(socket.id);
  //     if (peer) {
  //       // Tell the call room that every producer this socket owned is gone
  //      peer.producers.forEach((_producer, producerId) => {
  //       producers.delete(producerId);
  //       if (peer.chatId) {
  //         socket.to(peer.chatId).emit('producer-closed', { 
  //           producerId,
  //           producerSocketId: socket.id  // ← ADD THIS
  //         });
  //       }
  //     });

  //       // Close transports (implicitly closes their producers & consumers)
  //       peer.transports.forEach((t) => t.close());

  //       peers.delete(socket.id);
  //     }
  //   });

  //   // -------------------------------------------------------------------------
  //   // Chat / messaging  (unchanged)
  //   // -------------------------------------------------------------------------
  //   socket.on('Status', async (data) => {
  //     const participants = await prisma.chats.findFirst({
  //       where: { id: data.chatId },
  //       include: { participants: true },
  //     });
  //     if (!participants) return;

  //     const groupParticipants = participants.participants
  //       .filter((p) => p.user_id !== data.id)
  //       .map((p) => p.user_id);

  //     const onlineUsers = await pubClient.smembers(ONLINE_USERS_KEY);
  //     const onlineCount = groupParticipants.filter((id) =>
  //       onlineUsers.includes(id)
  //     ).length;

  //     socket.emit('Status', { status: `${onlineCount} online` });
  //   });

  //   socket.on('joinRoom', async (data) => {
  //     const { allChats, userId: joinUserId } = data;

  //     allChats.forEach(async (chat: any) => {
  //       socket.join(chat.chatId);
  //       const newCount = await pubClient.get(
  //         `unread:${joinUserId}:${chat.chatId}`
  //       );
  //       await pubClient.sadd(`userJoinedRoom:${joinUserId}`, chat.chatId);

  //       io.to(joinUserId).emit('unreadCountUpdate', {
  //         chatId: chat.chatId,
  //         count: newCount,
  //       });
  //     });
  //   });

  //   socket.on(
  //     'memberRemove',
  //     async (
  //       { memberId, chatId },
  //       cb: (res: { success: boolean; message?: string }) => void
  //     ) => {
  //       const isInChat = await pubClient.sismember(
  //         `userJoinedRoom:${memberId}`,
  //         chatId
  //       );
  //       if (!isInChat)
  //         return cb({ success: false, message: 'User not in chat' });

  //       const socketIds = await pubClient.smembers(memberId);
  //       for (const sid of socketIds) {
  //         io.sockets.sockets.get(sid)?.leave(chatId);
  //       }
  //       await pubClient.srem(`userJoinedRoom:${memberId}`, chatId);
  //       socket.to(chatId).emit('memberRemoved', { memberId, chatId });
  //       cb({ success: true });
  //     }
  //   );

  //   socket.on('newMessage', async (data) => {
  //     const chat = await prisma.chats.findFirst({
  //       where: { id: data.chatId },
  //       include: { participants: true },
  //     });
  //     if (
  //       !chat ||
  //       !chat.participants.some((p) => p.user_id === data.senderId)
  //     )
  //       return;

  //     for (const participant of chat.participants) {
  //       const uid = participant.user_id;
  //       if (uid !== data.senderId) {
  //         const newCount = await pubClient.incr(
  //           `unread:${uid}:${data.chatId}`
  //         );
  //         io.to(uid).emit('unreadCountUpdate', {
  //           chatId: data.chatId,
  //           count: newCount,
  //         });
  //       }
  //     }

  //     io.to(data.chatId).emit('newMessage', { data });
  //   });

  //   socket.on('markAsRead', async (data) => {
  //     const { userId: readUserId, chatId } = data;
  //     await pubClient.del(`unread:${readUserId}:${chatId}`);
  //     socket.emit('unreadCountUpdate', { chatId, count: 0 });
  //   });

  //   // -------------------------------------------------------------------------
  //   // Call signaling  (invite / accept / reject / end)
  //   // -------------------------------------------------------------------------
  //   socket.on('video call has been started', (data) => {
  //     const { chatId, org, callerName } = data;
  //     socket.to(chatId).emit('friend started video call', {
  //       chatId,
  //       callerId: org,
  //       callerName,
  //     });
  //   });

  //   socket.on('call accepted', (data) => {
  //     const { chatId, userId: acceptUserId } = data;
  //     socket.to(chatId).emit('call was accepted', {
  //       chatId,
  //       acceptedBy: acceptUserId,
  //     });
  //   });

  //   socket.on('call rejected', (data) => {
  //     const { chatId, userId: rejectUserId } = data;
  //     socket.to(chatId).emit('call was rejected', {
  //       chatId,
  //       rejectedBy: rejectUserId,
  //     });
  //   });

  //   socket.on('end-call', async (data) => {
  //     const { chatId } = data;
  //     console.log('call ended in chatId:', chatId);
  //     try {
  //       const chat = await prisma.chats.findFirst({
  //         where: { id: chatId },
  //         include: { participants: true },
  //       });
  //       if (chat) {
  //         for (const p of chat.participants) {
  //           io.to(p.user_id).emit('call-end');
  //         }
  //       }
  //     } catch (err) {
  //       console.error('Error handling end-call:', err);
  //     }
  //   });

  //   // -------------------------------------------------------------------------
  //   // Mediasoup signaling
  //   // -------------------------------------------------------------------------

  //   // 0. join-call  — client sends this ONCE before anything else mediasoup-
  //   //    related.  It attaches the chatId to the peer, joins the socket.io
  //   //    room, and returns the list of producers already in that call.
  //   //
  //   //    Client:
  //   //      socket.emit('join-call', { chatId }, (res) => {
  //   //        res.existingProducerIds.forEach(id => consumeProducer(id));
  //   //      });
  //   //
  //   socket.on(
  //     'join-call',
  //     (
  //       { chatId }: { chatId: string },
  //       cb: (res: { existingProducerIds: string[] }) => void
  //     ) => {
  //       const peer = peers.get(socket.id);
  //       if (peer) peer.chatId = chatId;

  //       // Join the Socket.IO room so .to(chatId) works
  //       socket.join(chatId);

  //       // Collect producers that belong to this chatId
  //       const existingProducerIds: string[] = [];
  //       producers.forEach((p, id) => {
  //         if (p.chatId === chatId) existingProducerIds.push(id);
  //       });

  //       console.log(`Socket ${socket.id} joined call room: ${chatId}`);
  //       cb({ existingProducerIds });
  //     }
  //   );

  //   // 1. routerCapability  — identical signature to the working standalone
  //   //    server (doc 1).  Just a callback, no data object.
  //   socket.on(
  //     'routerCapability',
  //     (cb: (res: { rtpCapabilities: mediasoup.types.RtpCapabilities }) => void) => {
  //       cb({ rtpCapabilities: router.rtpCapabilities });
  //     }
  //   );

  //   // 2. create-transport
  //   socket.on(
  //     'create-transport',
  //     async (
  //       { sender }: { sender: boolean },
  //       cb: (res: {
  //         id: string;
  //         iceParameters: mediasoup.types.IceParameters;
  //         iceCandidates: mediasoup.types.IceCandidate[];
  //         dtlsParameters: mediasoup.types.DtlsParameters;
  //       }) => void
  //     ) => {
  //       try {
  //         const transport = await router.createWebRtcTransport({
  //           listenInfos: [
  //             {
  //               protocol: 'udp',
  //               ip: '0.0.0.0',
  //               announcedAddress: '127.0.0.1',
  //               portRange: { min: 40000, max: 40100 },
  //             },
  //             {
  //               protocol: 'tcp',
  //               ip: '0.0.0.0',
  //               announcedAddress: '127.0.0.1',
  //               portRange: { min: 40000, max: 40100 },
  //             },
  //           ],
  //           enableUdp: true,
  //           enableTcp: true,
  //           preferUdp: true,
  //           initialAvailableOutgoingBitrate: 1_000_000,
  //         });

  //         const peer = peers.get(socket.id);
  //         if (peer) peer.transports.set(transport.id, transport);

  //         cb({
  //           id: transport.id,
  //           iceParameters: transport.iceParameters,
  //           iceCandidates: transport.iceCandidates,
  //           dtlsParameters: transport.dtlsParameters,
  //         });
  //       } catch (error) {
  //         console.error('Error creating transport:', error);
  //       }
  //     }
  //   );

  //   // 3a. transport-connect  (send transport)
  //   socket.on(
  //     'transport-connect',
  //     async (
  //       {
  //         dtlsParameters,
  //         transportId,
  //       }: {
  //         dtlsParameters: mediasoup.types.DtlsParameters;
  //         transportId: string;
  //       },
  //       cb: () => void
  //     ) => {
  //       try {
  //         const peer = peers.get(socket.id);
  //         const transport = peer?.transports.get(transportId);
  //         if (!transport) {
  //           console.error('Transport not found:', transportId);
  //           return;
  //         }
  //         await transport.connect({ dtlsParameters });
  //         cb();
  //       } catch (error) {
  //         console.error('Error connecting send transport:', error);
  //       }
  //     }
  //   );

  //   // 3b. transport-recv-connect  (recv transport)
  //   socket.on(
  //     'transport-recv-connect',
  //     async (
  //       {
  //         dtlsParameters,
  //         transportId,
  //       }: {
  //         dtlsParameters: mediasoup.types.DtlsParameters;
  //         transportId: string;
  //       },
  //       cb: () => void
  //     ) => {
  //       try {
  //         const peer = peers.get(socket.id);
  //         const transport = peer?.transports.get(transportId);
  //         if (!transport) {
  //           console.error('Transport not found:', transportId);
  //           return;
  //         }
  //         await transport.connect({ dtlsParameters });
  //         cb();
  //       } catch (error) {
  //         console.error('Error connecting recv transport:', error);
  //       }
  //     }
  //   );

  //   // 4. transport-produce
  //   socket.on(
  //     'transport-produce',
  //     async (
  //       {
  //         kind,
  //         rtpParameters,
  //         transportId,
  //       }: {
  //         kind: 'audio' | 'video';
  //         rtpParameters: mediasoup.types.RtpParameters;
  //         transportId: string;
  //       },
  //       cb: (res: { id: string }) => void
  //     ) => {
  //       try {
  //         const peer = peers.get(socket.id);
  //         const transport = peer?.transports.get(transportId);
  //         if (!transport) {
  //           console.error('Transport not found:', transportId);
  //           return;
  //         }

  //         const producer = await transport.produce({ kind, rtpParameters });
  //         const chatId = peer?.chatId || '';

  //         // Global + peer maps
  //         producers.set(producer.id, { socketId: socket.id, producer, chatId });
  //         peer?.producers.set(producer.id, producer);

  //         console.log(
  //           'Producer created:',
  //           producer.id,
  //           'by',
  //           socket.id,
  //           'in room',
  //           chatId
  //         );

  //         // Notify only the same call room
  //         // if (chatId) {
  //         //   socket.to(chatId).emit('new-producer', { producerId: producer.id });
  //         // } else {
  //         //   // Fallback broadcast if join-call was never called (shouldn't happen)
  //         //   socket.broadcast.emit('new-producer', { producerId: producer.id });
  //         // }

  //         if (chatId) {
  //       socket.to(chatId).emit('new-producer', { 
  //         producerId: producer.id,
  //         producerSocketId: socket.id  // ← ADD THIS
  //       });
  //     } else {
  //       socket.broadcast.emit('new-producer', { 
  //         producerId: producer.id,
  //         producerSocketId: socket.id  // ← ADD THIS
  //       });
  //     }

  //         cb({ id: producer.id });
  //       } catch (error) {
  //         console.error('Error producing:', error);
  //       }
  //     }
  //   );

  //   // 5. consume
  //   socket.on(
  //     'consume',
  //     async (
  //       {
  //         rtpCapabilities,
  //         producerId,
  //         transportId,
  //       }: {
  //         rtpCapabilities: mediasoup.types.RtpCapabilities;
  //         producerId: string;
  //         transportId: string;
  //       },
  //       cb: (res: {
  //         id: string;
  //         producerId: string;
  //         kind: 'audio' | 'video';
  //         rtpParameters: mediasoup.types.RtpParameters;
  //       }) => void
  //     ) => {
  //       try {
  //         const producerData = producers.get(producerId);
  //         if (!producerData) {
  //           console.error('Producer not found:', producerId);
  //           return;
  //         }

  //         if (!router.canConsume({ producerId, rtpCapabilities })) {
  //           console.error('Cannot consume producer:', producerId);
  //           return;
  //         }

  //         const peer = peers.get(socket.id);
  //         const transport = peer?.transports.get(transportId);
  //         if (!transport) {
  //           console.error('Transport not found:', transportId);
  //           return;
  //         }

  //         const consumer = await transport.consume({
  //           producerId,
  //           rtpCapabilities,
  //           paused: true,
  //         });

  //         peer?.consumers.set(consumer.id, consumer);
  //         console.log(
  //           'Consumer created:',
  //           consumer.id,
  //           'for producer:',
  //           producerId
  //         );

  //         cb({
  //           id: consumer.id,
  //           producerId,
  //           kind: consumer.kind,
  //           rtpParameters: consumer.rtpParameters,
  //         });
  //       } catch (error) {
  //         console.error('Error consuming:', error);
  //       }
  //     }
  //   );

  //   // 6. consumer-resume
  //   socket.on(
  //     'consumer-resume',
  //     async ({ consumerId }: { consumerId: string }) => {
  //       try {
  //         const peer = peers.get(socket.id);
  //         const consumer = peer?.consumers.get(consumerId);
  //         if (!consumer) {
  //           console.error('Consumer not found:', consumerId);
  //           return;
  //         }
  //         await consumer.resume();
  //         console.log('Consumer resumed:', consumerId);
  //       } catch (error) {
  //         console.error('Error resuming consumer:', error);
  //       }
  //     }
  //   );
  // });




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
    (cb: (res: { 
      existingProducers: Array<{ producerId: string, socketId: string }> 
    }) => void) => {
      const existingProducers: Array<{ producerId: string, socketId: string }> = [];
      
      producers.forEach((p, id) => {
        // Don't send your own producers
        if (p.socketId !== socket.id) {
          existingProducers.push({ 
            producerId: id, 
            socketId: p.socketId 
          });
        }
      });

      console.log(`Socket ${socket.id} requested producers. Found: ${existingProducers.length}`);
      cb({ existingProducers });
    }
  );

  // Disconnect handler
  socket.on('disconnect', async () => {
    console.log('user disconnected:', userId, socket.id);

    await pubClient.srem(userId, socket.id);
    await pubClient.srem(ONLINE_USERS_KEY, userId);
    io.emit('userStatusUpdate', { userId, status: 'offline' });

    const peer = peers.get(socket.id);
    if (peer) {
      // Notify everyone that this user's producers are gone
      peer.producers.forEach((_producer, producerId) => {
        producers.delete(producerId);
        // Broadcast to ALL (no room restriction)
        socket.broadcast.emit('producer-closed', { 
          producerId,
          producerSocketId: socket.id
        });
      });

      peer.transports.forEach((t) => t.close());
      peers.delete(socket.id);
    }
  });

  // ... existing socket handlers (Status, joinRoom, etc.) ...

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
      }: {
        kind: 'audio' | 'video';
        rtpParameters: mediasoup.types.RtpParameters;
        transportId: string;
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

        // Store without chatId
        producers.set(producer.id, { socketId: socket.id, producer });
        peer?.producers.set(producer.id, producer);

        console.log(
          'Producer created:',
          producer.id,
          'kind:',
          kind,
          'by',
          socket.id
        );

        // Broadcast to EVERYONE except sender
        socket.broadcast.emit('new-producer', { 
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