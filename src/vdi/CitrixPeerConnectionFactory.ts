// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import PeerConnectionFactory from '../peerconnectionfactory/PeerConnectionFactory';
import CitrixVDIAdapter from './CitrixVDIAdapter';

export default class CitrixPeerConnectionFactory implements PeerConnectionFactory {
  constructor(private adapter: CitrixVDIAdapter) {}

  create(configuration: RTCConfiguration): RTCPeerConnection {
    this.adapter.logger?.info('CitrixVDIAdapter: peer connection is redirected');
    return new this.adapter.ucsdk.CitrixPeerConnection(configuration);
  }
}
