import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, User, Video } from 'lucide-react';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatar?: string | null;
  onAccept: () => void;
  onDecline: () => void;
  isVisible: boolean;
}

const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerName,
  callerAvatar,
  onAccept,
  onDecline,
  isVisible,
}) => {
  const [isRinging, setIsRinging] = useState(true);

  useEffect(() => {
    if (!isVisible) {
      setIsRinging(false);
      return;
    }

    setIsRinging(true);

    // Auto-decline after 30 seconds if no response
    const timeout = setTimeout(() => {
      onDecline();
    }, 30000);

    return () => clearTimeout(timeout);
  }, [isVisible, onDecline]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-700">
        {/* Caller Info */}
        <div className="flex flex-col items-center mb-8">
          {/* Avatar */}
          <div className={`relative mb-4 ${isRinging ? 'animate-pulse' : ''}`}>
            {callerAvatar ? (
              <img
                src={callerAvatar}
                alt={callerName}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-blue-500/50 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center ring-4 ring-blue-500/50 shadow-xl">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            
            {/* Ringing indicator */}
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center animate-ping">
              <Video className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Caller Name */}
          <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
          <p className="text-gray-400 text-sm mb-1">Incoming video call...</p>
          
          {/* Ringing animation */}
          {isRinging && (
            <div className="flex gap-1 mt-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {/* Decline Button */}
          <button
            onClick={onDecline}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-red-500/50"
            aria-label="Decline call"
          >
            <PhoneOff className="w-8 h-8 text-white" />
            <span className="absolute -bottom-8 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Decline
            </span>
          </button>

          {/* Accept Button */}
          <button
            onClick={onAccept}
            className="group relative flex flex-col items-center gap-2 p-4 rounded-full bg-green-600 hover:bg-green-700 transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-green-500/50 animate-pulse"
            aria-label="Accept call"
          >
            <Phone className="w-8 h-8 text-white" />
            <span className="absolute -bottom-8 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Accept
            </span>
          </button>
        </div>

        {/* Timeout indicator */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Call will automatically end in 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;

// ============================================
// USAGE EXAMPLE IN USERCHAT.TSX
// ============================================

/*
// Add these states in UserChat component:
const [showIncomingCall, setShowIncomingCall] = useState(false);
const [incomingCallData, setIncomingCallData] = useState<{
  callerName: string;
  callerAvatar?: string | null;
  callerId: string;
} | null>(null);

// Add this useEffect to listen for incoming calls:
useEffect(() => {
  if (!socket) return;

  const handleIncomingCall = (data: {
    callerId: string;
    callerName: string;
    callerAvatar?: string | null;
    chatId: string;
  }) => {
    if (data.callerId === currentUserId) return; // Don't show for initiator
    
    setIncomingCallData({
      callerName: data.callerName,
      callerAvatar: data.callerAvatar,
      callerId: data.callerId,
    });
    setShowIncomingCall(true);
  };

  socket.on('incoming-video-call', handleIncomingCall);

  return () => {
    socket.off('incoming-video-call', handleIncomingCall);
  };
}, [socket, currentUserId]);

// Handle accept call
const handleAcceptCall = () => {
  setShowIncomingCall(false);
  setVideoCall(true);
  
  // Emit acceptance to the caller
  socket?.emit('call-accepted', {
    chatId: currentChatId,
    accepterId: currentUserId,
  });
};

// Handle decline call
const handleDeclineCall = () => {
  setShowIncomingCall(false);
  setIncomingCallData(null);
  
  // Emit decline to the caller
  socket?.emit('call-declined', {
    chatId: currentChatId,
    declinerId: currentUserId,
  });
};

// Update VideoCallHandler to emit incoming call event:
const VideoCallHandler = () => {
  socket?.emit("incoming-video-call", {
    chatId: currentChatId,
    callerId: currentUserId,
    callerName: "Your Name", // Get from user data
    callerAvatar: "Your Avatar URL", // Get from user data
  });
  setVideoCall(true);
};

// Add modal to JSX (before VideoCall component):
{showIncomingCall && incomingCallData && (
  <IncomingCallModal
    callerName={incomingCallData.callerName}
    callerAvatar={incomingCallData.callerAvatar}
    onAccept={handleAcceptCall}
    onDecline={handleDeclineCall}
    isVisible={showIncomingCall}
  />
)}
*/