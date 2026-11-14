// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DefaultPeerConnection from '../peerconnection/DefaultPeerConnection';
import SDP from '../sdp/SDP';
import CitrixVDIAdapter from './CitrixVDIAdapter';

/** A peer connection whose media runs on the Citrix endpoint. */
export default class CitrixPeerConnection extends DefaultPeerConnection {
  // The endpoint encodes and decodes, so there are no frames in the browser to transform.
  readonly supportsEncodedTransforms: boolean = false;

  constructor(
    configuration: RTCConfiguration,
    private adapter: CitrixVDIAdapter
  ) {
    super(new adapter.ucsdk.CitrixPeerConnection(configuration));
    adapter.logger?.info('CitrixVDIAdapter: peer connection is redirected');
  }

  // The UCSDK binds `mid` asynchronously, so it can still be unset after
  // setLocalDescription. Derive it from the local description.
  midOf(transceiver: RTCRtpTransceiver): string | null {
    if (transceiver.mid) {
      return transceiver.mid;
    }
    const derived = this.deriveMid(transceiver);
    this.adapter.logger?.warn(`CitrixVDIAdapter: transceiver has no mid; derived ${derived}`);
    return derived;
  }

  // The UCSDK rejects a null track, and on an empty sender it is a no-op anyway.
  async replaceTrack(sender: RTCRtpSender, track: MediaStreamTrack | null): Promise<void> {
    if (!track && !sender.track) {
      return;
    }
    await sender.replaceTrack(track);
  }

  // Transceivers that report a mid claim their SDP sections. The remaining SDP
  // mids, in order, pair with the mid-less transceivers, in order. Not by array
  // index: the UCSDK may omit inactive transceivers from getTransceivers().
  private deriveMid(transceiver: RTCRtpTransceiver): string | null {
    const sdp = this.localDescription?.sdp;
    if (!sdp) {
      return null;
    }
    const transceivers = this.getTransceivers();
    const claimed = new Set(transceivers.map(t => t.mid).filter(mid => !!mid));
    const unclaimed = new SDP(sdp)
      .mediaSections()
      .map(section => section.mid)
      .filter(mid => !!mid && !claimed.has(mid));
    const midless = transceivers.filter(t => !t.mid);
    const index = midless.indexOf(transceiver);
    if (index >= 0) {
      return unclaimed[index] ?? null;
    }
    // UCSDK proxies may not keep a stable identity across getTransceivers().
    return unclaimed.length === 1 ? unclaimed[0] : null;
  }
}
