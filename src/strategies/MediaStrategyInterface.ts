// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Which peer connection the SDK is about to construct. */
export enum PeerConnectionPurpose {
  /** Main audio and video connection. */
  Signaling = 'signaling',
  /** Separate connection owned by `DefaultContentShareController`. */
  ContentShare = 'content',
  /** Throwaway connection that reads the browser's codec support. Must stay native. */
  CapabilityProbe = 'probe',
}

/** Which stream the SDK is about to acquire. Screen capture is not covered. */
export enum MediaPurpose {
  Camera = 'camera',
  Microphone = 'microphone',
  /** Acquired only to trigger the permission prompt so device labels resolve. */
  PermissionProbe = 'probe',
}

/** Values returned by `getStrategyName()`. */
export const STANDARD_STRATEGY = 'StandardStrategy';

/** True when `strategy` redirects media away from the browser. */
export function isVDIStrategy(strategy: MediaStrategyInterface): boolean {
  return strategy.getStrategyName() !== STANDARD_STRATEGY;
}

/**
 * The platform primitives the SDK builds media on. [[StandardStrategy]] uses the
 * browser and is the default; a VDI strategy redirects media to the endpoint.
 * Each method takes a purpose because some call sites must stay native even
 * when the rest is redirected. See the Media Strategies guide.
 */
export default interface MediaStrategyInterface {
  /** One of the `*_STRATEGY` names. */
  getStrategyName(): string;

  /** Returns a native `RTCPeerConnection` for any purpose the platform does not redirect. */
  createPeerConnection(
    configuration: RTCConfiguration,
    purpose: PeerConnectionPurpose
  ): RTCPeerConnection;

  getUserMedia(constraints: MediaStreamConstraints, purpose: MediaPurpose): Promise<MediaStream>;

  /** Lists the devices the platform exposes, which may be the endpoint's. */
  enumerateDevices(): Promise<MediaDeviceInfo[]>;

  /**
   * Returns a silent audio stream for when no microphone is selected, or null to
   * use the browser synthesized one. A redirected connection refuses that track,
   * and the join waits for an audio packet.
   */
  createSilentAudioStream(): Promise<MediaStream | null>;

  /**
   * Registers `element` as the render target for a redirected stream. Called
   * before the SDK assigns `srcObject`; a no-op for a stream the platform does not own.
   */
  bindVideoElement(element: HTMLVideoElement, stream: MediaStream): void;

  /** Called only when the SDK clears `srcObject`, so a paused frame stays registered. */
  unbindVideoElement(element: HTMLVideoElement): void;

  /** Registers `element` as the sink for a redirected stream. */
  bindAudioElement(element: HTMLAudioElement, stream: MediaStream): void;

  unbindAudioElement(element: HTMLAudioElement): void;

  /** Releases platform resources. The SDK does not call this; the application does. */
  dispose(): Promise<void>;
}
