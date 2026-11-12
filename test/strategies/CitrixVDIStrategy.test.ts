// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import NoOpLogger from '../../src/logger/NoOpLogger';
import CitrixVDIStrategy, { CitrixUCSDK } from '../../src/strategies/CitrixVDIStrategy';
import {
  CITRIX_VDI_STRATEGY,
  MediaPurpose,
  PeerConnectionPurpose,
} from '../../src/strategies/MediaStrategyInterface';
import DOMMockBehavior from '../dommock/DOMMockBehavior';
import DOMMockBuilder from '../dommock/DOMMockBuilder';

// A UCSDK proxy track exposes `object_id()`; a browser track does not.
function citrixStream(): MediaStream {
  const track = { kind: 'audio', enabled: true, object_id: (): string => 'id' };
  return {
    getTracks: () => [track],
    getAudioTracks: () => [track],
  } as unknown as MediaStream;
}

function browserStream(): MediaStream {
  const track = { kind: 'video', enabled: true };
  return {
    getTracks: () => [track],
    getAudioTracks: (): unknown[] => [],
  } as unknown as MediaStream;
}

class FakePeerConnection {
  constructor(public configuration: RTCConfiguration) {}
}

describe('CitrixVDIStrategy', () => {
  const expect: Chai.ExpectStatic = chai.expect;
  let domMockBuilder: DOMMockBuilder;
  let ucsdk: CitrixUCSDK;
  let strategy: CitrixVDIStrategy;

  function makeUcsdk(): CitrixUCSDK {
    return {
      CitrixPeerConnection: FakePeerConnection as unknown as new (
        configuration: RTCConfiguration
      ) => RTCPeerConnection,
      getUserMedia: sinon.stub().resolves(citrixStream()),
      enumerateDevices: sinon.stub().resolves([]),
      mapVideoElement: sinon.stub(),
      disposeVideoElement: sinon.stub(),
      mapAudioElement: sinon.stub(),
      disposeAudioElement: sinon.stub(),
    };
  }

  beforeEach(() => {
    domMockBuilder = new DOMMockBuilder(new DOMMockBehavior());
    ucsdk = makeUcsdk();
    strategy = new CitrixVDIStrategy({ ucsdk, windowHandle: '0x1f', logger: new NoOpLogger() });
  });

  afterEach(() => {
    domMockBuilder.cleanup();
  });

  it('reports the Citrix strategy name', () => {
    expect(strategy.getStrategyName()).to.equal(CITRIX_VDI_STRATEGY);
  });

  describe('isCitrixStream', () => {
    it('is true only when every track is a UCSDK track', () => {
      expect(CitrixVDIStrategy.isCitrixStream(citrixStream())).to.be.true;
      expect(CitrixVDIStrategy.isCitrixStream(browserStream())).to.be.false;
    });

    it('is false for an empty or missing stream', () => {
      expect(CitrixVDIStrategy.isCitrixStream(null)).to.be.false;
      expect(CitrixVDIStrategy.isCitrixStream(undefined)).to.be.false;
      expect(
        CitrixVDIStrategy.isCitrixStream({
          getTracks: (): unknown[] => [],
        } as unknown as MediaStream)
      ).to.be.false;
      expect(CitrixVDIStrategy.isCitrixStream({} as unknown as MediaStream)).to.be.false;
    });
  });

  describe('createPeerConnection', () => {
    it('redirects the signaling connection', () => {
      const peer = strategy.createPeerConnection({}, PeerConnectionPurpose.Signaling);
      expect(peer).to.be.instanceOf(FakePeerConnection);
    });

    it('keeps the content share and probe connections native', () => {
      for (const purpose of [
        PeerConnectionPurpose.ContentShare,
        PeerConnectionPurpose.CapabilityProbe,
      ]) {
        expect(strategy.createPeerConnection({}, purpose)).to.be.instanceOf(RTCPeerConnection);
      }
    });
  });

  it('acquires media and lists devices through the UCSDK', async () => {
    await strategy.getUserMedia({ video: true }, MediaPurpose.Camera);
    await strategy.enumerateDevices();
    expect((ucsdk.getUserMedia as sinon.SinonStub).calledOnceWith({ video: true })).to.be.true;
    expect((ucsdk.enumerateDevices as sinon.SinonStub).calledOnce).to.be.true;
  });

  describe('createSilentAudioStream', () => {
    it('returns a muted endpoint microphone', async () => {
      const stream = await strategy.createSilentAudioStream();
      expect(stream.getAudioTracks()[0].enabled).to.be.false;
    });

    it('returns null when the endpoint microphone is unavailable', async () => {
      (ucsdk.getUserMedia as sinon.SinonStub).rejects(new Error('no device'));
      expect(await strategy.createSilentAudioStream()).to.be.null;
    });
  });

  describe('video elements', () => {
    let element: HTMLVideoElement;

    beforeEach(() => {
      element = document.createElement('video');
    });

    it('maps an element showing a Citrix stream once', () => {
      strategy.bindVideoElement(element, citrixStream());
      strategy.bindVideoElement(element, citrixStream());
      expect((ucsdk.mapVideoElement as sinon.SinonStub).calledOnceWith(element, '0x1f')).to.be.true;
    });

    it('leaves an element showing a browser stream alone', () => {
      strategy.bindVideoElement(element, browserStream());
      strategy.unbindVideoElement(element);
      expect((ucsdk.mapVideoElement as sinon.SinonStub).called).to.be.false;
      expect((ucsdk.disposeVideoElement as sinon.SinonStub).called).to.be.false;
    });

    it('disposes a mapped element on unbind', () => {
      strategy.bindVideoElement(element, citrixStream());
      strategy.unbindVideoElement(element);
      expect((ucsdk.disposeVideoElement as sinon.SinonStub).calledOnceWith(element)).to.be.true;
    });

    it('tolerates a UCSDK without disposeVideoElement', () => {
      delete ucsdk.disposeVideoElement;
      strategy.bindVideoElement(element, citrixStream());
      expect(() => strategy.unbindVideoElement(element)).to.not.throw();
    });
  });

  describe('audio elements', () => {
    let element: HTMLAudioElement;

    beforeEach(() => {
      element = new HTMLAudioElement();
    });

    it('maps an element playing a Citrix stream once', () => {
      strategy.bindAudioElement(element, citrixStream());
      strategy.bindAudioElement(element, citrixStream());
      expect((ucsdk.mapAudioElement as sinon.SinonStub).calledOnceWith(element)).to.be.true;
    });

    it('leaves an element playing a browser stream alone', () => {
      strategy.bindAudioElement(element, browserStream());
      strategy.unbindAudioElement(element);
      expect((ucsdk.mapAudioElement as sinon.SinonStub).called).to.be.false;
      expect((ucsdk.disposeAudioElement as sinon.SinonStub).called).to.be.false;
    });

    it('disposes a mapped element on unbind', () => {
      strategy.bindAudioElement(element, citrixStream());
      strategy.unbindAudioElement(element);
      expect((ucsdk.disposeAudioElement as sinon.SinonStub).calledOnceWith(element)).to.be.true;
    });

    it('tolerates a UCSDK without disposeAudioElement', () => {
      delete ucsdk.disposeAudioElement;
      strategy.bindAudioElement(element, citrixStream());
      expect(() => strategy.unbindAudioElement(element)).to.not.throw();
    });
  });

  it('leaves the UCSDK running on dispose', async () => {
    await strategy.dispose();
    expect((ucsdk.disposeVideoElement as sinon.SinonStub).called).to.be.false;
  });

  it('works without a logger', async () => {
    const quiet = new CitrixVDIStrategy({ ucsdk, windowHandle: '0x1f' });
    expect(quiet.createPeerConnection({}, PeerConnectionPurpose.Signaling)).to.be.instanceOf(
      FakePeerConnection
    );
    expect(quiet.createPeerConnection({}, PeerConnectionPurpose.ContentShare)).to.be.instanceOf(
      RTCPeerConnection
    );
    await quiet.getUserMedia({ video: true }, MediaPurpose.Camera);
    expect(await quiet.createSilentAudioStream()).to.not.be.null;
    (ucsdk.getUserMedia as sinon.SinonStub).rejects(new Error('no device'));
    expect(await quiet.createSilentAudioStream()).to.be.null;
  });
});
