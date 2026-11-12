// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

import NoOpLogger from '../../src/logger/NoOpLogger';
import CitrixVDIStrategy, {
  CitrixBootstrap,
  CitrixUCSDK,
  CitrixVMEvent,
} from '../../src/strategies/CitrixVDIStrategy';
import { CITRIX_VDI_STRATEGY } from '../../src/strategies/MediaStrategy';
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
  chai.use(chaiAsPromised);
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
      initUCSDK: sinon.stub(),
      setVMEventCallback: sinon.stub(),
      isFeatureOn: sinon.stub().returns(true),
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

  describe('connect', () => {
    let bootstrap: CitrixBootstrap;

    function makeBootstrap(handle: Promise<string>, initialized = false): CitrixBootstrap {
      return {
        initBootstrap: sinon.stub(),
        isBootstrapInitialized: sinon.stub().returns(initialized),
        getWindowHandle: sinon.stub().returns(handle),
      };
    }

    // Sends `events` through the callback the strategy registered, once it registers one.
    function emitOnRegister(...events: CitrixVMEvent[]): void {
      (ucsdk.setVMEventCallback as sinon.SinonStub).callsFake(
        (callback: (event: CitrixVMEvent) => void) => {
          setTimeout(() => events.forEach(event => callback(event)), 0);
        }
      );
    }

    it('initializes the Bootstrap and the UCSDK and resolves once the endpoint connects', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'));
      emitOnRegister({ event: 'vdiClientDisconnected' }, { event: 'vdiClientConnected' });
      const connected = await CitrixVDIStrategy.connect({
        ucsdk,
        bootstrap,
        vendor: 'Vendor',
        logger: new NoOpLogger(),
      });
      expect((bootstrap.initBootstrap as sinon.SinonStub).calledOnceWith('Vendor')).to.be.true;
      expect((ucsdk.initUCSDK as sinon.SinonStub).calledOnceWith('Vendor')).to.be.true;
      expect(
        (ucsdk.initUCSDK as sinon.SinonStub).calledAfter(
          ucsdk.setVMEventCallback as sinon.SinonStub
        )
      ).to.be.true;
      const element = document.createElement('video');
      connected.bindVideoElement(element, citrixStream());
      expect((ucsdk.mapVideoElement as sinon.SinonStub).calledOnceWith(element, '0x2a')).to.be.true;
    });

    it('does not initialize a Bootstrap that is already initialized', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'), true);
      emitOnRegister({ event: 'vdiClientConnected' });
      await CitrixVDIStrategy.connect({ ucsdk, bootstrap, vendor: 'Vendor' });
      expect((bootstrap.initBootstrap as sinon.SinonStub).called).to.be.false;
    });

    it('rejects when the endpoint cannot redirect WebRTC', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'));
      (ucsdk.isFeatureOn as sinon.SinonStub).returns(false);
      emitOnRegister({ event: 'vdiClientConnected' });
      await expect(
        CitrixVDIStrategy.connect({ ucsdk, bootstrap, vendor: 'Vendor' })
      ).to.be.rejectedWith('does not support WebRTC redirection');
      expect((ucsdk.isFeatureOn as sinon.SinonStub).calledOnceWith('webrtc1.0')).to.be.true;
    });

    it('rejects when the Bootstrap returns no window handle', async () => {
      bootstrap = makeBootstrap(Promise.resolve(''));
      await expect(
        CitrixVDIStrategy.connect({ ucsdk, bootstrap, vendor: 'Vendor' })
      ).to.be.rejectedWith('no window handle');
      expect((ucsdk.initUCSDK as sinon.SinonStub).called).to.be.false;
    });

    it('rejects when the window handle does not arrive in time', async () => {
      bootstrap = makeBootstrap(new Promise<string>(() => {}));
      await expect(
        CitrixVDIStrategy.connect({ ucsdk, bootstrap, vendor: 'Vendor', timeoutMs: 5 })
      ).to.be.rejectedWith('timed out waiting for the window handle');
    });

    it('rejects when the endpoint does not connect in time', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'));
      await expect(
        CitrixVDIStrategy.connect({ ucsdk, bootstrap, vendor: 'Vendor', timeoutMs: 5 })
      ).to.be.rejectedWith('timed out waiting for the endpoint connection');
    });
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

  it('redirects the peer connection', () => {
    expect(strategy.createPeerConnection({})).to.be.instanceOf(FakePeerConnection);
  });

  it('does not support content share', () => {
    expect(strategy.supportsContentShare).to.be.false;
  });

  it('acquires media and lists devices through the UCSDK', async () => {
    await strategy.getUserMedia({ video: true });
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
    expect(quiet.createPeerConnection({})).to.be.instanceOf(FakePeerConnection);
    await quiet.getUserMedia({ video: true });
    expect(await quiet.createSilentAudioStream()).to.not.be.null;
    (ucsdk.getUserMedia as sinon.SinonStub).rejects(new Error('no device'));
    expect(await quiet.createSilentAudioStream()).to.be.null;
  });
});
