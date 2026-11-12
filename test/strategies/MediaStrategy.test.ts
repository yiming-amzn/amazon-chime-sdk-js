// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';

import { CITRIX_VDI_STRATEGY, STANDARD_STRATEGY } from '../../src/index';

describe('MediaStrategy', () => {
  const expect: Chai.ExpectStatic = chai.expect;

  it('exposes the strategy names from the entry point', () => {
    expect(STANDARD_STRATEGY).to.equal('StandardStrategy');
    expect(CITRIX_VDI_STRATEGY).to.equal('CitrixVDIStrategy');
  });
});
