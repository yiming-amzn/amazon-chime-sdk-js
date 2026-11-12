// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Logger from '../logger/Logger';
import MediaStrategy, { CITRIX_VDI_STRATEGY } from './MediaStrategy';

/** The Citrix UCSDK (`CitrixWebRTC`) calls used here. The application supplies the object. */
export interface CitrixUCSDK {
  initUCSDK(vendor: string): void;
  setVMEventCallback(callback: (event: CitrixVMEvent) => void): void;
  isFeatureOn(feature: string): boolean;
  CitrixPeerConnection: new (configuration: RTCConfiguration) => RTCPeerConnection;
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  mapVideoElement(element: HTMLVideoElement, windowHandle: string): void;
  disposeVideoElement?(element: HTMLVideoElement): void;
  mapAudioElement(element: HTMLAudioElement): void;
  disposeAudioElement?(element: HTMLAudioElement): void;
}

/** The Citrix Bootstrap (`CitrixBootstrap`) calls used here. The application supplies the object. */
export interface CitrixBootstrap {
  initBootstrap(vendor: string): void;
  isBootstrapInitialized(): boolean;
  getWindowHandle(): Promise<string>;
}

/** An event the UCSDK passes to the `setVMEventCallback` callback. */
export interface CitrixVMEvent {
  event: string;
  [key: string]: unknown;
}

export interface CitrixVDIStrategyConnectOptions {
  ucsdk: CitrixUCSDK;
  bootstrap: CitrixBootstrap;
  /** Vendor name passed to `initBootstrap` and `initUCSDK`. */
  vendor: string;
  /** Limit for the window handle and for the endpoint to connect. Defaults to 15000. */
  timeoutMs?: number;
  logger?: Logger;
}

export interface CitrixVDIStrategyOptions {
  /** Initialized UCSDK object, for example from `connect.getCitrixUCSDK()`. */
  ucsdk: CitrixUCSDK;
  /** Hex window handle of the top-level window, from the Citrix Bootstrap. */
  windowHandle: string;
  logger?: Logger;
}

/**
 * Citrix HDX media redirection. Media runs on the endpoint; content share stays
 * in the browser.
 */
export default class CitrixVDIStrategy implements MediaStrategy {
  readonly supportsContentShare = false;

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

  /**
   * Initializes the Bootstrap and the UCSDK, waits for the endpoint to connect, and returns
   * a strategy for it. Rejects if the endpoint does not connect in time or cannot redirect
   * WebRTC, so the application can join with [[StandardStrategy]] instead.
   *
   * This registers the UCSDK VM event callback, which holds a single listener. When another
   * component on the page owns it, such as a Citrix softphone, construct the strategy with
   * that component's window handle instead.
   */
  static async connect(options: CitrixVDIStrategyConnectOptions): Promise<CitrixVDIStrategy> {
    const { ucsdk, bootstrap, vendor, timeoutMs = 15000, logger } = options;
    if (!bootstrap.isBootstrapInitialized()) {
      bootstrap.initBootstrap(vendor);
    }
    const windowHandle = await withTimeout(bootstrap.getWindowHandle(), timeoutMs, 'window handle');
    if (!windowHandle) {
      throw new Error('CitrixVDIStrategy: the Bootstrap returned no window handle');
    }
    const connected = new Promise<void>((resolve, reject) => {
      ucsdk.setVMEventCallback(event => {
        logger?.info(`CitrixVDIStrategy: VM event ${event.event}`);
        if (event.event !== 'vdiClientConnected') {
          return;
        }
        if (ucsdk.isFeatureOn('webrtc1.0')) {
          resolve();
        } else {
          reject(new Error('CitrixVDIStrategy: the endpoint does not support WebRTC redirection'));
        }
      });
    });
    // A second call is a no-op, so this is safe when the UCSDK is already initialized.
    ucsdk.initUCSDK(vendor);
    await withTimeout(connected, timeoutMs, 'endpoint connection');
    return new CitrixVDIStrategy({ ucsdk, windowHandle, logger });
  }

  getStrategyName(): string {
    return CITRIX_VDI_STRATEGY;
  }

  static isCitrixStream(stream: MediaStream | null | undefined): boolean {
    const tracks = stream?.getTracks?.() ?? [];
    return (
      tracks.length > 0 &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tracks.every(track => typeof (track as any).object_id === 'function')
    );
  }

  createPeerConnection(configuration: RTCConfiguration): RTCPeerConnection {
    this.logger?.info('CitrixVDIStrategy: peer connection is redirected');
    return new this.ucsdk.CitrixPeerConnection(configuration);
  }

  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    this.logger?.info('CitrixVDIStrategy: media captured on the endpoint');
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`CitrixVDIStrategy: timed out waiting for the ${what}`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
