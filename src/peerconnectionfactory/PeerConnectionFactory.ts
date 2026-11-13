// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** Creates the meeting's peer connection. */
export default interface PeerConnectionFactory {
  create(configuration: RTCConfiguration): RTCPeerConnection;
}
