// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * A virtual desktop platform that runs media on the user's device instead of in
 * the browser. Supply one through `MeetingSessionConfiguration.vdiAdapter` and the
 * `vdiAdapter` option of `DefaultDeviceController`; without one the SDK uses the
 * browser. See the VDI guide.
 */
export default interface VDIAdapter {
  /** Identifies the platform in logs. */
  readonly name: string;
}
