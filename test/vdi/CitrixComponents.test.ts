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

  describe('CitrixPeerConnection', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=mid:0',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=mid:1',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=mid:2',
      '',
    ].join('\r\n');

    type FakeTransceiver = { mid: string | null };

    // A redirected connection with the given transceivers and local description.
    function peerWith(
      transceivers: FakeTransceiver[],
      localSdp: string | null = sdp
    ): CitrixPeerConnection {
      ucsdk.CitrixPeerConnection = class {
        localDescription = localSdp === null ? null : { sdp: localSdp };
        getTransceivers(): FakeTransceiver[] {
          return transceivers;
        }
      } as unknown as CitrixUCSDK['CitrixPeerConnection'];
      return new CitrixPeerConnection({}, adapter);
    }

    function midOf(peer: CitrixPeerConnection, transceiver: FakeTransceiver): string | null {
      return peer.midOf(transceiver as RTCRtpTransceiver);
    }

    it('wraps a redirected peer connection', () => {
      expect(new CitrixPeerConnection({}, adapter).rtcPeerConnection).to.be.instanceOf(
        FakePeerConnection
      );
    });

    it('cannot carry encoded transforms', () => {
      expect(new CitrixPeerConnection({}, adapter).supportsEncodedTransforms).to.be.false;
    });

    it('returns the mid a transceiver reports', () => {
      const transceiver = { mid: '1' };
      expect(midOf(peerWith([transceiver]), transceiver)).to.equal('1');
    });

    it('pairs unclaimed SDP mids with mid-less transceivers in order', () => {
      const first = { mid: null as string | null };
      const second = { mid: null as string | null };
      const peer = peerWith([{ mid: '0' }, first, second]);
      expect(midOf(peer, first)).to.equal('1');
      expect(midOf(peer, second)).to.equal('2');
    });

    it('skips SDP mids already claimed by another transceiver', () => {
      const midless = { mid: null as string | null };
      expect(midOf(peerWith([{ mid: '1' }, midless]), midless)).to.equal('0');
    });

    it('uses the only unclaimed mid when the transceiver identity is not stable', () => {
      expect(midOf(peerWith([{ mid: '0' }, { mid: '1' }]), { mid: null })).to.equal('2');
    });

    it('returns null when the transceiver cannot be matched', () => {
      expect(midOf(peerWith([{ mid: '0' }]), { mid: null })).to.equal(null);
    });

    it('returns null when more mid-less transceivers than unclaimed mids', () => {
      const third = { mid: null as string | null };
      const peer = peerWith([{ mid: '0' }, { mid: null }, { mid: null }, third]);
      expect(midOf(peer, third)).to.equal(null);
    });

    it('returns null when there is no local description', () => {
      const midless = { mid: null as string | null };
      expect(midOf(peerWith([midless], null), midless)).to.equal(null);
    });

    it('skips replacing an empty sender with no track', async () => {
      const sender = { track: null as MediaStreamTrack | null, replaceTrack: sinon.stub() };
      const peer = new CitrixPeerConnection({}, adapter);
      await peer.replaceTrack(sender as unknown as RTCRtpSender, null);
      expect(sender.replaceTrack.called).to.be.false;
    });

    it('replaces the track otherwise', async () => {
      const track = new MediaStreamTrack();
      const sender = { track, replaceTrack: sinon.stub().resolves() };
      const peer = new CitrixPeerConnection({}, adapter);
      await peer.replaceTrack(sender as unknown as RTCRtpSender, null);
      await peer.replaceTrack(sender as unknown as RTCRtpSender, track);
      expect(sender.replaceTrack.args).to.deep.equal([[null], [track]]);
    });
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
    const quietPeer = new CitrixPeerConnection({}, quiet);
    expect(quietPeer.rtcPeerConnection).to.be.instanceOf(FakePeerConnection);
    expect(quietPeer.midOf({ mid: null } as RTCRtpTransceiver)).to.equal(null);
    const devices = new CitrixMediaDeviceProvider(quiet);
    await devices.getUserMedia({ video: true });
    expect(await devices.createSilentAudioStream()).to.not.be.null;
    (ucsdk.getUserMedia as sinon.SinonStub).rejects(new Error('no device'));
    expect(await devices.createSilentAudioStream()).to.be.null;
  });
});
