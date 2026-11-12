// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Logger from '../logger/Logger';
import MediaStrategyInterface, {
  CITRIX_VDI_STRATEGY,
  MediaPurpose,
  PeerConnectionPurpose,
} from './MediaStrategyInterface';

/** The Citrix UCSDK (`CitrixWebRTC`) calls used here. The application supplies the object. */
export interface CitrixUCSDK {
  CitrixPeerConnection: new (configuration: RTCConfiguration) => RTCPeerConnection;
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  mapVideoElement(element: HTMLVideoElement, windowHandle: string): void;
  disposeVideoElement?(element: HTMLVideoElement): void;
  mapAudioElement(element: HTMLAudioElement): void;
  disposeAudioElement?(element: HTMLAudioElement): void;
}

export interface CitrixVDIStrategyOptions {
  /** Initialized UCSDK object, for example from `connect.getCitrixUCSDK()`. */
  ucsdk: CitrixUCSDK;
  /** Hex window handle of the top-level window, from the Citrix Bootstrap. */
  windowHandle: string;
  logger?: Logger;
}

/**
 * Citrix HDX media redirection. Media runs on the endpoint; the capability probe
 * and the content share connection stay in the browser.
 */
export default class CitrixVDIStrategy implements MediaStrategyInterface {
  private readonly ucsdk: CitrixUCSDK;
  private readonly windowHandle: string;
  private readonly logger?: Logger;
  private readonly mappedVideo = new WeakSet<HTMLVideoElement>();
  private readonly mappedAudio = new WeakSet<HTMLAudioElement>();

  constructor(options: CitrixVDIStrategyOptions) {
    this.ucsdk = options.ucsdk;
    this.windowHandle = options.windowHandle;
    this.logger = options.logger;
  }

  getStrategyName(): string {
    return CITRIX_VDI_STRATEGY;
  }

  /** True when every track belongs to the UCSDK rather than the browser. */
  static isCitrixStream(stream: MediaStream | null | undefined): boolean {
    const tracks = stream?.getTracks?.() ?? [];
    return (
      tracks.length > 0 &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tracks.every(track => typeof (track as any).object_id === 'function')
    );
  }

  createPeerConnection(
    configuration: RTCConfiguration,
    purpose: PeerConnectionPurpose
  ): RTCPeerConnection {
    if (purpose === PeerConnectionPurpose.Signaling) {
      this.logger?.info('CitrixVDIStrategy: signaling connection is redirected');
      return new this.ucsdk.CitrixPeerConnection(configuration);
    }
    this.logger?.info(`CitrixVDIStrategy: ${purpose} connection stays native`);
    return new RTCPeerConnection(configuration);
  }

  getUserMedia(constraints: MediaStreamConstraints, purpose: MediaPurpose): Promise<MediaStream> {
    this.logger?.info(`CitrixVDIStrategy: ${purpose} captured on the endpoint`);
    return this.ucsdk.getUserMedia(constraints);
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return this.ucsdk.enumerateDevices();
  }

  // A browser synthesized track is refused by the redirected connection. A
  // muted endpoint microphone sends silence and completes the join handshake.
  async createSilentAudioStream(): Promise<MediaStream | null> {
    try {
      const stream = await this.ucsdk.getUserMedia({ audio: true });
      for (const track of stream.getAudioTracks()) {
        track.enabled = false;
      }
      this.logger?.warn('CitrixVDIStrategy: using a muted endpoint microphone as silent audio');
      return stream;
    } catch (e) {
      this.logger?.error(`CitrixVDIStrategy: silent audio unavailable: ${(e as Error).message}`);
      return null;
    }
  }

  bindVideoElement(element: HTMLVideoElement, stream: MediaStream): void {
    if (!CitrixVDIStrategy.isCitrixStream(stream) || this.mappedVideo.has(element)) {
      return;
    }
    this.ucsdk.mapVideoElement(element, this.windowHandle);
    this.mappedVideo.add(element);
  }

  unbindVideoElement(element: HTMLVideoElement): void {
    if (!this.mappedVideo.has(element)) {
      return;
    }
    this.mappedVideo.delete(element);
    this.ucsdk.disposeVideoElement?.(element);
  }

  bindAudioElement(element: HTMLAudioElement, stream: MediaStream): void {
    if (!CitrixVDIStrategy.isCitrixStream(stream) || this.mappedAudio.has(element)) {
      return;
    }
    this.ucsdk.mapAudioElement(element);
    this.mappedAudio.add(element);
  }

  unbindAudioElement(element: HTMLAudioElement): void {
    if (!this.mappedAudio.has(element)) {
      return;
    }
    this.mappedAudio.delete(element);
    this.ucsdk.disposeAudioElement?.(element);
  }

  // The UCSDK outlives a meeting; the application owns its lifetime.
  dispose(): Promise<void> {
    return Promise.resolve();
  }
}
