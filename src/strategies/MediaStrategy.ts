// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Values returned by `getStrategyName()`. */
export const STANDARD_STRATEGY = 'StandardStrategy';
export const CITRIX_VDI_STRATEGY = 'CitrixVDIStrategy';

/** True when `strategy` redirects media away from the browser. */
export function isVDIStrategy(strategy: MediaStrategy): boolean {
  return strategy.getStrategyName() !== STANDARD_STRATEGY;
}

/**
 * The platform primitives the SDK builds media on. [[StandardStrategy]] uses the
 * browser and is the default; a VDI strategy such as [[CitrixVDIStrategy]]
 * redirects media to the endpoint. See the Media Strategies guide.
 */
export default interface MediaStrategy {
  /** One of the `*_STRATEGY` names. */
  getStrategyName(): string;

  /** False when the content share session must use [[StandardStrategy]] instead. */
  readonly supportsContentShare: boolean;

  createPeerConnection(configuration: RTCConfiguration): RTCPeerConnection;

  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;

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
