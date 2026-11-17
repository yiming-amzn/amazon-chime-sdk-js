// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import VDIAdapter from '../vdi/VDIAdapter';

/** Opens and lists devices. */
export default class MediaDevices {
  /** The adapter's devices, or `navigator.mediaDevices` without an adapter or when it supplies none. */
  static create(
    adapter?: VDIAdapter
  ): Pick<globalThis.MediaDevices, 'getUserMedia' | 'enumerateDevices'> {
    return adapter?.mediaDevices ?? navigator.mediaDevices;
  }
}
