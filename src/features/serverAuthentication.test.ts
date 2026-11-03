import { accountAuthenticationError } from './serverAuthentication';

describe('server authentication', () => {
  test.each([false, true])('allows email-free accounts and blank passwords with premium=%s offline', (premium) => {
    expect(accountAuthenticationError({ premium }, false)).toBeNull();
    expect(accountAuthenticationError({ premium, password: 'x' }, false)).toBeNull();
  });
  test('restricts premium servers and retains the password limit', () => {
    expect(accountAuthenticationError({ premium: false }, true)).toMatch(/Premium servers/);
    expect(accountAuthenticationError({ premium: true }, true)).toBeNull();
    expect(accountAuthenticationError({ premium: true, email: 'legacy-invalid' }, true)).toBeNull();
    expect(accountAuthenticationError({ premium: true, password: 'x'.repeat(45) }, false)).toBeNull();
    expect(accountAuthenticationError({ premium: true, password: 'x'.repeat(46) }, false)).toMatch(/45/);
  });
});
