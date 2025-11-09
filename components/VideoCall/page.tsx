// // import { useEffect, useRef } from "react";
// // import { userChatStore } from "@/store/chatStore";

// // const VideoCall = () => {
// //   const { currentChatId, currentUserId, socket } = userChatStore();

// //   const peerConnection = useRef<RTCPeerConnection | null>(null);
// //   const localStream = useRef<MediaStream | null>(null);
// //   const isInitializing = useRef(false);
// //   const pendingCandidates = useRef<RTCIceCandidate[]>([]);




// //   const localRef = useRef<HTMLVideoElement>(null);
// //   const remoteRef = useRef<HTMLVideoElement>(null);

// //   const videoConstraints = {
// //     audio: true,
// //     video: { width: 640, height: 480 },
// //   };

// //   useEffect(() => {
// //     if (!socket || !currentChatId || !currentUserId) return;

// //     let isMounted = true;
// //     isInitializing.current = true;

// //     const init = async () => {
// //       try {
// //         if (!isMounted) return;

// //         const pc = new RTCPeerConnection({
// //           iceServers: [
// //             { urls: "stun:stun.l.google.com:19302" },
// //           ],
// //         });
// //         peerConnection.current = pc;

// //         if (!isMounted) {
// //           pc.close();
// //           return;
// //         }

// //         const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
// //         localStream.current = stream;

// //         if (!isMounted) {
// //           stream.getTracks().forEach(track => track.stop());
// //           pc.close();
// //           return;
// //         }

// //         if (localRef.current) localRef.current.srcObject = stream;

// //         if (!isMounted || pc.signalingState === 'closed') {
// //           stream.getTracks().forEach(track => track.stop());
// //           return;
// //         }

// //         stream.getTracks().forEach((track) => pc.addTrack(track, stream));

// //         pc.ontrack = (event) => {
// //           if (remoteRef.current && isMounted) {
// //             remoteRef.current.srcObject = event.streams[0];
// //           }
// //         };

// //         pc.onicecandidate = (event) => {
// //           if (event.candidate && isMounted) {
// //             socket.emit("ice-candidate", {
// //               chatId: currentChatId,
// //               senderId: currentUserId,
// //               candidate: event.candidate,
// //             });
// //           }
// //         };

// //         socket.on("sdp-offer", async (data) => {
// //           if (data.senderId === currentUserId) return;
// //           if (!peerConnection.current || !isMounted) return;
// //           const pc = peerConnection.current;

// //           if (pc.signalingState === 'closed') return;

// //           // Check if we're in a state that can accept an offer
// //           if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
// //             console.warn('Ignoring offer in state:', pc.signalingState);
// //             return;
// //           }

// //           // If we have a local offer pending, use rollback to handle collision
// //           if (pc.signalingState === 'have-local-offer') {
// //             await pc.setLocalDescription({ type: 'rollback' });
// //           }

// //           await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          
// //           // Process any pending ICE candidates after setting remote description
// //           while (pendingCandidates.current.length > 0) {
// //             const candidate = pendingCandidates.current.shift();
// //             if (candidate) {
// //               try {
// //                 await pc.addIceCandidate(candidate);
// //               } catch (err) {
// //                 console.error("Error adding queued ICE candidate:", err);
// //               }
// //             }
// //           }

// //           const answer = await pc.createAnswer();
// //           await pc.setLocalDescription(answer);

// //           socket.emit("sdp-answer", {
// //             chatId: currentChatId,
// //             senderId: currentUserId,
// //             answer,
// //           });
// //         });

// //         socket.on("sdp-answer", async (data) => {
// //           if (data.senderId === currentUserId) return;
// //           if (!peerConnection.current || !isMounted) return;
// //           const pc = peerConnection.current;

// //           if (pc.signalingState === 'closed') return;

// //           // Only accept answer if we're expecting one (have-local-offer state)
// //           if (pc.signalingState !== 'have-local-offer') {
// //             console.warn('Ignoring answer in state:', pc.signalingState);
// //             return;
// //           }

// //           await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          
// //           // Process any pending ICE candidates after setting remote description
// //           while (pendingCandidates.current.length > 0) {
// //             const candidate = pendingCandidates.current.shift();
// //             if (candidate) {
// //               try {
// //                 await pc.addIceCandidate(candidate);
// //               } catch (err) {
// //                 console.error("Error adding queued ICE candidate:", err);
// //               }
// //             }
// //           }
// //         });

// //         socket.on("ice-candidate", async (data) => {
// //           if (data.senderId === currentUserId) return;
// //           if (!peerConnection.current || !isMounted) return;
// //           const pc = peerConnection.current;

// //           if (pc.signalingState === 'closed') return;

// //           const candidate = new RTCIceCandidate(data.candidate);

// //           // If remote description is not set yet, queue the candidate
// //           if (!pc.remoteDescription) {
// //             pendingCandidates.current.push(candidate);
// //             return;
// //           }

// //           // Otherwise, add it immediately
// //           try {
// //             await pc.addIceCandidate(candidate);
// //           } catch (err) {
// //             console.error("Error adding ICE candidate:", err);
// //           }
// //         });

// //         // Only create offer if we're the "caller" (e.g., user with lower ID)
// //         // This prevents both peers from creating offers simultaneously
// //         if (!isMounted) return;

// //         // Determine if this peer should initiate the call
// //         // You can use any logic here - for example, compare user IDs
// //         const shouldInitiate = true; // Replace with your logic, e.g., currentUserId < otherUserId

// //         if (shouldInitiate) {
// //           const offer = await pc.createOffer();
// //           await pc.setLocalDescription(offer);
// //           socket.emit("sdp-offer", {
// //             chatId: currentChatId,
// //             senderId: currentUserId,
// //             offer,
// //           });
// //         }
// //       } catch (err) {
// //         console.error("Error initializing video call:", err);
// //       } finally {
// //         isInitializing.current = false;
// //       }
// //     };

// //     init();

// //     return () => {
// //       isMounted = false;

// //       socket.off("sdp-offer");
// //       socket.off("sdp-answer");
// //       socket.off("ice-candidate");

// //       // Clear pending candidates
// //       pendingCandidates.current = [];

// //       if (localStream.current) {
// //         localStream.current.getTracks().forEach(track => track.stop());
// //         localStream.current = null;
// //       }

// //       if (peerConnection.current) {
// //         peerConnection.current.close();
// //         peerConnection.current = null;
// //       }
// //     };
// //   }, [socket, currentChatId, currentUserId]);




// //   return (
// //     <div className="flex flex-col items-center gap-4 p-4">
// //       <h2 className="text-lg font-semibold">Video Call</h2>
// //       <div className="flex gap-4">
// //         <video
// //           ref={localRef}
// //           autoPlay
// //           playsInline
// //           muted
// //           className="w-1/2 rounded-lg shadow-md border border-gray-300"
// //         />
// //         <video
// //           ref={remoteRef}
// //           autoPlay
// //           playsInline
// //           className="w-1/2 rounded-lg shadow-md border border-gray-300"
// //         />
// //       </div>
// //     </div>
// //   );
// // };

// // export default VideoCall;


//          import { useEffect, useRef, useState } from "react";
// import { userChatStore } from "@/store/chatStore";
// import { PhoneOutgoing, PhoneIncoming, PhoneCall, Video, Mic, MicOff, VideoOff, X } from "lucide-react"; // Importing icons

// const VideoCall = () => {
//   const { currentChatId, currentUserId, socket } = userChatStore();

//   const peerConnection = useRef<RTCPeerConnection | null>(null);
//   const localStream = useRef<MediaStream | null>(null);
//   const isInitializing = useRef(false);
//   const pendingCandidates = useRef<RTCIceCandidate[]>([]);

//   const localRef = useRef<HTMLVideoElement>(null);
//   const remoteRef = useRef<HTMLVideoElement>(null);

//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);
//   const [callStatus, setCallStatus] = useState("connecting"); // connecting, in-call, ended

//   const videoConstraints = {
//     audio: true,
//     video: { width: 640, height: 480 },
//   };

//   useEffect(() => {
//     if (!socket || !currentChatId || !currentUserId) return;

//     let isMounted = true;
//     isInitializing.current = true;
//     setCallStatus("connecting");

//     const init = async () => {
//       try {
//         if (!isMounted) return;

//         const pc = new RTCPeerConnection({
//           iceServers: [
//             { urls: "stun:stun.l.google.com:19302" },
//           ],
//         });
//         peerConnection.current = pc;

//         if (!isMounted) {
//           pc.close();
//           return;
//         }

//         const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
//         localStream.current = stream;

//         if (!isMounted) {
//           stream.getTracks().forEach(track => track.stop());
//           pc.close();
//           return;
//         }

//         if (localRef.current) localRef.current.srcObject = stream;

//         if (!isMounted || pc.signalingState === 'closed') {
//           stream.getTracks().forEach(track => track.stop());
//           return;
//         }

//         stream.getTracks().forEach((track) => pc.addTrack(track, stream));

//         pc.ontrack = (event) => {
//           if (remoteRef.current && isMounted) {
//             remoteRef.current.srcObject = event.streams[0];
//             setCallStatus("in-call");
//           }
//         };

//         pc.onicecandidate = (event) => {
//           if (event.candidate && isMounted) {
//             socket.emit("ice-candidate", {
//               chatId: currentChatId,
//               senderId: currentUserId,
//               candidate: event.candidate,
//             });
//           }
//         };

//         socket.on("sdp-offer", async (data) => {
//           if (data.senderId === currentUserId) return;
//           if (!peerConnection.current || !isMounted) return;
//           const pc = peerConnection.current;

//           if (pc.signalingState === 'closed') return;

//           if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
//             console.warn('Ignoring offer in state:', pc.signalingState);
//             return;
//           }

//           if (pc.signalingState === 'have-local-offer') {
//             await pc.setLocalDescription({ type: 'rollback' });
//           }

//           await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

//           while (pendingCandidates.current.length > 0) {
//             const candidate = pendingCandidates.current.shift();
//             if (candidate) {
//               try {
//                 await pc.addIceCandidate(candidate);
//               } catch (err) {
//                 console.error("Error adding queued ICE candidate:", err);
//               }
//             }
//           }

//           const answer = await pc.createAnswer();
//           await pc.setLocalDescription(answer);

//           socket.emit("sdp-answer", {
//             chatId: currentChatId,
//             senderId: currentUserId,
//             answer,
//           });
//         });

//         socket.on("sdp-answer", async (data) => {
//           if (data.senderId === currentUserId) return;
//           if (!peerConnection.current || !isMounted) return;
//           const pc = peerConnection.current;

//           if (pc.signalingState === 'closed') return;

//           if (pc.signalingState !== 'have-local-offer') {
//             console.warn('Ignoring answer in state:', pc.signalingState);
//             return;
//           }

//           await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

//           while (pendingCandidates.current.length > 0) {
//             const candidate = pendingCandidates.current.shift();
//             if (candidate) {
//               try {
//                 await pc.addIceCandidate(candidate);
//               } catch (err) {
//                 console.error("Error adding queued ICE candidate:", err);
//               }
//             }
//           }
//         });

//         socket.on("ice-candidate", async (data) => {
//           if (data.senderId === currentUserId) return;
//           if (!peerConnection.current || !isMounted) return;
//           const pc = peerConnection.current;

//           if (pc.signalingState === 'closed') return;

//           const candidate = new RTCIceCandidate(data.candidate);

//           if (!pc.remoteDescription) {
//             pendingCandidates.current.push(candidate);
//             return;
//           }

//           try {
//             await pc.addIceCandidate(candidate);
//           } catch (err) {
//             console.error("Error adding ICE candidate:", err);
//           }
//         });

//         if (!isMounted) return;

//         const shouldInitiate = true;

//         if (shouldInitiate) {
//           const offer = await pc.createOffer();
//           await pc.setLocalDescription(offer);
//           socket.emit("sdp-offer", {
//             chatId: currentChatId,
//             senderId: currentUserId,
//             offer,
//           });
//         }
//       } catch (err) {
//         console.error("Error initializing video call:", err);
//       } finally {
//         isInitializing.current = false;
//       }
//     };

//     init();

//     return () => {
//       isMounted = false;

//       socket.off("sdp-offer");
//       socket.off("sdp-answer");
//       socket.off("ice-candidate");

//       pendingCandidates.current = [];

//       if (localStream.current) {
//         localStream.current.getTracks().forEach(track => track.stop());
//         localStream.current = null;
//       }

//       if (peerConnection.current) {
//         peerConnection.current.close();
//         peerConnection.current = null;
//       }
//       setCallStatus("ended");
//     };
//   }, [socket, currentChatId, currentUserId]);

//   const toggleMute = () => {
//     if (localStream.current) {
//       localStream.current.getAudioTracks().forEach(track => {
//         track.enabled = !track.enabled;
//         setIsMuted(!track.enabled);
//       });
//     }
//   };

//   const toggleVideo = () => {
//     if (localStream.current) {
//       localStream.current.getVideoTracks().forEach(track => {
//         track.enabled = !track.enabled;
//         setIsVideoOff(!track.enabled);
//       });
//     }
//   };

//   const endCall = () => {
//     if (localStream.current) {
//       localStream.current.getTracks().forEach(track => track.stop());
//     }
//     if (peerConnection.current) {
//       peerConnection.current.close();
//     }
//     // You might want to emit a socket event here to inform the other peer that the call has ended
//     setCallStatus("ended");
//   };

//   const renderCallStatus = () => {
//     switch (callStatus) {
//       case "connecting":
//         return (
//           <div className="flex items-center text-yellow-500">
//             <PhoneOutgoing className="h-5 w-5 mr-2 animate-pulse" /> Connecting...
//           </div>
//         );
//       case "in-call":
//         return (
//           <div className="flex items-center text-green-500">
//             <PhoneCall className="h-5 w-5 mr-2" /> In Call
//           </div>
//         );
//       case "ended":
//         return (
//           <div className="flex items-center text-red-500">
//             <X className="h-5 w-5 mr-2" /> Call Ended
//           </div>
//         );
//       default:
//         return null;
//     }
//   };

//   return (
//     <div className="relative flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
//       <div className="absolute top-4 left-4 text-sm">
//         {renderCallStatus()}
//       </div>

//       <h2 className="text-3xl font-extrabold mb-8 tracking-wider">Video Call</h2>

//       <div className="relative w-full max-w-4xl aspect-video bg-gray-700 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center">
//         {/* Remote Video (Main View) */}
//         <video
//           ref={remoteRef}
//           autoPlay
//           playsInline
//           className="absolute inset-0 w-full h-full object-cover"
//           style={{ transform: 'scaleX(-1)' }} // Mirror remote video for natural feel
//         />
//         {callStatus !== "in-call" && (
//           <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 text-gray-400 text-xl">
//             Waiting for other participant...
//           </div>
//         )}

//         {/* Local Video (Picture-in-Picture) */}
//         <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-white/30">
//           <video
//             ref={localRef}
//             autoPlay
//             playsInline
//             muted
//             className="w-full h-full object-cover"
//             style={{ transform: 'scaleX(-1)' }} // Mirror local video for natural feel
//           />
//           {isVideoOff && (
//             <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 text-gray-400 text-sm">
//               <VideoOff className="h-6 w-6 mr-1" /> Camera Off
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Controls */}
//       <div className="flex justify-center gap-6 mt-10 p-4 bg-gray-800 rounded-full shadow-lg">
//         <button
//           onClick={toggleMute}
//           className={`p-4 rounded-full transition-all duration-300 ${
//             isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
//           } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
//           aria-label={isMuted ? "Unmute" : "Mute"}
//         >
//           {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
//         </button>

//         <button
//           onClick={toggleVideo}
//           className={`p-4 rounded-full transition-all duration-300 ${
//             isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
//           } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
//           aria-label={isVideoOff ? "Turn video on" : "Turn video off"}
//         >
//           {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
//         </button>

//         <button
//           onClick={endCall}
//           className="p-4 rounded-full bg-red-700 hover:bg-red-800 transition-colors duration-300 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
//           aria-label="End call"
//         >
//           <PhoneOutgoing className="h-6 w-6 rotate-[135deg]" /> {/* Rotated to look like hang up */}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default VideoCall;


import { useEffect, useRef, useState } from "react";
import { userChatStore } from "@/store/chatStore";
import { PhoneOutgoing, PhoneIncoming, PhoneCall, Video, Mic, MicOff, VideoOff, X } from "lucide-react";

interface VideoCallProps {
  onEndCall: () => void;
}

const VideoCall = ({ onEndCall }: VideoCallProps) => {
  const { currentChatId, currentUserId, socket  ,setVideoCall, setAccepting} = userChatStore();

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const isInitializing = useRef(false);
  const pendingCandidates = useRef<RTCIceCandidate[]>([]);

  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

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
    isInitializing.current = true;
    setCallStatus("connecting");

    const init = async () => {
      try {
        if (!isMounted) return;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
          ],
        });
        peerConnection.current = pc;

        if (!isMounted) {
          pc.close();
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        localStream.current = stream;

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          pc.close();
          return;
        }

        if (localRef.current) localRef.current.srcObject = stream;

        if (!isMounted || pc.signalingState === 'closed') {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteRef.current && isMounted) {
            remoteRef.current.srcObject = event.streams[0];
            setCallStatus("in-call");
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && isMounted) {
            socket.emit("ice-candidate", {
              chatId: currentChatId,
              senderId: currentUserId,
              candidate: event.candidate,
            });
          }
        };

        socket.on("sdp-offer", async (data) => {
          if (data.senderId === currentUserId) return;
          if (!peerConnection.current || !isMounted) return;
          const pc = peerConnection.current;

          if (pc.signalingState === 'closed') return;

          if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
            console.warn('Ignoring offer in state:', pc.signalingState);
            return;
          }

          if (pc.signalingState === 'have-local-offer') {
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

          while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(candidate);
              } catch (err) {
                console.error("Error adding queued ICE candidate:", err);
              }
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("sdp-answer", {
            chatId: currentChatId,
            senderId: currentUserId,
            answer,
          });
        });

        socket.on("sdp-answer", async (data) => {
          if (data.senderId === currentUserId) return;
          if (!peerConnection.current || !isMounted) return;
          const pc = peerConnection.current;

          if (pc.signalingState === 'closed') return;

          if (pc.signalingState !== 'have-local-offer') {
            console.warn('Ignoring answer in state:', pc.signalingState);
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          while (pendingCandidates.current.length > 0) {
            const candidate = pendingCandidates.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(candidate);
              } catch (err) {
                console.error("Error adding queued ICE candidate:", err);
              }
            }
          }
        });

        socket.on("ice-candidate", async (data) => {
          if (data.senderId === currentUserId) return;
          if (!peerConnection.current || !isMounted) return;
          const pc = peerConnection.current;

          if (pc.signalingState === 'closed') return;

          const candidate = new RTCIceCandidate(data.candidate);

          if (!pc.remoteDescription) {
            pendingCandidates.current.push(candidate);
            return;
          }

          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        // Listen for remote user ending the call
        socket.on("call-end", (data) => {
            console.log("Remote user ended the call");
            onEndCall();
        });

        if (!isMounted) return;

        const shouldInitiate = true;

        if (shouldInitiate) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("sdp-offer", {
            chatId: currentChatId,
            senderId: currentUserId,
            offer,
          });
        }
      } catch (err) {
        console.error("Error initializing video call:", err);
      } finally {
        isInitializing.current = false;
      }
    };

    init();

    return () => {
      isMounted = false;

      socket.off("sdp-offer");
      socket.off("sdp-answer");
      socket.off("ice-candidate");
      socket.off("call-ended");

      pendingCandidates.current = [];

      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
        localStream.current = null;
      }

      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      setCallStatus("ended");
    };
  }, [socket, currentChatId, currentUserId, onEndCall]);

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

  const endCall = () => {
    // Stop all tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    
    // Emit socket event to notify the other user
      console.log("i am ending the vc");
      socket?.emit("end-call", {
        chatId: currentChatId,
      });

      setAccepting(false);
      setVideoCall(false);
    
    
    // Close the video call UI
    setCallStatus("ended");
    onEndCall();
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
        {/* Remote Video (Main View) */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {callStatus !== "in-call" && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-70 text-gray-400 text-xl">
            Waiting for other participant...
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg shadow-lg overflow-hidden border-2 border-white/30">
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
      <div className="flex justify-center gap-6 mt-10 p-4 bg-gray-800 rounded-full shadow-lg">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-300 ${
            isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
          } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 ${
            isVideoOff ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
          } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
          aria-label={isVideoOff ? "Turn video on" : "Turn video off"}
        >
          {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </button>

        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-700 hover:bg-red-800 transition-colors duration-300 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          aria-label="End call"
        >
          <PhoneOutgoing className="h-6 w-6 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
};

export default VideoCall;