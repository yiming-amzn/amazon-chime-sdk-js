// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * The meeting's peer connection, as the SDK uses it. [[DefaultPeerConnection]]
 * wraps a browser `RTCPeerConnection`; a VDI adapter supplies its own.
 */
export default interface PeerConnection {
  /** The wrapped connection, for `AudioVideoController.rtcPeerConnection`. */
  readonly rtcPeerConnection: RTCPeerConnection;

  readonly localDescription: RTCSessionDescription | null;
  readonly iceGatheringState: RTCIceGatheringState;
  readonly iceConnectionState: RTCIceConnectionState;
  readonly connectionState: RTCPeerConnectionState;

  /** False when its senders and receivers cannot carry an encoded transform. */
  readonly supportsEncodedTransforms: boolean;

  addEventListener<K extends keyof RTCPeerConnectionEventMap>(
    type: K,
    listener: (this: RTCPeerConnection, event: RTCPeerConnectionEventMap[K]) => void
  ): void;
  removeEventListener<K extends keyof RTCPeerConnectionEventMap>(
    type: K,
    listener: (this: RTCPeerConnection, event: RTCPeerConnectionEventMap[K]) => void
  ): void;

  /** Whether the connection supports `getTransceivers`. */
  hasTransceivers(): boolean;
  addTransceiver(
    trackOrKind: MediaStreamTrack | string,
    init?: RTCRtpTransceiverInit
  ): RTCRtpTransceiver;
  getTransceivers(): RTCRtpTransceiver[];
  getReceivers(): RTCRtpReceiver[];

  /** The `mid` of one of this connection's transceivers. */
  midOf(transceiver: RTCRtpTransceiver): string | null;

  /** Replaces the track a sender of this connection sends. */
  replaceTrack(sender: RTCRtpSender, track: MediaStreamTrack | null): Promise<void>;

  createOffer(options?: RTCOfferOptions): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description?: RTCLocalSessionDescriptionInit): Promise<void>;
  setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void>;

  getStats(selector?: MediaStreamTrack | null): Promise<RTCStatsReport>;
  close(): void;
}
