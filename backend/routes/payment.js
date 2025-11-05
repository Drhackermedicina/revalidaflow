/**
 * Rotas de pagamento com Mercado Pago
 */

const express = require('express');
const router = express.Router();
const mercadopagoService = require('../services/mercadopago');
const logger = require('../services/logger').child('payment-routes');

// Middleware de autenticação opcional (pode ser ajustado conforme necessário)
const { optionalAuth } = require('../middleware/auth');

/**
 * POST /api/payment/create
 * Criar checkout do Mercado Pago
 */
router.post('/create', optionalAuth, async (req, res) => {
  try {
    const {
      valor,
      descricao,
      emailComprador,
      planoId,
      periodoId,
      subplanoId,
      quantidadeEstacoes
    } = req.body;

    // Validações básicas
    if (!valor || valor <= 0) {
      return res.status(400).json({
        error: 'Valor inválido',
        message: 'O valor do pagamento deve ser maior que zero'
      });
    }

    if (!descricao || descricao.trim().length === 0) {
      return res.status(400).json({
        error: 'Descrição inválida',
        message: 'A descrição do pagamento é obrigatória'
      });
    }

    // Gerar ID de referência único
    const referenceId = `RF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Metadata para rastreamento
    const metadata = {
      userId: req.user?.uid || 'anonymous',
      planoId: planoId || null,
      periodoId: periodoId || null,
      subplanoId: subplanoId || null,
      quantidadeEstacoes: quantidadeEstacoes || null,
      timestamp: new Date().toISOString()
    };

    // Criar preferência de pagamento
    const preferencia = await mercadopagoService.criarPreferenciaPagamento({
      valor: parseFloat(valor),
      descricao: descricao.trim(),
      referenceId,
      emailComprador: emailComprador || null,
      metadata
    });

    logger.info('Checkout criado com sucesso', {
      referenceId,
      preferenceId: preferencia.id,
      userId: metadata.userId
    });

    res.json({
      success: true,
      checkout: {
        id: preferencia.id,
        initPoint: preferencia.initPoint,
        referenceId: preferencia.referenceId
      }
    });
  } catch (error) {
    logger.error('Erro ao criar checkout', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    res.status(500).json({
      error: 'Erro ao criar checkout',
      message: error.message
    });
  }
});

/**
 * POST /api/payment/webhook
 * Webhook do Mercado Pago para confirmação de pagamento
 * 
 * NOTA: Esta rota deve estar acessível publicamente (sem autenticação)
 * O Mercado Pago validará a requisição através de assinatura
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const notification = req.body;

    // Log da notificação recebida
    logger.info('Webhook recebido do Mercado Pago', {
      type: notification.type,
      dataId: notification.data?.id
    });

    // Processar webhook
    const pagamento = await mercadopagoService.processarWebhook(notification);

    if (pagamento) {
      // Aqui você pode:
      // 1. Atualizar o status do pedido no banco de dados
      // 2. Enviar email de confirmação
      // 3. Liberar acesso ao plano
      // 4. Registrar transação

      logger.info('Pagamento processado via webhook', {
        paymentId: pagamento.id,
        status: pagamento.status,
        externalReference: pagamento.externalReference
      });

      // Retornar 200 OK para o Mercado Pago
      res.status(200).json({ received: true });
    } else {
      // Notificação não foi processada, mas retornamos 200 para evitar retry
      res.status(200).json({ received: true, processed: false });
    }
  } catch (error) {
    logger.error('Erro ao processar webhook', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    // Retornar 200 para evitar retry excessivo pelo Mercado Pago
    // Mas registrar o erro para investigação
    res.status(200).json({ received: true, error: 'Erro ao processar' });
  }
});

/**
 * GET /api/payment/status/:referenceId
 * Consultar status de um pagamento por ID de referência
 */
router.get('/status/:referenceId', optionalAuth, async (req, res) => {
  try {
    const { referenceId } = req.params;

    // Aqui você consultaria o pagamento no seu banco de dados
    // usando o referenceId para encontrar o payment_id do Mercado Pago
    
    // Por enquanto, retornamos uma resposta básica
    // Em produção, você deve armazenar o mapping referenceId -> paymentId
    
    res.json({
      message: 'Para consultar o status, use o webhook ou consulte diretamente no Mercado Pago',
      referenceId
    });
  } catch (error) {
    logger.error('Erro ao consultar status', {
      error: error.message,
      referenceId: req.params.referenceId
    });

    res.status(500).json({
      error: 'Erro ao consultar status do pagamento',
      message: error.message
    });
  }
});

/**
 * GET /api/payment/reference/:referenceId
 * Consultar pagamentos utilizando o external_reference usado na criação da preferência
 */
router.get('/reference/:referenceId', optionalAuth, async (req, res) => {
  const { referenceId } = req.params;

  if (!referenceId) {
    return res.status(400).json({
      success: false,
      error: 'referenceId_obrigatorio',
      message: 'Informe o identificador de referência do pagamento.'
    });
  }

  try {
    const pagamentos = await mercadopagoService.buscarPagamentosPorReferencia(referenceId);

    if (!pagamentos || pagamentos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'pagamento_nao_encontrado',
        message: 'Nenhum pagamento encontrado para a referência informada.'
      });
    }

    const pagamentoMaisRecente = pagamentos[0];

    return res.json({
      success: true,
      payment: pagamentoMaisRecente,
      payments: pagamentos
    });
  } catch (error) {
    logger.error('Erro ao consultar pagamento por referência', {
      error: error.message,
      referenceId
    });

    return res.status(500).json({
      success: false,
      error: 'erro_ao_consultar_pagamento',
      message: error.message
    });
  }
});

/**
 * GET /api/payment/details/:paymentId
 * Consultar detalhes de um pagamento diretamente no Mercado Pago
 */
router.get('/details/:paymentId', optionalAuth, async (req, res) => {
  const { paymentId } = req.params;

  if (!paymentId) {
    return res.status(400).json({
      error: 'paymentId obrigatório',
      message: 'Informe o identificador do pagamento do Mercado Pago'
    });
  }

  try {
    const pagamento = await mercadopagoService.consultarPagamento(paymentId);

    return res.json({
      success: true,
      payment: pagamento
    });
  } catch (error) {
    logger.error('Erro ao consultar detalhes do pagamento', {
      error: error.message,
      paymentId
    });

    return res.status(500).json({
      success: false,
      error: 'Erro ao consultar pagamento',
      message: error.message
    });
  }
});

module.exports = router;


