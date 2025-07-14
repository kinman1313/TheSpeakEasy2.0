export class WebRTCStreamManager {
  private streams: Map<string, MediaStream> = new Map();
  private peerConnections: Map<string, RTCPeerConnection> = new Map();

  async createLocalStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.streams.set('local', stream);
      return stream;
    } catch (error) {
      console.error('Error creating local stream:', error);
      throw error;
    }
  }

  addRemoteStream(streamId: string, stream: MediaStream): void {
    this.streams.set(streamId, stream);
  }

  stopStream(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      this.streams.delete(streamId);
    }
  }

  stopAllStreams(): void {
    this.streams.forEach((stream, id) => {
      this.stopStream(id);
    });
    this.streams.clear();
  }

  cleanup(): void {
    this.stopAllStreams();
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
  }
}