// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import NoOpLogger from '../../src/logger/NoOpLogger';
import CitrixMediaDeviceProvider from '../../src/vdi/CitrixMediaDeviceProvider';
import CitrixMediaElementBinder from '../../src/vdi/CitrixMediaElementBinder';
import CitrixPeerConnection from '../../src/vdi/CitrixPeerConnection';
import CitrixVDIAdapter, { CitrixUCSDK } from '../../src/vdi/CitrixVDIAdapter';
import DOMMockBehavior from '../dommock/DOMMockBehavior';
import DOMMockBuilder from '../dommock/DOMMockBuilder';
import { browserStream, citrixStream, FakePeerConnection, makeUcsdk } from './FakeCitrixUCSDK';

describe('Citrix VDI components', () => {
  const expect: Chai.ExpectStatic = chai.expect;
  let domMockBuilder: DOMMockBuilder;
  let ucsdk: CitrixUCSDK;
  let adapter: CitrixVDIAdapter;

  beforeEach(() => {
    domMockBuilder = new DOMMockBuilder(new DOMMockBehavior());
    ucsdk = makeUcsdk();
    adapter = new CitrixVDIAdapter({ ucsdk, windowHandle: '0x1f', logger: new NoOpLogger() });
  });

  afterEach(() => {
    domMockBuilder.cleanup();
  });

  it('CitrixPeerConnection wraps a redirected peer connection', () => {
    expect(new CitrixPeerConnection({}, adapter).rtcPeerConnection).to.be.instanceOf(
      FakePeerConnection
    );
  });

  describe('CitrixMediaDeviceProvider', () => {
    let devices: CitrixMediaDeviceProvider;

    beforeEach(() => {
      devices = new CitrixMediaDeviceProvider(adapter);
    });

    it('acquires media and lists devices through the UCSDK', async () => {
      await devices.getUserMedia({ video: true });
      await devices.enumerateDevices();
      expect((ucsdk.getUserMedia as sinon.SinonStub).calledOnceWith({ video: true })).to.be.true;
      expect((ucsdk.enumerateDevices as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('returns a muted endpoint microphone as the silent audio stream', async () => {
      const stream = await devices.createSilentAudioStream();
      expect(stream.getAudioTracks()[0].enabled).to.be.false;
    });

    it('returns null when the endpoint microphone is unavailable', async () => {
      (ucsdk.getUserMedia as sinon.SinonStub).rejects(new Error('no device'));
      expect(await devices.createSilentAudioStream()).to.be.null;
    });
  });

  describe('CitrixMediaElementBinder', () => {
    let binder: CitrixMediaElementBinder;

    beforeEach(() => {
      binder = new CitrixMediaElementBinder(adapter);
    });

    describe('video elements', () => {
      let element: HTMLVideoElement;

      beforeEach(() => {
        element = document.createElement('video');
      });

      it('maps an element showing a Citrix stream once', () => {
        binder.bindVideoElement(element, citrixStream());
        binder.bindVideoElement(element, citrixStream());
        expect((ucsdk.mapVideoElement as sinon.SinonStub).calledOnceWith(element, '0x1f')).to.be
          .true;
      });

      it('leaves an element showing a browser stream alone', () => {
        binder.bindVideoElement(element, browserStream());
        binder.unbindVideoElement(element);
        expect((ucsdk.mapVideoElement as sinon.SinonStub).called).to.be.false;
        expect((ucsdk.disposeVideoElement as sinon.SinonStub).called).to.be.false;
      });

      it('disposes a mapped element on unbind', () => {
        binder.bindVideoElement(element, citrixStream());
        binder.unbindVideoElement(element);
        expect((ucsdk.disposeVideoElement as sinon.SinonStub).calledOnceWith(element)).to.be.true;
      });

      it('tolerates a UCSDK without disposeVideoElement', () => {
        delete ucsdk.disposeVideoElement;
        binder.bindVideoElement(element, citrixStream());
        expect(() => binder.unbindVideoElement(element)).to.not.throw();
      });
    });

    describe('audio elements', () => {
      let element: HTMLAudioElement;

      beforeEach(() => {
        element = new HTMLAudioElement();
      });

      it('maps an element playing a Citrix stream once', () => {
        binder.bindAudioElement(element, citrixStream());
        binder.bindAudioElement(element, citrixStream());
        expect((ucsdk.mapAudioElement as sinon.SinonStub).calledOnceWith(element)).to.be.true;
      });

      it('leaves an element playing a browser stream alone', () => {
        binder.bindAudioElement(element, browserStream());
        binder.unbindAudioElement(element);
        expect((ucsdk.mapAudioElement as sinon.SinonStub).called).to.be.false;
        expect((ucsdk.disposeAudioElement as sinon.SinonStub).called).to.be.false;
      });

      it('disposes a mapped element on unbind', () => {
        binder.bindAudioElement(element, citrixStream());
        binder.unbindAudioElement(element);
        expect((ucsdk.disposeAudioElement as sinon.SinonStub).calledOnceWith(element)).to.be.true;
      });

      it('tolerates a UCSDK without disposeAudioElement', () => {
        delete ucsdk.disposeAudioElement;
        binder.bindAudioElement(element, citrixStream());
        expect(() => binder.unbindAudioElement(element)).to.not.throw();
      });
    });
  });

  it('works without a logger', async () => {
    const quiet = new CitrixVDIAdapter({ ucsdk, windowHandle: '0x1f' });
    expect(new CitrixPeerConnection({}, quiet).rtcPeerConnection).to.be.instanceOf(
      FakePeerConnection
    );
    const devices = new CitrixMediaDeviceProvider(quiet);
    await devices.getUserMedia({ video: true });
    expect(await devices.createSilentAudioStream()).to.not.be.null;
    (ucsdk.getUserMedia as sinon.SinonStub).rejects(new Error('no device'));
    expect(await devices.createSilentAudioStream()).to.be.null;
  });
});
