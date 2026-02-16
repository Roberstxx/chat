import { useApp } from '@/contexts/AppContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RtcSignal } from '@/types';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallOverlay() {
  const {
    inCall,
    endCall,
    callChatId,
    callMode,
    callInitiator,
    chats,
    user,
    sendRtcSignal,
    onRtcSignal,
  } = useApp();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState('Conectando...');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const callChat = useMemo(() => chats.find((c) => c.id === callChatId) ?? null, [chats, callChatId]);
  const peer = useMemo(() => {
    if (!callChat || callChat.type !== 'direct' || !user) return null;
    return callChat.members.find((m) => m.id !== user.id) ?? null;
  }, [callChat, user]);

  useEffect(() => {
    if (!localVideoRef.current) return;
    localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!remoteVideoRef.current) return;
    remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!inCall || !callChat || !user || !peer) return;

    let active = true;

    const ensurePeerConnection = () => {
      if (pcRef.current) return pcRef.current;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendRtcSignal({
            type: 'ice',
            chatId: callChat.id,
            toUserId: peer.id,
            payload: event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        setStatus('En llamada');
      };

      pcRef.current = pc;
      return pc;
    };

    const setupLocalMedia = async (videoEnabled: boolean) => {
      if (localStream) return localStream;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled,
      });
      if (!active) {
        stream.getTracks().forEach((t) => t.stop());
        return null;
      }
      setLocalStream(stream);
      setMicOn(true);
      setCamOn(videoEnabled);
      const pc = ensurePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      return stream;
    };

    const createOutgoingOffer = async () => {
      const pc = ensurePeerConnection();
      await setupLocalMedia(callMode === 'video');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendRtcSignal({
        type: 'offer',
        chatId: callChat.id,
        toUserId: peer.id,
        mode: callMode,
        payload: offer,
      });

      setStatus('Llamando...');
    };

    const handleSignal = async (signal: RtcSignal) => {
      if (!active || signal.chatId !== callChat.id || signal.fromUserId === user.id) return;
      const pc = ensurePeerConnection();

      if (signal.type === 'offer') {
        await setupLocalMedia((signal.mode ?? callMode) === 'video');
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendRtcSignal({
          type: 'answer',
          chatId: callChat.id,
          toUserId: signal.fromUserId,
          payload: answer,
        });
        setStatus('Conectando...');
      }

      if (signal.type === 'answer' && signal.payload) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        setStatus('En llamada');
      }

      if (signal.type === 'ice' && signal.payload) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
        } catch {
          // ignore early ICE race conditions
        }
      }

      if (signal.type === 'end') {
        setStatus('Llamada finalizada');
        cleanup(false);
      }
    };

    const unsub = onRtcSignal((signal) => {
      void handleSignal(signal);
    });

    if (callInitiator) {
      void createOutgoingOffer();
    } else {
      setStatus('Llamada entrante...');
    }

    function cleanup(notifyPeer: boolean) {
      if (!active) return;
      active = false;
      unsub();

      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.close();
        pcRef.current = null;
      }

      setRemoteStream(null);

      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });

      endCall(notifyPeer);
    }

    return () => {
      if (!active) return;
      active = false;
      unsub();

      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.close();
        pcRef.current = null;
      }

      setRemoteStream(null);
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, [inCall, callChat, user, peer, callMode, callInitiator, onRtcSignal, sendRtcSignal, endCall, localStream]);

  if (!inCall || !callChat) return null;

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !micOn;
    });
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !camOn;
    });
    setCamOn((v) => !v);
  };

  const shareScreen = async () => {
    if (!pcRef.current) return;
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const [videoTrack] = display.getVideoTracks();
    const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
    if (sender && videoTrack) {
      await sender.replaceTrack(videoTrack);
      videoTrack.onended = async () => {
        const camTrack = localStream?.getVideoTracks()?.[0];
        if (camTrack) {
          await sender.replaceTrack(camTrack);
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-call-bg flex flex-col items-center justify-center animate-fade-in p-4">
      <div className="absolute top-6 left-6 text-call-foreground">
        <h2 className="text-lg font-semibold">{callChat.title}</h2>
        <p className="text-sm opacity-70">{status}</p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden aspect-video relative">
          {callMode === 'video' ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-call-foreground text-xl">Audio</div>
          )}
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">
            {peer?.displayName || 'Participante'}
          </div>
        </div>

        <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden aspect-video relative">
          {callMode === 'video' ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-call-foreground text-xl">Tu audio</div>
          )}
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">
            Tú
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 flex items-center gap-4">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? 'bg-call-muted text-call-foreground hover:opacity-80' : 'bg-destructive text-destructive-foreground'
          }`}
          aria-label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>

        {callMode === 'video' && (
          <button
            onClick={toggleCam}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              camOn ? 'bg-call-muted text-call-foreground hover:opacity-80' : 'bg-destructive text-destructive-foreground'
            }`}
            aria-label={camOn ? 'Apagar cámara' : 'Encender cámara'}
          >
            {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
        )}

        {callMode === 'video' && (
          <button
            onClick={() => void shareScreen()}
            className="w-12 h-12 rounded-full bg-call-muted text-call-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Compartir pantalla"
          >
            <Monitor className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => endCall(true)}
          className="w-14 h-14 rounded-full bg-call-danger text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Colgar"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
