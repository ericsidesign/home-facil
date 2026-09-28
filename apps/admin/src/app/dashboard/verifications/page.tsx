import React from 'react';
import styles from './page.module.css';
import { supabaseAdmin } from '@/lib/supabase';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { revalidatePath } from 'next/cache';

// Server Action para aprovar/rejeitar
async function handleAction(formData: FormData) {
  'use server';
  
  const docId = formData.get('docId') as string;
  const profileId = formData.get('profileId') as string;
  const actionType = formData.get('actionType') as 'APPROVE' | 'RESEND' | 'BLOCK';

  if (!docId || !profileId || !actionType) return;

  if (actionType === 'APPROVE') {
    // Aprova o documento e o perfil
    await supabaseAdmin.from('professional_documents').update({ status: 'APPROVED' }).eq('id', docId);
    await supabaseAdmin.from('professional_profiles').update({ verification_status: 'APPROVED' }).eq('id', profileId);
  } else if (actionType === 'RESEND') {
    // Rejeita apenas o documento para a pessoa tentar de novo
    await supabaseAdmin.from('professional_documents').update({ status: 'REJECTED', review_notes: 'Foto ilegível' }).eq('id', docId);
    await supabaseAdmin.from('professional_profiles').update({ verification_status: 'REJECTED' }).eq('id', profileId);
  } else if (actionType === 'BLOCK') {
    // Bloqueia a pessoa permanentemente (Antecedentes)
    await supabaseAdmin.from('professional_profiles').update({ verification_status: 'BLOCKED' }).eq('id', profileId);
    // Também rejeita os documentos pendentes para eles sumirem da Fila de Verificação
    await supabaseAdmin.from('professional_documents').update({ status: 'REJECTED', review_notes: 'Bloqueado por Antecedentes' }).eq('professional_profile_id', profileId);
  }

  // Recarrega a página
  revalidatePath('/dashboard/verifications');
}

export default async function VerificationsPage() {
  // Busca todos os documentos PENDENTES (bypass RLS usando supabaseAdmin)
  const { data, error } = await supabaseAdmin
    .from('professional_documents')
    .select(`
      id,
      document_type,
      storage_path,
      created_at,
      professional_profile_id,
      professional_profiles (
        verification_status,
        user_profiles (
          full_name
        )
      )
    `)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar documentos:', error.message, error.details, error.hint);
    return (
      <div className={styles.container}>
        <h2>Erro Supabase</h2>
        <pre>{JSON.stringify(error, null, 2)}</pre>
        <p>{error.message}</p>
      </div>
    );
  }

  // Gera URL assinada para cada imagem
  const docsWithUrls = await Promise.all((data || []).map(async (doc: any) => {
    const { data: urlData } = await supabaseAdmin.storage
      .from('professional_documents')
      .createSignedUrl(doc.storage_path, 3600); // 1 hora de acesso
      
    return {
      ...doc,
      imageUrl: urlData?.signedUrl || null,
      proName: doc.professional_profiles?.user_profiles?.full_name || 'Desconhecido',
    };
  }));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Fila de Verificação de Documentos</h1>
      </header>

      {docsWithUrls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7190', background: 'white', borderRadius: '12px' }}>
          <CheckCircle size={48} color="#10B981" style={{ marginBottom: '16px', display: 'inline-block' }} />
          <h2>Tudo limpo por aqui!</h2>
          <p>Não há nenhum documento aguardando análise no momento.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {docsWithUrls.map((doc) => (
            <div key={doc.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.proName}>{doc.proName}</h3>
                  <p className={styles.docType}>
                    <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} /> 
                    {doc.document_type === 'PROOF_OF_ADDRESS' ? 'Comprovante de Residência' : 'Documento (RG/CNH)'}
                  </p>
                </div>
                <span className={styles.badge}>Pendente</span>
              </div>

              <div className={styles.imagePreview}>
                {doc.imageUrl ? (
                  <a href={doc.imageUrl} target="_blank" rel="noreferrer" style={{ width: '100%', height: '100%' }}>
                    <img src={doc.imageUrl} alt="Documento" className={styles.img} />
                  </a>
                ) : (
                  <span style={{ color: '#9CA0B8' }}>Erro ao carregar imagem</span>
                )}
              </div>

              <div className={styles.actions} style={{ flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <form action={handleAction} style={{ flex: 1 }}>
                    <input type="hidden" name="docId" value={doc.id} />
                    <input type="hidden" name="profileId" value={doc.professional_profile_id} />
                    <input type="hidden" name="actionType" value="RESEND" />
                    <button type="submit" className={styles.btnReject} style={{ width: '100%', padding: '12px' }} title="Foto ruim, ilegível, etc.">
                      <XCircle size={18} style={{ display: 'block', margin: '0 auto 4px' }} /> 
                      Pedir Reenvio
                    </button>
                  </form>
                  
                  <form action={handleAction} style={{ flex: 1 }}>
                    <input type="hidden" name="docId" value={doc.id} />
                    <input type="hidden" name="profileId" value={doc.professional_profile_id} />
                    <input type="hidden" name="actionType" value="APPROVE" />
                    <button type="submit" className={styles.btnApprove} style={{ width: '100%', padding: '12px' }}>
                      <CheckCircle size={18} style={{ display: 'block', margin: '0 auto 4px' }} /> 
                      Aprovar
                    </button>
                  </form>
                </div>

                <form action={handleAction} style={{ width: '100%' }}>
                  <input type="hidden" name="docId" value={doc.id} />
                  <input type="hidden" name="profileId" value={doc.professional_profile_id} />
                  <input type="hidden" name="actionType" value="BLOCK" />
                  <button type="submit" style={{ width: '100%', background: 'transparent', border: '1px solid #EF4444', color: '#EF4444', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}>
                    Bloquear Definitivo (Antecedentes)
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
