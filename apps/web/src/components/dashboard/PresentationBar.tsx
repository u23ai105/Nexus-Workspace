import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import Peer from 'peerjs';
import { Mic, MicOff, Users, StopCircle, Radio } from 'lucide-react';

interface PresentationBarProps {
  socket: Socket | null;
  workspaceId: string;
  userId: string;
  userRole: string; // 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER'
  currentDocumentId: string;
  onNavigateToDocument: (documentId: string) => void;
}

export const PresentationBar: React.FC<PresentationBarProps> = ({
  socket,
  workspaceId,
  userId,
  userRole,
  currentDocumentId,
  onNavigateToDocument
}) => {
  const [isActive, setIsActive] = useState(false);
  const [presenterId, setPresenterId] = useState<string | null>(null);
  
  // Voice state
  const [isMuted, setIsMuted] = useState(true);
  const [peers, setPeers] = useState<Record<string, any>>({}); // stream tracking
  
  const peerInstance = useRef<any>(null);
  const localStream = useRef<MediaStream | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    if (!socket) return;

    socket.emit('workspace:join', workspaceId);

    socket.on('presentation:active', (data) => {
      setIsActive(true);
      setPresenterId(data.presenterId);
      
      if (data.documentId && data.documentId !== currentDocumentId) {
        onNavigateToDocument(data.documentId);
      }
    });

    socket.on('presentation:started', (data) => {
      setIsActive(true);
      setPresenterId(data.presenterId);
      
      if (data.documentId && data.documentId !== currentDocumentId) {
        onNavigateToDocument(data.documentId);
      }
    });

    socket.on('presentation:stopped', () => {
      setIsActive(false);
      setPresenterId(null);
      // clean up streams
      Object.values(audioRefs.current).forEach(audio => {
        audio.srcObject = null;
      });
      setPeers({});
    });

    socket.on('presentation:doc_switched', (data) => {
      if (presenterId !== userId) {
        onNavigateToDocument(data.documentId);
      }
    });

    socket.on('presentation:takeover', (data) => {
      setPresenterId(data.presenterId);
    });

    socket.on('presentation:force_mute', (data) => {
      if (data.targetUserId === userId) {
        setIsMuted(true);
        if (localStream.current) {
          localStream.current.getAudioTracks()[0].enabled = false;
        }
      }
    });

    return () => {
      socket.off('presentation:active');
      socket.off('presentation:started');
      socket.off('presentation:stopped');
      socket.off('presentation:doc_switched');
      socket.off('presentation:takeover');
      socket.off('presentation:force_mute');
    };
  }, [socket, workspaceId, currentDocumentId, presenterId, userId, onNavigateToDocument]);

  useEffect(() => {
    // Notify others if the presenter switches documents
    if (isActive && presenterId === userId && socket && currentDocumentId) {
      socket.emit('presentation:switch_doc', { workspaceId, documentId: currentDocumentId });
    }
  }, [currentDocumentId, isActive, presenterId, socket, workspaceId]);

  // PeerJS setup
  useEffect(() => {
    if (isActive) {
      const peer = new Peer(`${workspaceId}-${userId}`); // deterministic ID
      
      peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
      });

      // Get user audio
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          localStream.current = stream;
          // default muted
          stream.getAudioTracks()[0].enabled = false;

          // Answer incoming calls
          peer.on('call', (call) => {
            call.answer(stream); // Answer with our stream
            call.on('stream', (remoteStream) => {
              setPeers(prev => ({ ...prev, [call.peer]: remoteStream }));
            });
          });

          // Call other users in the room - typically you'd need a signaling server or a list of peers.
          // For simplicity here, we assume users emit a 'voice:join' with their peerId, 
          // and we call them.
        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
        });

      peerInstance.current = peer;

      return () => {
        peer.destroy();
        if (localStream.current) {
          localStream.current.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [isActive, workspaceId, userId]);

  useEffect(() => {
    // Attach streams to audio elements
    Object.entries(peers).forEach(([peerId, stream]) => {
      if (!audioRefs.current[peerId]) {
        const audio = new Audio();
        audio.autoplay = true;
        audioRefs.current[peerId] = audio;
      }
      if (audioRefs.current[peerId].srcObject !== stream) {
        audioRefs.current[peerId].srcObject = stream;
      }
    });
  }, [peers]);

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const startPresentation = () => {
    if (userRole === 'VIEWER') return;
    if (socket) {
      socket.emit('presentation:start', {
        workspaceId,
        documentId: currentDocumentId,
        role: userRole
      });
    }
  };

  const stopPresentation = () => {
    if (socket && presenterId === userId) {
      socket.emit('presentation:stop', workspaceId);
    }
  };

  const isPresenter = presenterId === userId;
  const canPresent = userRole !== 'VIEWER';

  if (!isActive) {
    if (!canPresent) return null;
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={startPresentation}
          className="bg-primary/90 hover:bg-primary text-primary-foreground backdrop-blur-sm px-6 py-3 rounded-full font-medium shadow-xl flex items-center space-x-2 transition-transform hover:scale-105"
        >
          <Radio size={20} />
          <span>Start "Follow Me"</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-full px-6 py-3 flex items-center space-x-6">
      
      {/* Status indicator */}
      <div className="flex items-center space-x-3">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-foreground">
            {isPresenter ? 'You are presenting' : 'Following Presenter'}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            Workspace Mode
          </span>
        </div>
      </div>

      <div className="w-px h-8 bg-border"></div>

      {/* Audio Controls */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleMute}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <div className="flex items-center space-x-1 text-sm text-muted-foreground font-medium">
          <Users size={16} className="mr-1" />
          <span>{Object.keys(peers).length + 1}</span>
        </div>
      </div>

      {isPresenter && (
        <>
          <div className="w-px h-8 bg-border"></div>
          <button
            onClick={stopPresentation}
            className="flex items-center space-x-2 bg-destructive/10 hover:bg-destructive/20 text-destructive px-4 py-2 rounded-full font-medium transition-colors text-sm"
          >
            <StopCircle size={18} />
            <span>Stop Presenting</span>
          </button>
        </>
      )}

      {/* Admin Mute Example (in a real app, this would be a menu listing all users) */}
      {(userRole === 'OWNER' || userRole === 'ADMIN') && !isPresenter && (
         <div className="w-px h-8 bg-border"></div>
      )}
    </div>
  );
};
