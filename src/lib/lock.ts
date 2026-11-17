// Bloqueo de pantalla con PIN (y huella / Face ID opcional).
//
// OJO: es un bloqueo de pantalla para que nadie curiosee tu celular. No cifra los datos que la app
// guarda en el dispositivo; quien tenga acceso técnico al navegador podría leerlos igualmente.
//
// El PIN nunca se guarda: solo un hash PBKDF2-SHA256 con sal aleatoria.

const KEY = 'bolsillo.lock';
const FAIL_KEY = 'bolsillo.lock.fail';
const ITER = 150_000;

interface LockCfg {
  v: 1;
  salt: string;
  hash: string;
  iter: number;
  len: number;
  after: number; // minutos en segundo plano antes de volver a bloquear (0 = siempre que se sale de la app)
  bio?: string; // id de la credencial WebAuthn (huella / Face ID)
}

// ---- Utilidades -------------------------------------------------------------
const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf: ArrayBuffer | Uint8Array) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s: string) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

const read = (): LockCfg | null => {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    return c && c.v === 1 && c.salt && c.hash && c.iter ? c : null;
  } catch {
    return null;
  }
};
const write = (c: LockCfg | null) => {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify(c));
    else localStorage.removeItem(KEY);
  } catch {}
};

async function derive(pin: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter } as Pbkdf2Params, key, 256);
  return new Uint8Array(bits);
}

/** Comparación en tiempo constante. */
function same(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export const validPin = (pin: string) => /^\d{4,6}$/.test(pin);

// ---- Configuración ------------------------------------------------------------
export const isLockEnabled = () => read() !== null;
export const getPinLength = () => read()?.len ?? 4;
export const getAfter = () => read()?.after ?? 1;
export const hasBio = () => !!read()?.bio;

export function setAfter(minutes: number) {
  const c = read();
  if (c) write({ ...c, after: minutes });
}

export async function enableLock(pin: string, after = 1) {
  if (!validPin(pin)) throw new Error('El PIN debe tener de 4 a 6 dígitos.');
  const salt = rand(16);
  write({ v: 1, salt: b64(salt), hash: b64(await derive(pin, salt, ITER)), iter: ITER, len: pin.length, after });
  resetFails();
}

// ---- Intentos fallidos: espera creciente --------------------------------------
interface Fails { n: number; until: number }
const readFails = (): Fails => {
  try {
    return JSON.parse(localStorage.getItem(FAIL_KEY) || '') as Fails;
  } catch {
    return { n: 0, until: 0 };
  }
};
const resetFails = () => {
  try {
    localStorage.removeItem(FAIL_KEY);
  } catch {}
};
function recordFail(now = Date.now()) {
  const f = readFails();
  const n = (f.n || 0) + 1;
  // 5 fallos libres; después 30 s, 1 min, 2 min… hasta 15 min
  const wait = n >= 5 ? Math.min(15 * 60_000, 30_000 * 2 ** (n - 5)) : 0;
  try {
    localStorage.setItem(FAIL_KEY, JSON.stringify({ n, until: wait ? now + wait : 0 }));
  } catch {}
}
export const failedAttempts = () => readFails().n || 0;
/** Milisegundos que faltan para poder volver a intentar (0 = ya se puede). */
export function lockoutRemaining(now = Date.now()) {
  return Math.max(0, (readFails().until || 0) - now);
}

// ---- Verificación ----------------------------------------------------------------
export type PinResult = 'ok' | 'bad' | 'wait';

export async function verifyPin(pin: string): Promise<PinResult> {
  const c = read();
  if (!c) return 'ok';
  if (lockoutRemaining() > 0) return 'wait';
  const ok = validPin(pin) && same(await derive(pin, unb64(c.salt), c.iter), unb64(c.hash));
  if (ok) {
    resetFails();
    return 'ok';
  }
  recordFail();
  return lockoutRemaining() > 0 ? 'wait' : 'bad';
}

export async function changePin(oldPin: string, newPin: string): Promise<PinResult> {
  const r = await verifyPin(oldPin);
  if (r !== 'ok') return r;
  const c = read()!;
  await enableLock(newPin, c.after);
  if (c.bio) write({ ...read()!, bio: c.bio });
  return 'ok';
}

export async function disableLock(pin: string): Promise<PinResult> {
  const r = await verifyPin(pin);
  if (r === 'ok') {
    write(null);
    resetFails();
    setLocked(false);
  }
  return r;
}

/** Salida de emergencia ("olvidé mi PIN"): quita el bloqueo, y el llamador debe borrar los datos locales. */
export function wipeLockConfig() {
  write(null);
  resetFails();
}

// ---- Huella / Face ID (WebAuthn, solo en este dispositivo) -----------------------
export async function bioSupported(): Promise<boolean> {
  try {
    return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch {
    return false;
  }
}

export async function registerBio(): Promise<boolean> {
  const c = read();
  if (!c) return false;
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: rand(32),
        rp: { name: 'Bolsillo' },
        user: { id: rand(16), name: 'bolsillo', displayName: 'Bolsillo' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        timeout: 60_000,
        attestation: 'none',
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    write({ ...c, bio: b64url(cred.rawId) });
    return true;
  } catch {
    return false;
  }
}

export function removeBio() {
  const c = read();
  if (c) {
    const { bio, ...rest } = c;
    write(rest as LockCfg);
  }
}

export async function verifyBio(): Promise<boolean> {
  const c = read();
  if (!c?.bio) return false;
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: rand(32),
        allowCredentials: [{ type: 'public-key', id: unb64url(c.bio) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!got;
  } catch {
    return false;
  }
}

// ---- Estado bloqueado / desbloqueado (para la interfaz) ------------------------------
let locked = false;
let hiddenAt: number | null = null;
let version = 0;
const subs = new Set<() => void>();

export const subscribeLock = (fn: () => void) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
export const getLockVersion = () => version;
export const isLocked = () => locked;

function setLocked(v: boolean) {
  if (locked === v) return;
  locked = v;
  version++;
  subs.forEach((f) => f());
}
export const lockNow = () => isLockEnabled() && setLocked(true);
export const unlock = () => setLocked(false);

/** Bloquea al abrir y cuando la app pasó el tiempo elegido en segundo plano. */
export function initLock() {
  locked = isLockEnabled();
  version++;
  document.addEventListener('visibilitychange', () => {
    const c = read();
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (c && hiddenAt !== null) {
      if (Date.now() - hiddenAt >= c.after * 60_000) setLocked(true);
      hiddenAt = null;
    }
  });
}
