'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ShieldCheck, FileText, CheckCircle2, UploadCloud, Clock, AlertCircle } from 'lucide-react';
import styles from '../subpage.module.css';
import { createClient } from '@/lib/supabase/client';

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState('DRAFT');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); // Some depois de 4 segundos
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Pega o ID do profissional e o status geral
      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
      if (!userProfile) return;

      const { data: proProfile } = await supabase.from('professional_profiles')
        .select('id, verification_status')
        .eq('user_profile_id', userProfile.id).single();
        
      if (proProfile) {
        setProfileId(proProfile.id);
        setVerificationStatus(proProfile.verification_status);

        // 2. Busca os documentos enviados
        const { data: docs } = await supabase
          .from('professional_documents')
          .select('*')
          .eq('professional_profile_id', proProfile.id)
          .order('created_at', { ascending: false });
          
        if (docs) setDocuments(docs);
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;

    try {
      setUploading(true);
      const supabase = createClient();
      
      // 1. Upload para o Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}/${docType}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('professional_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Registrar no Banco de Dados
      const { error: dbError } = await supabase.from('professional_documents').insert({
        professional_profile_id: profileId,
        document_type: docType,
        storage_path: fileName,
        file_name: file.name,
        mime_type: file.type,
        status: 'PENDING'
      });

      if (dbError) throw dbError;
      
      // 3. Muda o status geral do perfil para PENDENTE de verificação para voltar pra fila
      if (verificationStatus !== 'PENDING_VERIFICATION') {
        await supabase.from('professional_profiles')
          .update({ verification_status: 'PENDING_VERIFICATION' })
          .eq('id', profileId);
      }

      showToast('Documento enviado com sucesso! Em breve faremos a análise.', 'success');
      fetchDocuments(); // Recarrega a lista
    } catch (error: any) {
      showToast('Erro ao enviar documento: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const getDocStatus = (docType: string) => {
    const doc = documents.find(d => d.document_type === docType);
    return doc ? doc : null;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href="/profile" className={styles.backBtn}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className={styles.title}>Documentos e Verificação</h1>
        </div>
        <p className={styles.subtitle}>Mantenha seus documentos em dia para receber serviços.</p>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.875rem',
          fontWeight: 600,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className={styles.content}>
        
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</p>
        ) : (
          <>
            {/* Status Geral */}
            {verificationStatus === 'BLOCKED' ? (
              <div className={styles.card} style={{ borderLeft: '4px solid var(--error)' }}>
                <div className={styles.cardHeader}>
                  <AlertCircle size={20} color="var(--error)" /> Conta Desativada
                </div>
                <p className={styles.cardText} style={{ color: 'var(--text-secondary)' }}>
                  Infelizmente, após análise rigorosa da nossa equipe de segurança, seu perfil foi bloqueado permanentemente e não foi aprovado para atuar na plataforma por não atender às nossas diretrizes internas.
                </p>
              </div>
            ) : verificationStatus === 'REJECTED' ? (
              <div className={styles.card} style={{ borderLeft: '4px solid var(--error)' }}>
                <div className={styles.cardHeader}>
                  <AlertCircle size={20} color="var(--error)" /> Problemas na Verificação
                </div>
                <p className={styles.cardText} style={{ color: 'var(--text-secondary)' }}>
                  Alguns dos seus documentos não foram aprovados (foto ilegível ou incorreta). Por favor, veja abaixo os documentos recusados e envie uma nova foto mais nítida.
                </p>
              </div>
            ) : (
              <div className={styles.card} style={{ borderLeft: verificationStatus === 'APPROVED' ? '4px solid var(--success)' : '4px solid var(--warning)' }}>
                <div className={styles.cardHeader}>
                  {verificationStatus === 'APPROVED' ? (
                    <><CheckCircle2 size={20} color="var(--success)" /> Perfil 100% Verificado</>
                  ) : (
                    <><Clock size={20} color="var(--warning)" /> Verificação Pendente</>
                  )}
                </div>
                <p className={styles.cardText}>
                  {verificationStatus === 'APPROVED' 
                    ? 'Parabéns! Todos os seus documentos foram analisados e aprovados pela nossa equipe.'
                    : 'Envie seus documentos abaixo. Nossa equipe fará a análise em até 48 horas úteis para liberar seu perfil.'}
                </p>
              </div>
            )}

            {/* RG/CNH */}
            <DocumentCard 
              title="Documento de Identidade (RG/CNH)" 
              docType="RG" 
              doc={getDocStatus('RG')} 
              onUpload={handleUpload} 
              uploading={uploading} 
              isProfileRejected={verificationStatus === 'BLOCKED'}
            />

            {/* Comprovante de Residência */}
            <DocumentCard 
              title="Comprovante de Residência" 
              docType="PROOF_OF_ADDRESS" 
              doc={getDocStatus('PROOF_OF_ADDRESS')} 
              onUpload={handleUpload} 
              uploading={uploading} 
              isProfileRejected={verificationStatus === 'BLOCKED'}
            />
          </>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para os cards de documento
function DocumentCard({ title, docType, doc, onUpload, uploading, isProfileRejected }: { title: string, docType: string, doc: any, onUpload: any, uploading: boolean, isProfileRejected?: boolean }) {
  return (
    <div className={styles.card} style={{ border: doc?.status === 'REJECTED' ? '1px solid var(--error)' : 'none', opacity: isProfileRejected ? 0.6 : 1, pointerEvents: isProfileRejected ? 'none' : 'auto' }}>
      <div className={styles.cardHeader}>
        <FileText size={20} color="var(--brand-500)" /> {title}
      </div>
      
      {doc ? (
        <>
          <p className={styles.cardText}>
            Enviado em {new Date(doc.created_at).toLocaleDateString()}.<br />
            Status: <strong>
              {doc.status === 'APPROVED' && <span style={{color: 'var(--success)'}}>Aprovado</span>}
              {doc.status === 'PENDING' && <span style={{color: 'var(--warning)'}}>Em Análise</span>}
              {doc.status === 'REJECTED' && <span style={{color: 'var(--error)'}}>Rejeitado ({doc.review_notes})</span>}
            </strong>
          </p>
          {(doc.status === 'REJECTED' || doc.status === 'EXPIRED') && (
            <UploadButton docType={docType} onUpload={onUpload} uploading={uploading} />
          )}
        </>
      ) : (
        <>
          <p className={styles.cardText}>Nenhum documento enviado ainda.</p>
          <UploadButton docType={docType} onUpload={onUpload} uploading={uploading} />
        </>
      )}
    </div>
  );
}

function UploadButton({ docType, onUpload, uploading }: { docType: string, onUpload: any, uploading: boolean }) {
  return (
    <label style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
      <input 
        type="file" 
        accept="image/*,.pdf" 
        style={{ display: 'none' }} 
        onChange={(e) => onUpload(e, docType)}
        disabled={uploading}
      />
      <div className={styles.button} style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', boxShadow: 'none' }}>
        <UploadCloud size={18} /> {uploading ? 'Enviando...' : 'Enviar Documento'}
      </div>
    </label>
  );
}
