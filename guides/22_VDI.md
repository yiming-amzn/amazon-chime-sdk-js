# Virtual Desktops (VDI)

- [Virtual Desktops (VDI)](#virtual-desktops-vdi)
  - [Overview](#overview)
  - [Components](#components)
  - [Citrix](#citrix)
  - [Limitations](#limitations)

## Overview

In a virtual desktop (VDI), the browser runs on a remote server while the camera, microphone, speakers and screen are on the user's own device. Some VDI platforms can capture, encode, decode and render media on that device, which saves the server CPU and keeps media quality high. A `VDIAdapter` tells the SDK to do that.

Without an adapter, the SDK uses the browser exactly as before.

## Components

The SDK builds media from three components. `VDIComponents` creates each one for the adapter you supply, or the browser one without an adapter:

| Component | Browser | Citrix |
|---|---|---|
| `PeerConnection` is the meeting's peer connection, as the SDK uses it | `DefaultPeerConnection` | `CitrixPeerConnection` |
| `MediaDeviceProvider` opens the camera and microphone, lists devices and supplies the silent audio stream used when no microphone is selected | `DefaultMediaDeviceProvider` | `CitrixMediaDeviceProvider` |
| `MediaElementBinder` registers video tiles, the local preview and the meeting audio element with the platform that renders them | `DefaultMediaElementBinder` | `CitrixMediaElementBinder` |

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
- With a VDI adapter, encoded transforms are skipped on senders and receivers the browser did not create.
- `MeetingManager` in amazon-chime-sdk-component-library-react creates its own `DefaultDeviceController`. Use a version that accepts a device controller, or create the meeting session yourself as shown above.
