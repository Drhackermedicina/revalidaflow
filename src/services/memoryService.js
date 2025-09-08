/**
 * Serviço para gerenciar memórias de correções no Firestore
 */
import { db } from '@/plugins/firebase.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, collection, getDocs, query, orderBy, limit, deleteDoc, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

class MemoryService {
  /**
   * Salvar contexto geral da estação
   */
  async saveStationContext(stationId, context, modelUsed = 'gemini-2.0-flash-exp') {
    try {
      const contextDoc = {
        estacao_uid: stationId,
        contexto_geral: context,
        data_criacao: serverTimestamp(),
        modelo_usado: modelUsed,
        versao: 1
      };

      await setDoc(doc(db, 'contextos_estacoes', stationId), contextDoc);
      console.log('✅ Contexto da estação salvo com sucesso');
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
        console.log('✅ Contexto da estação carregado');
        return contextDoc.data();
      }
      console.log('ℹ️ Nenhum contexto encontrado para a estação');
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
      console.log('💾 Salvando prompt na memória...', { stationId, promptData });

      if (!stationId || !promptData) {
        console.warn('⚠️ Dados insuficientes para salvar prompt:', { stationId, promptData: !!promptData });
        return null;
      }

      // 🔧 DEBUG: Verificar autenticação
      const currentUser = this.getCurrentUserId();
      console.log('🔐 Usuário atual:', currentUser);

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

      console.log('📤 Enviando para Firestore:', memoryEntry);
      await setDoc(memoryRef, memoryEntry);
      console.log('✅ Documento salvo no Firestore com ID:', memoryId);

      // Backup no localStorage
      await this.saveToLocalStorage(stationId, memoryEntry);

      console.log('✅ Prompt salvo na memória com sucesso!', memoryId);
      return memoryId;

    } catch (error) {
      console.error('❌ Erro ao salvar prompt no Firebase:', error);
      console.error('❌ Detalhes do erro:', error.message);
      console.error('❌ Stack trace:', error.stack);
      console.log('🔄 Tentando salvar no localStorage...');
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
      console.log('✅ Prompt salvo no localStorage');
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
      console.log('✅ Memórias carregadas do localStorage:', memories.length);
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
      console.log('🔍 Carregando memórias...', { stationId });

      if (!stationId) {
        console.warn('⚠️ StationId não fornecido para carregar memórias');
        return [];
      }

      // Verificar se usuário está autenticado
      const currentUser = this.getCurrentUserId();
      console.log('🔐 Usuário atual para carregar memórias:', currentUser);

      if (!currentUser) {
        console.warn('⚠️ Usuário não autenticado, usando memória local');
        return await this.loadFromLocalStorage(stationId);
      }

      console.log('🔍 Fazendo query no Firestore...');
      // 🔧 QUERY SIMPLES SEM ÍNDICE COMPOSTO
      const q = query(
        collection(db, 'memorias_prompts'),
        where('stationId', '==', stationId),
        limit(50)
      );
      const snapshot = await getDocs(q);

      console.log('📊 Snapshot recebido:', {
        size: snapshot.size,
        empty: snapshot.empty
      });

      const memories = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Documento encontrado:', { id: doc.id, data });
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

      console.log('✅ Memórias carregadas do Firebase:', memories.length);
      console.log('📋 Lista de memórias:', memories.map(m => ({ id: m.id, fieldName: m.fieldName, timestamp: m.timestamp })));

      return memories;

    } catch (error) {
      console.error('❌ Erro ao carregar memória do Firebase:', error);
      console.error('❌ Detalhes do erro:', error.message);
      console.error('❌ Stack trace:', error.stack);
      console.log('🔄 Tentando carregar do localStorage...');
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
      console.log('🔍 Buscando memórias relevantes...', { fieldName, itemIndex, currentStationId });

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

      console.log(`📊 Encontradas ${allMemories.length} memórias do usuário`);

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

      console.log(`✅ Encontradas ${relevantMemories.length} memórias relevantes:`,
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
