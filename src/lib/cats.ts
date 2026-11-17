import { ArrowDownLeft, BookOpen, CircleDollarSign, CreditCard, GraduationCap, House, Tv, Users, Zap, type LucideIcon } from 'lucide-react';

export interface Cat {
  label: string;
  c: string; // color del texto/acento
  bg: string; // fondo suave
  icon: LucideIcon;
}

export const CATS: Record<string, Cat> = {
  kueski: { label: 'Kueski', c: '#e8590c', bg: '#fff0e4', icon: Zap },
  tarjeta: { label: 'Tarjeta de crédito', c: '#3b5bdb', bg: '#e8edff', icon: CreditCard },
  streaming: { label: 'Streaming', c: '#7048e8', bg: '#f1eaff', icon: Tv },
  tanda: { label: 'Tanda', c: '#2b8a3e', bg: '#e6f6ec', icon: Users },
  colegiatura: { label: 'Colegiatura', c: '#0b7285', bg: '#e0f4f8', icon: GraduationCap },
  inscripcion: { label: 'Inscripción', c: '#b45309', bg: '#fdf1d8', icon: BookOpen },
  servicio: { label: 'Servicios', c: '#c2255c', bg: '#fde8f0', icon: House },
  otro: { label: 'Otro', c: '#5f5d54', bg: '#efede5', icon: CircleDollarSign },
  ingreso: { label: 'Ingreso', c: '#2b8a3e', bg: '#e6f6ec', icon: ArrowDownLeft },
};

export const PAY_CATS = ['kueski', 'tarjeta', 'streaming', 'tanda', 'colegiatura', 'inscripcion', 'servicio', 'otro'];
