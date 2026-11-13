// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaElementBinder from './MediaElementBinder';

/** The browser renders `srcObject` itself, so there is nothing to register. */
export default class DefaultMediaElementBinder implements MediaElementBinder {
  bindVideoElement(_element: HTMLVideoElement, _stream: MediaStream): void {}

  unbindVideoElement(_element: HTMLVideoElement): void {}

  bindAudioElement(_element: HTMLAudioElement, _stream: MediaStream): void {}

  unbindAudioElement(_element: HTMLAudioElement): void {}
}
