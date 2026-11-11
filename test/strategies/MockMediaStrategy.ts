// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaStrategyInterface, {
  MediaPurpose,
  PeerConnectionPurpose,
} from '../../src/strategies/MediaStrategyInterface';

/**
 * Records the purpose the SDK asks for at each call site, so a test can assert
 * that the substitution happened and that it was labelled correctly.
 */
export default class MockMediaStrategy implements MediaStrategyInterface {
  peerConnectionPurposes: PeerConnectionPurpose[] = [];
  mediaPurposes: MediaPurpose[] = [];
  enumerateDevicesCalls = 0;
  silentAudioStreamCalls = 0;
  disposeCalls = 0;
  boundVideoElements: [HTMLVideoElement, MediaStream][] = [];
  unboundVideoElements: HTMLVideoElement[] = [];
  boundAudioElements: [HTMLAudioElement, MediaStream][] = [];
  unboundAudioElements: HTMLAudioElement[] = [];

  /** Records the element's `srcObject` as seen at bind time, to assert call order. */
  srcObjectAtBindTime: unknown[] = [];

  constructor(
    private devices: MediaDeviceInfo[] = [],
    private silentAudioStream?: MediaStream | null,
    private strategyName: string = 'MockMediaStrategy'
  ) {}

  getStrategyName(): string {
    return this.strategyName;
  }

  createPeerConnection(
    configuration: RTCConfiguration,
    purpose: PeerConnectionPurpose
  ): RTCPeerConnection {
    this.peerConnectionPurposes.push(purpose);
    return new RTCPeerConnection(configuration);
  }

  async getUserMedia(
    _constraints: MediaStreamConstraints,
    purpose: MediaPurpose
  ): Promise<MediaStream> {
    this.mediaPurposes.push(purpose);
    const stream = new MediaStream();
    stream.addTrack(new MediaStreamTrack());
    return stream;
  }

  async enumerateDevices(): Promise<MediaDeviceInfo[]> {
    this.enumerateDevicesCalls += 1;
    return this.devices;
  }

  async createSilentAudioStream(): Promise<MediaStream | null> {
    this.silentAudioStreamCalls += 1;
    return this.silentAudioStream === undefined ? new MediaStream() : this.silentAudioStream;
  }

  bindVideoElement(element: HTMLVideoElement, stream: MediaStream): void {
    this.srcObjectAtBindTime.push(element.srcObject);
    this.boundVideoElements.push([element, stream]);
  }

  unbindVideoElement(element: HTMLVideoElement): void {
    this.unboundVideoElements.push(element);
  }

  bindAudioElement(element: HTMLAudioElement, stream: MediaStream): void {
    this.boundAudioElements.push([element, stream]);
  }

  unbindAudioElement(element: HTMLAudioElement): void {
    this.unboundAudioElements.push(element);
  }

  async dispose(): Promise<void> {
    this.disposeCalls += 1;
  }
}
