// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Acquires the camera and microphone and lists devices. */
export default interface MediaDeviceProvider {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;

  enumerateDevices(): Promise<MediaDeviceInfo[]>;

  /**
   * Returns a silent audio stream for when no microphone is selected, or null to
   * let the SDK create one with Web Audio.
   */
  createSilentAudioStream(): Promise<MediaStream | null>;
}
