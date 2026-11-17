# Bolsillo

Finanzas personales para llevar al día tus pagos y tus ingresos: Kueski quincenal, tarjetas, streaming, tandas, colegiatura e inscripción. Es una **PWA** (se instala en el celular y funciona sin internet) y sincroniza con **Supabase**.

## Qué hace

- **Resumen** por quincena, mes o año, con gráfica de ingresos contra pagos, desglose por categoría y próximos pagos.
- **Calendario** mensual con los días de pago e ingreso marcados; toca un día para ver el detalle y marcar pagos.
- **Saldo proyectado**: se calcula solo con tus ingresos y pagos registrados, sin capturar nada. Dibuja tu saldo día por día (1 a 6 meses), con un resumen por quincena, y te avisa si algún tramo queda en rojo (o por debajo del mínimo que elijas) antes de que llegue el siguiente ingreso: aviso en el Resumen y punto rojo en el menú. Ver abajo cómo se calcula.
- **Pagos**: tabla de deudas con progreso (por ejemplo `2/4`), lo que falta por pagar y la próxima fecha. Al agregar una nueva se acomoda sola en la tabla, el calendario y la gráfica.
- **Ingresos**: fijos (quincenal o mensual) y variables (extras o por cierto tiempo).
- **Frecuencias**: quincenal (15 y fin de mes, 1 y 16, 5 y 20, 10 y 25), cada 14 días, mensual, anual o una sola vez; con número de pagos (colegiatura a 4 meses) o fecha de fin.
- **Cargo automático**: marca un pago como "se cobra solo" (Netflix, Spotify, tarjetas domiciliadas) y la app lo da por pagado en cuanto pasa su fecha, sin que lo marques a mano. Se sugiere para streaming. Si un cargo falla, lo desmarcas y esa marca manual siempre gana. El mismo día del cargo sigue pendiente. En la tabla de Pagos aparece con la etiqueta *Auto*.
- **Días hábiles**: si una fecha cae en sábado, domingo o festivo, se recorre al día hábil anterior (ver abajo).
- **Recordatorios en tu calendario**: en Ajustes descargas un `.ics` con tus próximos pagos (y opcionalmente ingresos) como eventos con aviso el mismo día, 1 o 3 días antes y a la hora que elijas. Se abre en Apple Calendar o Google Calendar; es una foto de hoy, así que se vuelve a descargar cuando cambies algo.
- **Tandas**: pagas cada quincena y registras tu turno de cobro como ingreso.
- **Deshacer**: al borrar una deuda o un ingreso aparece un aviso con *Deshacer* durante 8 segundos; se restaura tal cual, con sus pagos marcados.
- **Modo oscuro**: claro, oscuro o automático (sigue al sistema), sin parpadeo al abrir.
- **Bloqueo con PIN o huella**: pide un PIN (4 a 6 dígitos) al abrir y al volver después del tiempo que elijas, y huella o Face ID si el dispositivo lo permite. Ver *Bloqueo* abajo.
- **Exportar a Excel (CSV)**: movimientos de un periodo, o tus deudas e ingresos con su progreso, listos para Excel con acentos y montos que suman.
- **Notificaciones push**: avisos en el celular antes de cada pago, aunque la app esté cerrada. Requiere una configuración en Supabase (ver abajo); las alertas de calendario (`.ics`) funcionan sin ella.
- **Local primero**: todo se guarda en el dispositivo; si inicias sesión, se sincroniza con tu cuenta.

## Días hábiles y festivos

Cada pago o ingreso tiene la opción *Si cae en sábado, domingo o festivo, recorrer al día hábil anterior*. Viene activada en lo quincenal y desactivada en lo demás (una tarjeta con fecha límite del 15 suele no moverse), y se puede cambiar en cada uno.

Ejemplo: la quincena del domingo 15 de noviembre de 2026 aparece el viernes 13. Si el día anterior también es inhábil (un lunes festivo después de un fin de semana), sigue hacia atrás hasta encontrar un día hábil. En el calendario y en las listas se muestra una nota con la fecha original.

Los días inhábiles siguen el calendario bancario de México y se calculan por año, sin necesidad de actualizarlos: Año Nuevo, primer lunes de febrero, tercer lunes de marzo, Jueves y Viernes Santo, 1 de mayo, 16 de septiembre, 1 de octubre cada seis años (cambio de Poder Ejecutivo: 2024, 2030…), 2 de noviembre, tercer lunes de noviembre, 12 de diciembre y 25 de diciembre. La lógica está en [`src/lib/holidays.js`](src/lib/holidays.js).

## Cómo se calcula el saldo proyectado

No hay que capturar un saldo: usa la misma información que el Resumen.

- **Arranque**: en cero al inicio de la quincena actual. Desde ahí suma cada ingreso y resta cada pago, día por día, con el recorrido a día hábil aplicado.
- **Cuadra con el Resumen**: el cambio de cada quincena en la tabla es exactamente su *Balance* del Resumen, y el saldo se acumula de una quincena a la siguiente.
- **Rojo** significa que hasta ese día tus pagos acumulados superan tus ingresos acumulados, o sea que habría que cubrir la diferencia con ahorros.
- **Aviso**: un tramo son los días seguidos por debajo de tu mínimo (por defecto, cero). Cada aviso dice cuándo empieza, cuál es el punto más bajo y con qué ingreso se recupera, o que no se recupera dentro del periodo.
- **Ajustes opcionales**: un *saldo inicial* que se suma al arrancar la quincena (si ya traes dinero) y un *mínimo de aviso* para tener colchón.
- **Pagos vencidos sin marcar** de quincenas anteriores no entran, porque la proyección empieza en la quincena actual. La página te avisa cuántos son para que los marques.
- Solo ve lo que tienes registrado: no incluye gastos del día a día (súper, gasolina…). Si los acostumbras, sube el mínimo de aviso.

La lógica está en [`src/lib/projection.ts`](src/lib/projection.ts).

## Bloqueo con PIN o huella

Es un **bloqueo de pantalla** para que nadie curiosee tu celular: **no cifra** los datos que la app guarda en el dispositivo, y alguien con acceso técnico al navegador podría leerlos igualmente.

- El PIN nunca se guarda: solo un hash PBKDF2-SHA256 con sal aleatoria. Tras 5 intentos fallidos hay una espera que crece (30 s, 1 min, 2 min… hasta 15 min).
- Cambiar o desactivar el bloqueo pide el PIN actual.
- La huella o Face ID usa el sensor del dispositivo (WebAuthn) y solo se ofrece si el navegador lo permite. Funciona en este dispositivo; no se sincroniza.
- Si olvidas el PIN no se puede recuperar: la pantalla de bloqueo ofrece *Olvidé mi PIN*, que borra los datos locales de ese dispositivo (siguen en la nube si usas tu cuenta).

## Stack

Vite · React · TypeScript · Tailwind CSS v4 · shadcn/ui (preset Nova) · lucide-react · Recharts · Supabase · vite-plugin-pwa.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y llena tus valores de Supabase
npm run dev
```

Otros comandos: `npm run typecheck`, `npm run build`, `npm run preview`, `npm run icons` (regenera los iconos PNG de la PWA) y `npm run vapid` (claves para las notificaciones push).

## Supabase

1. En **SQL Editor** ejecuta, en orden, los archivos de [`supabase/migrations/`](supabase/migrations):
   - `0001_init.sql`: tablas `debts`, `incomes` y `payment_marks` con RLS (cada usuario solo ve sus propias filas).
   - `0002_shift_business_days.sql`: columna `shift_biz` para el recorrido a día hábil.
   - `0003_account_balance.sql`: tabla `account_balance` con los ajustes opcionales del saldo proyectado: saldo inicial y mínimo de aviso (con RLS).
   - `0004_auto_pay.sql`: columna `auto_pay` para los cargos automáticos.
   - `0005_push.sql`: tablas `push_subscriptions` y `reminders` para las notificaciones push (con RLS). Solo hace falta si vas a usarlas.
2. En **Authentication → Providers → Email** deja activo el correo con contraseña. Si no quieres confirmar el correo, desactiva *Confirm email*.
3. Crea tu cuenta desde **Ajustes** en la app y después, en **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up* para que nadie más pueda registrarse.
4. Usa solo la clave pública (`sb_publishable_…` o `anon`). **Nunca** pongas la `service_role` en el front.

### Cómo sincroniza

Cada deuda e ingreso lleva `updated_at` y `deleted_at` (borrado lógico). Al sincronizar se descarga lo remoto, se conserva la versión más reciente de cada fila y se sube lo local más nuevo. Los datos de ejemplo nunca se suben.

## Notificaciones push (opcional)

Los avisos llegan aunque la app esté cerrada. La app calcula qué avisos tocan con tus pagos pendientes y los guarda en tu Supabase; una función programada envía los que ya vencieron. Los textos viajan cifrados hasta tu dispositivo (Web Push).

1. **Genera las claves**: `npm run vapid`. Imprime una clave pública y una privada (no las compartas ni las subas al repo) y un secreto para el cron.
2. **Vercel**: agrega `VITE_VAPID_PUBLIC_KEY` (la pública) y vuelve a desplegar.
3. **Supabase → SQL Editor**: ejecuta `supabase/migrations/0005_push.sql`.
4. **Supabase → función**: despliega `supabase/functions/send-reminders` (con la CLI: `supabase link --project-ref <ref>` y `supabase functions deploy send-reminders --no-verify-jwt`; o crea la función en el panel pegando `index.ts` y `logic.ts` y desactivando *Verify JWT*). Va **sin verificación de JWT** porque se protege con su propio secreto (`CRON_SECRET`) y las claves nuevas de Supabase (`sb_publishable_…`) no son JWT.
5. **Supabase → secretos** (Edge Functions → Secrets, o `supabase secrets set …`): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (por ejemplo `mailto:tu@correo.com`) y `CRON_SECRET`.
6. **Supabase → SQL Editor**: copia `supabase/cron-send-reminders.sql` a `supabase/cron-send-reminders.local.sql` (git lo ignora; ahí van tus valores reales), reemplaza `<PROJECT_REF>` y `<CRON_SECRET>`, y pega ese contenido en el editor y ejecútalo. Programa la función cada 5 minutos. **No pongas tu secreto en el archivo que se sube al repo.**
7. **En la app**: Ajustes → *Notificaciones de pago* → *Activar notificaciones* (hay que haber iniciado sesión). En iPhone funcionan solo con la app instalada en la pantalla de inicio (iOS 16.4 o más reciente).

Para probar sin esperar a un pago, en el SQL Editor (reemplaza el id con el de tu usuario, en *Authentication → Users*):

```sql
insert into public.reminders (user_id, key, fire_at, title, body)
values ('<TU-USER-ID>', 'prueba', now(), 'Prueba de Bolsillo', 'Si ves esto, las notificaciones funcionan');
```

Llega en un máximo de 5 minutos. Para revisar el cron: `select jobid, jobname, schedule, active from cron.job;` (que esté programado) y `select id, status_code, content, created from net._http_response order by created desc limit 5;` (la respuesta de la función: `200` es correcto, `401` es que el secreto no coincide). También puedes llamarla a mano: `curl -i -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders -H "x-cron-secret: <CRON_SECRET>"`.

Los avisos se actualizan solos cuando marcas un pago o cambias algo y la app sincroniza. Pueden llegar con algunos minutos de retraso.

## Publicar en Vercel

1. **Add New → Project** e importa este repositorio. Vercel detecta Vite: `npm run build` y carpeta de salida `dist`.
2. En **Settings → Environment Variables** agrega, para Production y Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_VAPID_PUBLIC_KEY` (solo si usas notificaciones push)
3. Cada push a `main` se despliega solo. Las variables `VITE_*` se leen al compilar, así que si las cambias hay que volver a desplegar.

No hacen falta reglas de reescritura: la app navega con `#/…`.

Abre la URL en el celular y elige **Instalar aplicación** (Android) o **Compartir → Agregar a pantalla de inicio** (iPhone).

## Estructura

```
src/
├─ lib/          fechas, días hábiles, calendario de pagos, proyección, store local, sync, bloqueo, CSV, .ics, push
├─ pages/        resumen, calendario, saldo, pagos, ingresos, ajustes (se cargan por partes)
├─ components/   shell, formulario, gráficas y piezas reutilizables (ui/ = shadcn)
├─ hooks/        suscripciones al store, tema y bloqueo
└─ sw.ts         service worker: caché sin internet + notificaciones push
supabase/
├─ migrations/             esquema SQL
├─ functions/send-reminders/   función que envía las notificaciones
└─ cron-send-reminders.sql     programa la función cada 5 minutos
```
