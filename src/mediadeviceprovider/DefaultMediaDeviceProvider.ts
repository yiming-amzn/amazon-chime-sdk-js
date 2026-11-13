// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaDeviceProvider from './MediaDeviceProvider';

export default class DefaultMediaDeviceProvider implements MediaDeviceProvider {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia(constraints);
  }

  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices.enumerateDevices();
  }

  async createSilentAudioStream(): Promise<MediaStream | null> {
    return null;
  }
}
