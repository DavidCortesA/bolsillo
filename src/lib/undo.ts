import { toast } from 'sonner';
import { deleteItem, restoreItem } from '@/lib/store';

/**
 * Borra una deuda o un ingreso sin pedir confirmación y deja un aviso con "Deshacer".
 * El borrado es lógico (deleted_at), así que restaurar devuelve todo tal cual, incluidas
 * las marcas de pagado.
 */
export function removeWithUndo(table: 'debts' | 'incomes', item: { id: string; name: string }) {
  deleteItem(table, item.id);
  toast(`“${item.name}” eliminado`, {
    duration: 8000,
    action: {
      label: 'Deshacer',
      onClick: () => {
        if (restoreItem(table, item.id)) toast.success('Restaurado');
      },
    },
  });
}
