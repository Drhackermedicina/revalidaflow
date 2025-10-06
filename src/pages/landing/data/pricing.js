// src/pages/landing/data/pricing.js
export const pricingPlans = [
  {
    name: 'Básico',
    price: 'R$ 97',
    period: '/mês',
    description: 'Perfeito para começar',
    features: [
      'Acesso ao banco de questões',
      'Materiais de apoio básicos',
      'Flashcards inteligentes',
      'Cronograma personalizado',
      'Suporte por email'
    ],
    popular: false,
    buttonText: 'Começar Básico',
    buttonVariant: 'outlined'
  },
  {
    name: 'Premium',
    price: 'R$ 197',
    period: '/mês',
    description: 'Mais completo e recomendado',
    features: [
      'Tudo do plano Básico',
      'Simulações em tempo real',
      'Videoaulas exclusivas',
      'IA Feynman completa',
      'Suporte prioritário',
      'Certificado de conclusão'
    ],
    popular: true,
    buttonText: 'Escolher Premium',
    buttonVariant: 'elevated'
  },
  {
    name: 'VIP',
    price: 'R$ 297',
    period: '/mês',
    description: 'Experiência completa',
    features: [
      'Tudo do plano Premium',
      'Mentoria individual',
      'Acesso antecipado a conteúdos',
      'Sessões de dúvidas ao vivo',
      'Relatórios avançados',
      'Suporte 24/7'
    ],
    popular: false,
    buttonText: 'VIP Exclusivo',
    buttonVariant: 'outlined'
  }
]

export const platformStats = [
  {
    number: '2.500+',
    label: 'Médicos Aprovados',
    icon: 'ri-user-heart-line'
  },
  {
    number: '98%',
    label: 'Taxa de Aprovação',
    icon: 'ri-trophy-line'
  },
  {
    number: '50+',
    label: 'Estações Oficiais',
    icon: 'ri-hospital-line'
  },
  {
    number: '4.9/5',
    label: 'Avaliação Média',
    icon: 'ri-star-fill'
  }
]
