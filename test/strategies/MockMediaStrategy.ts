// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaStrategy from '../../src/strategies/MediaStrategy';

/** Records the calls the SDK makes, so a test can assert it went through the strategy. */
export default class MockMediaStrategy implements MediaStrategy {
  createPeerConnectionCalls = 0;
  getUserMediaCalls: MediaStreamConstraints[] = [];
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
    private strategyName: string = 'MockMediaStrategy',
    readonly supportsContentShare: boolean = true
  ) {}

  getStrategyName(): string {
    return this.strategyName;
  }

  createPeerConnection(configuration: RTCConfiguration): RTCPeerConnection {
    this.createPeerConnectionCalls += 1;
    return new RTCPeerConnection(configuration);
  }

  async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    this.getUserMediaCalls.push(constraints);
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
