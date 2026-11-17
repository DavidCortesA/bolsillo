import { ArrowDownLeft, BookOpen, CircleDollarSign, CreditCard, GraduationCap, House, Tv, Users, Zap, type LucideIcon } from 'lucide-react';
import { isDark } from '@/lib/theme';

export interface Cat {
  label: string;
  c: string; // color del texto/acento (modo claro)
  bg: string; // fondo suave (modo claro)
  cd: string; // color del texto/acento (modo oscuro)
  bgd: string; // fondo suave (modo oscuro)
  icon: LucideIcon;
}

export const CATS: Record<string, Cat> = {
  kueski: { label: 'Kueski', c: '#e8590c', bg: '#fff0e4', cd: '#ff9a5c', bgd: 'rgba(255,154,92,.16)', icon: Zap },
  tarjeta: { label: 'Tarjeta de crédito', c: '#3b5bdb', bg: '#e8edff', cd: '#8fa4ff', bgd: 'rgba(143,164,255,.16)', icon: CreditCard },
  streaming: { label: 'Streaming', c: '#7048e8', bg: '#f1eaff', cd: '#b79bff', bgd: 'rgba(183,155,255,.16)', icon: Tv },
  tanda: { label: 'Tanda', c: '#2b8a3e', bg: '#e6f6ec', cd: '#6fd08a', bgd: 'rgba(111,208,138,.16)', icon: Users },
  colegiatura: { label: 'Colegiatura', c: '#0b7285', bg: '#e0f4f8', cd: '#5cc7dd', bgd: 'rgba(92,199,221,.16)', icon: GraduationCap },
  inscripcion: { label: 'Inscripción', c: '#b45309', bg: '#fdf1d8', cd: '#f0b455', bgd: 'rgba(240,180,85,.16)', icon: BookOpen },
  servicio: { label: 'Servicios', c: '#c2255c', bg: '#fde8f0', cd: '#f58bb0', bgd: 'rgba(245,139,176,.16)', icon: House },
  otro: { label: 'Otro', c: '#5f5d54', bg: '#efede5', cd: '#b9b6a8', bgd: 'rgba(185,182,168,.16)', icon: CircleDollarSign },
  ingreso: { label: 'Ingreso', c: '#2b8a3e', bg: '#e6f6ec', cd: '#6fd08a', bgd: 'rgba(111,208,138,.16)', icon: ArrowDownLeft },
};

export const PAY_CATS = ['kueski', 'tarjeta', 'streaming', 'tanda', 'colegiatura', 'inscripcion', 'servicio', 'otro'];

/** Colores de una categoría según el tema activo. */
export function catPalette(key: string): { c: string; bg: string } {
  const cat = CATS[key] || CATS.otro;
  return isDark() ? { c: cat.cd, bg: cat.bgd } : { c: cat.c, bg: cat.bg };
}
