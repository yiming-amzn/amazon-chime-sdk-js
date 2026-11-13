// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DefaultMediaDeviceProvider from '../mediadeviceprovider/DefaultMediaDeviceProvider';
import MediaDeviceProvider from '../mediadeviceprovider/MediaDeviceProvider';
import DefaultMediaElementBinder from '../mediaelementbinder/DefaultMediaElementBinder';
import MediaElementBinder from '../mediaelementbinder/MediaElementBinder';
import DefaultPeerConnectionFactory from '../peerconnectionfactory/DefaultPeerConnectionFactory';
import PeerConnectionFactory from '../peerconnectionfactory/PeerConnectionFactory';
import CitrixMediaDeviceProvider from './CitrixMediaDeviceProvider';
import CitrixMediaElementBinder from './CitrixMediaElementBinder';
import CitrixPeerConnectionFactory from './CitrixPeerConnectionFactory';
import CitrixVDIAdapter from './CitrixVDIAdapter';
import VDIAdapter from './VDIAdapter';

/** Creates each media component for a VDI adapter, or the browser one without an adapter. */
export default class VDIComponents {
  static peerConnectionFactory(adapter?: VDIAdapter): PeerConnectionFactory {
    if (adapter instanceof CitrixVDIAdapter) {
      return new CitrixPeerConnectionFactory(adapter);
    }
    return new DefaultPeerConnectionFactory();
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
