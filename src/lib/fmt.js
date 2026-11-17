const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const MXN0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export const money = (n) => MXN.format(n || 0);
export const money0 = (n) => MXN0.format(n || 0);

/** Eje de la gráfica: 1.5k, 12k, 1.2M */
export function moneyK(v) {
  const t = (x) => String(+x.toFixed(2));
  if (v >= 1e6) return t(v / 1e6) + 'M';
  if (v >= 1e3) return t(v / 1e3) + 'k';
  return String(Math.round(v));
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const uid = () =>
  globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 3) | 8).toString(16);
      });
