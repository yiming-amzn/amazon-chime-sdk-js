// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaStrategyInterface, {
  MediaPurpose,
  PeerConnectionPurpose,
  STANDARD_STRATEGY,
} from './MediaStrategyInterface';

/**
 * Default strategy: uses the browser directly. Used when the app supplies none.
 */
export default class StandardStrategy implements MediaStrategyInterface {
  getStrategyName(): string {
    return STANDARD_STRATEGY;
  }

  createPeerConnection(
    configuration: RTCConfiguration,
    _purpose: PeerConnectionPurpose
  ): RTCPeerConnection {
    // @ts-ignore
    return new RTCPeerConnection(configuration);
  }

  getUserMedia(constraints: MediaStreamConstraints, _purpose: MediaPurpose): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }

  /** The SDK synthesizes the silent track itself. */
  async createSilentAudioStream(): Promise<MediaStream | null> {
    return null;
  }

  bindVideoElement(_element: HTMLVideoElement, _stream: MediaStream): void {}

  unbindVideoElement(_element: HTMLVideoElement): void {}

  bindAudioElement(_element: HTMLAudioElement, _stream: MediaStream): void {}

  unbindAudioElement(_element: HTMLAudioElement): void {}

  async dispose(): Promise<void> {}
}
