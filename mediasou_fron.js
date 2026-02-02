

import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

const MultiUserVideoChat = () => {
  const [socket, setSocket] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // Array of { producerId, stream }

  const localVideoRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const consumedProducers = useRef(new Set()); // Track what we already have

  useEffect(() => {
    const s = io('http://localhost:3000');
    setSocket(s);

    s.on('new-producer', ({ producerId }) => {
      console.log('New producer notification:', producerId);
      handleAutoConsume(s, producerId);
    });

    s.on('peer-left', ({ producerId }) => {
      setRemoteStreams(prev => prev.filter(s => s.producerId !== producerId));
      consumedProducers.current.delete(producerId);
    });

    return () => s.disconnect();
  }, []);

  // Wrapper to handle retries if transport isn't ready
  const handleAutoConsume = (s, producerId) => {
    if (!recvTransportRef.current || !deviceRef.current) {
      console.log('Transport not ready, retrying in 1s...');
      setTimeout(() => handleAutoConsume(s, producerId), 1000);
      return;
    }
    consume(s, producerId);
  };

  const handleJoin = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideoRef.current.srcObject = stream;

    socket.emit('get-router-rtp-capabilities', async (rtpCaps) => {
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCaps });
      deviceRef.current = device;

      // Create Send Transport
      socket.emit('create-transport', { sender: true }, async (params) => {
        const transport = device.createSendTransport(params);
        sendTransportRef.current = transport;
        transport.on('connect', ({ dtlsParameters }, cb, err) => socket.emit('transport-connect', { transportId: transport.id, dtlsParameters }, cb));
        transport.on('produce', (params, cb, err) => socket.emit('transport-produce', { transportId: transport.id, ...params }, ({ id }) => cb({ id })));
        await transport.produce({ track: stream.getVideoTracks()[0] });
      });

      // Create Recv Transport
      socket.emit('create-transport', { sender: false }, (params) => {
        const transport = device.createRecvTransport(params);
        recvTransportRef.current = transport;
        transport.on('connect', ({ dtlsParameters }, cb, err) => socket.emit('transport-connect', { transportId: transport.id, dtlsParameters }, cb));
        
        // Once ready, ask for existing producers
        socket.emit('get-producers', (list) => {
          list.forEach(p => handleAutoConsume(socket, p.producerId));
        });
      });
    });
  };

  const consume = async (s, producerId) => {
    if (consumedProducers.current.has(producerId)) return;
    consumedProducers.current.add(producerId);

    s.emit('consume', {
      transportId: recvTransportRef.current.id,
      rtpCapabilities: deviceRef.current.rtpCapabilities,
      producerId
    }, async (params) => {
      const consumer = await recvTransportRef.current.consume(params);
      const stream = new MediaStream([consumer.track]);
      
      setRemoteStreams(prev => [...prev, { producerId, stream }]);
      s.emit('consumer-resume', { consumerId: consumer.id });
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Room</h1>
      <button onClick={handleJoin}>Join Video Chat</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div>
          <p>Local</p>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', background: 'black' }} />
        </div>
        {remoteStreams.map(r => (
          <div key={r.producerId}>
            <p>Remote</p>
            <VideoComponent stream={r.stream} />
          </div>
        ))}
      </div>
    </div>
  );
};

const VideoComponent = ({ stream }) => {
  const vRef = useRef();
  useEffect(() => { if (vRef.current) vRef.current.srcObject = stream; }, [stream]);
  return <video ref={vRef} autoPlay playsInline style={{ width: '100%', background: 'gray' }} />;
};

export default MultiUserVideoChat;