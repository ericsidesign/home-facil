import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Eye } from 'lucide-react';
import styles from '../professionals/page.module.css';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const { data: customers, error } = await supabaseAdmin
    .from('user_profiles')
    .select(`
      id,
      full_name,
      created_at,
      role
    `)
    .eq('role', 'CUSTOMER')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customers:', error);
  }

  const columns = [
    {
      header: 'Cliente',
      accessorKey: 'full_name',
      cell: (item: any) => (
        <div className={styles.nameCell}>
          <div className={styles.avatar}>
            {(item.full_name || 'C')[0].toUpperCase()}
          </div>
          <div>
            <div className={styles.name}>{item.full_name || '—'}</div>
            <div className={styles.phone}>Sem telefone (por enquanto)</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Cadastro',
      accessorKey: 'created_at',
      cell: (item: any) =>
        item.created_at
          ? new Date(item.created_at).toLocaleDateString('pt-BR')
          : '—',
    },
    {
      header: 'Ações',
      accessorKey: 'id',
      cell: (_item: any) => (
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" title="Ver detalhes">
            <Eye size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Clientes</h1>
          <p className={styles.subtitle}>
            Visualize e gerencie os clientes cadastrados na plataforma.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <Table
          data={customers || []}
          columns={columns}
          keyExtractor={(item: any) => item.id}
        />
      </div>
    </div>
  );
}
