// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import PeerConnectionFactory from './PeerConnectionFactory';

export default class DefaultPeerConnectionFactory implements PeerConnectionFactory {
  create(configuration: RTCConfiguration): RTCPeerConnection {
    // @ts-ignore
    return new RTCPeerConnection(configuration);
  }
}
