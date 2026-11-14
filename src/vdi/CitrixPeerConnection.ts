// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DefaultPeerConnection from '../peerconnection/DefaultPeerConnection';
import CitrixVDIAdapter from './CitrixVDIAdapter';

/** A peer connection whose media runs on the Citrix endpoint. */
export default class CitrixPeerConnection extends DefaultPeerConnection {
  constructor(configuration: RTCConfiguration, adapter: CitrixVDIAdapter) {
    super(new adapter.ucsdk.CitrixPeerConnection(configuration));
    adapter.logger?.info('CitrixVDIAdapter: peer connection is redirected');
  }
}
