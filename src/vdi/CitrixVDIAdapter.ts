// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Logger from '../logger/Logger';
import VDIAdapter from './VDIAdapter';

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

export interface CitrixVDIAdapterConnectOptions {
  ucsdk: CitrixUCSDK;
  bootstrap: CitrixBootstrap;
  /** Vendor name passed to `initBootstrap` and `initUCSDK`. */
  vendor: string;
  /** Limit for the window handle and for the endpoint to connect. Defaults to 15000. */
  timeoutMs?: number;
  logger?: Logger;
}

export interface CitrixVDIAdapterOptions {
  /** Initialized UCSDK object, for example from `connect.getCitrixUCSDK()`. */
  ucsdk: CitrixUCSDK;
  /** Hex window handle of the top-level window, from the Citrix Bootstrap. */
  windowHandle: string;
  logger?: Logger;
}

/**
 * Citrix HDX media redirection. The SDK does not include the UCSDK; the
 * application passes in an initialized one.
 */
export default class CitrixVDIAdapter implements VDIAdapter {
  readonly name = 'CitrixVDIAdapter';
  readonly ucsdk: CitrixUCSDK;
  readonly windowHandle: string;
  readonly logger?: Logger;

  constructor(options: CitrixVDIAdapterOptions) {
    this.ucsdk = options.ucsdk;
    this.windowHandle = options.windowHandle;
    this.logger = options.logger;
  }

  /**
   * Initializes the Bootstrap and the UCSDK, waits for the endpoint to connect, and returns
   * an adapter for it. Rejects if the endpoint does not connect in time or cannot redirect
   * WebRTC, so the application can join without one instead.
   *
   * This registers the UCSDK VM event callback, which holds a single listener. When another
   * component on the page owns it, such as a Citrix softphone, construct the adapter with
   * that component's window handle instead.
   */
  static async connect(options: CitrixVDIAdapterConnectOptions): Promise<CitrixVDIAdapter> {
    const { ucsdk, bootstrap, vendor, timeoutMs = 15000, logger } = options;
    if (!bootstrap.isBootstrapInitialized()) {
      bootstrap.initBootstrap(vendor);
    }
    const windowHandle = await withTimeout(bootstrap.getWindowHandle(), timeoutMs, 'window handle');
    if (!windowHandle) {
      throw new Error('CitrixVDIAdapter: the Bootstrap returned no window handle');
    }
    const connected = new Promise<void>((resolve, reject) => {
      ucsdk.setVMEventCallback(event => {
        logger?.info(`CitrixVDIAdapter: VM event ${event.event}`);
        if (event.event !== 'vdiClientConnected') {
          return;
        }
        if (ucsdk.isFeatureOn('webrtc1.0')) {
          resolve();
        } else {
          reject(new Error('CitrixVDIAdapter: the endpoint does not support WebRTC redirection'));
        }
      });
    });
    // A second call is a no-op, so this is safe when the UCSDK is already initialized.
    ucsdk.initUCSDK(vendor);
    await withTimeout(connected, timeoutMs, 'endpoint connection');
    return new CitrixVDIAdapter({ ucsdk, windowHandle, logger });
  }

  /** A UCSDK proxy track exposes `object_id()`; a browser track does not. */
  static isCitrixStream(stream: MediaStream | null | undefined): boolean {
    const tracks = stream?.getTracks?.() ?? [];
    return (
      tracks.length > 0 &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tracks.every(track => typeof (track as any).object_id === 'function')
    );
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`CitrixVDIAdapter: timed out waiting for the ${what}`)),
      timeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
