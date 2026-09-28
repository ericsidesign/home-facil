'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { getPayouts, updatePayoutStatus } from './actions';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
  }, []);

  async function fetchPayouts() {
    const data = await getPayouts();
    setPayouts(data);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await updatePayoutStatus(id, status);
    fetchPayouts();
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', color: '#0F172A' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: '800', marginBottom: '24px', letterSpacing: '-0.02em' }}>Pedidos de Saque</h1>
      
      {loading ? (
        <p>Carregando saques...</p>
      ) : payouts.length === 0 ? (
        <p>Nenhum pedido de saque recebido ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {payouts.map(p => (
            <div key={p.id} style={{ 
              backgroundColor: '#FFFFFF', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
            }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px', color: '#0F172A' }}>
                  {p.professional_profiles?.user_profiles?.full_name || 'Profissional'} solicitou saque
                </h3>
                <p style={{ color: '#475569', marginBottom: '4px' }}>Valor: <span style={{ color: '#059669', fontWeight: 'bold' }}>R$ {(p.amount_cents / 100).toFixed(2).replace('.', ',')}</span></p>
                <p style={{ color: '#64748B', marginBottom: '4px' }}>Chave PIX: {p.pix_key} ({p.pix_key_type})</p>
                <p style={{ color: '#94A3B8', fontSize: '12px' }}>Solicitado em: {new Date(p.requested_at).toLocaleString('pt-BR')}</p>
                
                <div style={{ marginTop: '12px' }}>
                  <span style={{ 
                    padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600',
                    backgroundColor: p.status === 'PENDING' ? '#FEF3C7' : p.status === 'COMPLETED' ? '#D1FAE5' : '#FEE2E2',
                    color: p.status === 'PENDING' ? '#D97706' : p.status === 'COMPLETED' ? '#059669' : '#DC2626'
                  }}>
                    {p.status === 'PENDING' ? 'PENDENTE' : p.status === 'COMPLETED' ? 'PAGO' : 'REJEITADO'}
                  </span>
                </div>
              </div>
              
              {p.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => updateStatus(p.id, 'COMPLETED')}
                    style={{ backgroundColor: '#22C55E', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <CheckCircle size={18} /> Já fiz o PIX
                  </button>
                  <button 
                    onClick={() => updateStatus(p.id, 'REJEITADO')}
                    style={{ backgroundColor: '#EF4444', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                    <XCircle size={18} /> Rejeitar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
