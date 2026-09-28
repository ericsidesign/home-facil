import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import styles from '../categories/page.module.css'; // Reusing styles from categories
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const { data: services, error } = await supabaseAdmin
    .from('services')
    .select('*, service_categories(name)')
    .order('category_id', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching services:', error);
  }

  const columns = [
    { header: 'Nome', accessorKey: 'name' },
    { 
      header: 'Categoria', 
      accessorKey: 'category_id',
      cell: (item: any) => item.service_categories?.name || '-'
    },
    { 
      header: 'Duração Base', 
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
          <h1 className={styles.title}>Serviços</h1>
          <p className={styles.subtitle}>Gerencie os serviços oferecidos na plataforma e suas regras.</p>
        </div>
        <Button>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Novo Serviço
        </Button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
        <Table 
          data={services || []} 
          columns={columns} 
          keyExtractor={(item) => item.id} 
        />
      </div>
    </div>
  );
}
