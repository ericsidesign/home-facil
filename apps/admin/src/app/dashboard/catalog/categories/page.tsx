import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const dynamic = 'force-dynamic'; // Prevent static generation for real-time DB data

export default async function CategoriesPage() {
  const { data: categories, error } = await supabaseAdmin
    .from('service_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
  }

  const columns = [
    { header: 'Nome', accessorKey: 'name' },
    { header: 'Slug', accessorKey: 'slug' },
    { 
      header: 'Status', 
      accessorKey: 'is_active',
      cell: (item: any) => (
        <span className={item.is_active ? styles.statusActive : styles.statusInactive}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </span>
      )
    },
    { header: 'Ordem', accessorKey: 'sort_order' },
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
          <h1 className={styles.title}>Categorias de Serviço</h1>
          <p className={styles.subtitle}>Gerencie as categorias principais dos serviços oferecidos.</p>
        </div>
        <Button>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Nova Categoria
        </Button>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
        <Table 
          data={categories || []} 
          columns={columns} 
          keyExtractor={(item) => item.id} 
        />
      </div>
    </div>
  );
}
