// Edge Function: envía las notificaciones push de pago que ya vencieron.
// La llama pg_cron cada pocos minutos (ver supabase/cron-send-reminders.sql).
// Se despliega SIN verificación de JWT (supabase functions deploy send-reminders --no-verify-jwt):
// se protege con el secreto CRON_SECRET, y las claves sb_publishable_… de Supabase no son JWT.
//
// Secretos necesarios (supabase secrets set …):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo.com), CRON_SECRET
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase solos.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { processDue, type Reminder, type Store, type Sub } from './logic.ts';

const need = (name: string) => {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Falta el secreto ${name}`);
  return v;
};

Deno.serve(async (req) => {
  // Sin verificación de JWT, el único control de acceso es el secreto compartido con el cron
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('unauthorized', { status: 401 });

  try {
    webpush.setVapidDetails(need('VAPID_SUBJECT'), need('VAPID_PUBLIC_KEY'), need('VAPID_PRIVATE_KEY'));
    const db = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

    const store: Store = {
      async claimDue(nowIso, limit) {
        const { data: ids, error } = await db.from('reminders').select('id').is('sent_at', null).lte('fire_at', nowIso).order('fire_at').limit(limit);
        if (error) throw error;
        if (!ids?.length) return [];
        const { data, error: e2 } = await db
          .from('reminders')
          .update({ sent_at: nowIso })
          .in('id', ids.map((r) => r.id))
          .is('sent_at', null) // si otra ejecución ya los tomó, no se repiten
          .select('id,user_id,key,fire_at,title,body,url');
        if (e2) throw e2;
        return (data ?? []) as Reminder[];
      },
      async subsFor(userIds) {
        const { data, error } = await db.from('push_subscriptions').select('user_id,endpoint,p256dh,auth').in('user_id', userIds);
        if (error) throw error;
        return (data ?? []) as Sub[];
      },
      async release(ids) {
        const { error } = await db.from('reminders').update({ sent_at: null }).in('id', ids);
        if (error) throw error;
      },
      async deleteSub(endpoint) {
        await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
      },
      async purgeSent(beforeIso) {
        await db.from('reminders').delete().lt('sent_at', beforeIso);
      },
    };

    const stats = await processDue(store, (sub, payload) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, { TTL: 6 * 3600, urgency: 'normal' }),
    );
    return Response.json(stats);
  } catch (e) {
    console.error('send-reminders falló', e);
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
