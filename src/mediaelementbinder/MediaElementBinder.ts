// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Registers video and audio elements with the platform that renders them. Called
 * in addition to setting `srcObject`: bind just before it is set, unbind only when
 * it is cleared.
 */
export default interface MediaElementBinder {
  bindVideoElement(element: HTMLVideoElement, stream: MediaStream): void;

  unbindVideoElement(element: HTMLVideoElement): void;

  bindAudioElement(element: HTMLAudioElement, stream: MediaStream): void;

  unbindAudioElement(element: HTMLAudioElement): void;
}
