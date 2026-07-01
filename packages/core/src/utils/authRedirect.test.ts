import { describe, it, expect } from 'vitest';
import { parseAuthRedirect } from './authRedirect';

describe('parseAuthRedirect — deep link Supabase (R6.4)', () => {
  it('conferma email OK: token nel fragment → session', () => {
    const url = 'whostheboss://auth-callback#access_token=AAA&refresh_token=BBB&expires_in=3600&type=signup';
    expect(parseAuthRedirect(url)).toEqual({
      kind: 'session', access_token: 'AAA', refresh_token: 'BBB', type: 'signup',
    });
  });

  it('token nella query (?) se manca il fragment', () => {
    const r = parseAuthRedirect('whostheboss://x?access_token=AAA&refresh_token=BBB');
    expect(r.kind).toBe('session');
    if (r.kind === 'session') expect(r.access_token).toBe('AAA');
  });

  it('link scaduto: error nel fragment → error con descrizione decodificata', () => {
    const url = 'whostheboss://x#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    const r = parseAuthRedirect(url);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.code).toBe('otp_expired');
      expect(r.description).toBe('Email link is invalid or has expired');
    }
  });

  it('URL senza parametri auth → none', () => {
    expect(parseAuthRedirect('whostheboss://home')).toEqual({ kind: 'none' });
  });

  it('fragment presente ma senza token/errore → none', () => {
    expect(parseAuthRedirect('whostheboss://x#foo=bar')).toEqual({ kind: 'none' });
  });

  it('manca refresh_token → non è una session valida', () => {
    expect(parseAuthRedirect('whostheboss://x#access_token=AAA').kind).toBe('none');
  });

  it('il fragment ha priorità sulla query', () => {
    const r = parseAuthRedirect('whostheboss://x?access_token=Q&refresh_token=Q#access_token=H&refresh_token=H');
    if (r.kind === 'session') expect(r.access_token).toBe('H');
    else throw new Error('atteso session');
  });
});
