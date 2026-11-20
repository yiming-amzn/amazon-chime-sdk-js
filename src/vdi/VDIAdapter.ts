// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * A virtual desktop platform that runs media on the user's device instead of in
 * the browser. Supply one through `MeetingSessionConfiguration.vdiAdapter` and the
 * `vdiAdapter` option of `DefaultDeviceController`; without one the SDK uses the
 * browser. Every member but `name` is optional, and the SDK uses the browser for
 * what an adapter does not supply. See the VDI guide.
 */
export default interface VDIAdapter {
  /** Identifies the platform in logs, for example when the peer connection is created. */
  readonly name: string;

  /** Creates the meeting's peer connection. Without it, `new RTCPeerConnection(configuration)`. */
  createPeerConnection?(configuration: RTCConfiguration): RTCPeerConnection;

  /** Opens and lists devices. Without it, `navigator.mediaDevices`. */
  readonly mediaDevices?: Pick<MediaDevices, 'getUserMedia' | 'enumerateDevices'>;

  /**
   * The stream sent when no microphone is selected, for a peer connection that
   * refuses the SDK's Web Audio track. Without it, or when it returns null, the
   * SDK sends the Web Audio track.
   */
  createSilentAudioStream?(): Promise<MediaStream | null>;

  /**
   * False when the platform encodes and decodes on its endpoint, so there are no
   * frames in the browser for encoded transforms. Without it, true.
   */
  readonly supportsEncodedTransforms?: boolean;

  /**
   * Called just before a video element's `srcObject` is set to a stream, for a
   * platform that renders the stream itself.
   */
  bindVideoElement?(element: HTMLVideoElement, stream: MediaStream): void;

  /** Called when a video element's `srcObject` is cleared. */
  unbindVideoElement?(element: HTMLVideoElement): void;

  /**
   * Called just before an audio element's `srcObject` is set to a stream, for a
   * platform that plays the stream itself.
   */
  bindAudioElement?(element: HTMLAudioElement, stream: MediaStream): void;

  /** Called when an audio element's `srcObject` is cleared. */
  unbindAudioElement?(element: HTMLAudioElement): void;
}
