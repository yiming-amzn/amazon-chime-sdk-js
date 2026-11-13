// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import MediaElementBinder from '../mediaelementbinder/MediaElementBinder';
import CitrixVDIAdapter from './CitrixVDIAdapter';

export default class CitrixMediaElementBinder implements MediaElementBinder {
  private readonly mappedVideo = new WeakSet<HTMLVideoElement>();
  private readonly mappedAudio = new WeakSet<HTMLAudioElement>();

  constructor(private adapter: CitrixVDIAdapter) {}

  bindVideoElement(element: HTMLVideoElement, stream: MediaStream): void {
    if (!CitrixVDIAdapter.isCitrixStream(stream) || this.mappedVideo.has(element)) {
      return;
    }
    this.adapter.ucsdk.mapVideoElement(element, this.adapter.windowHandle);
    this.mappedVideo.add(element);
  }

  unbindVideoElement(element: HTMLVideoElement): void {
    if (!this.mappedVideo.has(element)) {
      return;
    }
    this.mappedVideo.delete(element);
    this.adapter.ucsdk.disposeVideoElement?.(element);
  }

  bindAudioElement(element: HTMLAudioElement, stream: MediaStream): void {
    if (!CitrixVDIAdapter.isCitrixStream(stream) || this.mappedAudio.has(element)) {
      return;
    }
    this.adapter.ucsdk.mapAudioElement(element);
    this.mappedAudio.add(element);
  }

  unbindAudioElement(element: HTMLAudioElement): void {
    if (!this.mappedAudio.has(element)) {
      return;
    }
    this.mappedAudio.delete(element);
    this.adapter.ucsdk.disposeAudioElement?.(element);
  }
}
