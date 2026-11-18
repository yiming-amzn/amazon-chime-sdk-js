// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';
import * as sinon from 'sinon';

import CitrixRTCRtpSender from '../../../src/vdi/citrix/CitrixRTCRtpSender';

describe('CitrixRTCRtpSender', () => {
  const expect: Chai.ExpectStatic = chai.expect;

  it('forwards to the UCSDK sender', async () => {
    const inner = {
      dtmf: { id: 'dtmf' },
      track: { id: 'track' },
      transform: null as unknown,
      transport: { id: 'transport' },
      replaceTrack: sinon.stub().resolves(),
      getParameters: sinon.stub().returns('parameters'),
      getStats: sinon.stub().resolves('stats'),
      setParameters: sinon.stub().resolves(),
      setStreams: sinon.stub(),
    };
    const sender = new CitrixRTCRtpSender(inner as unknown as RTCRtpSender);
    await sender.replaceTrack(null);
    expect(inner.replaceTrack.calledOnceWith(null)).to.be.true;
    inner.replaceTrack.resetHistory();
    expect(sender.dtmf).to.equal(inner.dtmf);
    expect(sender.track).to.equal(inner.track);
    expect(sender.transport).to.equal(inner.transport);
    const transform = {} as RTCRtpTransform;
    sender.transform = transform;
    expect(inner.transform).to.equal(transform);
    expect(sender.transform).to.equal(transform);
    const track = {} as MediaStreamTrack;
    await sender.replaceTrack(track);
    expect(inner.replaceTrack.calledOnceWith(track)).to.be.true;
    expect(sender.getParameters()).to.equal('parameters');
    expect(await sender.getStats()).to.equal('stats');
    const parameters = {} as RTCRtpSendParameters;
    const options = {} as RTCSetParameterOptions;
    await sender.setParameters(parameters, options);
    expect(inner.setParameters.calledOnceWith(parameters, options)).to.be.true;
    const stream = {} as MediaStream;
    sender.setStreams(stream);
    expect(inner.setStreams.calledOnceWith(stream)).to.be.true;
  });

  describe('replaceTrack', () => {
    function senderWith(track: { id?: string } | null): {
      inner: { track: { id?: string } | null; replaceTrack: sinon.SinonStub };
      sender: CitrixRTCRtpSender;
    } {
      const inner = { track, replaceTrack: sinon.stub().resolves() };
      return { inner, sender: new CitrixRTCRtpSender(inner as unknown as RTCRtpSender) };
    }

    it('skips a null track on a sender with no track', async () => {
      const { inner, sender } = senderWith(null);
      await sender.replaceTrack(null);
      expect(inner.replaceTrack.called).to.be.false;
    });

    it('skips a null track on a sender with a placeholder track', async () => {
      const { inner, sender } = senderWith({});
      await sender.replaceTrack(null);
      expect(inner.replaceTrack.called).to.be.false;
    });

    it('sets a track on a sender with no track', async () => {
      const { inner, sender } = senderWith(null);
      const track = {} as MediaStreamTrack;
      await sender.replaceTrack(track);
      expect(inner.replaceTrack.args).to.deep.equal([[track]]);
    });
  });
});
