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

`PeerConnection.create(configuration, adapter)` and `MediaDevices.create(adapter)` return the adapter's object, or the browser one when there is no adapter or it does not supply it.

| `VDIAdapter` member | Without it | Citrix |
|---|---|---|
| `createPeerConnection(configuration)` | `new RTCPeerConnection(configuration)` | the UCSDK `CitrixPeerConnection` |
| `mediaDevices` | `navigator.mediaDevices` | `CitrixMediaDevices`, which calls the UCSDK `getUserMedia` and `enumerateDevices` |

Pass the same adapter to the device controller and to the meeting session configuration, so devices and peer connections come from the same place:

```js
const deviceController = new DefaultDeviceController(logger, { vdiAdapter: adapter });
const configuration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);
configuration.vdiAdapter = adapter;
const meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
```

To show a camera preview before joining, create a `DefaultDeviceController` with the same adapter and call `startVideoInput` and `startVideoPreviewForVideoInput` as usual.

## Citrix

`CitrixVDIAdapter` uses Citrix HDX media redirection through the Citrix UCSDK. The SDK does not include the UCSDK: the application loads it and passes it in.

If nothing else on the page has initialized the UCSDK, let the adapter do it:

```js
const adapter = await CitrixVDIAdapter.connect({ ucsdk, bootstrap, vendor: 'MyApp' });
```

`connect` initializes the Citrix Bootstrap and the UCSDK, waits for the endpoint to connect, and rejects if it does not connect within the timeout (15 seconds by default) or cannot redirect WebRTC. Join without an adapter in that case.

The UCSDK has a single VM event callback, and `connect` registers it. If another component on the page already owns it, such as a Citrix softphone, construct the adapter with the window handle that component obtained instead:

```js
const adapter = new CitrixVDIAdapter({ ucsdk, windowHandle });
```

## Limitations

- Content share always runs in the browser. Screen capture uses the browser's `getDisplayMedia`, and a browser stream cannot be sent on a redirected connection.
- `MeetingManager` in amazon-chime-sdk-component-library-react creates its own `DefaultDeviceController`. Use a version that accepts a device controller, or create the meeting session yourself as shown above.
