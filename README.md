# Bolsillo

Finanzas personales para llevar al día tus pagos y tus ingresos: Kueski quincenal, tarjetas, streaming, tandas, colegiatura e inscripción. Es una **PWA** (se instala en el celular y funciona sin internet) y sincroniza con **Supabase**.

## Qué hace

- **Resumen** por quincena, mes o año, con gráfica de ingresos contra pagos, desglose por categoría y próximos pagos.
- **Calendario** mensual con los días de pago e ingreso marcados; toca un día para ver el detalle y marcar pagos.
- **Pagos**: tabla de deudas con progreso (por ejemplo `2/4`), lo que falta por pagar y la próxima fecha. Al agregar una nueva se acomoda sola en la tabla, el calendario y la gráfica.
- **Ingresos**: fijos (quincenal o mensual) y variables (extras o por cierto tiempo).
- **Frecuencias**: quincenal (15 y fin de mes, 1 y 16, 5 y 20, 10 y 25), cada 14 días, mensual, anual o una sola vez; con número de pagos (colegiatura a 4 meses) o fecha de fin.
- **Tandas**: pagas cada quincena y registras tu turno de cobro como ingreso.
- **Local primero**: todo se guarda en el dispositivo; si inicias sesión, se sincroniza con tu cuenta.

## Stack

Vite · React · TypeScript · Tailwind CSS v4 · shadcn/ui (preset Nova) · lucide-react · Recharts · Supabase · vite-plugin-pwa.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y llena tus valores de Supabase
npm run dev
```

Otros comandos: `npm run typecheck`, `npm run build`, `npm run preview`, `npm run icons` (regenera los iconos PNG de la PWA).

## Supabase

1. En **SQL Editor** pega y ejecuta [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Crea las tablas `debts`, `incomes` y `payment_marks` con RLS: cada usuario solo ve sus propias filas.
2. En **Authentication → Providers → Email** deja activo el correo con contraseña. Si no quieres confirmar el correo, desactiva *Confirm email*.
3. Crea tu cuenta desde **Ajustes** en la app y después, en **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up* para que nadie más pueda registrarse.
4. Usa solo la clave pública (`sb_publishable_…` o `anon`). **Nunca** pongas la `service_role` en el front.

### Cómo sincroniza

Cada deuda e ingreso lleva `updated_at` y `deleted_at` (borrado lógico). Al sincronizar se descarga lo remoto, se conserva la versión más reciente de cada fila y se sube lo local más nuevo. Los datos de ejemplo nunca se suben.

## Publicar en GitHub Pages

1. **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml` y publica en `https://<usuario>.github.io/bolsillo/`.

Abre esa URL en el celular y elige **Instalar aplicación** (Android) o **Compartir → Agregar a pantalla de inicio** (iPhone).

## Estructura

```
src/
├─ lib/          fechas, generador de calendario de pagos, store local, sync con Supabase
├─ pages/        resumen, calendario, pagos, ingresos, ajustes
├─ components/   shell, formulario, gráfica y piezas reutilizables (ui/ = shadcn)
└─ hooks/        suscripción al store
supabase/migrations/   esquema SQL
```
