import { createAdvancedProjector } from '../src/projector';
import { expect } from 'chai';

describe('advanced projector', () => {
  it('can be instantiated', () => {
    expect(createAdvancedProjector()).to.not.be.undefined;
  });
});
