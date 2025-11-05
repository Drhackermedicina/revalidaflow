/**
 * Serviço de integração com Mercado Pago
 * 
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing
 */

const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const logger = require('./logger').child('mercadopago');

// Configuração do Mercado Pago
let isConfigured = false;
let mercadopagoClient = null;
let preferenceClient = null;
let paymentClient = null;

function resolveFrontendBaseUrl() {
  const rawFrontendUrl = (process.env.FRONTEND_URL || '').trim();
  const fallbackFrontendUrl = 'http://localhost:5173';

  const candidate = /^https?:\/\//.test(rawFrontendUrl) ? rawFrontendUrl : fallbackFrontendUrl;

  try {
    const url = new URL(candidate);
    // Remover fragmentos (#/rota) pois o Checkout Pro exige URLs limpas
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch (error) {
    logger.warn('FRONTEND_URL inválida, usando fallback', {
      originalValue: rawFrontendUrl,
      error: error.message
    });
    return fallbackFrontendUrl;
  }
}

function initializeMercadoPago() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  // Log detalhado para debug
  logger.info('🔧 Tentando inicializar Mercado Pago', {
    hasAccessToken: !!accessToken,
    accessTokenLength: accessToken ? accessToken.length : 0,
    accessTokenPrefix: accessToken ? accessToken.substring(0, 20) + '...' : 'undefined',
    envKeys: Object.keys(process.env).filter(k => k.includes('MERCADOPAGO')),
    currentlyConfigured: isConfigured,
    attemptedBefore: initializationAttempted
  });
  
  if (!accessToken) {
    logger.warn('MERCADOPAGO_ACCESS_TOKEN não configurado. Mercado Pago desabilitado.', {
      allEnvVars: Object.keys(process.env).length,
      nodeEnv: process.env.NODE_ENV
    });
    return false;
  }

  try {
    mercadopagoClient = null;
    preferenceClient = null;
    paymentClient = null;
    isConfigured = false;

    const timeout = Number.parseInt(process.env.MERCADOPAGO_TIMEOUT || '8000', 10);

    mercadopagoClient = new MercadoPagoConfig({
      accessToken,
      options: Number.isNaN(timeout) ? undefined : { timeout }
    });

    preferenceClient = new Preference(mercadopagoClient);
    paymentClient = new Payment(mercadopagoClient);

    isConfigured = true;
    logger.info('✅ Mercado Pago inicializado com sucesso', {
      accessTokenPrefix: accessToken.substring(0, 20) + '...'
    });
    return true;
  } catch (error) {
    logger.error('❌ Erro ao inicializar Mercado Pago', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Inicializar na importação (se o dotenv já estiver carregado)
// Caso contrário, será inicializado quando necessário
let initializationAttempted = false;

function ensureInitialized() {
  logger.info('🔍 ensureInitialized chamado', {
    initializationAttempted,
    isConfigured,
    willInitialize: !initializationAttempted || !isConfigured
  });
  
  if (!initializationAttempted || !isConfigured) {
    const alreadyAttempted = initializationAttempted;
    initializationAttempted = true;
    logger.info('🚀 Inicializando Mercado Pago (lazy initialization)', {
      retry: alreadyAttempted && !isConfigured
    });
    initializeMercadoPago();
  }
  
  if (!isConfigured) {
    logger.error('❌ Mercado Pago não está configurado após inicialização', {
      accessTokenExists: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
      nodeEnv: process.env.NODE_ENV,
      initializationAttempted
    });
  }
  
  return isConfigured;
}

// NOTA: Não inicializamos aqui pois o dotenv pode não ter sido carregado ainda
// A inicialização ocorrerá de forma lazy quando necessário via ensureInitialized()

/**
 * Criar preferência de pagamento (Checkout Pro)
 * @param {Object} dadosPagamento - Dados do pagamento
 * @param {number} dadosPagamento.valor - Valor do pagamento
 * @param {string} dadosPagamento.descricao - Descrição do pagamento
 * @param {string} dadosPagamento.referenceId - ID de referência único
 * @param {string} dadosPagamento.emailComprador - Email do comprador (opcional)
 * @param {Object} dadosPagamento.metadata - Metadados adicionais (opcional)
 * @returns {Promise<Object>} Preferência criada
 */
async function criarPreferenciaPagamento(dadosPagamento) {
  // Garantir que está inicializado antes de usar
  if (!ensureInitialized()) {
    throw new Error('Mercado Pago não está configurado corretamente. Verifique se MERCADOPAGO_ACCESS_TOKEN está definido no arquivo .env');
  }

  const {
    valor,
    descricao,
    referenceId,
    emailComprador = null,
    metadata = {}
  } = dadosPagamento;

  // URLs de retorno
  const frontendUrl = resolveFrontendBaseUrl();
  const backendUrl = process.env.BACKEND_URL || process.env.PUBLIC_URL || 'http://localhost:3000';
  const backUrls = {
    success: `${frontendUrl}/pagamento/sucesso?reference=${referenceId}`,
    failure: `${frontendUrl}/pagamento/erro?reference=${referenceId}`,
    pending: `${frontendUrl}/pagamento/pendente?reference=${referenceId}`
  };
  const canUseAutoReturn = backUrls.success.startsWith('https://');

  const preferenceData = {
    items: [
      {
        title: descricao,
        quantity: 1,
        unit_price: parseFloat(valor),
        currency_id: 'BRL'
      }
    ],
    payer: emailComprador ? {
      email: emailComprador
    } : undefined,
    payment_methods: {
      excluded_payment_types: [],
      excluded_payment_methods: [],
      installments: 12 // Máximo de parcelas
    },
    back_urls: backUrls,
    external_reference: referenceId,
    notification_url: `${backendUrl}/api/payment/webhook`, // Webhook para confirmação
    statement_descriptor: 'REVALIDAFLOW', // Aparece na fatura do cartão
    additional_info: 'Revalida Flow - Plataforma de Simulações Clínicas', // Informação adicional exibida
    metadata: {
      ...metadata,
      platform: 'revalidaflow',
      created_at: new Date().toISOString()
    }
  };

  if (canUseAutoReturn) {
    preferenceData.auto_return = 'approved';
  }

  try {
    logger.info('Criando preferência de pagamento', {
      referenceId,
      valor,
      descricao: descricao.substring(0, 50),
      backUrls,
      autoReturn: canUseAutoReturn,
      frontendUrlBase: frontendUrl
    });

    const preference = await preferenceClient.create({ body: preferenceData });

    logger.info('Preferência criada com sucesso', {
      preferenceId: preference.id,
      initPoint: preference.init_point?.substring(0, 100),
      apiStatus: preference.api_response?.status
    });

    return {
      id: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      referenceId: preference.external_reference
    };
  } catch (error) {
    logger.error('Erro ao criar preferência de pagamento', {
      error: error.message,
      referenceId,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Consultar pagamento por ID
 * @param {string} paymentId - ID do pagamento do Mercado Pago
 * @returns {Promise<Object>} Dados do pagamento
 */
async function consultarPagamento(paymentId) {
  if (!ensureInitialized()) {
    throw new Error('Mercado Pago não está configurado corretamente');
  }

  try {
    const payment = await paymentClient.get({ id: paymentId });

    logger.info('Pagamento consultado', {
      paymentId,
      status: payment.status,
      statusDetail: payment.status_detail,
      apiStatus: payment.api_response?.status
    });

    return {
      id: payment.id,
      status: payment.status,
      statusDetail: payment.status_detail,
      externalReference: payment.external_reference,
      transactionAmount: payment.transaction_amount,
      currencyId: payment.currency_id,
      dateCreated: payment.date_created,
      dateApproved: payment.date_approved,
      paymentMethodId: payment.payment_method_id,
      payer: payment.payer
    };
  } catch (error) {
    logger.error('Erro ao consultar pagamento', {
      error: error.message,
      paymentId
    });
    throw error;
  }
}

/**
 * Buscar pagamentos pelo external_reference
 * @param {string} referenceId - Identificador externo usado na criação da preferência
 * @returns {Promise<Array<Object>>} Lista de pagamentos encontrados
 */
async function buscarPagamentosPorReferencia(referenceId) {
  if (!ensureInitialized()) {
    throw new Error('Mercado Pago não está configurado corretamente');
  }

  if (!referenceId) {
    throw new Error('referenceId é obrigatório');
  }

  try {
    const searchResponse = await paymentClient.search({
      options: {
        external_reference: referenceId,
        sort: 'date_created',
        criteria: 'desc',
        limit: 10
      }
    });

    const results = Array.isArray(searchResponse?.results) ? searchResponse.results : [];

    logger.info('Pagamentos buscados por referência', {
      referenceId,
      totalResultados: results.length
    });

    return results;
  } catch (error) {
    logger.error('Erro ao buscar pagamentos por referência', {
      error: error.message,
      referenceId
    });
    throw error;
  }
}

/**
 * Processar notificação de webhook
 * @param {Object} notification - Dados da notificação
 * @returns {Promise<Object>} Dados do pagamento processado
 */
async function processarWebhook(notification) {
  if (!ensureInitialized()) {
    throw new Error('Mercado Pago não está configurado corretamente');
  }

  try {
    const { type, data } = notification;

    if (type === 'payment') {
      const paymentId = data.id;
      const pagamento = await consultarPagamento(paymentId);
      
      logger.info('Webhook processado', {
        type,
        paymentId,
        status: pagamento.status,
        externalReference: pagamento.externalReference
      });

      return pagamento;
    }

    logger.warn('Tipo de notificação não processado', { type });
    return null;
  } catch (error) {
    logger.error('Erro ao processar webhook', {
      error: error.message,
      notification
    });
    throw error;
  }
}

module.exports = {
  isInitialized: () => ensureInitialized(),
  criarPreferenciaPagamento,
  consultarPagamento,
  buscarPagamentosPorReferencia,
  processarWebhook,
  initializeMercadoPago,
  ensureInitialized
};

