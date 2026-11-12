// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';

import {
  CITRIX_VDI_STRATEGY,
  MediaPurpose,
  PeerConnectionPurpose,
  STANDARD_STRATEGY,
} from '../../src/index';

describe('MediaStrategyInterface', () => {
  const expect: Chai.ExpectStatic = chai.expect;

  it('exposes the peer connection purposes from the entry point', () => {
    expect(PeerConnectionPurpose.Signaling).to.equal('signaling');
    expect(PeerConnectionPurpose.ContentShare).to.equal('content');
    expect(PeerConnectionPurpose.CapabilityProbe).to.equal('probe');
  });

  it('exposes the media purposes from the entry point', () => {
    expect(MediaPurpose.Camera).to.equal('camera');
    expect(MediaPurpose.Microphone).to.equal('microphone');
    expect(MediaPurpose.PermissionProbe).to.equal('probe');
  });

  it('exposes the strategy names from the entry point', () => {
    expect(STANDARD_STRATEGY).to.equal('StandardStrategy');
    expect(CITRIX_VDI_STRATEGY).to.equal('CitrixVDIStrategy');
  });
});
