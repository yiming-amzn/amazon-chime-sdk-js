// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaStrategy, { STANDARD_STRATEGY } from './MediaStrategy';

/**
 * Default strategy: uses the browser directly. Used when the app supplies none.
 */
export default class StandardStrategy implements MediaStrategy {
  readonly supportsContentShare = true;

  getStrategyName(): string {
    return STANDARD_STRATEGY;
  }

  createPeerConnection(configuration: RTCConfiguration): RTCPeerConnection {
    // @ts-ignore
    return new RTCPeerConnection(configuration);
  }

  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }

  async createSilentAudioStream(): Promise<MediaStream | null> {
    return null;
  }

  bindVideoElement(_element: HTMLVideoElement, _stream: MediaStream): void {}

  unbindVideoElement(_element: HTMLVideoElement): void {}

  bindAudioElement(_element: HTMLAudioElement, _stream: MediaStream): void {}

  unbindAudioElement(_element: HTMLAudioElement): void {}

  async dispose(): Promise<void> {}
}
