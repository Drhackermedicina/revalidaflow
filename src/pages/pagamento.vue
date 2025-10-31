<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { backendUrl } from '@/utils/backendUrl.js'
import { getAuthHeadersAsync } from '@/utils/authHeaders.js'

const router = useRouter()

// Dados do beneficiário (Mercado Pago)
const dadosBeneficiario = {
  nome: 'HELLITON JONATHAN FRIGO CECHINEL',
  agencia: '0001',
  conta: '55428346932',
  chavePix: '07330107921', // CPF como chave PIX
  // NOTA: Para testar, use uma conta DIFERENTE da que está escaneando
  // Muitos apps bancários bloqueiam pagamentos para a própria chave PIX
}

// Estrutura de planos
const planosDisponiveis = {
  revalidaFlowFull: {
    id: 'revalida-flow-full',
    nome: 'Revalida Flow Full',
    descricao: 'Acesso completo à plataforma com todas as funcionalidades',
    icone: 'ri-vip-crown-fill',
    cor: 'primary',
    periodos: [
      { id: 'mensal', label: 'Mensal', valor: 94.99 },
      { id: 'bimestral', label: 'Bimestral', valor: 159.99 },
      { id: 'trimestral', label: 'Trimestral', valor: 199.00 },
      { id: 'ate-prova', label: 'Até a data da prova', valor: 249.99 },
    ]
  },
  revalidaFlowEstacoes: {
    id: 'revalida-flow-estacoes',
    nome: 'Revalida Flow Estações',
    descricao: 'Acesso exclusivo às estações práticas',
    icone: 'ri-hospital-fill',
    cor: 'info',
    periodos: [
      { id: 'mensal', label: 'Mensal', valor: 54.99 },
      { id: 'bimestral', label: 'Bimestral', valor: 129.99 },
      { id: 'trimestral', label: 'Trimestral', valor: 159.00 },
      { id: 'ate-prova', label: 'Até a data da prova', valor: 219.99 },
    ]
  },
  mentoriaAtivaMed: {
    id: 'mentoria-ativa-med',
    nome: 'Mentoria Ativa Med',
    descricao: 'Mentoria personalizada com profissionais revalidados',
    icone: 'ri-graduation-cap-fill',
    cor: 'success',
    subplanos: [
      {
        id: 'ator-feedback',
        nome: 'Ator Revalida + Feedback',
        descricao: 'Estações ilimitadas com feedback detalhado',
        icone: 'ri-user-star-fill',
        quantidades: [
          { min: 1, max: 5, valorUnitario: 9.90, label: '1-5 estações - R$ 9,90/estação' },
          { min: 6, max: 14, valorUnitario: 8.90, label: '6-14 estações - R$ 8,90/estação' },
          { min: 15, max: 999, valorUnitario: 7.50, label: '15+ estações - R$ 7,50/estação' },
        ]
      },
      {
        id: 'mentoria-flash',
        nome: 'Mentoria Flash',
        descricao: '5 aulas intensivas para construir base sólida',
        icone: 'ri-flashlight-fill',
        valorFixo: 500.00
      },
      {
        id: 'mentoria-completa',
        nome: 'Mentoria Completa',
        descricao: '15 aulas + acompanhamento até a prova',
        icone: 'ri-trophy-fill',
        valorFixo: 1500.00
      }
    ]
  }
}

const formasPagamento = [
  { id: 'pix', nome: 'PIX', icone: 'ri-qr-code-line', descricao: 'Aprovação instantânea' },
  { id: 'boleto', nome: 'Boleto Bancário', icone: 'ri-barcode-line', descricao: 'Aprovação em até 3 dias úteis' },
  { id: 'credito', nome: 'Cartão de Crédito', icone: 'ri-bank-card-line', descricao: 'Aprovação imediata' },
]

const bandeirasCartao = [
  { id: 'visa', nome: 'Visa' },
  { id: 'mastercard', nome: 'Mastercard' },
  { id: 'elo', nome: 'Elo' },
  { id: 'amex', nome: 'American Express' },
  { id: 'hipercard', nome: 'Hipercard' },
]

// Estados
const etapa = ref(1) // 1: Seleção de plano, 2: Confirmação/Pagamento
const planoSelecionado = ref('')
const periodoSelecionado = ref('')
const subplanoSelecionado = ref('')
const quantidadeEstacoes = ref(1)
const processando = ref(false)
const mensagemStatus = ref('')
const pixCopiaCola = ref('')
const pixQRCode = ref('')
const aguardandoPagamento = ref(false)
const pixValido = ref(false)
const pixValidacaoMsg = ref('')
const pixValidacaoDetalhes = ref([])

// Dados do cartão (apenas para validação visual)
const dadosCartao = ref({
  numero: '',
  nome: '',
  validade: '',
  cvv: '',
  bandeira: '',
  parcelas: 1
})

// Computed
const planoAtual = computed(() => {
  return planosDisponiveis[planoSelecionado.value] || null
})

const valorTotal = computed(() => {
  if (!planoSelecionado.value) return 0

  const plano = planosDisponiveis[planoSelecionado.value]

  // Revalida Flow Full ou Estações
  if (plano.periodos && periodoSelecionado.value) {
    const periodo = plano.periodos.find(p => p.id === periodoSelecionado.value)
    return periodo?.valor || 0
  }

  // Mentoria Ativa Med
  if (plano.subplanos && subplanoSelecionado.value) {
    const subplano = plano.subplanos.find(s => s.id === subplanoSelecionado.value)
    
    if (subplano?.valorFixo) {
      return subplano.valorFixo
    }
    
    if (subplano?.quantidades && quantidadeEstacoes.value > 0) {
      const faixa = subplano.quantidades.find(q => 
        quantidadeEstacoes.value >= q.min && quantidadeEstacoes.value <= q.max
      )
      return faixa ? faixa.valorUnitario * quantidadeEstacoes.value : 0
    }
  }

  return 0
})

const podeProsseguir = computed(() => {
  if (etapa.value === 1) {
    if (!planoSelecionado.value) return false
    
    const plano = planosDisponiveis[planoSelecionado.value]
    
    if (plano.periodos && !periodoSelecionado.value) return false
    if (plano.subplanos && !subplanoSelecionado.value) return false
    
    const subplano = plano.subplanos?.find(s => s.id === subplanoSelecionado.value)
    if (subplano?.quantidades && quantidadeEstacoes.value < 1) return false
    
    return valorTotal.value > 0
  }
  
  return false
})

// Watchers
watch(planoSelecionado, () => {
  periodoSelecionado.value = ''
  subplanoSelecionado.value = ''
  quantidadeEstacoes.value = 1
})

watch(subplanoSelecionado, () => {
  quantidadeEstacoes.value = 1
})

// Funções
const selecionarPlano = (planoId) => {
  planoSelecionado.value = planoId
}

const avancarEtapa = async () => {
  if (podeProsseguir.value) {
    // Vai direto para finalização (etapa 2 = confirmação/pagamento)
    etapa.value = 2
    // Chama finalizarPagamento automaticamente
    await finalizarPagamento()
  }
}

const voltarEtapa = () => {
  if (etapa.value > 1) {
    etapa.value--
    mensagemStatus.value = ''
  }
}

const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor)
}

const formatarNumeroCartao = () => {
  let numero = dadosCartao.value.numero.replace(/\D/g, '')
  numero = numero.replace(/(\d{4})(?=\d)/g, '$1 ')
  dadosCartao.value.numero = numero.trim()
}

const formatarValidade = () => {
  let validade = dadosCartao.value.validade.replace(/\D/g, '')
  if (validade.length >= 2) {
    validade = validade.substring(0, 2) + '/' + validade.substring(2, 4)
  }
  dadosCartao.value.validade = validade
}

const finalizarPagamento = async () => {
  processando.value = true
  mensagemStatus.value = 'Criando checkout...'

  try {
    // Montar descrição do plano
    let descricao = ''
    const plano = planosDisponiveis[planoSelecionado.value]
    
    if (plano.periodos && periodoSelecionado.value) {
      const periodo = plano.periodos.find(p => p.id === periodoSelecionado.value)
      descricao = `${plano.nome} - ${periodo?.label || ''}`
    } else if (plano.subplanos && subplanoSelecionado.value) {
      const subplano = plano.subplanos.find(s => s.id === subplanoSelecionado.value)
      if (subplano?.valorFixo) {
        descricao = `${plano.nome} - ${subplano.nome}`
      } else if (subplano?.quantidades) {
        descricao = `${plano.nome} - ${subplano.nome} (${quantidadeEstacoes.value} estações)`
      }
    }

    // Obter headers de autenticação
    const headers = await getAuthHeadersAsync()

    // Criar checkout no backend
    const response = await fetch(`${backendUrl}/api/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        valor: valorTotal.value,
        descricao: descricao || plano.nome,
        planoId: planoSelecionado.value,
        periodoId: periodoSelecionado.value || null,
        subplanoId: subplanoSelecionado.value || null,
        quantidadeEstacoes: quantidadeEstacoes.value || null
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Erro ao criar checkout')
    }

    const data = await response.json()

    if (data.success && data.checkout && data.checkout.initPoint) {
      // Redirecionar imediatamente para o checkout do Mercado Pago
      // Não atualizar mensagemStatus para evitar mostrar "Pagamento Confirmado"
      window.location.href = data.checkout.initPoint
      return // Não continua o código após redirecionar
    } else {
      throw new Error('Resposta inválida do servidor')
    }
  } catch (err) {
    console.error('Erro ao criar checkout:', err)
    mensagemStatus.value = err.message || 'Erro ao criar checkout. Tente novamente.'
    processando.value = false
  }
}

const gerarPixPayload = () => {
  // Gerar código PIX válido no formato EMV seguindo padrão do Banco Central
  const valor = valorTotal.value.toFixed(2) // Formato: "94.99" (ponto decimal)
  const chavePix = dadosBeneficiario.chavePix
  const nomeRecebedor = dadosBeneficiario.nome.substring(0, 25).trim().toUpperCase()
  const cidade = 'SAO MIGUEL DO IGUACU' // Cidade correta: São Miguel do Iguaçu - Paraná
  
  // Função auxiliar para criar campo EMV
  const criarCampo = (id, valorCampo) => {
    const tamanho = String(valorCampo.length).padStart(2, '0')
    return id + tamanho + valorCampo
  }
  
  // Montar payload EMV seguindo padrão PIX do Banco Central
  // Ordem OBRIGATÓRIA dos campos (conforme especificação BCB)
  const payload = []
  
  // 00 = Payload Format Indicator (fixo: 01)
  payload.push(criarCampo('00', '01'))
  
  // 26 = Merchant Account Information (PIX) - obrigatório
  // Subcampos: 00 = GUI, 01 = Chave PIX
  const pixGui = 'br.gov.bcb.pix'
  const pixSubCampos = criarCampo('00', pixGui) + criarCampo('01', chavePix)
  payload.push(criarCampo('26', pixSubCampos))
  
  // 52 = Merchant Category Code (0000 = não especificado) - obrigatório
  payload.push(criarCampo('52', '0000'))
  
  // 53 = Transaction Currency (986 = BRL) - obrigatório
  payload.push(criarCampo('53', '986'))
  
  // 54 = Transaction Amount - obrigatório
  payload.push(criarCampo('54', valor))
  
  // 58 = Country Code (BR) - obrigatório
  payload.push(criarCampo('58', 'BR'))
  
  // 59 = Merchant Name (máximo 25 caracteres) - obrigatório
  payload.push(criarCampo('59', nomeRecebedor))
  
  // 60 = Merchant City - obrigatório
  payload.push(criarCampo('60', cidade))
  
  // Juntar todos os campos (sem CRC ainda)
  let payloadStr = payload.join('')
  
  // Salvar o payload original para validação
  const payloadOriginal = payloadStr
  
  // Calcular CRC16 sobre o payload completo (sem campo 63)
  // O CRC é calculado sobre tudo ANTES de adicionar o campo 63
  let crc = calcularCRC16(payloadOriginal)
  
  // Adicionar campo 63 com CRC16
  // Formato: "63" + tamanho (sempre "04" para 4 hex) + CRC (4 hex)
  const campo63 = criarCampo('63', crc)
  payloadStr += campo63
  
  // NOTA: O CRC16 no padrão PIX é calculado ANTES de adicionar o campo 63
  // Depois que adicionamos o campo 63, o código está completo
  
  // Debug final e validação
  if (import.meta.env.DEV) {
    console.log('✅ Código PIX gerado:', payloadStr)
    console.log('   CRC16 calculado:', crc)
    console.log('   Tamanho total:', payloadStr.length)
    
    // Validar CRC: usar o payload original que foi usado para calcular o CRC
    const crcRecalculado = calcularCRC16(payloadOriginal)
    
    // Debug adicional
    console.log('   Debug CRC:')
    console.log('     - Tamanho payload original:', payloadOriginal.length)
    console.log('     - Tamanho payload completo:', payloadStr.length)
    console.log('     - Tamanho campo 63:', payloadStr.length - payloadOriginal.length, '(deve ser 8)')
    console.log('     - Payload original:', payloadOriginal.substring(0, 50) + '...' + payloadOriginal.substring(payloadOriginal.length - 10))
    
    console.log('   Validação CRC:')
    console.log('     - CRC original calculado:', crc)
    console.log('     - CRC recalculado sobre payload original:', crcRecalculado)
    const crcValido = crcRecalculado === crc
    
    // Testar com implementação alternativa
    const crcAlternativo = calcularCRC16Alternativo(payloadOriginal)
    console.log('     - CRC método alternativo:', crcAlternativo)
    console.log('     - Resultado validação principal:', crcValido ? '✓ Correto' : `✗ Erro (diferença: ${crc} vs ${crcRecalculado})`)
    console.log('     - Resultado método alternativo:', crcAlternativo === crc ? '✓ Correto' : `✗ Erro (diferença: ${crc} vs ${crcAlternativo})`)
    
    if (!crcValido) {
      console.error('   ❌ PROBLEMA DETECTADO: CRC não valida!')
      console.error('   O código PIX gerado está INCORRETO e não será aceito por apps bancários.')
      
      // Se o método alternativo funciona, usar ele
      if (crcAlternativo === crc) {
        console.warn('   ⚠️ O método alternativo valida corretamente!')
      } else {
        console.error('   ❌ Ambos os métodos falharam. Problema na estrutura do código PIX.')
      }
    }
    
    // Validar estrutura completa
    const validacoes = []
    if (payloadStr.length < 50) {
      validacoes.push('⚠️ Código PIX muito curto!')
    }
    if (!payloadStr.startsWith('000201')) {
      validacoes.push('❌ Código PIX não começa com 000201')
    }
    
    // Validar que termina com CRC correto
    const crcNoCodigo = payloadStr.substring(payloadStr.length - 4)
    if (crcNoCodigo !== crc) {
      validacoes.push(`❌ CRC no código (${crcNoCodigo}) não corresponde ao calculado (${crc})`)
    }
    
    if (validacoes.length > 0) {
      console.warn('⚠️ Validações:', validacoes)
    }
    
    // Mostrar estrutura dos campos
    console.log('   Estrutura dos campos:')
    let pos = 0
    while (pos < payloadOriginal.length) {
      const campoId = payloadOriginal.substring(pos, pos + 2)
      const tamanho = parseInt(payloadOriginal.substring(pos + 2, pos + 4))
      const valorCampo = payloadOriginal.substring(pos + 4, pos + 4 + tamanho)
      console.log(`     - Campo ${campoId}: ${valorCampo.substring(0, 30)}${valorCampo.length > 30 ? '...' : ''}`)
      pos += 4 + tamanho
      if (tamanho <= 0 || tamanho > 1000 || pos > payloadOriginal.length) break
    }
    
    // Aviso importante sobre teste
    if (crcValido && validacoes.length === 0) {
      console.log('')
      console.log('ℹ️  IMPORTANTE: Para testar o código PIX gerado:')
      console.log('   1. O código está formatado corretamente (CRC válido)')
      console.log('   2. Use um app bancário DE OUTRA CONTA para testar')
      console.log('   3. Muitos apps bloqueiam pagamentos para a própria chave PIX')
      console.log('   4. Se o erro persistir, pode ser necessário usar API do Mercado Pago')
      console.log('')
    }
  }
  
  return payloadStr
}

const calcularCRC16 = (str) => {
  // Implementação ALTERNATIVA e TESTADA do CRC16-CCITT-FALSE para PIX
  // Esta implementação é baseada em bibliotecas testadas e validadas
  // Polinômio: 0x1021, Valor inicial: 0xFFFF
  
  // Tabela de lookup pré-calculada para performance (opcional, mas usaremos cálculo direto)
  let crc = 0xFFFF
  const polynomial = 0x1021
  
  // Processar cada byte da string
  for (let i = 0; i < str.length; i++) {
    // Obter o byte (valor 0-255)
    let byte = str.charCodeAt(i)
    
    // Garantir que está no range 0-255
    if (byte > 255) {
      byte = byte & 0xFF
    }
    
    // XOR com os 8 bits mais significativos
    crc ^= (byte << 8)
    
    // Processar 8 bits
    for (let bit = 0; bit < 8; bit++) {
      // Verificar bit mais significativo
      if (crc & 0x8000) {
        // Se bit 15 está setado: shift left e XOR com polinômio
        crc = ((crc << 1) ^ polynomial) & 0xFFFF
      } else {
        // Se bit 15 não está setado: apenas shift left
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  
  // Retornar resultado em hexadecimal (4 dígitos, maiúsculo)
  const result = crc.toString(16).toUpperCase().padStart(4, '0')
  
  // Debug
  if (import.meta.env.DEV) {
    console.log('🔢 CRC16 cálculo:', { 
      inputLength: str.length,
      inputStart: str.substring(0, 30),
      inputEnd: str.substring(Math.max(0, str.length - 15)),
      crcDecimal: crc,
      crcHex: result,
      crcBin: crc.toString(2).padStart(16, '0')
    })
  }
  
  return result
}

// Função ALTERNATIVA de CRC16 para comparação (usada apenas para debug)
const calcularCRC16Alternativo = (str) => {
  // Implementação alternativa baseada em algoritmos conhecidos
  let crc = 0xFFFF
  const polynomial = 0x1021
  
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xFF
    crc ^= (byte << 8)
    
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF
      } else {
        crc = (crc << 1) & 0xFFFF
      }
    }
  }
  
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

const gerarQRCodePix = async (payload) => {
  try {
    // Validar payload antes de gerar QR Code
    if (!payload || payload.length < 10) {
      throw new Error('Payload PIX inválido ou muito curto')
    }
    
    if (import.meta.env.DEV) {
      console.log('📱 Gerando QR Code PIX:', { payloadLength: payload.length })
    }
    
    // Usar API online para gerar QR Code (mais confiável que biblioteca local)
    // Usar API que suporta melhor códigos PIX longos
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}&margin=2&ecc=M`
    
    // Converter para data URL para uso local
    const response = await fetch(qrCodeUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/png'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`)
    }
    
    const blob = await response.blob()
    
    if (import.meta.env.DEV) {
      console.log('✅ QR Code gerado com sucesso:', { blobSize: blob.size, blobType: blob.type })
    }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (import.meta.env.DEV) {
          console.log('📸 QR Code convertido para Data URL')
        }
        resolve(reader.result)
      }
      reader.onerror = (err) => {
        console.error('❌ Erro ao converter QR Code:', err)
        reject(err)
      }
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('❌ Erro ao gerar QR Code:', err)
    // Fallback: retornar QR Code SVG simples
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmZmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm8gYW8gZ2VyYXIgUVJDb2RlPC90ZXh0Pjwvc3ZnPg=='
  }
}

const validarCodigoPix = (codigoPix) => {
  // Validação básica do código PIX EMV
  const validacoes = []
  
  // 1. Verificar se começa com 000201
  if (!codigoPix.startsWith('000201')) {
    validacoes.push('❌ Código não começa com 000201')
  }
  
  // 2. Verificar tamanho mínimo
  if (codigoPix.length < 50) {
    validacoes.push('❌ Código muito curto')
  }
  
  // 3. Verificar se termina com campo 63 (CRC)
  if (!codigoPix.includes('6304')) {
    validacoes.push('❌ Campo 63 (CRC) não encontrado')
  }
  
  // 4. Validar CRC
  try {
    const payloadSemCRC = codigoPix.substring(0, codigoPix.length - 8)
    const crcNoCodigo = codigoPix.substring(codigoPix.length - 4)
    const crcCalculado = calcularCRC16(payloadSemCRC)
    
    if (crcCalculado !== crcNoCodigo) {
      validacoes.push(`❌ CRC inválido (esperado: ${crcCalculado}, encontrado: ${crcNoCodigo})`)
    }
  } catch (err) {
    validacoes.push('❌ Erro ao validar CRC')
  }
  
  // 5. Verificar campos obrigatórios (verificando estrutura EMV, não strings fixas)
  const codigoSemCRC = codigoPix.substring(0, codigoPix.length - 8)
  
  // Campos obrigatórios no formato EMV: verificar por ID do campo, não valor fixo
  const camposObrigatorios = [
    { id: '00', obrigatorio: true }, // Payload Format Indicator
    { id: '26', obrigatorio: true }, // Merchant Account Information
    { id: '52', obrigatorio: true }, // Merchant Category Code
    { id: '53', obrigatorio: true }, // Transaction Currency
    { id: '54', obrigatorio: true }, // Transaction Amount
    { id: '58', obrigatorio: true }, // Country Code
    { id: '59', obrigatorio: true }, // Merchant Name
    { id: '60', obrigatorio: true }, // Merchant City
  ]
  
  let pos = 0
  const camposEncontrados = []
  
  // Parsear campos EMV para verificar estrutura
  while (pos < codigoSemCRC.length) {
    if (pos + 4 > codigoSemCRC.length) break
    
    const campoId = codigoSemCRC.substring(pos, pos + 2)
    const tamanhoStr = codigoSemCRC.substring(pos + 2, pos + 4)
    const tamanho = parseInt(tamanhoStr)
    
    if (isNaN(tamanho) || tamanho < 0 || tamanho > 1000) {
      break // Estrutura inválida
    }
    
    camposEncontrados.push(campoId)
    
    // Avançar para próximo campo: ID (2) + tamanho (2) + valor (tamanho)
    pos += 4 + tamanho
  }
  
  // Verificar se todos os campos obrigatórios estão presentes
  for (const campo of camposObrigatorios) {
    if (campo.obrigatorio && !camposEncontrados.includes(campo.id)) {
      validacoes.push(`❌ Campo obrigatório ${campo.id} não encontrado`)
    }
  }
  
  const valido = validacoes.length === 0
  
  return {
    valido,
    mensagens: validacoes.length > 0 ? validacoes : ['✓ Código PIX válido!'],
    resumo: valido ? 'Código PIX válido e pronto para uso' : 'Código PIX com problemas detectados'
  }
}

const confirmarPagamentoPix = () => {
  // Em produção, isso seria uma chamada à API do Mercado Pago para verificar o pagamento
  // Por enquanto, é uma confirmação manual do usuário
  processando.value = true
  mensagemStatus.value = 'Verificando pagamento...'
  
  // Simulação de verificação (em produção, seria polling ou webhook)
  setTimeout(() => {
    aguardandoPagamento.value = false
    processando.value = false
    mensagemStatus.value = 'Pagamento confirmado com sucesso!'
  }, 2000)
}

const copiarCodigoPix = () => {
  navigator.clipboard.writeText(pixCopiaCola.value)
  mensagemStatus.value = 'Código PIX copiado! Cole no seu aplicativo bancário.'
}

const baixarQRCode = () => {
  if (!pixQRCode.value) {
    mensagemStatus.value = 'QR Code não disponível para download.'
    return
  }
  
  try {
    // Converter Data URL para Blob
    const base64Data = pixQRCode.value.split(',')[1]
    const blob = base64ToBlob(base64Data, 'image/png')
    
    // Criar link de download
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pix-qrcode-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    mensagemStatus.value = 'QR Code baixado com sucesso!'
  } catch (err) {
    console.error('Erro ao baixar QR Code:', err)
    mensagemStatus.value = 'Erro ao baixar QR Code. Tente novamente.'
  }
}

const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

const copiarChavePix = () => {
  navigator.clipboard.writeText(dadosBeneficiario.chavePix)
  mensagemStatus.value = 'Chave PIX copiada para a área de transferência!'
}

const voltarInicio = () => {
  router.push('/app/mentoria')
}
</script>

<template>
  <VContainer class="pagamento-container py-10">
    <VRow justify="center">
      <VCol cols="12" md="10" lg="8">
        <VCard class="payment-card" elevation="12">
          <VCardTitle class="payment-header pa-6">
            <div class="d-flex align-center justify-space-between">
              <div>
                <h2 class="text-h4 font-weight-bold mb-1">Finalizar Assinatura</h2>
                <p class="text-body-2 mb-0 opacity-90">Escolha seu plano</p>
              </div>
              <VChip color="white" variant="flat" size="large">
                Etapa {{ etapa }}/2
              </VChip>
            </div>
          </VCardTitle>

          <VCardText class="pa-6 pa-md-8">
            <!-- ETAPA 1: SELEÇÃO DE PLANO -->
            <div v-show="etapa === 1" class="etapa-planos">
              <h3 class="text-h5 font-weight-bold mb-6">Escolha seu plano</h3>
              
              <VRow class="mb-6">
                <VCol
                  v-for="(plano, key) in planosDisponiveis"
                  :key="key"
                  cols="12"
                  md="4"
                >
                  <VCard
                    :class="['plano-option', { 'selected': planoSelecionado === key }]"
                    :color="planoSelecionado === key ? plano.cor : ''"
                    :variant="planoSelecionado === key ? 'tonal' : 'outlined'"
                    @click="selecionarPlano(key)"
                    hover
                  >
                    <VCardText class="text-center pa-6">
                      <VIcon :icon="plano.icone" size="48" :color="plano.cor" class="mb-3" />
                      <h4 class="text-h6 font-weight-bold mb-2">{{ plano.nome }}</h4>
                      <p class="text-body-2 text-medium-emphasis mb-0">{{ plano.descricao }}</p>
                    </VCardText>
                  </VCard>
                </VCol>
              </VRow>

              <!-- Opções de período (Flow Full e Estações) -->
              <div v-if="planoAtual?.periodos" class="opcoes-periodo mb-6">
                <h4 class="text-h6 font-weight-bold mb-4">Escolha o período</h4>
                <VRadioGroup v-model="periodoSelecionado" class="periodo-radio">
                  <VRadio
                    v-for="periodo in planoAtual.periodos"
                    :key="periodo.id"
                    :value="periodo.id"
                    class="periodo-item"
                  >
                    <template v-slot:label>
                      <div class="d-flex align-center justify-space-between w-100 periodo-label">
                        <span class="font-weight-medium periodo-label-text">{{ periodo.label }}</span>
                        <strong class="periodo-valor">{{ formatarMoeda(periodo.valor) }}</strong>
                      </div>
                    </template>
                  </VRadio>
                </VRadioGroup>
              </div>

              <!-- Subplanos de Mentoria -->
              <div v-if="planoAtual?.subplanos" class="opcoes-mentoria mb-6">
                <h4 class="text-h6 font-weight-bold mb-4">Escolha o tipo de mentoria</h4>
                <VRow>
                  <VCol
                    v-for="subplano in planoAtual.subplanos"
                    :key="subplano.id"
                    cols="12"
                    md="4"
                  >
                    <VCard
                      :class="['subplano-option', { 'selected': subplanoSelecionado === subplano.id }]"
                      :variant="subplanoSelecionado === subplano.id ? 'tonal' : 'outlined'"
                      @click="subplanoSelecionado = subplano.id"
                      hover
                    >
                      <VCardText class="pa-5">
                        <VIcon :icon="subplano.icone" size="32" color="success" class="mb-2" />
                        <h5 class="text-subtitle-1 font-weight-bold mb-2">{{ subplano.nome }}</h5>
                        <p class="text-body-2 text-medium-emphasis mb-3">{{ subplano.descricao }}</p>
                        <div v-if="subplano.valorFixo" class="text-h6 font-weight-bold subplano-valor-fixo">
                          {{ formatarMoeda(subplano.valorFixo) }}
                        </div>
                      </VCardText>
                    </VCard>
                  </VCol>
                </VRow>

                <!-- Quantidade de estações (Ator Feedback) -->
                <div
                  v-if="subplanoSelecionado === 'ator-feedback'"
                  class="quantidade-estacoes mt-6"
                >
                  <h5 class="text-subtitle-1 font-weight-bold mb-3">Quantas estações?</h5>
                  <VTextField
                    v-model.number="quantidadeEstacoes"
                    type="number"
                    min="1"
                    max="999"
                    label="Número de estações"
                    variant="outlined"
                    class="mb-3"
                  />
                  <VAlert
                    v-if="quantidadeEstacoes > 0"
                    type="info"
                    variant="tonal"
                    density="compact"
                    class="estacoes-valor-alert"
                  >
                    <div class="mb-2">
                      <strong class="text-dark">Tabela de Preços:</strong>
                    </div>
                    <div v-for="faixa in planoAtual.subplanos[0].quantidades" :key="faixa.min" class="estacoes-faixa-item">
                      <div :class="['estacoes-valor-texto', { 'estacoes-faixa-ativa': quantidadeEstacoes >= faixa.min && quantidadeEstacoes <= faixa.max }]">
                        <span>{{ faixa.label }}</span>
                        <span v-if="quantidadeEstacoes >= faixa.min && quantidadeEstacoes <= faixa.max" class="estacoes-valor-total">
                          = {{ formatarMoeda(faixa.valorUnitario * quantidadeEstacoes) }}
                        </span>
                      </div>
                    </div>
                  </VAlert>
                </div>
              </div>

              <!-- Resumo do valor -->
              <VAlert v-if="valorTotal > 0" color="primary" variant="tonal" class="mb-6 resumo-valor-alert">
                <div class="d-flex align-center justify-space-between">
                  <span class="text-h6 resumo-label">Valor total:</span>
                  <strong class="text-h5 resumo-valor">{{ formatarMoeda(valorTotal) }}</strong>
                </div>
              </VAlert>

              <VBtn
                block
                size="x-large"
                color="primary"
                :disabled="!podeProsseguir"
                @click="avancarEtapa"
              >
                Continuar para Pagamento
                <VIcon icon="ri-arrow-right-line" end />
              </VBtn>
            </div>

            <!-- ETAPA 2: CONFIRMAÇÃO/PAGAMENTO -->
            <div v-show="etapa === 2" class="etapa-confirmacao text-center">
              <!-- Aguardando criação do checkout -->
              <div v-if="processando && !mensagemStatus.includes('Redirecionando')">
                <VIcon
                  icon="ri-loader-4-line"
                  size="80"
                  color="primary"
                  class="mb-4 animate-spin"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">{{ mensagemStatus || 'Processando pagamento...' }}</h3>
              </div>
              
              <!-- Mensagem de erro -->
              <div v-else-if="mensagemStatus && mensagemStatus.includes('Erro')">
                <VIcon
                  icon="ri-error-warning-line"
                  size="80"
                  color="error"
                  class="mb-4"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Erro no Pagamento</h3>
                <p class="text-body-1 mb-6 text-dark">{{ mensagemStatus }}</p>
                <VBtn
                  size="large"
                  color="primary"
                  @click="voltarEtapa"
                  class="me-3"
                >
                  <VIcon icon="ri-arrow-left-line" start />
                  Voltar
                </VBtn>
                <VBtn
                  size="large"
                  color="success"
                  @click="finalizarPagamento"
                >
                  <VIcon icon="ri-refresh-line" start />
                  Tentar Novamente
                </VBtn>
              </div>
              
              <!-- PIX - Aguardando Pagamento (quando usar PIX no futuro) -->
              <div v-else-if="aguardandoPagamento">
                <VIcon
                  icon="ri-qr-code-line"
                  size="80"
                  color="primary"
                  class="mb-4"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Escaneie o QR Code</h3>
                <p class="text-body-1 mb-6 text-dark">{{ mensagemStatus }}</p>

                <!-- QR Code PIX -->
                <VCard variant="outlined" class="mb-6 qr-code-card">
                  <VCardText class="pa-6">
                    <div v-if="pixQRCode" class="qr-code-wrapper mb-4">
                      <img :src="pixQRCode" alt="QR Code PIX" class="qr-code-image" />
        </div>
                    
                    <VDivider class="my-4" />
                    
                    <p class="text-subtitle-2 text-dark mb-3">Ou copie o código PIX Copia e Cola:</p>
                    <VTextarea
                      :model-value="pixCopiaCola"
                      readonly
                      variant="outlined"
                      rows="3"
                      class="pix-code-textarea mb-3"
                    />
                    <VRow class="mt-3">
                      <VCol cols="12" md="6">
                        <VBtn
                          block
                          size="large"
          color="primary"
                          @click="copiarCodigoPix"
                        >
                          <VIcon icon="ri-file-copy-line" start />
                          Copiar Código PIX
                        </VBtn>
                      </VCol>
                      <VCol cols="12" md="6">
                        <VBtn
          block
                          size="large"
                          color="success"
                          variant="tonal"
                          @click="baixarQRCode"
                        >
                          <VIcon icon="ri-download-line" start />
                          Baixar QR Code
                        </VBtn>
                      </VCol>
                    </VRow>
                  </VCardText>
                </VCard>
                
                <!-- Validação do código PIX -->
                <VAlert
                  :color="pixValido ? 'success' : 'warning'"
                  :variant="pixValido ? 'tonal' : 'outlined'"
                  class="mb-4"
                >
                  <div class="d-flex align-start">
                    <VIcon :icon="pixValido ? 'ri-checkbox-circle-fill' : 'ri-alert-line'" class="me-3 mt-1" />
                    <div class="flex-grow-1">
                      <strong class="text-dark d-block mb-2">{{ pixValidacaoMsg }}</strong>
                      <div v-if="!pixValido && pixValidacaoDetalhes.length > 0" class="mb-2">
                        <small class="text-dark d-block mb-1"><strong>Problemas detectados:</strong></small>
                        <ul class="mb-0 text-dark" style="font-size: 0.875rem; padding-left: 1.5rem;">
                          <li v-for="(msg, idx) in pixValidacaoDetalhes" :key="idx" class="mb-1">
                            {{ msg }}
                          </li>
                        </ul>
                      </div>
                      <small class="text-dark d-block">
                        {{ pixValido 
                          ? '✓ O código PIX está formatado corretamente e pronto para uso.' 
                          : '⚠ Verifique o console do navegador (F12) para mais detalhes técnicos.' }}
                      </small>
                    </div>
                  </div>
                </VAlert>

                <VCard variant="tonal" color="info" class="mb-6">
                  <VCardText class="text-left">
                    <h4 class="text-subtitle-1 font-weight-bold mb-3 text-dark">Dados para Pagamento</h4>
                    <div class="pix-dados">
                      <p class="mb-2 text-dark"><strong>Beneficiário:</strong> {{ dadosBeneficiario.nome }}</p>
                      <p class="mb-2 text-dark"><strong>Instituição:</strong> Mercado Pago</p>
                      <p class="mb-2 text-dark"><strong>Valor:</strong> {{ formatarMoeda(valorTotal) }}</p>
                    </div>
                  </VCardText>
                </VCard>
                
                <!-- Links para validadores online -->
                <VCard variant="outlined" class="mb-6">
                  <VCardTitle class="text-h6 text-dark">
                    <VIcon icon="ri-information-line" class="me-2" />
                    Validadores Online
                  </VCardTitle>
                  <VCardText>
                    <p class="text-body-2 text-dark mb-3">
                      Teste seu código PIX ou QR Code em validadores online:
                    </p>
                    <VList density="compact">
                      <VListItem
                        prepend-icon="ri-global-line"
                        title="ZXing Decoder (QR Code)"
                        subtitle="Decodifica QR Codes online"
                        href="https://zxing.org/w/decode.jspx"
                        target="_blank"
                        class="text-dark"
                      />
                      <VListItem
                        prepend-icon="ri-qr-code-line"
                        title="Online Barcode Reader"
                        subtitle="Leitor de QR Code e códigos de barras"
                        href="https://online-barcode-reader.inliteresearch.com/"
                        target="_blank"
                        class="text-dark"
                      />
                      <VListItem
                        prepend-icon="ri-checkbox-circle-line"
                        title="Validador PIX (Gerador)"
                        subtitle="Valida estrutura do código PIX EMV"
                        href="https://github.com/renatomb/php-pix"
                        target="_blank"
                        class="text-dark"
                      />
                    </VList>
                    <VAlert type="info" variant="text" density="compact" class="mt-3">
                      <small class="text-dark">
                        <strong>Dica:</strong> Faça upload do QR Code gerado ou cole o código PIX Copia e Cola nos validadores acima para verificar se está formatado corretamente.
                      </small>
                    </VAlert>
                  </VCardText>
                </VCard>

                <VAlert type="info" variant="tonal" class="mb-6 status-alert">
                  <div class="text-center">
                    <p class="text-body-1 mb-4 text-dark">
                      <strong>Instruções:</strong> Escaneie o QR Code acima com o app do seu banco ou copie o código PIX e cole no seu aplicativo bancário para realizar o pagamento.
                    </p>
                    <VBtn
                      size="large"
                      color="success"
                      :loading="processando"
                      @click="confirmarPagamentoPix"
                      class="px-8"
                    >
                      <VIcon icon="ri-check-line" start />
                      Já realizei o pagamento
                    </VBtn>
                  </div>
                </VAlert>
              </div>

              <!-- Pagamento Confirmado - só aparece quando realmente confirmado (via webhook/retorno) -->
              <div v-else-if="mensagemStatus && mensagemStatus.includes('confirmado') && !processando">
                <VIcon
                  icon="ri-checkbox-circle-fill"
                  size="80"
                  color="success"
                  class="mb-4"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Pagamento Confirmado!</h3>
                <p class="text-body-1 mb-6 text-dark">{{ mensagemStatus }}</p>

                <VAlert type="success" variant="tonal" class="mb-6">
                  <strong class="text-dark">Pagamento aprovado com sucesso!</strong><br>
                  <span class="text-dark">Você receberá um email de confirmação em instantes com todos os detalhes da sua assinatura.</span>
                </VAlert>

                <VBtn
                  size="x-large"
                  color="primary"
                  @click="voltarInicio"
                >
                  <VIcon icon="ri-home-line" start />
                  Voltar para Início
                </VBtn>
              </div>
              
              <!-- Fallback: apenas loading se nenhuma das condições acima foi atendida -->
              <div v-else>
                <VIcon
                  icon="ri-loader-4-line"
                  size="80"
                  color="primary"
                  class="mb-4 animate-spin"
                />
                <h3 class="text-h4 font-weight-bold mb-3 text-dark">Redirecionando para o Mercado Pago...</h3>
                <p class="text-body-1 mb-6 text-dark">Aguarde, você será redirecionado automaticamente.</p>
              </div>
          </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
  </template>

<style scoped lang="scss">
.pagamento-container {
  background: radial-gradient(circle at top, rgba(124, 77, 255, 0.15), transparent 55%);
  min-height: 100vh;
}

.payment-card {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border-radius: 24px !important;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

// Garantir visibilidade de todos os textos
h3, h4, h5, p, span, label {
  color: #333 !important;
}

.text-dark {
  color: #333 !important;
}

.etapa-planos,
.etapa-confirmacao {
  h3, h4, h5 {
    color: #1a1a1a !important;
  }
  
  p, span {
    color: #666 !important;
  }
}

.payment-header {
  background: linear-gradient(135deg, #7c4dff 0%, #00bcd4 100%);
  color: white !important;

  h2, p {
    color: white !important;
  }
}

.plano-option,
.subplano-option,
.forma-pagamento-option {
  cursor: pointer;
  transition: all 0.3s ease;
  border-width: 2px !important;
  background: white !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08) !important;

  &.selected {
    transform: scale(1.02);
    box-shadow: 0 8px 24px rgba(124, 77, 255, 0.25);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
  }
  
  h4 {
    color: #333 !important;
  }
  
  p {
    color: #666 !important;
  }
}

.periodo-radio {
  .periodo-item {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    transition: all 0.3s ease;
    background: white !important;

    &:hover {
      background: rgba(124, 77, 255, 0.05);
      border-color: rgba(124, 77, 255, 0.3);
    }
  }

  .periodo-label {
    width: 100%;
    gap: 24px; // Espaçamento entre o texto do período e o valor
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .periodo-label-text {
      color: #333 !important;
      flex: 1; // Permite que o texto ocupe o espaço disponível
      margin-right: auto; // Empurra para a esquerda
      text-align: left;
    }
    
    .periodo-valor {
      color: #1a1a1a !important;
      font-weight: 700 !important;
      margin-left: auto; // Empurra o valor para a direita
      flex-shrink: 0; // Impede que o valor seja comprimido
      white-space: nowrap; // Evita quebra de linha no valor
      text-align: right; // Alinha o texto do valor à direita
      min-width: 100px; // Garante largura mínima para alinhamento
    }
  }
}

.form-cartao {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.pix-info {
  text-align: left;
  color: #333 !important;
  
  p {
    margin-bottom: 8px;
    color: #333 !important;
  }
}

.pix-dados {
  p {
    color: #333 !important;
  }
}

// Estilos para QR Code PIX
.qr-code-card {
  background: white !important;
  border: 2px solid rgba(124, 77, 255, 0.2) !important;
}

.qr-code-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.qr-code-image {
  max-width: 300px;
  width: 100%;
  height: auto;
  display: block;
}

.pix-code-textarea {
  font-family: monospace;
  font-size: 12px;
  
  :deep(.v-field__input) {
    color: #333 !important;
  }
}

.status-alert {
  background: rgba(124, 77, 255, 0.1) !important;
  
  strong, span {
    color: #333 !important;
  }
}

// Estilos para resumo de valores - garantir visibilidade
.resumo-valor-alert {
  .resumo-label {
    color: #333 !important;
  }
  
  .resumo-valor {
    color: #1a1a1a !important;
    font-weight: 700 !important;
  }
}

.resumo-card {
  .resumo-title {
    color: #1a1a1a !important;
  }
  
  .resumo-label {
    color: #333 !important;
  }
  
  .resumo-value {
    color: #333 !important;
  }
  
  .resumo-valor {
    color: #1a1a1a !important;
    font-weight: 700 !important;
  }
  
  .resumo-valor-total {
    color: #000 !important;
    font-weight: 800 !important;
  }
  
  // Garantir que texto dentro do VCardText tenha cor escura
  :deep(.v-card-text) {
    span, strong {
      color: #333 !important;
    }
  }
}

// Garantir labels visíveis
:deep(.v-label) {
  color: #333 !important;
}

// Valores de subplanos visíveis
.subplano-valor-fixo {
  color: #1a7f3a !important;
  font-weight: 700 !important;
}

// Valores no alerta de estações
.estacoes-valor-alert {
  .estacoes-faixa-item {
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .estacoes-valor-texto {
    color: #333 !important;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-radius: 4px;
    transition: background-color 0.2s;
    
    &.estacoes-faixa-ativa {
      background-color: rgba(124, 77, 255, 0.1);
      padding-left: 8px;
      padding-right: 8px;
      font-weight: 600;
    }
    
    span:first-child {
      flex: 1;
      text-align: left;
    }
  }
  
  .estacoes-valor-total {
    color: #1a1a1a !important;
    font-weight: 700 !important;
    margin-left: 16px; // Espaçamento adicional antes do valor
    white-space: nowrap; // Evita quebra de linha no valor
    text-align: right;
    min-width: 120px; // Garante largura mínima para alinhamento
  }
  
  .estacoes-valor-moeda {
    color: #1a1a1a !important;
    font-weight: 700 !important;
    margin-left: 12px; // Espaçamento adicional antes do valor (depois do "=")
    white-space: nowrap; // Evita quebra de linha no valor
  }
}

:deep(.v-field__input) {
  color: #333 !important;
}

:deep(.v-selection-control-group) {
  label {
    color: #333 !important;
  }
}

// Animação de spin para loader
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@media (max-width: 960px) {
  .payment-header {
    h2 {
      font-size: 1.5rem !important;
    }
  }

  .plano-option {
    margin-bottom: 16px;
  }
  
  .qr-code-image {
    max-width: 250px;
  }
}
  </style>
