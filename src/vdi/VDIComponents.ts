// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DefaultMediaDeviceProvider from '../mediadeviceprovider/DefaultMediaDeviceProvider';
import MediaDeviceProvider from '../mediadeviceprovider/MediaDeviceProvider';
import DefaultMediaElementBinder from '../mediaelementbinder/DefaultMediaElementBinder';
import MediaElementBinder from '../mediaelementbinder/MediaElementBinder';
import DefaultPeerConnection from '../peerconnection/DefaultPeerConnection';
import PeerConnection from '../peerconnection/PeerConnection';
import CitrixMediaDeviceProvider from './CitrixMediaDeviceProvider';
import CitrixMediaElementBinder from './CitrixMediaElementBinder';
import CitrixPeerConnection from './CitrixPeerConnection';
import CitrixVDIAdapter from './CitrixVDIAdapter';
import VDIAdapter from './VDIAdapter';

/** Creates each media component for a VDI adapter, or the browser one without an adapter. */
export default class VDIComponents {
  static peerConnection(configuration: RTCConfiguration, adapter?: VDIAdapter): PeerConnection {
    if (adapter instanceof CitrixVDIAdapter) {
      return new CitrixPeerConnection(configuration, adapter);
    }
    // @ts-ignore
    return new DefaultPeerConnection(new RTCPeerConnection(configuration));
  }

  static mediaDeviceProvider(adapter?: VDIAdapter): MediaDeviceProvider {
    if (adapter instanceof CitrixVDIAdapter) {
      return new CitrixMediaDeviceProvider(adapter);
    }
    return new DefaultMediaDeviceProvider();
  }

  static mediaElementBinder(adapter?: VDIAdapter): MediaElementBinder {
    if (adapter instanceof CitrixVDIAdapter) {
      return new CitrixMediaElementBinder(adapter);
    }
    return new DefaultMediaElementBinder();
  }
}
