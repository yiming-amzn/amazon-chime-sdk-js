// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

import NoOpLogger from '../../src/logger/NoOpLogger';
import CitrixVDIAdapter, {
  CitrixBootstrap,
  CitrixUCSDK,
  CitrixVMEvent,
} from '../../src/vdi/CitrixVDIAdapter';
import DOMMockBehavior from '../dommock/DOMMockBehavior';
import DOMMockBuilder from '../dommock/DOMMockBuilder';
import { browserStream, citrixStream, makeUcsdk } from './FakeCitrixUCSDK';

describe('CitrixVDIAdapter', () => {
  const expect: Chai.ExpectStatic = chai.expect;
  chai.use(chaiAsPromised);
  let domMockBuilder: DOMMockBuilder;
  let ucsdk: CitrixUCSDK;

  beforeEach(() => {
    domMockBuilder = new DOMMockBuilder(new DOMMockBehavior());
    ucsdk = makeUcsdk();
  });

  afterEach(() => {
    domMockBuilder.cleanup();
  });

  it('holds the UCSDK and window handle it was given', () => {
    const adapter = new CitrixVDIAdapter({ ucsdk, windowHandle: '0x1f' });
    expect(adapter.name).to.equal('CitrixVDIAdapter');
    expect(adapter.ucsdk).to.equal(ucsdk);
    expect(adapter.windowHandle).to.equal('0x1f');
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

    // Sends `events` through the callback the adapter registered, once it registers one.
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
      const adapter = await CitrixVDIAdapter.connect({
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
      expect(adapter.windowHandle).to.equal('0x2a');
    });

    it('does not initialize a Bootstrap that is already initialized', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'), true);
      emitOnRegister({ event: 'vdiClientConnected' });
      await CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'Vendor' });
      expect((bootstrap.initBootstrap as sinon.SinonStub).called).to.be.false;
    });

    it('rejects when the endpoint cannot redirect WebRTC', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'));
      (ucsdk.isFeatureOn as sinon.SinonStub).returns(false);
      emitOnRegister({ event: 'vdiClientConnected' });
      await expect(
        CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'Vendor' })
      ).to.be.rejectedWith('does not support WebRTC redirection');
      expect((ucsdk.isFeatureOn as sinon.SinonStub).calledOnceWith('webrtc1.0')).to.be.true;
    });

    it('rejects when the Bootstrap returns no window handle', async () => {
      bootstrap = makeBootstrap(Promise.resolve(''));
      await expect(
        CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'Vendor' })
      ).to.be.rejectedWith('no window handle');
      expect((ucsdk.initUCSDK as sinon.SinonStub).called).to.be.false;
    });

    it('rejects when the window handle does not arrive in time', async () => {
      bootstrap = makeBootstrap(new Promise<string>(() => {}));
      await expect(
        CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'Vendor', timeoutMs: 5 })
      ).to.be.rejectedWith('timed out waiting for the window handle');
    });

    it('rejects when the endpoint does not connect in time', async () => {
      bootstrap = makeBootstrap(Promise.resolve('0x2a'));
      await expect(
        CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'Vendor', timeoutMs: 5 })
      ).to.be.rejectedWith('timed out waiting for the endpoint connection');
    });
  });

  describe('isCitrixStream', () => {
    it('is true only when every track is a UCSDK track', () => {
      expect(CitrixVDIAdapter.isCitrixStream(citrixStream())).to.be.true;
      expect(CitrixVDIAdapter.isCitrixStream(browserStream())).to.be.false;
    });

    it('is false for an empty or missing stream', () => {
      expect(CitrixVDIAdapter.isCitrixStream(null)).to.be.false;
      expect(CitrixVDIAdapter.isCitrixStream(undefined)).to.be.false;
      expect(
        CitrixVDIAdapter.isCitrixStream({
          getTracks: (): unknown[] => [],
        } as unknown as MediaStream)
      ).to.be.false;
      expect(CitrixVDIAdapter.isCitrixStream({} as unknown as MediaStream)).to.be.false;
    });
  });
});
