import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Plus, CheckCircle2, Clock, XCircle, UserCheck } from 'lucide-react';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export default async function ProfessionalsPage() {
  const { data: professionals, error } = await supabaseAdmin
    .from('professional_profiles')
    .select(`
      id,
      verification_status,
      bio,
      rating_average,
      completed_bookings_count,
      created_at,
      user_profiles (
        full_name,
        avatar_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching professionals:', error);
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return { label: 'Aprovado', cls: styles.statusApproved };
      case 'PENDING_VERIFICATION': 
      case 'UNDER_REVIEW': return { label: 'Pendente', cls: styles.statusPending };
      case 'SUSPENDED': return { label: 'Suspenso', cls: styles.statusSuspended };
      case 'REJECTED': 
      case 'BLOCKED': return { label: 'Rejeitado', cls: styles.statusRejected };
      case 'DRAFT': return { label: 'Rascunho', cls: styles.statusPending };
      default: return { label: status, cls: styles.statusPending };
    }
  };

  const columns = [
    {
      header: 'Nome',
      accessorKey: 'user_profiles',
      cell: (item: any) => (
        <div className={styles.nameCell}>
          <div className={styles.avatar}>
            {(item.user_profiles?.full_name || 'P')[0].toUpperCase()}
          </div>
          <div>
            <div className={styles.name}>{item.user_profiles?.full_name || '—'}</div>
            <div className={styles.phone}>Sem telefone</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Avaliação',
      accessorKey: 'rating_average',
      cell: (item: any) =>
        item.rating_average
          ? `⭐ ${Number(item.rating_average).toFixed(1)}`
          : '—',
    },
    {
      header: 'Serviços',
      accessorKey: 'completed_bookings_count',
      cell: (item: any) => item.completed_bookings_count ?? 0,
    },
    {
      header: 'Status',
      accessorKey: 'verification_status',
      cell: (item: any) => {
        const { label, cls } = statusLabel(item.verification_status);
        return <span className={cls}>{label}</span>;
      },
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
      cell: (item: any) => (
        <div className={styles.actions}>
          {(item.verification_status === 'PENDING_VERIFICATION' || item.verification_status === 'UNDER_REVIEW') && (
            <Button variant="ghost" size="sm" className={styles.approveBtn} title="Aprovar">
              <UserCheck size={16} />
            </Button>
          )}
          <Button variant="ghost" size="sm" title="Ver detalhes">
            <CheckCircle2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  const total = professionals?.length ?? 0;
  const approved = professionals?.filter((p) => p.status === 'approved').length ?? 0;
  const pending = professionals?.filter((p) => p.status === 'pending_review').length ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Profissionais</h1>
          <p className={styles.subtitle}>
            Gerencie os profissionais cadastrados e aprovações pendentes.
          </p>
        </div>
        <Button>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Adicionar Profissional
        </Button>
      </div>

      {/* Estatísticas rápidas */}
      <div className={styles.statsRow}>
        <div className={styles.statChip}>
          <CheckCircle2 size={16} className={styles.iconGreen} />
          <span>{approved} aprovados</span>
        </div>
        <div className={styles.statChip}>
          <Clock size={16} className={styles.iconYellow} />
          <span>{pending} pendentes</span>
        </div>
        <div className={styles.statChip}>
          <XCircle size={16} className={styles.iconMuted} />
          <span>{total} total</span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius)' }}>
        <Table
          data={professionals || []}
          columns={columns}
          keyExtractor={(item: any) => item.id}
        />
      </div>
    </div>
  );
}
