// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import VDIAdapter from '../vdi/VDIAdapter';

/** Creates the meeting's peer connection. */
export default class PeerConnection {
  /** The adapter's peer connection, or a browser one without an adapter or when it supplies none. */
  static create(configuration: RTCConfiguration, adapter?: VDIAdapter): RTCPeerConnection {
    return adapter?.createPeerConnection?.(configuration) ?? new RTCPeerConnection(configuration);
  }
}
