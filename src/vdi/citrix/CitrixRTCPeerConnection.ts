// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import SDP from '../../sdp/SDP';
import CitrixVDIAdapter from '../CitrixVDIAdapter';
import CitrixRTCRtpReceiver from './CitrixRTCRtpReceiver';
import CitrixRTCRtpSender from './CitrixRTCRtpSender';
import CitrixRTCRtpTransceiver from './CitrixRTCRtpTransceiver';

type Listener = EventListenerOrEventListenerObject;
type Handler<E extends Event> = ((this: RTCPeerConnection, ev: E) => unknown) | null;

/** Returns the UCSDK object behind a wrapper, or the object itself. */
export function unwrap<T>(x: T): T {
  return (x as { inner?: T }).inner ?? x;
}

/**
 * The meeting's peer connection on Citrix: the browser `RTCPeerConnection` API over the UCSDK one.
 * Every member is written out, either as a forward or as a Citrix mapping, and `implements` makes
 * the compiler reject a missing one. The transceivers, senders and receivers it hands out are
 * wrappers too, one per UCSDK object.
 */
export default class CitrixRTCPeerConnection implements RTCPeerConnection {
  private readonly wrappers = new WeakMap<object, object>();
  private readonly trackListeners = new Map<Listener, EventListener>();
  private ontrackHandler: Handler<RTCTrackEvent> = null;

  constructor(
    public readonly inner: RTCPeerConnection,
    public readonly adapter: CitrixVDIAdapter
  ) {}

  static create(configuration: RTCConfiguration, adapter: CitrixVDIAdapter): RTCPeerConnection {
    return new CitrixRTCPeerConnection(
      new adapter.ucsdk.CitrixPeerConnection(configuration),
      adapter
    );
  }

  // Citrix mappings: every path that hands out a transceiver, sender or receiver.

  addTransceiver(
    trackOrKind: MediaStreamTrack | string,
    init?: RTCRtpTransceiverInit
  ): RTCRtpTransceiver {
    return this.wrapTransceiver(this.inner.addTransceiver(trackOrKind, init));
  }

  getTransceivers(): RTCRtpTransceiver[] {
    return this.inner.getTransceivers().map(t => this.wrapTransceiver(t));
  }

  getSenders(): RTCRtpSender[] {
    return this.inner.getSenders().map(s => this.wrapSender(s));
  }

  getReceivers(): RTCRtpReceiver[] {
    return this.inner.getReceivers().map(r => this.wrapReceiver(r));
  }

  addTrack(track: MediaStreamTrack, ...streams: MediaStream[]): RTCRtpSender {
    return this.wrapSender(this.inner.addTrack(track, ...streams));
  }

  removeTrack(sender: RTCRtpSender): void {
    this.inner.removeTrack(unwrap(sender));
  }

  // The SDK's track listeners read event.transceiver and event.receiver, so they must get the
  // wrappers the SDK already holds.
  addEventListener(
    type: string,
    listener: Listener,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (type === 'track') {
      const mapped = (event: Event): void =>
        this.callListener(listener, this.wrapTrackEvent(event as RTCTrackEvent));
      this.trackListeners.set(listener, mapped);
      this.inner.addEventListener(type, mapped, options);
      return;
    }
    this.inner.addEventListener(type, listener, options);
  }

  removeEventListener(
    type: string,
    listener: Listener,
    options?: boolean | EventListenerOptions
  ): void {
    const mapped = type === 'track' ? this.trackListeners.get(listener) : undefined;
    if (mapped) {
      this.trackListeners.delete(listener);
    }
    this.inner.removeEventListener(type, mapped ?? listener, options);
  }

  get ontrack(): Handler<RTCTrackEvent> {
    return this.ontrackHandler;
  }

  set ontrack(handler: Handler<RTCTrackEvent>) {
    this.ontrackHandler = handler;
    this.inner.ontrack = handler && (event => handler.call(this, this.wrapTrackEvent(event)));
  }

  // Forwards.

  get canTrickleIceCandidates(): boolean | null {
    return this.inner.canTrickleIceCandidates;
  }

  // The UCSDK reports the connection state as connectionState_.
  get connectionState(): RTCPeerConnectionState {
    return (
      this.inner.connectionState ??
      (this.inner as { connectionState_?: RTCPeerConnectionState }).connectionState_
    );
  }

  get currentLocalDescription(): RTCSessionDescription | null {
    return this.inner.currentLocalDescription;
  }

  get currentRemoteDescription(): RTCSessionDescription | null {
    return this.inner.currentRemoteDescription;
  }

  get iceConnectionState(): RTCIceConnectionState {
    return this.inner.iceConnectionState;
  }

  get iceGatheringState(): RTCIceGatheringState {
    return this.inner.iceGatheringState;
  }

  get localDescription(): RTCSessionDescription | null {
    return this.inner.localDescription;
  }

  get pendingLocalDescription(): RTCSessionDescription | null {
    return this.inner.pendingLocalDescription;
  }

  get pendingRemoteDescription(): RTCSessionDescription | null {
    return this.inner.pendingRemoteDescription;
  }

  get remoteDescription(): RTCSessionDescription | null {
    return this.inner.remoteDescription;
  }

  get sctp(): RTCSctpTransport | null {
    return this.inner.sctp;
  }

  get signalingState(): RTCSignalingState {
    return this.inner.signalingState;
  }

  get onconnectionstatechange(): Handler<Event> {
    return this.inner.onconnectionstatechange;
  }

  set onconnectionstatechange(handler: Handler<Event>) {
    this.inner.onconnectionstatechange = handler;
  }

  get ondatachannel(): Handler<RTCDataChannelEvent> {
    return this.inner.ondatachannel;
  }

  set ondatachannel(handler: Handler<RTCDataChannelEvent>) {
    this.inner.ondatachannel = handler;
  }

  get onicecandidate(): Handler<RTCPeerConnectionIceEvent> {
    return this.inner.onicecandidate;
  }

  set onicecandidate(handler: Handler<RTCPeerConnectionIceEvent>) {
    this.inner.onicecandidate = handler;
  }

  get onicecandidateerror(): Handler<RTCPeerConnectionIceErrorEvent> {
    return this.inner.onicecandidateerror;
  }

  set onicecandidateerror(handler: Handler<RTCPeerConnectionIceErrorEvent>) {
    this.inner.onicecandidateerror = handler;
  }

  get oniceconnectionstatechange(): Handler<Event> {
    return this.inner.oniceconnectionstatechange;
  }

  set oniceconnectionstatechange(handler: Handler<Event>) {
    this.inner.oniceconnectionstatechange = handler;
  }

  get onicegatheringstatechange(): Handler<Event> {
    return this.inner.onicegatheringstatechange;
  }

  set onicegatheringstatechange(handler: Handler<Event>) {
    this.inner.onicegatheringstatechange = handler;
  }

  get onnegotiationneeded(): Handler<Event> {
    return this.inner.onnegotiationneeded;
  }

  set onnegotiationneeded(handler: Handler<Event>) {
    this.inner.onnegotiationneeded = handler;
  }

  get onsignalingstatechange(): Handler<Event> {
    return this.inner.onsignalingstatechange;
  }

  set onsignalingstatechange(handler: Handler<Event>) {
    this.inner.onsignalingstatechange = handler;
  }

  close(): void {
    this.inner.close();
  }

  createDataChannel(label: string, init?: RTCDataChannelInit): RTCDataChannel {
    return this.inner.createDataChannel(label, init);
  }

  dispatchEvent(event: Event): boolean {
    return this.inner.dispatchEvent(event);
  }

  getConfiguration(): RTCConfiguration {
    return this.inner.getConfiguration();
  }

  getStats(selector?: MediaStreamTrack | null): Promise<RTCStatsReport> {
    return this.inner.getStats(selector);
  }

  restartIce(): void {
    this.inner.restartIce();
  }

  setConfiguration(configuration?: RTCConfiguration): void {
    this.inner.setConfiguration(configuration);
  }

  // These keep lib.dom's legacy callback overloads, so they forward their arguments unchanged.
  addIceCandidate(...args: unknown[]): Promise<void> {
    return forward(this.inner, 'addIceCandidate', args);
  }

  createAnswer(...args: unknown[]): Promise<never> {
    return forward(this.inner, 'createAnswer', args);
  }

  createOffer(...args: unknown[]): Promise<never> {
    return forward(this.inner, 'createOffer', args);
  }

  setLocalDescription(...args: unknown[]): Promise<void> {
    return forward(this.inner, 'setLocalDescription', args);
  }

  setRemoteDescription(...args: unknown[]): Promise<void> {
    return forward(this.inner, 'setRemoteDescription', args);
  }

  // One wrapper per UCSDK object, so that `===` in the SDK holds: it compares transceivers with
  // the ones it stored and keeps them as Map values.
  wrapTransceiver(transceiver: RTCRtpTransceiver): RTCRtpTransceiver {
    return this.cached(transceiver, () => new CitrixRTCRtpTransceiver(transceiver, this));
  }

  wrapSender(sender: RTCRtpSender): RTCRtpSender {
    return this.cached(sender, () => new CitrixRTCRtpSender(sender));
  }

  wrapReceiver(receiver: RTCRtpReceiver): RTCRtpReceiver {
    return this.cached(receiver, () => new CitrixRTCRtpReceiver(receiver));
  }

  /**
   * Pairs the transceivers that have no mid with the local description's unclaimed mids, in
   * order. Returns null unless the pairing is unambiguous: when the counts differ, a guess could
   * wire a transceiver to the wrong video stream.
   */
  deriveMid(transceiver: RTCRtpTransceiver): string | null {
    const sdp = this.inner.localDescription?.sdp;
    if (!sdp) {
      return null;
    }
    const transceivers = this.getTransceivers();
    const nativeMid = (t: RTCRtpTransceiver): string | null => unwrap(t).mid;
    const claimed = new Set(transceivers.map(nativeMid).filter(mid => !!mid));
    const unclaimed = new SDP(sdp)
      .mediaSections()
      .map(section => section.mid)
      .filter(mid => !!mid && !claimed.has(mid));
    const midless = transceivers.filter(t => !nativeMid(t));
    const index = midless.indexOf(transceiver);
    if (unclaimed.length !== midless.length || index < 0) {
      return null;
    }
    this.adapter.logger?.warn(
      `CitrixVDIAdapter: transceiver has no mid; derived ${unclaimed[index]}`
    );
    return unclaimed[index];
  }

  private cached<T extends object>(inner: T, make: () => T): T {
    if (!inner) {
      return inner;
    }
    let wrapper = this.wrappers.get(inner) as T | undefined;
    if (!wrapper) {
      wrapper = make();
      this.wrappers.set(inner, wrapper);
    }
    return wrapper;
  }

  // Only the members the SDK reads.
  private wrapTrackEvent(event: RTCTrackEvent): RTCTrackEvent {
    const mapped: Pick<RTCTrackEvent, 'type' | 'track' | 'streams' | 'receiver' | 'transceiver'> = {
      type: event.type,
      track: event.track,
      streams: event.streams,
      receiver: this.wrapReceiver(event.receiver),
      transceiver: this.wrapTransceiver(event.transceiver),
    };
    return mapped as RTCTrackEvent;
  }

  private callListener(listener: Listener, event: Event): void {
    if (typeof listener === 'function') {
      listener.call(this, event);
    } else {
      listener.handleEvent(event);
    }
  }
}

function forward<R>(target: object, method: string, args: unknown[]): R {
  const fn = (target as Record<string, (...a: unknown[]) => R>)[method];
  return fn.apply(target, args);
}
