'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Minus, Plus, Check, Calendar, Clock, RotateCcw, Star, Shield, MapPin, Sparkles, Droplets, Package, Home as HomeIcon, LayoutGrid, Info } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type ServiceType = 'padrao' | 'pesada' | 'pre_mudanca' | 'pos_mudanca' | 'organizacao';
type FrequencyType = 'once' | 'weekly' | 'biweekly' | 'monthly';

interface Rooms {
  quartos: number;
  banheiros: number;
  salas: number;
  cozinhas: number;
}

interface Addons {
  geladeira: boolean;
  forno: boolean;
  janelas: boolean;
  armarios: boolean;
  passadoria: boolean;
}

interface Professional {
  id: number;
  initial: string;
  name: string;
  rating: string;
  reviews: number;
  services: string;
  color: string;
  distance: string;
}

// ─── Mocks & Constants ────────────────────────────────────────────────────────

const PROFESSIONALS: Professional[] = [
  { id: 1, initial: 'C', name: 'Camila S.', rating: '4.9', reviews: 127, services: 'Padrão, Pesada', color: '#0EA5E9', distance: 'A 2.5 km' },
  { id: 2, initial: 'A', name: 'Ana R.',    rating: '4.8', reviews: 89,  services: 'Pesada, Org.', color: '#8B5CF6', distance: 'A 3.1 km' },
  { id: 3, initial: 'J', name: 'Juliana M.',rating: '5.0', reviews: 201, services: 'Padrão', color: '#10B981', distance: 'A 4.0 km' },
  { id: 4, initial: 'M', name: 'Márcia T.', rating: '4.7', reviews: 56,  services: 'Pós-mudança', color: '#F59E0B', distance: 'A 5.2 km' },
];

const SERVICE_BASE: Record<ServiceType, { label: string; description: string; basePrice: number; icon: any }> = {
  padrao:       { label: 'Limpeza Padrão',  description: 'Limpeza completa de rotina', basePrice: 150, icon: Sparkles },
  pesada:       { label: 'Faxina Pesada',   description: 'Limpeza profunda e detalhada', basePrice: 250, icon: Droplets },
  pre_mudanca:  { label: 'Pré-Mudança',     description: 'Preparação do imóvel vazio', basePrice: 200, icon: Package },
  pos_mudanca:  { label: 'Pós-Mudança',     description: 'Limpeza para entrega do imóvel', basePrice: 200, icon: HomeIcon },
  organizacao:  { label: 'Organização',     description: 'Organização de armários e closets', basePrice: 180, icon: LayoutGrid },
};

const ROOM_PRICE = { quartos: 30, banheiros: 25, salas: 20, cozinhas: 20 };
const ADDON_PRICE: Record<keyof Addons, number> = {
  geladeira: 30,
  forno: 25,
  janelas: 25,
  armarios: 35,
  passadoria: 35,
};

const FREQUENCY_DISCOUNT: Record<FrequencyType, { label: string; discountDesc: string; discountMultiplier: number }> = {
  once:     { label: 'Só dessa vez', discountDesc: 'Preço normal', discountMultiplier: 1 },
  weekly:   { label: 'Semanalmente', discountDesc: '10% de desconto', discountMultiplier: 0.9 },
  biweekly: { label: 'Quinzenalmente', discountDesc: '5% de desconto', discountMultiplier: 0.95 },
  monthly:  { label: 'Mensalmente', discountDesc: 'Preço normal', discountMultiplier: 1 },
};

function calcTotal(service: ServiceType, rooms: Rooms, addons: Addons, freq: FrequencyType): number {
  const base = SERVICE_BASE[service].basePrice;
  const roomCost = Object.entries(rooms).reduce(
    (sum, [key, qty]) => {
      // O pacote base inclui 1 de cada cômodo. Só cobramos a partir do 2º.
      const extraQty = Math.max(0, qty - 1);
      return sum + ROOM_PRICE[key as keyof Rooms] * extraQty;
    },
    0,
  );
  const addonCost = Object.entries(addons).reduce(
    (sum, [key, active]) => sum + (active ? ADDON_PRICE[key as keyof Addons] : 0),
    0,
  );
  const subtotal = base + roomCost + addonCost;
  return subtotal * FREQUENCY_DISCOUNT[freq].discountMultiplier;
}

const AVAILABLE_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ─── Stepper component ─────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  min = 0,
  max = 10,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={styles.stepperRow}>
      <span className={styles.stepperLabel}>{label}</span>
      <div className={styles.stepperControls}>
        <button
          className={styles.stepperBtn}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Diminuir ${label}`}
        >
          <Minus size={16} />
        </button>
        <span className={styles.stepperValue}>{value}</span>
        <button
          className={styles.stepperBtn}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const [step, setStep] = useState(1);
  const [proId, setProId] = useState<string | null>(null);
  const [proName, setProName] = useState<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('proId');
    if (id) {
      setProId(id);
      const fetchPro = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from('professional_profiles')
          .select('user_profiles(full_name)')
          .eq('id', id)
          .single();
        if (data && data.user_profiles) {
          setProName(data.user_profiles.full_name);
        }
      };
      fetchPro();
    }
  }, []);
  const [service, setService]     = useState<ServiceType>('padrao');
  const [rooms, setRooms]         = useState<Rooms>({ quartos: 1, banheiros: 1, salas: 1, cozinhas: 1 });
  const [addons, setAddons]       = useState<Addons>({ geladeira: false, forno: false, janelas: false, armarios: false, passadoria: false });
  const [frequency, setFrequency] = useState<FrequencyType>('once');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const days = nextDays(7);
  const total = calcTotal(service, rooms, addons, frequency);
  const TOTAL_STEPS = 4;

  const canProceed = () => {
    if (step === 4 && (selectedDay === null || selectedTime === null)) return false;
    return true;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      const supabase = createClient();
      
      const scheduledAt = new Date(selectedDay!);
      const [hours, minutes] = selectedTime!.split(':');
      scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { data: category } = await supabase
        .from('service_categories')
        .select('id')
        .eq('name', SERVICE_BASE[service].label)
        .single();

      // Buscar o endereço atual e o perfil de cliente
      const { data: { user } } = await supabase.auth.getUser();
      let customerAddress = null;
      let realCustomerId = '00000000-0000-0000-0000-000000000000'; // mock fallback
      
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
        if (profile) {
          const { data: custProfile } = await supabase.from('customer_profiles').select('id').eq('user_profile_id', profile.id).single();
          if (custProfile) realCustomerId = custProfile.id;
          
          const { data: addr } = await supabase.from('addresses').select('*').eq('user_profile_id', profile.id).is('deleted_at', null).order('is_primary', { ascending: false }).limit(1).single();
          customerAddress = addr;
        }
      }

      const { error } = await supabase.from('bookings').insert({
        customer_id: realCustomerId,
        professional_profile_id: proId || null,
        service_category_id: category?.id || null,
        status: proId ? 'AWAITING_PROFESSIONAL' : 'PENDING',
        scheduled_at: scheduledAt.toISOString(),
        total_amount: total,
        address_snapshot: customerAddress ? { street: `${customerAddress.street}, ${customerAddress.number}${customerAddress.complement ? ` - ${customerAddress.complement}` : ''} - ${customerAddress.neighborhood}` } : { street: "Endereço não informado" },
        frequency: frequency
      });

      if (error) {
        console.warn('Supabase Insert failed:', error.message);
        alert('Erro ao salvar no banco: ' + error.message);
        setIsSubmitting(false);
        return;
      }
      
      setIsSubmitting(false);
      setConfirmed(true);
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className={styles.container}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>
            <Check size={40} color="white" />
          </div>
          <h1 className={styles.successTitle}>Pedido Enviado!</h1>
          
          <div className={styles.successProCard} style={{ justifyContent: 'center', textAlign: 'center' }}>
            <p className={styles.successProName} style={{ margin: 0 }}>
              {proName ? `O pedido foi enviado para ${proName.split(' ')[0]}!` : 'Buscando profissionais na sua região...'}
            </p>
          </div>

          <p className={styles.successSub}>
            {proName ? `Ela tem até 1 hora para confirmar o seu agendamento. Avisaremos assim que ela aceitar!` : `Acabamos de notificar as melhores profissionais perto de você. Assim que uma aceitar, você será avisada!`}
          </p>
          
          <Link href="/bookings" className="btn-primary" style={{ display: 'block', textDecoration: 'none' }}>
            Acompanhar Pedido
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        {step > 1 ? (
          <button className={styles.backBtn} onClick={() => setStep(step - 1)} aria-label="Voltar">
            <ChevronLeft size={28} />
          </button>
        ) : (
          <Link href="/" className={styles.backBtn} aria-label="Voltar ao início">
            <ChevronLeft size={28} />
          </Link>
        )}
        <h1 className={styles.pageTitle}>
          {proName ? `Agendando com ${proName.split(' ')[0]}` : (
            <>
              {step === 1 && 'Tipo de serviço'}
              {step === 2 && 'Detalhes'}
              {step === 3 && 'Frequência'}
              {step === 4 && 'Data e horário'}
            </>
          )}
        </h1>
        <div style={{ width: 28 }} />
      </header>

      {/* Progress dots */}
      <div className={styles.progressDots}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
          <div key={s} className={`${styles.dot} ${step >= s ? styles.dotActive : ''}`} />
        ))}
      </div>

      {/* ── Step 1: Service Type ── */}
      {step === 1 && (
        <section className={styles.stepContent}>
          <p className={styles.stepHint}>Escolha o tipo de limpeza que você precisa.</p>
          <div className={styles.serviceCards}>
            {(Object.entries(SERVICE_BASE) as [ServiceType, typeof SERVICE_BASE[ServiceType]][]).map(
              ([key, val]) => (
                <button
                  key={key}
                  className={`card ${styles.serviceCard} ${service === key ? styles.serviceCardActive : ''}`}
                  onClick={() => {
                    setService(key as ServiceType);
                    setTimeout(() => setStep(2), 250);
                  }}
                  aria-pressed={service === key}
                >
                  <div className={styles.serviceCardInner}>
                    <div className={styles.serviceIconWrapper}>
                      <val.icon size={24} />
                    </div>
                    <div className={styles.serviceContent}>
                      <div className={styles.serviceLabel}>{val.label}</div>
                      <div className={styles.serviceDesc}>{val.description}</div>
                    </div>
                    <div className={styles.servicePrice}>
                      A partir de<br />
                      <strong>R$ {val.basePrice}</strong>
                    </div>
                    {service === key && (
                      <div className={styles.serviceCheck}>
                        <Check size={14} color="white" />
                      </div>
                    )}
                  </div>
                </button>
              ),
            )}
          </div>
        </section>
      )}

      {/* ── Step 2: Rooms & Addons ── */}
      {step === 2 && (
        <section className={styles.stepContent}>
          <div className="card">
            <h2 className={styles.cardSectionTitle}>Cômodos</h2>
            <Stepper label="Quartos"   value={rooms.quartos}   onChange={(v) => setRooms({ ...rooms, quartos: v })}   min={0} />
            <Stepper label="Banheiros" value={rooms.banheiros} onChange={(v) => setRooms({ ...rooms, banheiros: v })} min={0} />
            <Stepper label="Salas"     value={rooms.salas}     onChange={(v) => setRooms({ ...rooms, salas: v })}     min={0} />
            <Stepper label="Cozinhas"  value={rooms.cozinhas}  onChange={(v) => setRooms({ ...rooms, cozinhas: v })}  min={0} />
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 className={styles.cardSectionTitle}>Adicionais</h2>
            {(
              [
                { key: 'passadoria',label: 'Passadoria de Roupas',  price: 35 },
                { key: 'geladeira', label: 'Limpeza de geladeira',  price: 30 },
                { key: 'forno',     label: 'Limpeza de forno',      price: 25 },
                { key: 'janelas',   label: 'Limpeza de janelas',    price: 25 },
                { key: 'armarios',  label: 'Limpeza de armários',   price: 35 },
              ] as { key: keyof Addons; label: string; price: number }[]
            ).map(({ key, label, price }) => (
              <button
                key={key}
                className={`${styles.addonRow} ${addons[key] ? styles.addonActive : ''}`}
                onClick={() => setAddons({ ...addons, [key]: !addons[key] })}
                aria-pressed={addons[key]}
              >
                <span className={styles.addonLabel}>{label}</span>
                <div className={styles.addonRight}>
                  <span className={styles.addonPrice}>+R$ {price}</span>
                  <div className={`${styles.addonCheck} ${addons[key] ? styles.addonCheckActive : ''}`}>
                    {addons[key] && <Check size={12} color="white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Step 3: Frequency ── */}
      {step === 3 && (
        <section className={styles.stepContent}>
          <p className={styles.stepHint}>
            Agendamentos recorrentes têm desconto!
          </p>
          <div className={styles.serviceCards}>
            {(Object.entries(FREQUENCY_DISCOUNT) as [FrequencyType, typeof FREQUENCY_DISCOUNT[FrequencyType]][]).map(
              ([key, val]) => (
                <button
                  key={key}
                  className={`card ${styles.freqCard} ${frequency === key ? styles.freqCardActive : ''}`}
                  onClick={() => {
                    setFrequency(key);
                    setTimeout(() => setStep(4), 250);
                  }}
                  aria-pressed={frequency === key}
                >
                  <div className={styles.freqCardInner}>
                    <div className={styles.freqInfo}>
                      <div className={styles.freqLabel}>
                        <RotateCcw size={16} className={styles.freqIcon} />
                        {val.label}
                      </div>
                      {val.discountMultiplier < 1 && (
                        <div className={styles.freqDiscountBadge}>{val.discountDesc}</div>
                      )}
                      {val.discountMultiplier === 1 && (
                        <div className={styles.freqDesc}>{val.discountDesc}</div>
                      )}
                    </div>
                    {frequency === key && (
                      <div className={styles.serviceCheck}>
                        <Check size={14} color="white" />
                      </div>
                    )}
                  </div>
                </button>
              ),
            )}
          </div>
        </section>
      )}

      {/* ── Step 4: Date & Time ── */}
      {step === 4 && (
        <section className={styles.stepContent}>
          <div className="card">
            <h2 className={styles.cardSectionTitle}>
              <Calendar size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Escolha o dia
            </h2>
            <div className={styles.dayScroll}>
              {days.map((d) => {
                const isActive = selectedDay?.toDateString() === d.toDateString();
                return (
                  <button
                    key={d.toDateString()}
                    className={`${styles.dayBtn} ${isActive ? styles.dayBtnActive : ''}`}
                    onClick={() => setSelectedDay(d)}
                  >
                    <span className={styles.dayName}>
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </span>
                    <span className={styles.dayNum}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
            <h2 className={styles.cardSectionTitle}>
              <Clock size={18} style={{ marginRight: '0.5rem', display: 'inline' }} />
              Escolha o horário
            </h2>
            <div className={styles.timeGrid}>
              {AVAILABLE_TIMES.map((t) => (
                <button
                  key={t}
                  className={`${styles.timeBtn} ${selectedTime === t ? styles.timeBtnActive : ''}`}
                  onClick={() => setSelectedTime(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom Bar ── */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomBarInner}>
          <div className={styles.priceDisplay}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className={styles.priceLabel}>Total estimado</span>
              <button 
                className={styles.detailsBtn} 
                onClick={() => setShowBreakdown(true)}
                aria-label="Ver detalhes do valor"
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <Info size={16} />
              </button>
            </div>
            <span className={styles.priceValue}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              {frequency !== 'once' && <span className={styles.pricePeriod}>/limpeza</span>}
            </span>
          </div>

          {step < TOTAL_STEPS ? (
            <button 
              className="btn-primary" 
              style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }} 
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Continuar <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: '0.875rem 1.25rem' }}
              onClick={handleConfirm}
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? '...' : 'Confirmar'}
            </button>
          )}
        </div>
      </div>

      {/* ── Breakdown Modal ── */}
      {showBreakdown && (
        <div className={styles.modalOverlay} onClick={() => setShowBreakdown(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Detalhes do valor</h3>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.breakdownRow}>
                <span>{SERVICE_BASE[service].label} <br/><small style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}>(Incluso: 1 quarto, 1 banheiro, 1 sala, 1 cozinha)</small></span>
                <span>R$ {SERVICE_BASE[service].basePrice.toFixed(2)}</span>
              </div>
              
              {/* Extra Rooms */}
              {rooms.quartos > 1 && (
                <div className={styles.breakdownRow}>
                  <span>+ {rooms.quartos - 1} Quarto(s) extra</span>
                  <span>R$ {((rooms.quartos - 1) * ROOM_PRICE.quartos).toFixed(2)}</span>
                </div>
              )}
              {rooms.banheiros > 1 && (
                <div className={styles.breakdownRow}>
                  <span>+ {rooms.banheiros - 1} Banheiro(s) extra</span>
                  <span>R$ {((rooms.banheiros - 1) * ROOM_PRICE.banheiros).toFixed(2)}</span>
                </div>
              )}
              {rooms.salas > 1 && (
                <div className={styles.breakdownRow}>
                  <span>+ {rooms.salas - 1} Sala(s) extra</span>
                  <span>R$ {((rooms.salas - 1) * ROOM_PRICE.salas).toFixed(2)}</span>
                </div>
              )}
              {rooms.cozinhas > 1 && (
                <div className={styles.breakdownRow}>
                  <span>+ {rooms.cozinhas - 1} Cozinha(s) extra</span>
                  <span>R$ {((rooms.cozinhas - 1) * ROOM_PRICE.cozinhas).toFixed(2)}</span>
                </div>
              )}

              {/* Addons */}
              {addons.geladeira && (
                <div className={styles.breakdownRow}>
                  <span>+ Interior da Geladeira</span>
                  <span>R$ {ADDON_PRICE.geladeira.toFixed(2)}</span>
                </div>
              )}
              {addons.forno && (
                <div className={styles.breakdownRow}>
                  <span>+ Interior do Forno</span>
                  <span>R$ {ADDON_PRICE.forno.toFixed(2)}</span>
                </div>
              )}
              {addons.janelas && (
                <div className={styles.breakdownRow}>
                  <span>+ Limpeza de Janelas</span>
                  <span>R$ {ADDON_PRICE.janelas.toFixed(2)}</span>
                </div>
              )}
              {addons.armarios && (
                <div className={styles.breakdownRow}>
                  <span>+ Interior de Armários</span>
                  <span>R$ {ADDON_PRICE.armarios.toFixed(2)}</span>
                </div>
              )}
              {addons.passadoria && (
                <div className={styles.breakdownRow}>
                  <span>+ Passadoria</span>
                  <span>R$ {ADDON_PRICE.passadoria.toFixed(2)}</span>
                </div>
              )}

              {/* Discount */}
              {frequency !== 'once' && (
                <div className={`${styles.breakdownRow} ${styles.breakdownDiscount}`}>
                  <span>Desconto ({FREQUENCY_DISCOUNT[frequency].label})</span>
                  <span>- {((1 - FREQUENCY_DISCOUNT[frequency].discountMultiplier) * 100).toFixed(0)}%</span>
                </div>
              )}
              
              <div className={styles.breakdownTotal}>
                <span>Total Estimado</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalCloseBtn} onClick={() => setShowBreakdown(false)}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
