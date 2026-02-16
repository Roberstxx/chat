/**
 * WebRTC helper utilities.
 * TODO: Integrate with your signaling server via wsService.
 */

import { wsService } from './websocket';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function createPeerConnection(
  chatId: string,
  fromUserId: string,
  toUserId?: string
): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      wsService.send('rtc:signal', {
        type: 'ice',
        chatId,
        toUserId,
        payload: event.candidate,
      });
    }
  };

  return pc;
}

export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
}

export async function createAnswer(pc: RTCPeerConnection, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

export async function getUserMedia(video = true, audio = true): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video, audio });
}

export async function getDisplayMedia(): Promise<MediaStream> {
  return navigator.mediaDevices.getDisplayMedia({ video: true });
}
