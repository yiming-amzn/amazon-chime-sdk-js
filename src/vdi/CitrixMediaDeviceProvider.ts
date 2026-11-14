// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaDeviceProvider from '../mediadeviceprovider/MediaDeviceProvider';
import CitrixVDIAdapter from './CitrixVDIAdapter';

export default class CitrixMediaDeviceProvider implements MediaDeviceProvider {
  constructor(private adapter: CitrixVDIAdapter) {}

  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    this.adapter.logger?.info('CitrixVDIAdapter: media captured on the endpoint');
    return this.adapter.ucsdk.getUserMedia(constraints);
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return this.adapter.ucsdk.enumerateDevices();
  }

  // A browser synthesized track is refused by the redirected connection. A
  // muted endpoint microphone sends silence and completes the join handshake.
  async createSilentAudioStream(): Promise<MediaStream | null> {
    try {
      const stream = await this.adapter.ucsdk.getUserMedia({ audio: true });
      for (const track of stream.getAudioTracks()) {
        track.enabled = false;
      }
      this.adapter.logger?.warn(
        'CitrixVDIAdapter: using a muted endpoint microphone as silent audio'
      );
      return stream;
    } catch (e) {
      this.adapter.logger?.warn(
        `CitrixVDIAdapter: no silent audio stream, the join may not complete: ${(e as Error).message}`
      );
      return null;
    }
  }
}
