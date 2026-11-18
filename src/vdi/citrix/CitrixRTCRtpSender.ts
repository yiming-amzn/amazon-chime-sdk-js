// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/** The browser `RTCRtpSender` API over a UCSDK sender. */
export default class CitrixRTCRtpSender implements RTCRtpSender {
  constructor(public readonly inner: RTCRtpSender) {}

  // The UCSDK rejects a null track. On a sender with no track the call would change nothing, and
  // such a sender can report a placeholder track with no id.
  replaceTrack(track: MediaStreamTrack | null): Promise<void> {
    if (!track && !this.inner.track?.id) {
      return Promise.resolve();
    }
    return this.inner.replaceTrack(track);
  }

  get dtmf(): RTCDTMFSender | null {
    return this.inner.dtmf;
  }

  get track(): MediaStreamTrack | null {
    return this.inner.track;
  }

  get transform(): RTCRtpTransform | null {
    return this.inner.transform;
  }

  set transform(transform: RTCRtpTransform | null) {
    this.inner.transform = transform;
  }

  get transport(): RTCDtlsTransport | null {
    return this.inner.transport;
  }

  getParameters(): RTCRtpSendParameters {
    return this.inner.getParameters();
  }

  getStats(): Promise<RTCStatsReport> {
    return this.inner.getStats();
  }

  setParameters(parameters: RTCRtpSendParameters, options?: RTCSetParameterOptions): Promise<void> {
    return this.inner.setParameters(parameters, options);
  }

  setStreams(...streams: MediaStream[]): void {
    this.inner.setStreams(...streams);
  }
}
