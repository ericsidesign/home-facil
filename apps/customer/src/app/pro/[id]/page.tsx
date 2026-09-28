'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Star, Shield, Award, MapPin, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import styles from './pro.module.css';
import { createClient } from '@/lib/supabase/client';

const PRO_DATA: Record<string, { initial: string; name: string; rating: string; reviews: number; color: string; bio: string; services: string[]; region: string; since: string }> = {
  '1': { initial: 'C', name: 'Camila Santos', rating: '4.9', reviews: 127, color: '#0EA5E9', bio: 'Amo o que faço! Cuido da sua casa como se fosse a minha. Experiência de 5 anos em limpeza residencial.', services: ['Limpeza Padrão', 'Faxina Pesada', 'Pós-Mudança'], region: 'Zona Sul', since: 'Março 2024' },
  '2': { initial: 'A', name: 'Ana Rodrigues', rating: '4.8', reviews: 89, color: '#8B5CF6', bio: 'Dedicada e pontual. Minha missão é transformar seu lar num lugar de paz e conforto.', services: ['Faxina Pesada', 'Organização'], region: 'Zona Norte', since: 'Maio 2024' },
  '3': { initial: 'J', name: 'Juliana Mendes', rating: '5.0', reviews: 201, color: '#10B981', bio: 'Profissional certificada com mais de 200 atendimentos 5 estrelas. Perfeccionista nos detalhes!', services: ['Limpeza Padrão', 'Pré-Mudança', 'Organização'], region: 'Centro', since: 'Janeiro 2024' },
};

const MOCK_REVIEWS = [
  { name: 'Maria L.', rating: 5, text: 'Excelente! Muito cuidadosa e detalhista. Minha casa ficou impecável.', service: 'Faxina Pesada', time: 'há 3 dias' },
  { name: 'João P.', rating: 5, text: 'Pontual e eficiente. Recomendo muito!', service: 'Limpeza Padrão', time: 'há 1 semana' },
];

export default function ProProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [pro, setPro] = useState(PRO_DATA['1']);
  const [reviews, setReviews] = useState<any[]>(MOCK_REVIEWS);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [proErrorState, setProErrorState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProData = async () => {
      const supabase = createClient();
      
      // Busca dados reais da profissional
      const { data: proData, error: proError } = await supabase
        .from('professional_profiles')
        .select(`
          rating_average,
          rating_count,
          bio,
          experience_description,
          portfolio_urls,
          created_at,
          user_profiles ( full_name, avatar_url ),
          service_areas ( city, state ),
          professional_services ( services ( name, service_categories ( name ) ) )
        `)
        .eq('id', id)
        .single();
        
      console.log('Pro Fetch Error:', proError);
      console.log('Pro Fetch Data:', proData);
      
      if (proError) {
        setProErrorState(proError);
      }
        
      if (!proError && proData) {
        const name = proData.user_profiles?.full_name || 'Profissional';
        
        let dynamicServices = ['Limpeza Padrão']; // fallback
        if (proData.professional_services && proData.professional_services.length > 0) {
          const names = proData.professional_services
            .map((ps: any) => ps.services?.name)
            .filter(Boolean);
          if (names.length > 0) dynamicServices = Array.from(new Set(names));
        }
        
        let dynamicRegion = 'Sua Região';
        if (proData.service_areas && proData.service_areas.length > 0) {
          const area = proData.service_areas[0];
          dynamicRegion = `${area.city} - ${area.state}`;
        }

        setPro({
          initial: name.charAt(0).toUpperCase(),
          name: name,
          rating: (proData.rating_average || 5.0).toFixed(1),
          reviews: proData.rating_count || 0,
          color: '#2BA89A',
          bio: proData.bio || 'Profissional parceira da HomeFácil. Sempre pronta para deixar sua casa impecável.',
          services: dynamicServices,
          region: dynamicRegion,
          since: proData.created_at ? new Date(proData.created_at).getFullYear().toString() : '2024',
          avatarUrl: proData.user_profiles?.avatar_url || null,
          experience: proData.experience_description || '',
          portfolioUrls: proData.portfolio_urls || []
        });
      }

      // Busca avaliações reais
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          overall_rating,
          comment,
          created_at,
          customer_profiles (
            user_profiles (
              full_name
            )
          ),
          bookings (
            service_categories (
              name
            )
          )
        `)
        .eq('professional_profile_id', id)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (!error && data && data.length > 0) {
        const mappedReviews = data.map(r => ({
          name: r.customer_profiles?.user_profiles?.full_name || 'Cliente',
          rating: r.overall_rating,
          text: r.comment || '',
          service: r.bookings?.service_categories?.name || 'Serviço',
          time: new Date(r.created_at).toLocaleDateString()
        }));
        setReviews([...mappedReviews]);
      }
      setIsLoading(false);
    };
    
    fetchProData();
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--brand-600)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn}><ChevronLeft size={24} /></Link>
        <span className={styles.headerTitle}>Profissional</span>
        <div style={{ width: 24 }} />
      </header>

      {/* Profile Hero */}
      <div className={styles.profileHero}>
        {pro.avatarUrl ? (
          <div className={styles.avatar} style={{ backgroundImage: `url(${pro.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent' }} />
        ) : (
          <div className={styles.avatar} style={{ backgroundColor: pro.color }}>{pro.initial}</div>
        )}
        <h1 className={styles.proName}>{pro.name}</h1>
        <div className={styles.ratingRow}>
          <Star size={16} fill="#F59E0B" color="#F59E0B" />
          <span className={styles.ratingValue}>{pro.rating}</span>
          <span className={styles.ratingCount}>({pro.reviews} avaliações)</span>
        </div>
        <div className={styles.badges}>
          <span className={styles.badgeVerified}><Shield size={12} /> Verificada</span>
          {parseFloat(pro.rating) >= 4.9 && <span className={styles.badgeTop}><Award size={12} /> Top Pro</span>}
        </div>
      </div>

      {/* Bio */}
      <section className={styles.section}>
        <p className={styles.bio}>&quot;{pro.bio}&quot;</p>
      </section>

      {/* Info */}
      <section className={styles.section} style={{ marginTop: 0 }}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div style={{ padding: '8px', background: 'var(--brand-50)', borderRadius: '50%', color: 'var(--brand-600)' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <span className={styles.infoLabel}>Serviços oferecidos</span>
              <div className={styles.infoValue}>{pro.services.join(', ')}</div>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '50%', color: 'var(--text-secondary)' }}>
              <MapPin size={16} />
            </div>
            <div>
              <span className={styles.infoLabel}>Região de atendimento</span>
              <div className={styles.infoValue}>{pro.region}</div>
            </div>
          </div>
          <div className={styles.infoItem}>
            <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '50%', color: 'var(--text-secondary)' }}>
              <Calendar size={16} />
            </div>
            <div>
              <span className={styles.infoLabel}>Membro desde</span>
              <div className={styles.infoValue}>{pro.since}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Experiência */}
      {pro.experience && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Experiência</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {pro.experience}
          </p>
        </section>
      )}

      {/* Portfólio / Galeria */}
      {pro.portfolioUrls && pro.portfolioUrls.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Trabalhos Recentes</h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
            {pro.portfolioUrls.map((url: string, i: number) => (
              <div key={i} style={{ minWidth: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={url} alt={`Trabalho ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Avaliações recentes</h2>
        <div className={styles.reviewsList}>
          {reviews.slice(0, showAllReviews ? reviews.length : 3).map((r, i) => (
            <div key={i} className={styles.reviewCard}>
              <div className={styles.reviewHeader}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-50)', color: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                  {r.name.charAt(0)}
                </div>
                <div>
                  <span className={styles.reviewAuthor}>{r.name}</span>
                  <div className={styles.reviewStars}>
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} size={12} fill="#F59E0B" color="#F59E0B" />
                    ))}
                  </div>
                </div>
              </div>
              <p className={styles.reviewText}>&quot;{r.text}&quot;</p>
              <p className={styles.reviewMeta}>{r.service} &middot; {r.time}</p>
            </div>
          ))}
        </div>
        
        {reviews.length > 3 && (
          <button 
            onClick={() => setShowAllReviews(!showAllReviews)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginTop: '12px', 
              background: 'transparent', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px',
              color: 'var(--brand-600)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {showAllReviews ? 'Mostrar menos' : `Ver todas as ${reviews.length} avaliações`}
          </button>
        )}
      </section>

      {/* CTA */}
      <div className={styles.ctaBar}>
        <Link href={`/bookings/new?proId=${id}`} className="btn-primary" style={{ textDecoration: 'none' }}>
          Agendar com {pro.name.split(' ')[0]}
        </Link>
      </div>
    </div>
  );
}
