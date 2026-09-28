'use client';

import React, { useState } from 'react';
import styles from './page.module.css';
import { Save, Percent, Clock, DollarSign, Globe, Bell } from 'lucide-react';

interface SettingField {
  id: string;
  label: string;
  description: string;
  type: 'number' | 'text' | 'toggle';
  defaultValue: string | boolean;
  prefix?: string;
  suffix?: string;
}

interface SettingSection {
  title: string;
  icon: React.ElementType;
  fields: SettingField[];
}

const sections: SettingSection[] = [
  {
    title: 'Taxas e Preços',
    icon: Percent,
    fields: [
      {
        id: 'platform_fee_pct',
        label: 'Taxa da Plataforma (%)',
        description: 'Percentual cobrado sobre cada serviço concluído.',
        type: 'number',
        defaultValue: '15',
        suffix: '%',
      },
      {
        id: 'min_booking_value',
        label: 'Valor Mínimo de Agendamento',
        description: 'Valor mínimo aceito para um agendamento.',
        type: 'number',
        defaultValue: '80',
        prefix: 'R$',
      },
    ],
  },
  {
    title: 'Horários de Funcionamento',
    icon: Clock,
    fields: [
      {
        id: 'open_time',
        label: 'Hora de Abertura',
        description: 'Hora mais cedo em que agendamentos podem ser marcados.',
        type: 'text',
        defaultValue: '07:00',
      },
      {
        id: 'close_time',
        label: 'Hora de Fechamento',
        description: 'Hora mais tarde em que agendamentos podem ser marcados.',
        type: 'text',
        defaultValue: '20:00',
      },
    ],
  },
  {
    title: 'Pagamentos',
    icon: DollarSign,
    fields: [
      {
        id: 'pix_enabled',
        label: 'Aceitar Pix',
        description: 'Permitir pagamentos via Pix na plataforma.',
        type: 'toggle',
        defaultValue: true,
      },
      {
        id: 'credit_card_enabled',
        label: 'Aceitar Cartão de Crédito',
        description: 'Permitir pagamentos via cartão de crédito.',
        type: 'toggle',
        defaultValue: true,
      },
    ],
  },
  {
    title: 'Notificações',
    icon: Bell,
    fields: [
      {
        id: 'notify_new_booking',
        label: 'Notificar Novo Agendamento',
        description: 'Enviar email ao administrador a cada novo agendamento.',
        type: 'toggle',
        defaultValue: true,
      },
      {
        id: 'notify_cancellation',
        label: 'Notificar Cancelamentos',
        description: 'Enviar email ao administrador em cancelamentos.',
        type: 'toggle',
        defaultValue: false,
      },
    ],
  },
  {
    title: 'Região',
    icon: Globe,
    fields: [
      {
        id: 'service_city',
        label: 'Cidade de Operação',
        description: 'Cidade principal onde os serviços são prestados.',
        type: 'text',
        defaultValue: 'São Paulo',
      },
      {
        id: 'service_radius_km',
        label: 'Raio de Cobertura (km)',
        description: 'Raio máximo de atendimento a partir do centro da cidade.',
        type: 'number',
        defaultValue: '30',
        suffix: 'km',
      },
    ],
  },
];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Configurações</h1>
          <p className={styles.subtitle}>Ajuste as configurações gerais da plataforma.</p>
        </div>
        <button className={styles.saveBtn} onClick={handleSave}>
          <Save size={16} />
          {saved ? 'Salvo!' : 'Salvar Alterações'}
        </button>
      </div>

      <div className={styles.sections}>
        {sections.map((section) => (
          <div key={section.title} className={`glass-panel ${styles.section}`}>
            <div className={styles.sectionHeader}>
              <section.icon size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>{section.title}</h2>
            </div>
            <div className={styles.fields}>
              {section.fields.map((field) => (
                <div key={field.id} className={styles.field}>
                  <div className={styles.fieldMeta}>
                    <label htmlFor={field.id} className={styles.fieldLabel}>
                      {field.label}
                    </label>
                    <p className={styles.fieldDescription}>{field.description}</p>
                  </div>
                  {field.type === 'toggle' ? (
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        id={field.id}
                        defaultChecked={field.defaultValue as boolean}
                        className={styles.toggleInput}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  ) : (
                    <div className={styles.inputWrapper}>
                      {field.prefix && <span className={styles.inputAddon}>{field.prefix}</span>}
                      <input
                        id={field.id}
                        type={field.type}
                        defaultValue={field.defaultValue as string}
                        className={styles.input}
                      />
                      {field.suffix && <span className={styles.inputAddon}>{field.suffix}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
