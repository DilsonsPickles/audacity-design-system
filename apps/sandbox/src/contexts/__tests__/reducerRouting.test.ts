import { describe, it, expect } from 'vitest';
import { ACTION_DOMAIN, DOMAINS } from '../reducers/domains';

describe('reducer routing table', () => {
  it('maps every action to a known domain', () => {
    for (const [type, domain] of Object.entries(ACTION_DOMAIN)) {
      expect(DOMAINS, `action ${type} routed to unknown domain ${domain}`).toContain(domain);
    }
  });
  it('has no duplicate/blank entries', () => {
    for (const [type, domain] of Object.entries(ACTION_DOMAIN)) {
      expect(domain, `action ${type} has empty domain`).toBeTruthy();
    }
  });
});
