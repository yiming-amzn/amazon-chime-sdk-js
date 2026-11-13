// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import { STANDARD_STRATEGY } from '../../src/strategies/MediaStrategy';
import StandardStrategy from '../../src/strategies/StandardStrategy';
import DOMMockBehavior from '../dommock/DOMMockBehavior';
import DOMMockBuilder from '../dommock/DOMMockBuilder';

describe('StandardStrategy', () => {
  const expect: Chai.ExpectStatic = chai.expect;
  let domMockBuilder: DOMMockBuilder;
  let strategy: StandardStrategy;

  beforeEach(() => {
    domMockBuilder = new DOMMockBuilder(new DOMMockBehavior());
    strategy = new StandardStrategy();
  });

  afterEach(() => {
    domMockBuilder.cleanup();
  });

  it('reports the standard strategy name', () => {
    expect(strategy.getStrategyName()).to.equal(STANDARD_STRATEGY);
  });

  it('supports content share', () => {
    expect(strategy.supportsContentShare).to.be.true;
  });

  it('creates a native peer connection', () => {
    const peer = strategy.createPeerConnection({});
    expect(peer).to.be.instanceOf(RTCPeerConnection);
  });

  it('calls the browser getUserMedia', async () => {
    const spy = sinon.spy(navigator.mediaDevices, 'getUserMedia');
    await strategy.getUserMedia({ audio: true });
    expect(spy.calledOnceWith({ audio: true })).to.be.true;
  });

  it('calls the browser enumerateDevices', async () => {
    const spy = sinon.spy(navigator.mediaDevices, 'enumerateDevices');
    await strategy.enumerateDevices();
    expect(spy.calledOnce).to.be.true;
  });

  it('leaves the silent audio stream to the SDK', async () => {
    expect(await strategy.createSilentAudioStream()).to.be.null;
  });

  it('does nothing when binding or unbinding elements', async () => {
    const video = document.createElement('video');
    const audio = new HTMLAudioElement();
    const stream = new MediaStream();
    strategy.bindVideoElement(video, stream);
    strategy.unbindVideoElement(video);
    strategy.bindAudioElement(audio, stream);
    strategy.unbindAudioElement(audio);
    expect(video.srcObject).to.be.undefined;
    await strategy.dispose();
  });
});
