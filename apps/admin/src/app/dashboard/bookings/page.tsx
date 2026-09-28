import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Eye, CheckCircle2, XCircle } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending_confirmation: { label: 'Aguardando confirmação', cls: 'statusPending' },
  confirmed:            { label: 'Confirmado',              cls: 'statusApproved' },
  professional_en_route:{ label: 'A caminho',               cls: 'statusEnRoute'  },
  in_progress:          { label: 'Em andamento',            cls: 'statusInProgress'},
  completed:            { label: 'Concluído',               cls: 'statusCompleted' },
  cancelled_by_customer:{ label: 'Cancelado (cliente)',     cls: 'statusCancelled' },
  cancelled_by_professional:{ label: 'Cancelado (prof.)',   cls: 'statusCancelled' },
  cancelled_by_admin:   { label: 'Cancelado (admin)',       cls: 'statusCancelled' },
};

export default async function AdminBookingsPage() {
  const { data: bookings, error } = await supabaseAdmin
    .from('bookings')
    .select(`
      id,
      status,
      scheduled_date,
      scheduled_start_time,
      created_at,
      customer_profiles (
        user_profiles ( full_name )
      ),
      professional_profiles (
        user_profiles ( full_name )
      ),
      services ( name )
    `)
    .order('scheduled_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching bookings:', error);
  }

  const formatCurrency = (val: number | null) =>
    val != null
      ? `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '—';

  const columns = [
    {
      header: 'Cliente',
      accessorKey: 'customer_profiles',
      cell: (item: any) => item.customer_profiles?.user_profiles?.full_name || '—',
    },
    {
      header: 'Profissional',
      accessorKey: 'professional_profiles',
      cell: (item: any) => item.professional_profiles?.user_profiles?.full_name || 'Não alocado',
    },
    {
      header: 'Serviço',
      accessorKey: 'services',
      cell: (item: any) => item.services?.name || '—',
    },
    {
      header: 'Data',
      accessorKey: 'scheduled_date',
      cell: (item: any) =>
        item.scheduled_date
          ? `${new Date(item.scheduled_date).toLocaleDateString('pt-BR')} às ${item.scheduled_start_time}`
          : '—',
    },
    {
      header: 'Valor',
      accessorKey: 'price_quote_id',
      cell: () => 'R$ --,--',
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item: any) => {
        const s = STATUS_MAP[item.status] ?? { label: item.status, cls: 'statusPending' };
        return <span className={styles[s.cls]}>{s.label}</span>;
      },
    },
    {
      header: 'Ações',
      accessorKey: 'id',
      cell: (_item: any) => (
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" title="Ver detalhes">
            <Eye size={16} />
          </Button>
          <Button variant="ghost" size="sm" className={styles.approveBtn} title="Confirmar">
            <CheckCircle2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" className={styles.cancelBtn} title="Cancelar">
            <XCircle size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Agendamentos</h1>
          <p className={styles.subtitle}>
            Acompanhe e gerencie todos os agendamentos da plataforma.
          </p>
        </div>
      </div>

      <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
        <Table
          data={bookings || []}
          columns={columns}
          keyExtractor={(item: any) => item.id}
        />
      </div>
    </div>
  );
}
