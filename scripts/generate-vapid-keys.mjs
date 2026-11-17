// Genera las claves VAPID (identifican a tu servidor ante los servicios de push) y un secreto para el cron.
// Uso: npm run vapid
//
// La clave PÚBLICA va en el front (VITE_VAPID_PUBLIC_KEY). La PRIVADA y el secreto del cron van solo en
// los secretos de Supabase: no las pegues en el código, en el repo ni en el chat.
import { generateKeyPairSync, randomBytes } from 'node:crypto';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' }); // x, y
const prv = privateKey.export({ format: 'jwk' }); // d

const b64u = (buf) => Buffer.from(buf).toString('base64url');
// Clave pública en formato "punto sin comprimir": 0x04 || x || y (65 bytes)
const publicB64 = b64u(Buffer.concat([Buffer.from([0x04]), Buffer.from(pub.x, 'base64url'), Buffer.from(pub.y, 'base64url')]));
const privateB64 = prv.d; // 32 bytes en base64url
const cron = randomBytes(24).toString('base64url');

if (process.argv.includes('--check')) {
  // Solo para pruebas: muestra longitudes, nunca las claves
  console.log(JSON.stringify({ publicBytes: Buffer.from(publicB64, 'base64url').length, privateBytes: Buffer.from(privateB64, 'base64url').length }));
  process.exit(0);
}

console.log(`
Claves generadas. Guárdalas ahora: la privada no se vuelve a mostrar.

── En Vercel (Settings → Environment Variables) y en tu .env.local ──────────────
VITE_VAPID_PUBLIC_KEY=${publicB64}

── En Supabase (Edge Functions → Secrets), o con: supabase secrets set NOMBRE=valor ──
VAPID_PUBLIC_KEY=${publicB64}
VAPID_PRIVATE_KEY=${privateB64}
VAPID_SUBJECT=mailto:TU-CORREO@ejemplo.com
CRON_SECRET=${cron}

El mismo CRON_SECRET va en supabase/cron-send-reminders.sql.
Después de cambiar VITE_VAPID_PUBLIC_KEY hay que volver a desplegar el front.
`);
