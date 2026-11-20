# Virtual Desktops (VDI)

- [Virtual Desktops (VDI)](#virtual-desktops-vdi)
  - [Overview](#overview)
  - [What an adapter supplies](#what-an-adapter-supplies)
  - [Citrix](#citrix)
  - [Limitations](#limitations)

## Overview

In a virtual desktop (VDI), the browser runs on a remote server while the camera, microphone, speakers and screen are on the user's own device. Some VDI platforms can capture, encode, decode and render media on that device, which saves the server CPU and keeps media quality high. A `VDIAdapter` tells the SDK to do that.

Without an adapter, the SDK uses the browser exactly as before.

## What an adapter supplies

The SDK keeps using the browser's own objects and asks the adapter only where a platform differs. Every member of `VDIAdapter` except `name` is optional; for anything the adapter does not supply, the SDK uses the browser:

| `VDIAdapter` member | Without it | Citrix |
|---|---|---|
| `createPeerConnection(configuration)` | `new RTCPeerConnection(configuration)` | the UCSDK `CitrixPeerConnection`, wrapped in `CitrixRTCPeerConnection` |
| `mediaDevices` | `navigator.mediaDevices` | `CitrixMediaDevices`, which calls the UCSDK `getUserMedia` and `enumerateDevices` |
| `createSilentAudioStream()` | a Web Audio track when no microphone is selected | a muted endpoint microphone |
| `supportsEncodedTransforms` | true | false: the endpoint encodes and decodes |
| `bindVideoElement` / `bindAudioElement`, `unbindVideoElement` / `unbindAudioElement` | the browser renders `srcObject` | `mapVideoElement` / `mapAudioElement` for elements that show UCSDK streams |

Pass the same adapter to the device controller and to the meeting session configuration, so devices and peer connections come from the same place:

```js
const deviceController = new DefaultDeviceController(logger, { vdiAdapter: adapter });
const configuration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);
configuration.vdiAdapter = adapter;
const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
```

`DefaultMeetingSession` logs a warning when the two adapters differ.

To show a camera preview before joining, create a `DefaultDeviceController` with the same adapter and call `startVideoInput` and `startVideoPreviewForVideoInput` as usual.

## Citrix

`CitrixVDIAdapter` uses Citrix HDX media redirection through the Citrix UCSDK. The SDK does not include the UCSDK: the application loads it and passes it in.

If nothing else on the page has initialized the UCSDK, let the adapter do it:

```js
const adapter = await CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'MyApp' });
```

`connect` initializes the Citrix Bootstrap and the UCSDK, waits for the endpoint to connect, and rejects if that does not finish within `timeoutMs` (15 seconds by default, covering both the window handle and the endpoint connection) or the endpoint cannot redirect WebRTC. Join without an adapter in that case.

The UCSDK has a single VM event callback, and `connect` registers it. If another component on the page already owns it, such as a Citrix softphone, construct the adapter with the window handle that component obtained instead:

```js
const adapter = new CitrixVDIAdapter({ ucsdk, windowHandle });
```

Tested with Citrix UCSDK 5.1 on a VDA that supports the Citrix Bootstrap. `connect` needs the Bootstrap for the window handle, so it does not work on a VDA without Bootstrap support.

## Limitations

- Content share always runs in the browser. Screen capture uses the browser's `getDisplayMedia`, and a browser stream cannot be sent on a redirected connection.
- With an adapter, Web Audio still runs in the browser. `enableWebAudio`, audio and video transform devices, and `createAnalyserNodeForAudioInput` pass the endpoint stream to browser Web Audio or canvas processing.
- `getSupportedConstraints` comes from the browser, not the endpoint.
- `DefaultMeetingReadinessChecker` uses the browser's devices.
- The SDK is not told when the endpoint disconnects. `CitrixVDIAdapter` logs it.
- `MeetingManager` in amazon-chime-sdk-component-library-react creates its own `DefaultDeviceController`. Use a version that accepts a device controller, or create the meeting session yourself as shown above.
