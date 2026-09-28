import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import styles from '../categories/page.module.css'; // Reusing styles
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AddonsPage() {
  const { data: addons, error } = await supabaseAdmin
    .from('service_addons')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching addons:', error);
  }

  const columns = [
    { header: 'Nome', accessorKey: 'name' },
    { header: 'Descrição', accessorKey: 'description' },
    { 
      header: 'Duração Extra', 
      accessorKey: 'estimated_duration_minutes',
      cell: (item: any) => `${item.estimated_duration_minutes} min`
    },
    { 
      header: 'Status', 
      accessorKey: 'is_active',
      cell: (item: any) => (
        <span className={item.is_active ? styles.statusActive : styles.statusInactive}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    {
      header: 'Ações',
      accessorKey: 'id',
      cell: (item: any) => (
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" title="Editar"><Edit2 size={16} /></Button>
          <Button variant="ghost" size="sm" className={styles.deleteBtn} title="Excluir"><Trash2 size={16} /></Button>
        </div>
      )
    }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Adicionais de Serviço</h1>
          <p className={styles.subtitle}>Gerencie os itens opcionais que podem ser adicionados aos serviços.</p>
        </div>
        <Button>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Novo Adicional
        </Button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
        <Table 
          data={addons || []} 
          columns={columns} 
          keyExtractor={(item) => item.id} 
        />
      </div>
    </div>
  );
}
