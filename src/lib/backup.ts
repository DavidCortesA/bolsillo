import { S, replaceAll } from '@/lib/store';
import { todayS } from '@/lib/dates';

export function exportBackup() {
  const data = {
    app: 'bolsillo',
    version: 1,
    exported: new Date().toISOString(),
    debts: S.debts,
    incomes: S.incomes,
    marks: S.marks,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `bolsillo-respaldo-${todayS()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const valid = (x: any) => x && typeof x.id === 'string' && typeof x.name === 'string' && x.freq && x.start_date && Number.isFinite(+x.amount);

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data.debts) || !Array.isArray(data.incomes)) throw new Error('El archivo no parece un respaldo de Bolsillo.');
  replaceAll({
    debts: data.debts.filter(valid),
    incomes: data.incomes.filter(valid),
    marks: data.marks && typeof data.marks === 'object' ? data.marks : {},
    sample: false,
  });
}
