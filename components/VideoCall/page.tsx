
// import React, { useEffect, useRef, useState, useCallback } from 'react';
// import * as mediasoupClient from 'mediasoup-client';
// import { userChatStore } from '@/store/chatStore';

// // Remote video component - now receives combined stream with both audio and video
// const RemoteVideo = ({ stream, userId }) => {
//   const videoRef = useRef(null);
//   const [debugInfo, setDebugInfo] = useState('');

//   useEffect(() => {
//     if (videoRef.current && stream) {
//       console.log('🎥 Setting stream for user:', userId);
      
//       const tracks = stream.getTracks();
//       const trackInfo = tracks.map(t => 
//         `${t.kind}: ${t.readyState} (enabled: ${t.enabled}, muted: ${t.muted})`
//       ).join(', ');
//       setDebugInfo(trackInfo);

//       videoRef.current.srcObject = stream;
      
//       // Force play after a short delay
//       setTimeout(() => {
//         if (videoRef.current) {
//           videoRef.current.play()
//             .then(() => console.log('✅ Video playing for', userId))
//             .catch(e => console.error('❌ Play failed for', userId, e));
//         }
//       }, 100);
//     }

//     return () => {
//       if (videoRef.current) {
//         videoRef.current.srcObject = null;
//       }
//     };
//   }, [stream, userId]);

//   return (
//     <div style={{ textAlign: 'center' }}>
//       <p style={{ margin: '5px 0', fontSize: '12px', fontWeight: 'bold' }}>
//         User: {userId}
//       </p>
//       <p style={{ margin: '5px 0', fontSize: '10px', color: '#999' }}>
//         {debugInfo || 'Loading...'}
//       </p>
//       <video
//         ref={videoRef}
//         autoPlay
//         playsInline
//         style={{
//           width: '300px',
//           height: '225px',
//           border: '2px solid #666',
//           borderRadius: '8px',
//           backgroundColor: '#000',
//           objectFit: 'cover'
//         }}
//       />
//     </div>
//   );
// };

// const VideoCall = () => {
//   const { socket } = userChatStore();

//   const deviceRef = useRef(null);
//   const localSendTransportRef = useRef(null);
//   const localRecvTransportRef = useRef(null);
//   const availableProducersRef = useRef(new Set());
  
//   // Track consumers by producerId
//   const consumersRef = useRef(new Map());
  
//   // Track YOUR OWN producer IDs so you don't consume yourself
//   const ownProducerIdsRef = useRef(new Set());
  
//   // Group remote streams by user (socketId) instead of by producer
//   // Structure: Map<socketId, { videoTrack?: MediaStreamTrack, audioTrack?: MediaStreamTrack }>
//   const remoteTracksRef = useRef(new Map());

//   const localVideoRef = useRef(null);
//   const [remoteStreams, setRemoteStreams] = useState(new Map());
//   const [isInitialized, setIsInitialized] = useState(false);

//   // Helper to update remote streams when tracks change
//   const updateRemoteStream = useCallback((socketId) => {
//     const tracks = remoteTracksRef.current.get(socketId);
//     if (!tracks) return;

//     const streamTracks = [];
//     if (tracks.videoTrack) streamTracks.push(tracks.videoTrack);
//     if (tracks.audioTrack) streamTracks.push(tracks.audioTrack);

//     if (streamTracks.length > 0) {
//       const stream = new MediaStream(streamTracks);
//       setRemoteStreams((prev) => {
//         const newMap = new Map(prev);
//         newMap.set(socketId, stream);
//         console.log('✅ Updated stream for user:', socketId, 'with tracks:', streamTracks.length);
//         return newMap;
//       });
//     }
//   }, []);

//   // ---------------------------------------------------------------------------
//   // consumeProducer — now tracks the socketId that owns the producer
//   // ---------------------------------------------------------------------------
//   const consumeProducer = useCallback(async (producerId, producerSocketId) => {
//     if (!localRecvTransportRef.current || !deviceRef.current) {
//       console.error('❌ Not ready to consume');
//       return;
//     }

//     // Skip your own producer
//     if (ownProducerIdsRef.current.has(producerId)) {
//       console.log('⏭️ Skipping own producer:', producerId);
//       return;
//     }

//     // Avoid double-consume
//     if (consumersRef.current.has(producerId)) {
//       console.log('⚠️ Already consuming:', producerId);
//       return;
//     }

//     try {
//       console.log('🔵 Starting to consume producer:', producerId, 'from socket:', producerSocketId);
      
//       socket.emit(
//         'consume',
//         {
//           rtpCapabilities: deviceRef.current.rtpCapabilities,
//           producerId,
//           transportId: localRecvTransportRef.current.id,
//         },
//         async (cb) => {
//           if (!cb || cb.error) {
//             console.error('❌ Consume callback error:', cb?.error);
//             return;
//           }

//           console.log('📦 Consume callback received:', {
//             id: cb.id,
//             producerId: cb.producerId,
//             kind: cb.kind,
//           });

//           try {
//             const consumer = await localRecvTransportRef.current.consume({
//               id: cb.id,
//               producerId: cb.producerId,
//               kind: cb.kind,
//               rtpParameters: cb.rtpParameters,
//             });

//             console.log('🎬 Consumer created:', {
//               id: consumer.id,
//               kind: consumer.kind,
//               producerId: consumer.producerId,
//               track: consumer.track.id,
//             });

//             // Store consumer
//             consumersRef.current.set(producerId, consumer);

//             // Add track to the remote user's track collection
//             if (!remoteTracksRef.current.has(producerSocketId)) {
//               remoteTracksRef.current.set(producerSocketId, {});
//             }
            
//             const userTracks = remoteTracksRef.current.get(producerSocketId);
//             if (consumer.kind === 'video') {
//               userTracks.videoTrack = consumer.track;
//               console.log('📹 Added video track for user:', producerSocketId);
//             } else if (consumer.kind === 'audio') {
//               userTracks.audioTrack = consumer.track;
//               console.log('🎤 Added audio track for user:', producerSocketId);
//             }

//             // Update the combined stream for this user
//             updateRemoteStream(producerSocketId);

//             // CRITICAL: Resume the consumer
//             console.log('📤 Sending consumer-resume for:', consumer.id);
//             socket.emit('consumer-resume', { consumerId: consumer.id });

//             console.log('✅ Successfully set up consumer for:', producerId);
//           } catch (consumeError) {
//             console.error('❌ Error during consume:', consumeError);
//           }
//         }
//       );
//     } catch (error) {
//       console.error('❌ Error in consumeProducer:', error);
//     }
//   }, [socket, updateRemoteStream]);

//   // ---------------------------------------------------------------------------
//   // setupConsumer
//   // ---------------------------------------------------------------------------
//   const setupConsumer = useCallback(() => {
//     return new Promise((resolve) => {
//       console.log('📥 Requesting recv transport creation...');
//       socket.emit('create-transport', { sender: false }, (cb) => {
//         console.log('📥 Creating recv transport');

//         const recvTransport = deviceRef.current.createRecvTransport(cb);
//         localRecvTransportRef.current = recvTransport;

//         recvTransport.on('connect', ({ dtlsParameters }, callback) => {
//           console.log('🔗 Recv transport connecting...');
//           socket.emit(
//             'transport-recv-connect',
//             { dtlsParameters, transportId: recvTransport.id },
//             () => {
//               console.log('✅ Recv transport connected');
//               callback();
//             }
//           );
//         });

//         recvTransport.on('connectionstatechange', (state) => {
//           console.log('📡 Recv transport connection state:', state);
//         });

//         console.log('✅ Recv transport created');
//         resolve();
//       });
//     });
//   }, [socket]);

//   // ---------------------------------------------------------------------------
//   // setupProducer
//   // ---------------------------------------------------------------------------
//   const setupProducer = useCallback(() => {
//     return new Promise(async (resolve) => {
//       try {
//         console.log('🎥 Requesting user media...');
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             width: { ideal: 1280 },
//             height: { ideal: 720 },
//           },
//           audio: true,
//         });

//         console.log('✅ Got user media');

//         socket.emit('create-transport', { sender: true }, async (cb) => {
//           console.log('📤 Creating send transport');
          
//           const senderTransport = deviceRef.current.createSendTransport(cb);
//           localSendTransportRef.current = senderTransport;

//           senderTransport.on('connect', ({ dtlsParameters }, callback) => {
//             console.log('🔗 Send transport connecting...');
//             socket.emit(
//               'transport-connect',
//               { dtlsParameters, transportId: senderTransport.id },
//               () => {
//                 console.log('✅ Send transport connected');
//                 callback();
//               }
//             );
//           });

//           senderTransport.on('produce', ({ kind, rtpParameters }, callback) => {
//             console.log('📤 Producing:', kind);
//             socket.emit(
//               'transport-produce',
//               { kind, rtpParameters, transportId: senderTransport.id },
//               ({ id }) => {
//                 console.log('✅ Produced with ID:', id, 'kind:', kind);
//                 // Remember this is OUR producer so we skip it when consuming
//                 ownProducerIdsRef.current.add(id);
//                 callback({ id });
//               }
//             );
//           });

//           // Show local video
//           if (localVideoRef.current) {
//             localVideoRef.current.srcObject = stream;
//             console.log('✅ Local video element set');
//           }

//           // Produce video
//           const videoTrack = stream.getVideoTracks()[0];
//           if (videoTrack) {
//             console.log('🎬 Producing video track');
//             await senderTransport.produce({
//               track: videoTrack,
//               encodings: [
//                 { maxBitrate: 100_000 },
//                 { maxBitrate: 300_000 },
//                 { maxBitrate: 900_000 },
//               ],
//               codecOptions: { videoGoogleStartBitrate: 1000 },
//             });
//           }

//           // Produce audio
//           const audioTrack = stream.getAudioTracks()[0];
//           if (audioTrack) {
//             console.log('🎤 Producing audio track');
//             await senderTransport.produce({ track: audioTrack });
//           }

//           console.log('✅ Producer setup complete');
//           resolve();
//         });
//       } catch (error) {
//         console.error('❌ Error setting up producer:', error);
//         resolve();
//       }
//     });
//   }, [socket]);

//   // ---------------------------------------------------------------------------
//   // Main effect
//   // ---------------------------------------------------------------------------
//   useEffect(() => {
//     if (!socket) {
//       console.log('⏳ Waiting for socket...');
//       return;
//     }

//     console.log('🚀 Socket available, initializing...');
//     let isMounted = true;

//     // Modified to receive producerSocketId along with producerId
//     const handleNewProducer = ({ producerId, producerSocketId }) => {
//       console.log('🆕 New producer:', producerId, 'from socket:', producerSocketId);
//       availableProducersRef.current.add(producerId);

//       if (localRecvTransportRef.current && isMounted) {
//         console.log('Attempting to consume new producer');
//         consumeProducer(producerId, producerSocketId);
//       }
//     };

//     const handleProducerClosed = ({ producerId, producerSocketId }) => {
//       console.log('🔴 Producer closed:', producerId);
//       availableProducersRef.current.delete(producerId);

//       const consumer = consumersRef.current.get(producerId);
//       if (consumer) {
//         console.log('Closing consumer for producer:', producerId);
//         consumer.close();
//         consumersRef.current.delete(producerId);

//         // Remove the track from remote user
//         const userTracks = remoteTracksRef.current.get(producerSocketId);
//         if (userTracks) {
//           if (consumer.kind === 'video') {
//             delete userTracks.videoTrack;
//           } else if (consumer.kind === 'audio') {
//             delete userTracks.audioTrack;
//           }

//           // If no more tracks, remove the user entirely
//           if (!userTracks.videoTrack && !userTracks.audioTrack) {
//             remoteTracksRef.current.delete(producerSocketId);
//             setRemoteStreams((prev) => {
//               const newMap = new Map(prev);
//               newMap.delete(producerSocketId);
//               return newMap;
//             });
//           } else {
//             // Update the stream with remaining tracks
//             updateRemoteStream(producerSocketId);
//           }
//         }
//       }
//     };

//     socket.on('new-producer', handleNewProducer);
//     socket.on('producer-closed', handleProducerClosed);

//     const initialize = async () => {
//       try {
//         console.log('📡 Requesting router capabilities...');
//         socket.emit('routerCapability', async (cb) => {
//           if (!isMounted) return;

//           console.log('✅ Router capabilities received');
//           const device = new mediasoupClient.Device();
//           await device.load({ routerRtpCapabilities: cb.rtpCapabilities });
//           deviceRef.current = device;
//           console.log('✅ Device loaded');

//           await setupProducer();
//           await setupConsumer();

//           if (!isMounted) return;

//           setIsInitialized(true);
//           console.log('🎉 Initialization complete!');
//         });
//       } catch (error) {
//         console.error('❌ Error initializing media:', error);
//       }
//     };

//     initialize();

//     return () => {
//       console.log('🧹 Cleaning up...');
//       isMounted = false;

//       socket.off('new-producer', handleNewProducer);
//       socket.off('producer-closed', handleProducerClosed);

//       consumersRef.current.forEach((consumer) => consumer.close());
//       consumersRef.current.clear();

//       if (localSendTransportRef.current) {
//         localSendTransportRef.current.close();
//         localSendTransportRef.current = null;
//       }
//       if (localRecvTransportRef.current) {
//         localRecvTransportRef.current.close();
//         localRecvTransportRef.current = null;
//       }

//       if (localVideoRef.current?.srcObject) {
//         localVideoRef.current.srcObject.getTracks().forEach((t) => t.stop());
//       }

//       ownProducerIdsRef.current.clear();
//       availableProducersRef.current.clear();
//       remoteTracksRef.current.clear();
//     };
//   }, [socket, setupProducer, setupConsumer, consumeProducer, updateRemoteStream]);

//   return (
//     <div style={{ padding: '20px' }}>
//       <h2>WebRTC Multi-User Video Chat</h2>
//       <p>Status: {isInitialized ? '✅ Connected' : '⏳ Connecting...'}</p>

//       <div style={{ marginTop: '20px' }}>
//         <h3>My Video</h3>
//         <video
//           ref={localVideoRef}
//           autoPlay
//           muted
//           playsInline
//           style={{ 
//             width: '400px',
//             height: '300px',
//             border: '2px solid #333', 
//             borderRadius: '8px',
//             backgroundColor: '#000',
//             objectFit: 'cover'
//           }}
//         />
//       </div>

//       <div style={{ marginTop: '20px' }}>
//         <h3>Remote Videos ({remoteStreams.size})</h3>
//         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
//           {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
//             <RemoteVideo key={socketId} stream={stream} userId={socketId.slice(0, 8)} />
//           ))}
//           {remoteStreams.size === 0 && (
//             <p style={{ color: '#666' }}>No remote users yet.</p>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default VideoCall;

// /*
// SERVER CHANGES NEEDED in server.ts:

// 1. Update the 'transport-produce' handler to send producerSocketId:

//       // Notify only the same call room
//       if (chatId) {
//         socket.to(chatId).emit('new-producer', { 
//           producerId: producer.id,
//           producerSocketId: socket.id  // ← ADD THIS
//         });
//       } else {
//         socket.broadcast.emit('new-producer', { 
//           producerId: producer.id,
//           producerSocketId: socket.id  // ← ADD THIS
//         });
//       }

// 2. Update the disconnect handler to send producerSocketId:

//       peer.producers.forEach((_producer, producerId) => {
//         producers.delete(producerId);
//         if (peer.chatId) {
//           socket.to(peer.chatId).emit('producer-closed', { 
//             producerId,
//             producerSocketId: socket.id  // ← ADD THIS
//           });
//         }
//       });
// */




import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { userChatStore } from '@/store/chatStore';

const VideoCall = () => {
  const { socket, setVideoCall, currentChatId } = userChatStore();

  const deviceRef = useRef<any>(null);
  const localSendTransportRef = useRef<any>(null);
  const localRecvTransportRef = useRef<any>(null);
  
  const consumersRef = useRef<Map<string, any>>(new Map());
  const ownProducerIdsRef = useRef<Set<string>>(new Set());
  const remoteTracksRef = useRef<Map<string, any>>(new Map());

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  const updateRemoteStream = useCallback((socketId: string) => {
    const tracks = remoteTracksRef.current.get(socketId);
    if (!tracks) return;

    const streamTracks = [];
    if (tracks.videoTrack) streamTracks.push(tracks.videoTrack);
    if (tracks.audioTrack) streamTracks.push(tracks.audioTrack);

    if (streamTracks.length > 0) {
      const stream = new MediaStream(streamTracks);
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(socketId, stream);
        console.log('✅ Updated stream for user:', socketId, 'with tracks:', streamTracks.length);
        return newMap;
      });
    }
  }, []);

  const consumeProducer = useCallback(async (producerId: string, producerSocketId: string) => {
    if (!socket || !localRecvTransportRef.current || !deviceRef.current) {
      console.error('❌ Not ready to consume');
      return;
    }

    if (ownProducerIdsRef.current.has(producerId)) {
      console.log('⏭️ Skipping own producer:', producerId);
      return;
    }

    if (consumersRef.current.has(producerId)) {
      console.log('⚠️ Already consuming:', producerId);
      return;
    }

    try {
      console.log('🔵 Starting to consume producer:', producerId, 'from socket:', producerSocketId);
      
      socket.emit(
        'consume',
        {
          rtpCapabilities: deviceRef.current.rtpCapabilities,
          producerId,
          transportId: localRecvTransportRef.current.id,
        },
        async (cb: any) => {
          if (!cb || cb.error) {
            console.error('❌ Consume callback error:', cb?.error);
            return;
          }

          console.log('📦 Consume callback received:', {
            id: cb.id,
            producerId: cb.producerId,
            kind: cb.kind,
          });

          try {
            const consumer = await localRecvTransportRef.current.consume({
              id: cb.id,
              producerId: cb.producerId,
              kind: cb.kind,
              rtpParameters: cb.rtpParameters,
            });

            console.log('🎬 Consumer created:', {
              id: consumer.id,
              kind: consumer.kind,
              producerId: consumer.producerId,
              track: consumer.track.id,
            });

            consumersRef.current.set(producerId, consumer);

            if (!remoteTracksRef.current.has(producerSocketId)) {
              remoteTracksRef.current.set(producerSocketId, {});
            }
            
            const userTracks = remoteTracksRef.current.get(producerSocketId);
            if (consumer.kind === 'video') {
              userTracks.videoTrack = consumer.track;
              console.log('📹 Added video track for user:', producerSocketId);
            } else if (consumer.kind === 'audio') {
              userTracks.audioTrack = consumer.track;
              console.log('🎤 Added audio track for user:', producerSocketId);
            }

            updateRemoteStream(producerSocketId);

            console.log('📤 Sending consumer-resume for:', consumer.id);
            socket.emit('consumer-resume', { consumerId: consumer.id });

            console.log('✅ Successfully set up consumer for:', producerId);
          } catch (consumeError) {
            console.error('❌ Error during consume:', consumeError);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error in consumeProducer:', error);
    }
  }, [socket, updateRemoteStream]);

  const setupConsumer = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!socket) {
        console.error('❌ No socket available');
        resolve();
        return;
      }
      console.log('📥 Requesting recv transport creation...');
      socket.emit('create-transport', { sender: false }, (cb: any) => {
        console.log('📥 Creating recv transport');

        const recvTransport = deviceRef.current.createRecvTransport(cb);
        localRecvTransportRef.current = recvTransport;

        recvTransport.on('connect', ({ dtlsParameters }: any, callback: any) => {
          console.log('🔗 Recv transport connecting...');
          socket.emit(
            'transport-recv-connect',
            { dtlsParameters, transportId: recvTransport.id },
            () => {
              console.log('✅ Recv transport connected');
              callback();
            }
          );
        });

        recvTransport.on('connectionstatechange', (state: any) => {
          console.log('📡 Recv transport connection state:', state);
        });

        console.log('✅ Recv transport created');
        resolve();
      });
    });
  }, [socket]);

  const setupProducer = useCallback(() => {
    return new Promise<void>(async (resolve) => {
      if (!socket) {
        console.error('❌ No socket available');
        resolve();
        return;
      }
      try {
        console.log('🎥 Requesting user media...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });

        console.log('✅ Got user media');

        socket.emit('create-transport', { sender: true }, async (cb: any) => {
          console.log('📤 Creating send transport');
          
          const senderTransport = deviceRef.current.createSendTransport(cb);
          localSendTransportRef.current = senderTransport;

          senderTransport.on('connect', ({ dtlsParameters }: any, callback: any) => {
            console.log('🔗 Send transport connecting...');
            socket.emit(
              'transport-connect',
              { dtlsParameters, transportId: senderTransport.id },
              () => {
                console.log('✅ Send transport connected');
                callback();
              }
            );
          });

          senderTransport.on('produce', ({ kind, rtpParameters }: any, callback: any) => {
            console.log('📤 Producing:', kind, 'for chat:', currentChatId);
            socket.emit(
              'transport-produce',
              { kind, rtpParameters, transportId: senderTransport.id, chatId: currentChatId },
              ({ id }: any) => {
                console.log('✅ Produced with ID:', id, 'kind:', kind);
                ownProducerIdsRef.current.add(id);
                callback({ id });
              }
            );
          });

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            console.log('✅ Local video element set');
          }

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('🎬 Producing video track');
            await senderTransport.produce({
              track: videoTrack,
              encodings: [
                { maxBitrate: 100_000 },
                { maxBitrate: 300_000 },
                { maxBitrate: 900_000 },
              ],
              codecOptions: { videoGoogleStartBitrate: 1000 },
            });
          }

          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
            console.log('🎤 Producing audio track');
            await senderTransport.produce({ track: audioTrack });
          }

          console.log('✅ Producer setup complete');
          resolve();
        });
      } catch (error) {
        console.error('❌ Error setting up producer:', error);
        resolve();
      }
    });
  }, [socket]);

  useEffect(() => {
    if (!socket) {
      console.log('⏳ Waiting for socket...');
      return;
    }

    console.log('🚀 Socket available, initializing...');
    let isMounted = true;

    const handleNewProducer = ({ producerId, producerSocketId }: { producerId: string; producerSocketId: string }) => {
      console.log('🆕 New producer:', producerId, 'from socket:', producerSocketId);

      if (localRecvTransportRef.current && isMounted) {
        console.log('Attempting to consume new producer');
        consumeProducer(producerId, producerSocketId);
      }
    };

    const handleProducerClosed = ({ producerId, producerSocketId }: { producerId: string; producerSocketId: string }) => {
      console.log('🔴 Producer closed:', producerId);

      const consumer = consumersRef.current.get(producerId);
      if (consumer) {
        console.log('Closing consumer for producer:', producerId);
        consumer.close();
        consumersRef.current.delete(producerId);

        const userTracks = remoteTracksRef.current.get(producerSocketId);
        if (userTracks) {
          if (consumer.kind === 'video') {
            delete userTracks.videoTrack;
          } else if (consumer.kind === 'audio') {
            delete userTracks.audioTrack;
          }

          if (!userTracks.videoTrack && !userTracks.audioTrack) {
            remoteTracksRef.current.delete(producerSocketId);
            setRemoteStreams((prev) => {
              const newMap = new Map(prev);
              newMap.delete(producerSocketId);
              return newMap;
            });
          } else {
            updateRemoteStream(producerSocketId);
          }
        }
      }
    };

    socket.on('new-producer', handleNewProducer);
    socket.on('producer-closed', handleProducerClosed);

    const initialize = async () => {
      try {
        console.log('📡 Requesting router capabilities...');
        socket.emit('routerCapability', async (cb: { rtpCapabilities: any }) => {
          if (!isMounted) return;

          console.log('✅ Router capabilities received');
          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: cb.rtpCapabilities });
          deviceRef.current = device;
          console.log('✅ Device loaded');

          await setupProducer();
          await setupConsumer();

          // Request existing producers after setup
          socket.emit(
            'get-producers',
            { chatId: currentChatId },
            (res: { existingProducers: Array<{ producerId: string, socketId: string }> }) => {
              console.log('📋 Received existing producers:', res.existingProducers);
              
              res.existingProducers.forEach(({ producerId, socketId }) => {
                console.log('Consuming existing producer:', producerId, 'from:', socketId);
                consumeProducer(producerId, socketId);
              });
            }
          );

          if (!isMounted) return;

          setIsInitialized(true);
          console.log('🎉 Initialization complete!');
        });
      } catch (error) {
        console.error('❌ Error initializing media:', error);
      }
    };

    initialize();

    return () => {
      console.log('🧹 Cleaning up...');
      isMounted = false;

      socket.off('new-producer', handleNewProducer);
      socket.off('producer-closed', handleProducerClosed);

      consumersRef.current.forEach((consumer) => consumer.close());
      consumersRef.current.clear();

      if (localSendTransportRef.current) {
        localSendTransportRef.current.close();
        localSendTransportRef.current = null;
      }
      if (localRecvTransportRef.current) {
        localRecvTransportRef.current.close();
        localRecvTransportRef.current = null;
      }

      if (localVideoRef.current?.srcObject) {
        (localVideoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }

      ownProducerIdsRef.current.clear();
      remoteTracksRef.current.clear();
    };
  }, [socket, setupProducer, setupConsumer, consumeProducer, updateRemoteStream]);

  return (
    <div className="bg-slate-950 min-h-screen text-white p-6 flex flex-col select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">WebRTC Multi-User Video Call</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`h-2.5 w-2.5 rounded-full ${isInitialized ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`}></span>
            <p className="text-xs text-slate-400 font-medium">
              {isInitialized ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setVideoCall(false)}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-rose-900/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-5 2a1 1 0 10-2 0v2a1 1 0 102 0V9z" clipRule="evenodd" />
          </svg>
          Leave Call
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column / Top row: My Video */}
        <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">My Feed</h3>
          <div className="relative flex-1 aspect-video lg:aspect-auto min-h-[240px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-semibold text-white">
              You
            </div>
          </div>
        </div>

        {/* Right column: Remote Videos */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Participants ({remoteStreams.size})
          </h3>
          <div className="flex-1 overflow-y-auto">
            {remoteStreams.size === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-slate-400 font-medium">Waiting for other participants to join...</p>
                <p className="text-xs text-slate-500 mt-1">They will see the call option on their screen.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                  <div key={socketId} className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                    <video
                      ref={el => {
                        if (el && stream) {
                          el.srcObject = stream;
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-semibold text-white">
                      User {socketId.slice(0, 8)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;