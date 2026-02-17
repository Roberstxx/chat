import { useApp } from '@/contexts/AppContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, Phone, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RtcSignal, User } from '@/types';
import { toast } from '@/components/ui/use-toast';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function MediaStreamView({ stream, mirrored = false }: { stream: MediaStream | null; mirrored?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      void audioRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={mirrored}
        className={`w-full h-full object-cover ${mirrored ? 'scale-x-[-1]' : ''}`}
      />
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
    </>
  );
}

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
    consumePendingIncomingOffer,
  } = useApp();

  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState('Conectando...');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [incomingOffer, setIncomingOffer] = useState<RtcSignal | null>(null);
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState<Record<string, boolean>>({});

  const incomingOfferRef = useRef<RtcSignal | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcByPeerRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingIceByPeerRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const remoteStreamByPeerRef = useRef(new Map<string, MediaStream>());
  const endedRef = useRef(false);
  const acceptIncomingRef = useRef<((signal: RtcSignal) => Promise<void>) | null>(null);
  const rejectIncomingRef = useRef<(() => void) | null>(null);

  const callChat = useMemo(() => chats.find((c) => c.id === callChatId) ?? null, [chats, callChatId]);
  const participants = useMemo(() => {
    if (!callChat || !user) return [] as User[];
    return callChat.members.filter((m) => m.id !== user.id);
  }, [callChat, user]);
  const isGroupCall = callChat?.type === 'group';

  useEffect(() => {
    incomingOfferRef.current = incomingOffer;
  }, [incomingOffer]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    const watchVolume = (
      stream: MediaStream | null,
      setSpeaking: (active: boolean) => void,
      trackEnabled?: () => boolean,
    ) => {
      if (!stream) {
        setSpeaking(false);
        return () => undefined;
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        setSpeaking(false);
        return () => undefined;
      }

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;

      const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
      source.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      let rafId = 0;
      let activeUntil = 0;

      const measure = () => {
        analyser.getByteTimeDomainData(data);
        const allowDetection = trackEnabled ? trackEnabled() : true;

        if (!allowDetection) {
          setSpeaking(false);
          rafId = requestAnimationFrame(measure);
          return;
        }

        let sumSquares = 0;
        for (const value of data) {
          const normalized = value / 128 - 1;
          sumSquares += normalized * normalized;
        }

        const rms = Math.sqrt(sumSquares / data.length);
        const now = performance.now();
        if (rms > 0.02) activeUntil = now + 220;
        setSpeaking(now < activeUntil);
        rafId = requestAnimationFrame(measure);
      };

      measure();

      return () => {
        cancelAnimationFrame(rafId);
        setSpeaking(false);
        source.disconnect();
        analyser.disconnect();
        void ctx.close();
      };
    };

    const stopLocal = watchVolume(localStream, setLocalSpeaking, () => Boolean(localStream?.getAudioTracks()[0]?.enabled));

    const remoteStops = Object.entries(remoteStreams).map(([peerId, stream]) =>
      watchVolume(stream, (isSpeaking) => {
        setRemoteSpeaking((prev) => ({ ...prev, [peerId]: isSpeaking }));
      }),
    );

    return () => {
      stopLocal();
      remoteStops.forEach((stop) => stop());
    };
  }, [localStream, remoteStreams]);

  useEffect(() => {
    if (!inCall || !callChat || !user) return;

    endedRef.current = false;

    const stopMedia = () => {
      setRemoteStreams({});
      setRemoteSpeaking({});
      remoteStreamByPeerRef.current.clear();
      pendingIceByPeerRef.current.clear();

      setLocalStream((prev) => {
        prev?.getTracks().forEach((track) => track.stop());
        return null;
      });
      localStreamRef.current = null;
    };

    const closeAllPeers = () => {
      for (const pc of pcByPeerRef.current.values()) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.close();
      }
      pcByPeerRef.current.clear();
    };

    const closePeer = (peerId: string) => {
      const pc = pcByPeerRef.current.get(peerId);
      if (!pc) return;
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      pcByPeerRef.current.delete(peerId);
      pendingIceByPeerRef.current.delete(peerId);
      remoteStreamByPeerRef.current.delete(peerId);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
      setRemoteSpeaking((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    };

    const safeEndLocal = (notifyPeers: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;

      if (notifyPeers) {
        for (const participant of participants) {
          sendRtcSignal({
            type: 'end',
            chatId: callChat.id,
            toUserId: participant.id,
          });
        }
      }

      closeAllPeers();
      stopMedia();
      endCall(false);
    };

    const ensurePeerConnection = (peerId: string) => {
      const existing = pcByPeerRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_CONFIG);

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        sendRtcSignal({
          type: 'ice',
          chatId: callChat.id,
          toUserId: peerId,
          payload: event.candidate,
        });
      };

      pc.ontrack = (event) => {
        const [incomingStream] = event.streams;
        if (incomingStream) {
          remoteStreamByPeerRef.current.set(peerId, incomingStream);
          setRemoteStreams((prev) => ({ ...prev, [peerId]: new MediaStream(incomingStream.getTracks()) }));
        } else {
          const current = remoteStreamByPeerRef.current.get(peerId) ?? new MediaStream();
          const alreadyExists = current.getTracks().some((track) => track.id === event.track.id);
          if (!alreadyExists) current.addTrack(event.track);
          remoteStreamByPeerRef.current.set(peerId, current);
          setRemoteStreams((prev) => ({ ...prev, [peerId]: new MediaStream(current.getTracks()) }));
        }

        setStatus('En llamada');
      };

      pcByPeerRef.current.set(peerId, pc);
      return pc;
    };

    const flushPendingIce = async (peerId: string, pc: RTCPeerConnection) => {
      if (!pc.remoteDescription) return;
      const queued = pendingIceByPeerRef.current.get(peerId) ?? [];
      if (!queued.length) return;

      pendingIceByPeerRef.current.set(peerId, []);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // ignore outdated candidates
        }
      }
    };

    const ensureLocalMedia = async (videoEnabled: boolean) => {
      if (localStreamRef.current) return localStreamRef.current;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoEnabled });
        if (videoEnabled && stream.getVideoTracks().length === 0) {
          const videoFallback = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          const [videoTrack] = videoFallback.getVideoTracks();
          if (videoTrack) stream.addTrack(videoTrack);
        }

        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicOn(false);
        setCamOn(videoEnabled && stream.getVideoTracks().length > 0);
        return stream;
      } catch (error) {
        if (videoEnabled) {
          try {
            const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            toast({
              title: 'Cámara no disponible',
              description: 'Se iniciará la llamada solo con audio.',
            });
            audioOnly.getAudioTracks().forEach((track) => {
              track.enabled = false;
            });

            localStreamRef.current = audioOnly;
            setLocalStream(audioOnly);
            setMicOn(false);
            setCamOn(false);
            return audioOnly;
          } catch {
            toast({
              title: 'No se pudo acceder al micrófono',
              description: 'Revisa permisos del navegador y vuelve a intentar.',
            });
            throw error;
          }
        }

        throw error;
      }
    };

    const attachLocalTracksToPeer = async (peerId: string) => {
      const stream = await ensureLocalMedia(callMode === 'video');
      const pc = ensurePeerConnection(peerId);

      stream.getTracks().forEach((track) => {
        const existingSender = pc.getSenders().find((sender) => sender.track?.kind === track.kind);
        if (existingSender) {
          void existingSender.replaceTrack(track);
          return;
        }
        pc.addTrack(track, stream);
      });

      return pc;
    };

    const createOfferForPeer = async (peerId: string) => {
      const pc = await attachLocalTracksToPeer(peerId);
      if (!pc) return;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendRtcSignal({
        type: 'offer',
        chatId: callChat.id,
        toUserId: peerId,
        mode: callMode,
        payload: offer,
      });
    };

    const acceptIncoming = async (signal: RtcSignal) => {
      const fromPeerId = signal.fromUserId;
      const targetMode = (signal.mode ?? callMode) === 'video';
      await ensureLocalMedia(targetMode);

      const pc = await attachLocalTracksToPeer(fromPeerId);
      if (pc.signalingState === 'have-local-offer') {
        await pc.setLocalDescription({ type: 'rollback' });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
      await flushPendingIce(fromPeerId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendRtcSignal({
        type: 'answer',
        chatId: callChat.id,
        toUserId: fromPeerId,
        payload: answer,
      });

      setIncomingOffer(null);
      setStatus('Conectando...');

      // En llamada grupal no iniciamos nuevas ofertas desde quien contestó,
      // para evitar colisiones de negociación. El iniciador conecta a todos.
    };

    const rejectIncoming = () => {
      const pending = incomingOfferRef.current;
      if (pending) {
        sendRtcSignal({
          type: 'end',
          chatId: callChat.id,
          toUserId: pending.fromUserId,
        });
      }
      safeEndLocal(false);
    };

    const handleSignal = async (signal: RtcSignal) => {
      if (endedRef.current) return;
      if (signal.chatId !== callChat.id) return;
      if (signal.fromUserId === user.id) return;
      if (signal.toUserId && signal.toUserId !== user.id) return;

      if (signal.type === 'end') {
        if (isGroupCall) {
          closePeer(signal.fromUserId);
          setStatus('Participante salió de la llamada');
          return;
        }

        setStatus('Llamada finalizada');
        safeEndLocal(false);
        return;
      }

      if (signal.type === 'offer') {
        if (!callInitiator || isGroupCall) {
          setIncomingOffer(signal);
          setStatus('Llamada entrante...');
          return;
        }
      }

      try {
        const peerId = signal.fromUserId;
        const pc = ensurePeerConnection(peerId);

        if (signal.type === 'answer' && signal.payload) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          await flushPendingIce(peerId, pc);
          setStatus('En llamada');
          return;
        }

        if (signal.type === 'ice' && signal.payload) {
          if (!pc.remoteDescription) {
            const queued = pendingIceByPeerRef.current.get(peerId) ?? [];
            queued.push(signal.payload);
            pendingIceByPeerRef.current.set(peerId, queued);
            return;
          }

          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          } catch {
            // ignore candidate race
          }
        }
      } catch (error) {
        console.error('[RTC] signal handling error', error);
      }
    };

    const unsub = onRtcSignal((signal) => {
      void handleSignal(signal);
    });

    const startOutgoing = async () => {
      try {
        await ensureLocalMedia(callMode === 'video');

        if (isGroupCall) {
          setStatus('Llamando al grupo...');
          const offerTargets = [...participants];
          if (!offerTargets.length) {
            safeEndLocal(false);
            return;
          }

          for (const participant of offerTargets) {
            await createOfferForPeer(participant.id);
          }
          return;
        }

        const directPeer = participants[0];
        if (!directPeer) {
          safeEndLocal(false);
          return;
        }

        await createOfferForPeer(directPeer.id);
        setStatus('Llamando...');
      } catch (error) {
        console.error('[RTC] create offer error', error);
        safeEndLocal(false);
      }
    };

    if (callInitiator) {
      void startOutgoing();
    } else {
      const pending = consumePendingIncomingOffer(callChat.id);
      if (pending) {
        setIncomingOffer(pending);
      }
      setStatus('Llamada entrante...');
    }

    acceptIncomingRef.current = acceptIncoming;
    rejectIncomingRef.current = rejectIncoming;

    return () => {
      unsub();
      closeAllPeers();
      stopMedia();
      setIncomingOffer(null);
      incomingOfferRef.current = null;
      acceptIncomingRef.current = null;
      rejectIncomingRef.current = null;
    };
  }, [
    inCall,
    callChat,
    user,
    callMode,
    callInitiator,
    participants,
    isGroupCall,
    onRtcSignal,
    sendRtcSignal,
    endCall,
    consumePendingIncomingOffer,
  ]);

  if (!inCall || !callChat) return null;

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !micOn;
    });
    setMicOn((prev) => !prev);
  };

  const toggleCam = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const nextCamOn = !camOn;
    const videoTracks = stream.getVideoTracks();

    if (nextCamOn && videoTracks.length === 0) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const [videoTrack] = videoStream.getVideoTracks();
        if (!videoTrack) return;

        stream.addTrack(videoTrack);
        for (const pc of pcByPeerRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, stream);
          }
        }

        setLocalStream(new MediaStream(stream.getTracks()));
      } catch {
        toast({
          title: 'No se pudo encender la cámara',
          description: 'Revisa permisos de cámara en el navegador.',
        });
        return;
      }
    } else {
      videoTracks.forEach((track) => {
        track.enabled = nextCamOn;
      });
    }

    setCamOn(nextCamOn);
  };

  const shareScreen = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const [screenTrack] = stream.getVideoTracks();
    if (!screenTrack) return;

    for (const pc of pcByPeerRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
    }

    screenTrack.onended = async () => {
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (!camTrack) return;
      for (const pc of pcByPeerRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack);
      }
    };
  };

  const remoteTiles = participants
    .map((participant) => ({
      id: participant.id,
      title: participant.displayName,
      stream: remoteStreams[participant.id] ?? null,
      speaking: Boolean(remoteSpeaking[participant.id]),
    }))
    .filter((tile) => tile.stream || isGroupCall);

  const incoming = Boolean(incomingOffer) && !callInitiator;
  const acceptIncoming = () => {
    if (acceptIncomingRef.current && incomingOffer) {
      void acceptIncomingRef.current(incomingOffer);
    }
  };
  const rejectIncoming = () => {
    if (rejectIncomingRef.current) rejectIncomingRef.current();
  };

  const hangUp = () => {
    for (const participant of participants) {
      sendRtcSignal({
        type: 'end',
        chatId: callChat.id,
        toUserId: participant.id,
      });
    }
    endCall(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-call-bg flex flex-col items-center justify-center animate-fade-in p-4">
      <div className="absolute top-6 left-6 text-call-foreground">
        <h2 className="text-lg font-semibold">{callChat.title}</h2>
        <p className="text-sm opacity-70">{status}</p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {remoteTiles.map((tile) => (
          <div
            key={tile.id}
            className={`rounded-2xl bg-black/40 border overflow-hidden aspect-video relative transition-all duration-200 ${tile.speaking ? 'border-green-400 shadow-[0_0_0_2px_rgba(74,222,128,0.45)]' : 'border-white/10'}`}
          >
            {callMode === 'video' && tile.stream ? (
              <MediaStreamView stream={tile.stream} />
            ) : callMode === 'video' ? (
              <div className="w-full h-full flex items-center justify-center text-call-foreground/75 text-sm">Esperando cámara…</div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-call-foreground text-xl">Audio</div>
            )}
            <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">{tile.title}</div>
          </div>
        ))}

        <div
          className={`rounded-2xl bg-black/30 border overflow-hidden aspect-video relative transition-all duration-200 ${localSpeaking ? 'border-green-400 shadow-[0_0_0_2px_rgba(74,222,128,0.45)]' : 'border-white/10'}`}
        >
          {callMode === 'video' ? (
            <MediaStreamView stream={localStream} mirrored />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-call-foreground text-xl">Tu audio</div>
          )}
          <div className="absolute bottom-2 left-2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">Tú</div>
        </div>
      </div>

      {incoming ? (
        <div className="absolute bottom-8 flex items-center gap-4">
          <button
            onClick={rejectIncoming}
            className="w-12 h-12 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            aria-label="Rechazar llamada"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={acceptIncoming}
            className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center"
            aria-label="Contestar llamada"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      ) : (
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
              onClick={() => void toggleCam()}
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
            onClick={hangUp}
            className="w-14 h-14 rounded-full bg-call-danger text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Colgar"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
