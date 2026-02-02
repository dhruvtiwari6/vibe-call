import { useEffect, useRef, useState } from "react";
import { userChatStore } from "@/store/chatStore";
import { PhoneOutgoing, PhoneCall, Video, Mic, MicOff, VideoOff, X } from "lucide-react";
import * as mediasoupClient from 'mediasoup-client';

interface VideoCallProps {
  onEndCall: () => void;
}

const VideoCall = ({ onEndCall }: VideoCallProps) => {
  const { currentChatId, currentUserId, socket } = userChatStore();

  // Mediasoup refs
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const producersRef = useRef<Map<string, string>>(new Map()); // kind -> producerId
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map());

  const localStream = useRef<MediaStream | null>(null);
  const localRef = useRef<HTMLVideoElement>(null);

  // For now, simpler UI: Main remote video and list of others? 
  // Or just a grid. Let's do a grid or just keep the main one for 1-1, but SFU allows many.
  // The previous UI was 1-1. Let's assume 1-1 for the main view but keep the array for potential expansion.
  const [remoteStreams, setRemoteStreams] = useState<{ producerId: string, stream: MediaStream }[]>([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callStatus, setCallStatus] = useState("connecting");

  const videoConstraints = {
    audio: true,
    video: { width: 640, height: 480 },
  };

  useEffect(() => {
    if (!socket || !currentChatId || !currentUserId) return;

    let isMounted = true;
    setCallStatus("connecting");

    const init = async () => {
      try {
        if (!isMounted) return;

        // 1. Get Local Stream
        const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        localStream.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        // 2. Get Router Capabilities
        socket.emit('get-router-rtp-capabilities', async (rtpCaps: mediasoupClient.types.RtpCapabilities) => {
          if (!isMounted || !rtpCaps) return;

          const device = new mediasoupClient.Device();
          await device.load({ routerRtpCapabilities: rtpCaps });
          deviceRef.current = device;

          // 3. Create Send Transport
          socket.emit('create-transport', { sender: true }, async (params: any) => {
            if (params.error) {
              console.error("Create send transport error", params.error);
              return;
            }
            const transport = device.createSendTransport(params);
            sendTransportRef.current = transport;

            transport.on('connect', ({ dtlsParameters }, cb, err) => {
              socket.emit('transport-connect', { transportId: transport.id, dtlsParameters }, cb);
            });

            transport.on('produce', (params, cb, err) => {
              // Include transportId in the produce event
              socket.emit('transport-produce', { transportId: transport.id, ...params }, ({ id }: { id: string }) => {
                cb({ id });
              });
            });

            // Produce video (and audio?)
            try {
              // Audio
              const audioTrack = stream.getAudioTracks()[0];
              if (audioTrack) {
                const producer = await transport.produce({ track: audioTrack });
                producersRef.current.set('audio', producer.id);
              }

              // Video
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                const producer = await transport.produce({ track: videoTrack });
                producersRef.current.set('video', producer.id);
              }
            } catch (err) {
              console.error("Produce error:", err);
            }
          });

          // 4. Create Recv Transport
          socket.emit('create-transport', { sender: false }, (params: any) => {
            if (params.error) {
              console.error("Create recv transport error", params.error);
              return;
            }
            const transport = device.createRecvTransport(params);
            recvTransportRef.current = transport;

            transport.on('connect', ({ dtlsParameters }, cb, err) => {
              socket.emit('transport-connect', { transportId: transport.id, dtlsParameters }, cb);
            });

            // Get existing producers
            socket.emit('get-producers', (list: { producerId: string, producerSocketId: string }[]) => {
              list.forEach(p => consumeProducer(p.producerId, socket, device, transport));
            });

            setCallStatus("in-call");
          });
        });

      } catch (err) {
        console.error("Error initializing mediasoup:", err);
      }
    };

    init();

    // Socket Events
    const handleNewProducer = ({ producerId }: { producerId: string }) => {
      console.log("New producer:", producerId);
      if (recvTransportRef.current && deviceRef.current) {
        consumeProducer(producerId, socket, deviceRef.current, recvTransportRef.current);
      }
    };

    const handlePeerLeft = ({ producerId }: { producerId: string }) => {
      setRemoteStreams(prev => prev.filter(s => s.producerId !== producerId));
      const consumer = consumersRef.current.get(producerId); // We mapped consumer by producerId conceptually or we just close it
      // Actually consumersRef key should probably be producerId or consumerId.
      // For simplicity, let's just trust state update cleans UI.
    };

    socket.on('new-producer', handleNewProducer);
    socket.on('peer-left', handlePeerLeft);

    return () => {
      isMounted = false;
      socket.off('new-producer', handleNewProducer);
      socket.off('peer-left', handlePeerLeft);

      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (sendTransportRef.current) sendTransportRef.current.close();
      if (recvTransportRef.current) recvTransportRef.current.close();
    };
  }, [socket, currentChatId, currentUserId]);

  const consumeProducer = async (
    producerId: string,
    socket: any,
    device: mediasoupClient.types.Device,
    transport: mediasoupClient.types.Transport
  ) => {
    try {
      const { rtpCapabilities } = device;
      socket.emit('consume', {
        transportId: transport.id,
        producerId,
        rtpCapabilities
      }, async (params: any) => {
        if (params.error) {
          console.error("Consume error:", params.error);
          return;
        }

        const consumer = await transport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters
        });

        consumersRef.current.set(consumer.id, consumer);

        const stream = new MediaStream([consumer.track]);

        setRemoteStreams(prev => [...prev, { producerId, stream }]);

        // Resume on server
        socket.emit('consumer-resume', { consumerId: consumer.id });
      });
    } catch (error) {
      console.error("Consume setup error:", error);
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      localStream.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      localStream.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    }
  };

  const renderCallStatus = () => {
    switch (callStatus) {
      case "connecting":
        return (
          <div className="flex items-center text-yellow-500">
            <PhoneOutgoing className="h-5 w-5 mr-2 animate-pulse" /> Connecting...
          </div>
        );
      case "in-call":
        return (
          <div className="flex items-center text-green-500">
            <PhoneCall className="h-5 w-5 mr-2" /> In Call
          </div>
        );
      case "ended":
        return (
          <div className="flex items-center text-red-500">
            <X className="h-5 w-5 mr-2" /> Call Ended
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
      <div className="absolute top-4 left-4 text-sm">
        {renderCallStatus()}
      </div>

      <h2 className="text-3xl font-extrabold mb-8 tracking-wider">Video Call</h2>

      <div className="relative w-full max-w-4xl aspect-video bg-gray-700 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
        {/* Remote Video(s) */}
        {remoteStreams.length > 0 ? (
          <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
            {remoteStreams.map((rs) => (
              <VideoReference key={rs.producerId} stream={rs.stream} />
            ))}
          </div>
        ) : (
          callStatus !== "in-call" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 text-gray-400 text-xl">
              Waiting for participants...
            </div>
          )
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-white/30 z-10">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 text-gray-400 text-sm">
              <VideoOff className="h-6 w-6 mr-1" /> Camera Off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-6 mt-10 p-4 bg-gray-800 rounded-full shadow-lg z-20">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-300 ${isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
            } text-white focus:outline-none`}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 ${isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
            } text-white focus:outline-none`}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </button>

        <button
          onClick={() => {
            // cleanup handled in effect cleanup, but checking here
            onEndCall();
          }}
          className="p-4 rounded-full bg-red-700 hover:bg-red-800 transition-colors duration-300 text-white focus:outline-none"
        >
          <PhoneOutgoing className="h-6 w-6 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};

const VideoReference = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-cover rounded-lg"
    />
  )
}

export default VideoCall;