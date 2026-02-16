import { useApp } from '@/contexts/AppContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RtcSignal } from '@/types';
import { toast } from '@/components/ui/use-toast';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function CallOverlay() {
  const { inCall, endCall, callChatId, callMode, callInitiator, chats, user, sendRtcSignal, onRtcSignal } = useApp();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState('Conectando...');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const endedRef = useRef(false);

  const callChat = useMemo(() => chats.find((c) => c.id === callChatId) ?? null, [chats, callChatId]);
  const peer = useMemo(() => {
    if (!callChat || callChat.type !== 'direct' || !user) return null;
    return callChat.members.find((m) => m.id !== user.id) ?? null;
  }, [callChat, user]);

  useEffect(() => {
    localStreamRef.current = localStream;
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!inCall || !callChat || !peer || !user) return;

    endedRef.current = false;

    const stopMedia = () => {
      setRemoteStream(null);
      setLocalStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return null;
      });
      localStreamRef.current = null;
    };

    const closePeer = () => {
      if (pcRef.current) {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.close();
        pcRef.current = null;
      }
    };

    const safeEndLocal = (notifyPeer: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      closePeer();
      stopMedia();
      endCall(notifyPeer);
    };

    const ensurePeerConnection = () => {
      if (pcRef.current && pcRef.current.signalingState !== 'closed') return pcRef.current;

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
      if (localStreamRef.current) return localStreamRef.current;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: videoEnabled,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicOn(true);
        setCamOn(videoEnabled && stream.getVideoTracks().length > 0);

        const pc = ensurePeerConnection();
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        return stream;
      } catch (error) {
        if (videoEnabled) {
          toast({
            title: 'Cámara no disponible',
            description: 'Se iniciará la llamada solo con audio.',
          });
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = audioStream;
          setLocalStream(audioStream);
          setMicOn(true);
          setCamOn(false);
          const pc = ensurePeerConnection();
          audioStream.getTracks().forEach((track) => pc.addTrack(track, audioStream));
          return audioStream;
        }
        throw error;
      }
    };

    const createOutgoingOffer = async () => {
      try {
        const pc = ensurePeerConnection();
        await setupLocalMedia(callMode === 'video');

        if (!pcRef.current || pcRef.current.signalingState === 'closed') return;

        const offer = await pc.createOffer();
        if (!pcRef.current || pcRef.current.signalingState === 'closed') return;

        await pc.setLocalDescription(offer);
        sendRtcSignal({
          type: 'offer',
          chatId: callChat.id,
          toUserId: peer.id,
          mode: callMode,
          payload: offer,
        });
        setStatus('Llamando...');
      } catch (error) {
        console.error('[RTC] create offer error', error);
        toast({ title: 'No se pudo iniciar la llamada', description: 'Revisa permisos de micrófono/cámara.' });
        safeEndLocal(false);
      }
    };

    const handleSignal = async (signal: RtcSignal) => {
      if (endedRef.current) return;
      if (signal.chatId !== callChat.id || signal.fromUserId === user.id) return;

      if (signal.type === 'end') {
        setStatus('Llamada finalizada');
        safeEndLocal(false);
        return;
      }

      try {
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

        if (signal.type === 'answer' && signal.payload && pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          setStatus('En llamada');
        }

        if (signal.type === 'ice' && signal.payload && pc.signalingState !== 'closed') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch {
            // ignore ICE race conditions
          }
        }
      } catch (error) {
        console.error('[RTC] signal handling error', error);
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

    return () => {
      unsub();
      closePeer();
      stopMedia();
    };
  }, [inCall, callChat, peer, user, callMode, callInitiator, onRtcSignal, sendRtcSignal, endCall]);

  if (!inCall || !callChat) return null;

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !micOn;
    });
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
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
        const camTrack = localStreamRef.current?.getVideoTracks()?.[0];
        if (camTrack) await sender.replaceTrack(camTrack);
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
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">Participante</div>
        </div>

        <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden aspect-video relative">
          {callMode === 'video' ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-call-foreground text-xl">Tu audio</div>
          )}
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">Tú</div>
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
