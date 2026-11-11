# Media Strategies

- [Media Strategies](#media-strategies)
  - [Overview](#overview)
  - [Supplying a strategy](#supplying-a-strategy)
  - [Implementing a strategy](#implementing-a-strategy)
    - [Peer connections](#peer-connections)
    - [Camera, microphone and devices](#camera-microphone-and-devices)
    - [The silent audio stream](#the-silent-audio-stream)
    - [Video and audio elements](#video-and-audio-elements)
    - [Strategy name](#strategy-name)
  - [Limitations](#limitations)

## Overview

The Amazon Chime SDK for JavaScript builds media on a small set of browser primitives: `RTCPeerConnection`, `navigator.mediaDevices.getUserMedia`, `navigator.mediaDevices.enumerateDevices`, and the `srcObject` of video and audio elements. A media strategy supplies those primitives. Every place in the SDK that would call the browser calls the strategy instead.

By default the SDK uses `StandardStrategy`, which calls the browser directly. An application that does not supply a strategy behaves exactly as before.

A different strategy is useful on platforms that move media out of the browser. In a virtual desktop (VDI), for example, the browser runs on a remote server and the camera, speakers and screen are on the user's own machine. A VDI vendor's SDK can capture, encode, decode and render media on that machine, and expose objects that look like `RTCPeerConnection` and `MediaStream`. A strategy built on that SDK lets a meeting use it without changing application code.

Each strategy method receives a purpose, so a strategy can answer differently at each call site. This is why the SDK uses a strategy rather than replacing `window.RTCPeerConnection` or `navigator.mediaDevices.getUserMedia` globally: some call sites must stay in the browser even when the main connection is redirected (see [Peer connections](#peer-connections)).

## Supplying a strategy

Pass the same strategy object to the device controller and to the meeting session configuration:

```js
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';

const logger = new ConsoleLogger('MyLogger', LogLevel.INFO);
const strategy = new MyStrategy(); // implements MediaStrategyInterface

const deviceController = new DefaultDeviceController(logger, { strategy });
const configuration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);
configuration.strategy = strategy;

const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
```

The two are used for different things:

- The device controller uses it to acquire the camera and microphone, list devices, create the silent audio stream, and bind the local video preview.
- The meeting session configuration is read by the rest of the meeting: creating peer connections, and binding video tiles and the audio element. The content share session copies it from the configuration, so content share uses the same strategy.

Use one object for both. A meeting whose camera comes from one platform and whose peer connection comes from another will not work.

To show a camera preview before joining, create a `DefaultDeviceController` with the same strategy and call `startVideoInput` and `startVideoPreviewForVideoInput` as usual.

## Implementing a strategy

Implement `MediaStrategyInterface`. The simplest way is to extend `StandardStrategy` and override only the methods your platform handles; the inherited methods call the browser.

```js
import {
  MediaPurpose,
  PeerConnectionPurpose,
  StandardStrategy,
} from 'amazon-chime-sdk-js';

class MyStrategy extends StandardStrategy {
  constructor(platformSdk) {
    super();
    this.platformSdk = platformSdk;
  }

  getStrategyName() {
    return 'MyStrategy';
  }

  createPeerConnection(configuration, purpose) {
    if (purpose === PeerConnectionPurpose.Signaling) {
      return new this.platformSdk.PeerConnection(configuration);
    }
    return super.createPeerConnection(configuration, purpose);
  }

  getUserMedia(constraints, purpose) {
    return this.platformSdk.getUserMedia(constraints);
  }

  enumerateDevices() {
    return this.platformSdk.enumerateDevices();
  }
}
```

### Peer connections

`createPeerConnection(configuration, purpose)` is called with one of:

| Purpose | Connection |
|---|---|
| `PeerConnectionPurpose.Signaling` | The main audio and video connection of the meeting. |
| `PeerConnectionPurpose.ContentShare` | The content share connection, which is a separate session with its own connection. |
| `PeerConnectionPurpose.CapabilityProbe` | A short-lived connection used only to read which codecs the browser supports. |

Return a browser `RTCPeerConnection` for `CapabilityProbe`. Otherwise the codec list read from the probe will not match the browser that encodes and decodes content share.

Return a browser `RTCPeerConnection` for `ContentShare` unless your platform also captures the screen. The screen is captured with the browser's `getDisplayMedia` (see [Limitations](#limitations)), and a browser stream cannot be sent on a redirected connection.

### Camera, microphone and devices

`getUserMedia(constraints, purpose)` is called with one of:

| Purpose | When |
|---|---|
| `MediaPurpose.Camera` | Starting a video input. |
| `MediaPurpose.Microphone` | Starting an audio input. |
| `MediaPurpose.PermissionProbe` | Asking for permission so that device labels are filled in. |

`enumerateDevices()` lists the devices the platform exposes. Return the devices that your `getUserMedia` can open, so that device IDs from the list work in `startVideoInput` and `startAudioInput`.

### The silent audio stream

When no microphone is selected, the SDK still sends a silent audio track, because the meeting does not report that it has joined until it receives audio. `createSilentAudioStream()` is asked for this track first.

`StandardStrategy` returns `null`, and the SDK then creates the track with Web Audio. If your platform's connection refuses tracks created in the browser, return a silent track from your platform here, for example a microphone track with `enabled` set to `false`. If a strategy other than `StandardStrategy` returns `null`, the SDK logs a warning and uses the Web Audio track.

### Video and audio elements

The SDK calls these when it attaches a stream to an element:

- `bindVideoElement(element, stream)` and `unbindVideoElement(element)` for video tiles and the local video preview.
- `bindAudioElement(element, stream)` and `unbindAudioElement(element)` for the meeting audio element.

They are called in addition to setting `srcObject`, not instead of it. `bindVideoElement` is called just before `srcObject` is set, so the platform can register the element first. `unbindVideoElement` is called only when `srcObject` is cleared, so an element that keeps showing the last frame of a paused tile stays registered.

An element can also show a stream that your platform did not create, such as the output of a video processor. Do nothing for those streams. `StandardStrategy` implements all four as no-ops.

### Strategy name

`getStrategyName()` returns a name that identifies the strategy. `StandardStrategy` returns `STANDARD_STRATEGY`. The SDK treats any other name as a strategy that moves media out of the browser.

`dispose()` releases any resources the strategy holds. The SDK does not call it; call it when your application no longer needs the strategy.

## Limitations

- Screen capture for content share uses the browser's `getDisplayMedia` and does not go through the strategy.
- `MeetingManager` in amazon-chime-sdk-component-library-react creates its own `DefaultDeviceController`. Use a version that accepts a device controller, or create the meeting session yourself as shown above.
