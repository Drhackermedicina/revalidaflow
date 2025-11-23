/**
 * Serviço para gerenciar memórias de correções no Firestore
 */
import { db } from '@/plugins/firebase.js';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy, limit, deleteDoc, where, addDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Debug flag (controla logs verbosos). Pode ser ativado via Vite env VITE_AI_DEBUG='true' ou
// colocando window.AI_FIELD_ASSISTANT_DEBUG = true no devtools, ou localStorage.setItem('AI_DEBUG','1')
const DEBUG = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_AI_DEBUG === 'true' || import.meta.env.VITE_AI_DEBUG === '1')) return true
  } catch (e) { }
  try {
    if (typeof window !== 'undefined') {
      if (window.AI_FIELD_ASSISTANT_DEBUG) return true
      if (localStorage.getItem && localStorage.getItem('AI_DEBUG') === '1') return true
    }
  } catch (e) { }
  return false
})();

const dLog = (...args) => { if (DEBUG) console.log(...args) }
const dWarn = (...args) => { if (DEBUG) console.warn(...args) }

class MemoryService {
  constructor() {
    // Cache simples para reduzir queries repetidas ao Firestore (stationId -> { ts, value })
    this._cache = new Map()
    // TTL do cache em ms
    this._cacheTTL = 15 * 1000 // 15s
  }
  /**
   * Salvar contexto geral da estação
   */
  async saveStationContext(stationId, context, modelUsed = 'gemini-2.5-flash-lite') {
    try {
      const contextDoc = {
        estacao_uid: stationId,
        contexto_geral: context,
        data_criacao: serverTimestamp(),
        modelo_usado: modelUsed,
        versao: 1
      };

      await setDoc(doc(db, 'contextos_estacoes', stationId), contextDoc);
      dLog('✅ Contexto da estação salvo com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar contexto da estação:', error);
      return false;
    }
  }

  /**
   * Carregar contexto da estação
   */
  async loadStationContext(stationId) {
    try {
      const contextDoc = await getDoc(doc(db, 'contextos_estacoes', stationId));
      if (contextDoc.exists()) {
        dLog('✅ Contexto da estação carregado');
        return contextDoc.data();
      }
      dLog('ℹ️ Nenhum contexto encontrado para a estação');
      return null;
    } catch (error) {
      console.error('❌ Erro ao carregar contexto da estação:', error);
      return null;
    }
  }

  /**
   * Salvar prompt na memória usando coleção simples (como o contexto)
   */
  async savePrompt(stationId, promptData) {
    try {
      dLog('💾 Salvando prompt na memória...', { stationId, promptData });

      if (!stationId || !promptData) {
        console.warn('⚠️ Dados insuficientes para salvar prompt:', { stationId, promptData: !!promptData });
        return null;
      }

      // 🔧 DEBUG: Verificar autenticação
      const currentUser = this.getCurrentUserId();
      dLog('🔐 Usuário atual:', currentUser);

      if (!currentUser) {
        console.warn('⚠️ Usuário não autenticado! Salvando apenas no localStorage');
        return await this.saveToLocalStorage(stationId, {
          stationId,
          fieldName: promptData.fieldName || '',
          itemIndex: promptData.itemIndex || null,
          title: promptData.title || '',
          userRequest: promptData.userRequest || '',
          originalValue: promptData.originalValue || '',
          correctedValue: promptData.correctedValue || '',
          timestamp: new Date().toISOString(),
          userId: 'local-user'
        });
      }

      // 🔧 USAR COLEÇÃO SIMPLES como o contexto
      const memoryId = `${stationId}_${Date.now()}`;
      const memoryRef = doc(db, 'memorias_prompts', memoryId);

      const memoryEntry = {
        stationId,
        fieldName: promptData.fieldName || '',
        itemIndex: promptData.itemIndex || null,
        title: promptData.title || '',
        userRequest: promptData.userRequest || '',
        originalValue: promptData.originalValue || '',
        correctedValue: promptData.correctedValue || '',
        timestamp: serverTimestamp(),
        userId: currentUser,
        type: 'correction'
      };

      dLog('📤 Enviando para Firestore:', memoryEntry);
      await setDoc(memoryRef, memoryEntry);
      dLog('✅ Documento salvo no Firestore com ID:', memoryId);

      // Backup no localStorage
      await this.saveToLocalStorage(stationId, memoryEntry);

      // Invalidar cache para stationId para próxima leitura
      try { this._cache.delete(stationId) } catch (e) { }

      dLog('✅ Prompt salvo na memória com sucesso!', memoryId);
      return memoryId;

    } catch (error) {
      console.error('❌ Erro ao salvar prompt no Firebase:', error);
      console.error('❌ Detalhes do erro:', error.message);
      // Não imprimir stack trace em excesso no console do usuário em produção
      if (DEBUG) console.error('❌ Stack trace:', error.stack);
      dLog('🔄 Tentando salvar no localStorage...');
      return await this.saveToLocalStorage(stationId, {
        stationId,
        fieldName: promptData.fieldName || '',
        itemIndex: promptData.itemIndex || null,
        title: promptData.title || '',
        userRequest: promptData.userRequest || '',
        originalValue: promptData.originalValue || '',
        correctedValue: promptData.correctedValue || '',
        timestamp: new Date().toISOString(),
        userId: 'local-user'
      });
    }
  }

  /**
   * Salvar no localStorage como fallback
   */
  async saveToLocalStorage(stationId, memoryEntry) {
    try {
      const key = `prompts_${stationId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift({
        id: Date.now().toString(),
        ...memoryEntry
      });

      // Manter apenas os últimos 50
      if (existing.length > 50) {
        existing.splice(50);
      }

      localStorage.setItem(key, JSON.stringify(existing));
      dLog('✅ Prompt salvo no localStorage');
      return Date.now().toString();

    } catch (error) {
      console.error('❌ Erro ao salvar no localStorage:', error);
      return null;
    }
  }

  /**
   * Carregar do localStorage como fallback
   */
  async loadFromLocalStorage(stationId) {
    try {
      const key = `prompts_${stationId}`;
      const data = localStorage.getItem(key);
      const memories = data ? JSON.parse(data) : [];
      dLog('✅ Memórias carregadas do localStorage:', memories.length);
      return memories;

    } catch (error) {
      console.error('❌ Erro ao carregar do localStorage:', error);
      return [];
    }
  }

  /**
   * Carregar memórias de prompts
   */
  async loadMemories(stationId) {
    try {
      dLog('🔍 Carregando memórias...', { stationId });

      if (!stationId) {
        console.warn('⚠️ StationId não fornecido para carregar memórias');
        return [];
      }

      // Verificar cache simples
      try {
        const cached = this._cache.get(stationId)
        if (cached && (Date.now() - cached.ts) < this._cacheTTL) {
          dLog('♻️ Retornando memórias do cache para', stationId)
          return cached.value
        }
      } catch (e) { dWarn('Erro ao ler cache:', e) }

      // Verificar se Firestore está disponível
      if (!db) {
        console.warn('⚠️ Firestore não está disponível, usando memória local');
        return await this.loadFromLocalStorage(stationId);
      }

      // Verificar se usuário está autenticado
      const currentUser = this.getCurrentUserId();
      dLog('🔐 Usuário atual para carregar memórias:', currentUser);

      if (!currentUser) {
        console.warn('⚠️ Usuário não autenticado, usando memória local');
        return await this.loadFromLocalStorage(stationId);
      }

      dLog('🔍 Fazendo query no Firestore...');
      // 🔧 QUERY SIMPLES SEM ÍNDICE COMPOSTO com timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore query timeout')), 10000)
      );

      const firestorePromise = getDocs(query(
        collection(db, 'memorias_prompts'),
        where('stationId', '==', stationId),
        limit(50)
      ));

      const snapshot = await Promise.race([firestorePromise, timeoutPromise]);

      dLog('📊 Snapshot recebido:', {
        size: snapshot.size,
        empty: snapshot.empty
      });

      const memories = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        dLog('📄 Documento encontrado:', { id: doc.id, data });
        memories.push({
          id: doc.id,
          ...data
        });
      });

      // Ordenar no cliente ao invés do servidor
      memories.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA; // Mais recente primeiro
      });

      dLog('✅ Memórias carregadas do Firebase:', memories.length);
      dLog('📋 Lista de memórias:', memories.map(m => ({ id: m.id, fieldName: m.fieldName, timestamp: m.timestamp })));

      // Salvar no cache
      try { this._cache.set(stationId, { ts: Date.now(), value: memories }) } catch (e) { dWarn('Erro ao setar cache:', e) }

      return memories;

    } catch (error) {
      console.error('❌ Erro ao carregar memória do Firebase:', error);
      console.error('❌ Detalhes do erro:', error.message);
      if (DEBUG) console.error('❌ Stack trace:', error.stack);
      dLog('🔄 Tentando carregar do localStorage...');
      return await this.loadFromLocalStorage(stationId);
    }
  }

  /**
   * 💾 Salvar orientações personalizadas do usuário
   * @param {string} stationId - ID da estação
   * @param {Object} guidelines - Orientações personalizadas
   */
  async saveCustomGuidelines(stationId, guidelines) {
    try {
      const customGuidelines = {
        stationId,
        guidelines,
        timestamp: new Date().toISOString(),
        type: 'custom_guidelines'
      }

      // Salvar no Firebase
      const docRef = await addDoc(collection(db, 'custom_guidelines'), customGuidelines)
      console.log('✅ Orientações personalizadas salvas:', docRef.id)

      // Backup no localStorage
      this.saveCustomGuidelinesToLocal(stationId, guidelines)

      return docRef.id
    } catch (error) {
      console.error('❌ Erro ao salvar orientações:', error)
      // Fallback para localStorage
      this.saveCustomGuidelinesToLocal(stationId, guidelines)
    }
  }

  /**
   * 📚 Carregar orientações personalizadas
   * @param {string} stationId - ID da estação
   */
  async loadCustomGuidelines(stationId) {
    try {
      const q = query(
        collection(db, 'custom_guidelines'),
        where('stationId', '==', stationId),
        limit(10)
      )

      const snapshot = await getDocs(q)
      const guidelines = []

      snapshot.forEach(doc => {
        guidelines.push({
          id: doc.id,
          ...doc.data()
        })
      })

      return guidelines
    } catch (error) {
      console.error('❌ Erro ao carregar orientações:', error)
      return this.loadCustomGuidelinesFromLocal(stationId)
    }
  }

  // LocalStorage helpers para orientações
  saveCustomGuidelinesToLocal(stationId, guidelines) {
    try {
      const key = `custom_guidelines_${stationId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      existing.push({
        guidelines,
        timestamp: new Date().toISOString()
      })
      localStorage.setItem(key, JSON.stringify(existing))
    } catch (error) {
      console.error('❌ Erro ao salvar orientações no localStorage:', error)
    }
  }

  loadCustomGuidelinesFromLocal(stationId) {
    try {
      const key = `custom_guidelines_${stationId}`
      return JSON.parse(localStorage.getItem(key) || '[]')
    } catch (error) {
      console.error('❌ Erro ao carregar orientações do localStorage:', error)
      return []
    }
  }

  /**
   * Obter memórias relevantes (inteligente) - busca em todas as estações
   */
  async getRelevantMemories(fieldName, itemIndex = null, currentStationId = null) {
    try {
      dLog('🔍 Buscando memórias relevantes...', { fieldName, itemIndex, currentStationId });

      const currentUser = this.getCurrentUserId();
      if (!currentUser) {
        console.warn('⚠️ Usuário não autenticado, usando memória local');
        return await this.loadFromLocalStorage(currentStationId || 'all');
      }

      // 🔧 QUERY SIMPLIFICADA - Buscar todas as memórias e filtrar no cliente
      // (evita necessidade de índice composto)
      const q = query(
        collection(db, 'memorias_prompts'),
        orderBy('timestamp', 'desc'),
        limit(200) // Buscar mais para ter margem de filtragem
      );

      const snapshot = await getDocs(q);
      const allMemories = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        // 🔍 FILTRAR APENAS MEMÓRIAS DO USUÁRIO ATUAL
        if (data.userId === currentUser) {
          allMemories.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
          });
        }
      });

      dLog(`📊 Encontradas ${allMemories.length} memórias do usuário`);

      // 🔍 FILTRAR E PONTUAR MEMÓRIAS POR RELEVÂNCIA
      const scoredMemories = allMemories.map(memory => {
        let score = 0;
        let relevanceReason = '';

        // Mesmo campo = alta pontuação
        if (memory.fieldName === fieldName) {
          score += 100;
          relevanceReason = 'Mesmo campo';
        }

        // Mesmo itemIndex = alta pontuação
        if (memory.itemIndex === itemIndex && itemIndex !== null) {
          score += 80;
          relevanceReason = relevanceReason ? `${relevanceReason} + Mesmo item` : 'Mesmo item';
        }

        // Campos similares (ex: informacoesVerbaisSimulado com outros campos similares)
        if (this.areFieldsSimilar(memory.fieldName, fieldName)) {
          score += 50;
          relevanceReason = relevanceReason ? `${relevanceReason} + Campo similar` : 'Campo similar';
        }

        // Penalizar memórias da mesma estação (menos relevantes se já temos do mesmo campo)
        if (memory.stationId === currentStationId) {
          score -= 10;
          relevanceReason = `${relevanceReason} (mesma estação)`;
        }

        // Bonus por recência (últimos 30 dias)
        const daysSince = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) {
          score += Math.max(0, 30 - daysSince);
        }

        return {
          ...memory,
          relevanceScore: score,
          relevanceReason
        };
      });

      // 🔄 FILTRAR APENAS MEMÓRIAS RELEVANTES (score > 0) E ORDENAR
      const relevantMemories = scoredMemories
        .filter(memory => memory.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 20); // Top 20 mais relevantes

      dLog(`✅ Encontradas ${relevantMemories.length} memórias relevantes:`,
        relevantMemories.map(m => `${m.title} (${m.relevanceReason}, score: ${m.relevanceScore})`));

      return relevantMemories;

    } catch (error) {
      console.error('❌ Erro ao buscar memórias relevantes:', error);
      return [];
    }
  }

  /**
   * Verificar se dois campos são similares
   */
  areFieldsSimilar(field1, field2) {
    if (!field1 || !field2) return false;

    // Mesmos campos são similares
    if (field1 === field2) return true;

    // Campos relacionados a informações verbais
    const verbalFields = ['informacoesVerbaisSimulado', 'roteiroCandidato', 'informacoesVerbais'];
    if (verbalFields.includes(field1) && verbalFields.includes(field2)) return true;

    // Campos relacionados a impressos
    if (field1.includes('impresso') && field2.includes('impresso')) return true;

    // Campos relacionados a avaliação/procedimento
    const procedureFields = ['padraoEsperadoProcedimento', 'tarefasPrincipais', 'procedimento'];
    if (procedureFields.some(f => field1.includes(f)) && procedureFields.some(f => field2.includes(f))) return true;

    return false;
  }

  /**
   * Atualizar um prompt existente
   */
  async updatePrompt(stationId, promptId, updatedData) {
    try {
      // Usar coleção simples 'memorias_prompts' com ID direto do documento
      const promptRef = doc(db, 'memorias_prompts', promptId);

      await updateDoc(promptRef, {
        ...updatedData,
        timestamp: serverTimestamp()
      });

      console.log('✅ Prompt atualizado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao atualizar prompt:', error);
      return false;
    }
  }

  /**
   * Deletar um prompt
   */
  async deletePrompt(stationId, promptId) {
    try {
      // Usar coleção simples 'memorias_prompts' com ID direto do documento
      const promptRef = doc(db, 'memorias_prompts', promptId);

      await deleteDoc(promptRef);

      console.log('✅ Prompt deletado com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao deletar prompt:', error);
      return false;
    }
  }

  /**
   * Salvar uma sugestão aplicada (histórico por campo)
   * @param {string} stationId
   * @param {Object} suggestionData - { fieldName, itemIndex, suggestion, originalValue, source }
   */
  async saveAppliedSuggestion(stationId, suggestionData) {
    try {
      if (!stationId || !suggestionData) {
        dWarn('saveAppliedSuggestion: dados insuficientes', { stationId, suggestionData });
        return null;
      }

      const currentUser = this.getCurrentUserId() || 'local-user';

      const entry = {
        stationId,
        fieldName: suggestionData.fieldName || '',
        itemIndex: suggestionData.itemIndex ?? null,
        suggestion: suggestionData.suggestion || '',
        originalValue: suggestionData.originalValue || '',
        newValue: suggestionData.newValue || suggestionData.suggestion || '',
        source: suggestionData.source || 'unknown',
        userId: currentUser,
        timestamp: serverTimestamp(),
        type: 'applied_suggestion'
      };

      // Tentar salvar no Firestore
      try {
        const ref = await addDoc(collection(db, 'suggestions_history'), entry);
        dLog('✅ Applied suggestion salvo no Firestore:', ref.id);
        // Invalidar cache da estação
        try { this._cache.delete(stationId) } catch (e) { }
        return ref.id;
      } catch (e) {
        dWarn('Erro ao salvar applied suggestion no Firestore, salvando localmente:', e);
        // Fallback para localStorage
        const key = `applied_suggestions_${stationId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift({ id: Date.now().toString(), ...entry, timestamp: new Date().toISOString() });
        if (existing.length > 100) existing.splice(100);
        localStorage.setItem(key, JSON.stringify(existing));
        return Date.now().toString();
      }

    } catch (error) {
      console.error('❌ Erro em saveAppliedSuggestion:', error);
      return null;
    }
  }

  /**
   * Carregar histórico de sugestões aplicadas para um campo
   * @param {string} stationId
   * @param {string} fieldName
   * @param {number|null} itemIndex
   */
  async loadAppliedSuggestions(stationId, fieldName, itemIndex = null) {
    try {
      if (!stationId) return [];

      // Usuário não autenticado: carregar do localStorage
      const currentUser = this.getCurrentUserId();
      if (!currentUser) {
        dWarn('Usuário não autenticado, carregando applied suggestions do localStorage');
        const key = `applied_suggestions_${stationId}`;
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return data.filter(d => (!fieldName || d.fieldName === fieldName) && (itemIndex === null || d.itemIndex === itemIndex));
      }

      // Query no Firestore
      const q = query(
        collection(db, 'suggestions_history'),
        where('stationId', '==', stationId),
        where('fieldName', '==', fieldName),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(q);
      const results = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Filtrar por itemIndex se fornecido
        if (itemIndex === null || data.itemIndex === itemIndex) {
          results.push({ id: doc.id, ...data, timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp) });
        }
      });

      return results;
    } catch (error) {
      console.error('❌ Erro ao carregar applied suggestions:', error);
      return [];
    }
  }

  /**
   * Obter ID do usuário atual
   */
  getCurrentUserId() {
    try {
      const auth = getAuth();
      return auth.currentUser?.uid || null;
    } catch (error) {
      console.error('❌ Erro ao obter usuário atual:', error);
      return null;
    }
  }
}

// Exportar instância única (singleton)
export default new MemoryService();
