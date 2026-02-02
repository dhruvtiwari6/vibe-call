

import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import * as mediasoup from 'mediasoup';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const mediaCodecs = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } }
];

let worker;
let router;
const peers = new Map(); // socketId -> { transports, producers, consumers }

(async () => {
  worker = await mediasoup.createWorker({ logLevel: "warn" });
  router = await worker.createRouter({ mediaCodecs });
  console.log('✅ Mediasoup Router Ready');
})();

io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);
  peers.set(socket.id, { transports: new Map(), producers: new Map(), consumers: new Map() });

  socket.on('get-router-rtp-capabilities', (cb) => cb(router.rtpCapabilities));

  socket.on('create-transport', async ({ sender }, cb) => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '127.0.0.1' }], 
      enableUdp: true, enableTcp: true, preferUdp: true
    });
    peers.get(socket.id).transports.set(transport.id, transport);
    cb({ id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters });
  });

  socket.on('transport-connect', async ({ transportId, dtlsParameters }, cb) => {
    const transport = peers.get(socket.id).transports.get(transportId);
    if (transport) await transport.connect({ dtlsParameters });
    cb();
  });

  socket.on('transport-produce', async ({ transportId, kind, rtpParameters }, cb) => {
    const transport = peers.get(socket.id).transports.get(transportId);
    const producer = await transport.produce({ kind, rtpParameters });
    peers.get(socket.id).producers.set(producer.id, producer);

    // Tell everyone else to watch this producer
    socket.broadcast.emit('new-producer', { producerId: producer.id });
    cb({ id: producer.id });
  });

  socket.on('get-producers', (cb) => {
    let producerList = [];
    peers.forEach((peerData, peerId) => {
      if (peerId !== socket.id) {
        peerData.producers.forEach(p => producerList.push({ producerId: p.id }));
      }
    });
    cb(producerList);
  });

  socket.on('consume', async ({ rtpCapabilities, transportId, producerId }, cb) => {
    let producerToConsume;
    peers.forEach(p => { if (p.producers.has(producerId)) producerToConsume = p.producers.get(producerId); });

    if (producerToConsume && router.canConsume({ producerId: producerToConsume.id, rtpCapabilities })) {
      const transport = peers.get(socket.id).transports.get(transportId);
      const consumer = await transport.consume({ producerId: producerToConsume.id, rtpCapabilities, paused: true });
      peers.get(socket.id).consumers.set(consumer.id, consumer);
      cb({ id: consumer.id, producerId: producerToConsume.id, kind: consumer.kind, rtpParameters: consumer.rtpParameters });
    }
  });

  socket.on('consumer-resume', async ({ consumerId }) => {
    const consumer = peers.get(socket.id).consumers.get(consumerId);
    if (consumer) await consumer.resume();
  });

  socket.on('disconnect', () => {
    const peerData = peers.get(socket.id);
    if (peerData) {
      peerData.producers.forEach(p => socket.broadcast.emit('peer-left', { producerId: p.id }));
    }
    peers.delete(socket.id);
  });
});

httpServer.listen(3000);