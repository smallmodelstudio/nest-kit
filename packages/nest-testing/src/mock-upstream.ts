import nock from 'nock';

/** `nock(baseUrl)`, so an upstream mock reads the same either way. */
export function mockUpstream(baseUrl: string): nock.Scope {
  return nock(baseUrl);
}
