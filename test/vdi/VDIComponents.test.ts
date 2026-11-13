// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import DefaultMediaDeviceProvider from '../../src/mediadeviceprovider/DefaultMediaDeviceProvider';
import DefaultMediaElementBinder from '../../src/mediaelementbinder/DefaultMediaElementBinder';
import DefaultPeerConnectionFactory from '../../src/peerconnectionfactory/DefaultPeerConnectionFactory';
import CitrixMediaDeviceProvider from '../../src/vdi/CitrixMediaDeviceProvider';
import CitrixMediaElementBinder from '../../src/vdi/CitrixMediaElementBinder';
import CitrixPeerConnectionFactory from '../../src/vdi/CitrixPeerConnectionFactory';
import VDIAdapter from '../../src/vdi/VDIAdapter';
import VDIComponents from '../../src/vdi/VDIComponents';
import DOMMockBehavior from '../dommock/DOMMockBehavior';
import DOMMockBuilder from '../dommock/DOMMockBuilder';
import { makeCitrixAdapter } from './FakeCitrixUCSDK';

describe('VDIComponents', () => {
  const expect: Chai.ExpectStatic = chai.expect;
  let domMockBuilder: DOMMockBuilder;

  beforeEach(() => {
    domMockBuilder = new DOMMockBuilder(new DOMMockBehavior());
  });

  afterEach(() => {
    domMockBuilder.cleanup();
  });

  it('creates the browser components without an adapter', () => {
    expect(VDIComponents.peerConnectionFactory()).to.be.instanceOf(DefaultPeerConnectionFactory);
    expect(VDIComponents.mediaDeviceProvider()).to.be.instanceOf(DefaultMediaDeviceProvider);
    expect(VDIComponents.mediaElementBinder()).to.be.instanceOf(DefaultMediaElementBinder);
  });

  it('creates the Citrix components for a Citrix adapter', () => {
    const adapter = makeCitrixAdapter();
    expect(VDIComponents.peerConnectionFactory(adapter)).to.be.instanceOf(
      CitrixPeerConnectionFactory
    );
    expect(VDIComponents.mediaDeviceProvider(adapter)).to.be.instanceOf(CitrixMediaDeviceProvider);
    expect(VDIComponents.mediaElementBinder(adapter)).to.be.instanceOf(CitrixMediaElementBinder);
  });

  it('creates the browser components for an adapter it does not know', () => {
    const adapter: VDIAdapter = { name: 'Other' };
    expect(VDIComponents.peerConnectionFactory(adapter)).to.be.instanceOf(
      DefaultPeerConnectionFactory
    );
    expect(VDIComponents.mediaDeviceProvider(adapter)).to.be.instanceOf(DefaultMediaDeviceProvider);
    expect(VDIComponents.mediaElementBinder(adapter)).to.be.instanceOf(DefaultMediaElementBinder);
  });

  describe('browser components', () => {
    it('create a native peer connection', () => {
      expect(new DefaultPeerConnectionFactory().create({})).to.be.instanceOf(RTCPeerConnection);
    });

    it('call the browser getUserMedia and enumerateDevices', async () => {
      const gum = sinon.spy(navigator.mediaDevices, 'getUserMedia');
      const enumerate = sinon.spy(navigator.mediaDevices, 'enumerateDevices');
      const devices = new DefaultMediaDeviceProvider();
      await devices.getUserMedia({ audio: true });
      await devices.enumerateDevices();
      expect(gum.calledOnceWith({ audio: true })).to.be.true;
      expect(enumerate.calledOnce).to.be.true;
    });

    it('leave the silent audio stream to the SDK', async () => {
      expect(await new DefaultMediaDeviceProvider().createSilentAudioStream()).to.be.null;
    });

    it('do nothing when binding or unbinding elements', () => {
      const binder = new DefaultMediaElementBinder();
      const video = document.createElement('video');
      const audio = new HTMLAudioElement();
      const stream = new MediaStream();
      binder.bindVideoElement(video, stream);
      binder.unbindVideoElement(video);
      binder.bindAudioElement(audio, stream);
      binder.unbindAudioElement(audio);
      expect(video.srcObject).to.be.undefined;
    });
  });
});
