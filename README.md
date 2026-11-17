# Bolsillo

Finanzas personales para llevar al día tus pagos y tus ingresos: Kueski quincenal, tarjetas, streaming, tandas, colegiatura e inscripción. Es una **PWA** (se instala en el celular y funciona sin internet) y sincroniza con **Supabase**.

## Qué hace

- **Resumen** por quincena, mes o año, con gráfica de ingresos contra pagos, desglose por categoría y próximos pagos.
- **Calendario** mensual con los días de pago e ingreso marcados; toca un día para ver el detalle y marcar pagos.
- **Pagos**: tabla de deudas con progreso (por ejemplo `2/4`), lo que falta por pagar y la próxima fecha. Al agregar una nueva se acomoda sola en la tabla, el calendario y la gráfica.
- **Ingresos**: fijos (quincenal o mensual) y variables (extras o por cierto tiempo).
- **Frecuencias**: quincenal (15 y fin de mes, 1 y 16, 5 y 20, 10 y 25), cada 14 días, mensual, anual o una sola vez; con número de pagos (colegiatura a 4 meses) o fecha de fin.
- **Días hábiles**: si una fecha cae en sábado, domingo o festivo, se recorre al día hábil anterior (ver abajo).
- **Recordatorios en tu calendario**: en Ajustes descargas un `.ics` con tus próximos pagos (y opcionalmente ingresos) como eventos con aviso el mismo día, 1 o 3 días antes y a la hora que elijas. Se abre en Apple Calendar o Google Calendar; es una foto de hoy, así que se vuelve a descargar cuando cambies algo.
- **Tandas**: pagas cada quincena y registras tu turno de cobro como ingreso.
- **Local primero**: todo se guarda en el dispositivo; si inicias sesión, se sincroniza con tu cuenta.

## Días hábiles y festivos

Cada pago o ingreso tiene la opción *Si cae en sábado, domingo o festivo, recorrer al día hábil anterior*. Viene activada en lo quincenal y desactivada en lo demás (una tarjeta con fecha límite del 15 suele no moverse), y se puede cambiar en cada uno.

Ejemplo: la quincena del domingo 15 de noviembre de 2026 aparece el viernes 13. Si el día anterior también es inhábil (un lunes festivo después de un fin de semana), sigue hacia atrás hasta encontrar un día hábil. En el calendario y en las listas se muestra una nota con la fecha original.

Los días inhábiles siguen el calendario bancario de México y se calculan por año, sin necesidad de actualizarlos: Año Nuevo, primer lunes de febrero, tercer lunes de marzo, Jueves y Viernes Santo, 1 de mayo, 16 de septiembre, 1 de octubre cada seis años (cambio de Poder Ejecutivo: 2024, 2030…), 2 de noviembre, tercer lunes de noviembre, 12 de diciembre y 25 de diciembre. La lógica está en [`src/lib/holidays.js`](src/lib/holidays.js).

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

1. En **SQL Editor** ejecuta, en orden, los archivos de [`supabase/migrations/`](supabase/migrations):
   - `0001_init.sql`: tablas `debts`, `incomes` y `payment_marks` con RLS (cada usuario solo ve sus propias filas).
   - `0002_shift_business_days.sql`: columna `shift_biz` para el recorrido a día hábil.
2. En **Authentication → Providers → Email** deja activo el correo con contraseña. Si no quieres confirmar el correo, desactiva *Confirm email*.
3. Crea tu cuenta desde **Ajustes** en la app y después, en **Authentication → Sign In / Providers**, desactiva *Allow new users to sign up* para que nadie más pueda registrarse.
4. Usa solo la clave pública (`sb_publishable_…` o `anon`). **Nunca** pongas la `service_role` en el front.

### Cómo sincroniza

Cada deuda e ingreso lleva `updated_at` y `deleted_at` (borrado lógico). Al sincronizar se descarga lo remoto, se conserva la versión más reciente de cada fila y se sube lo local más nuevo. Los datos de ejemplo nunca se suben.

## Publicar en Vercel

1. **Add New → Project** e importa este repositorio. Vercel detecta Vite: `npm run build` y carpeta de salida `dist`.
2. En **Settings → Environment Variables** agrega, para Production y Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Cada push a `main` se despliega solo. Las variables `VITE_*` se leen al compilar, así que si las cambias hay que volver a desplegar.

No hacen falta reglas de reescritura: la app navega con `#/…`.

Abre la URL en el celular y elige **Instalar aplicación** (Android) o **Compartir → Agregar a pantalla de inicio** (iPhone).

## Estructura

```
src/
├─ lib/          fechas, días hábiles y festivos, generador de calendario de pagos, store local, sync con Supabase
├─ pages/        resumen, calendario, pagos, ingresos, ajustes
├─ components/   shell, formulario, gráfica y piezas reutilizables (ui/ = shadcn)
└─ hooks/        suscripción al store
supabase/migrations/   esquema SQL
```
