/**
 * Serviço para gerenciar memórias de correções no Firestore
 */
import { db } from '@/plugins/firebase.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, collection, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

class MemoryService {
  /**
   * Salvar contexto geral da estação
   */
  async saveStationContext(stationId, context, modelUsed = 'gemini-2.5-flash') {
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
        userId: this.getCurrentUserId(),
        type: 'correction'
      };

      await setDoc(memoryRef, memoryEntry);
      
      // Backup no localStorage
      await this.saveToLocalStorage(stationId, memoryEntry);
      
      console.log('✅ Prompt salvo na memória com sucesso!', memoryId);
      return memoryId;
      
    } catch (error) {
      console.error('❌ Erro ao salvar prompt no Firebase:', error);
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
      if (!currentUser) {
        console.warn('⚠️ Usuário não autenticado, usando memória local');
        return await this.loadFromLocalStorage(stationId);
      }

      // Usar subcoleção
      const memoryRef = doc(db, 'memorias_prompts', stationId);
      const promptsRef = collection(memoryRef, 'prompts');
      const q = query(promptsRef, orderBy('timestamp', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      
      const memories = [];
      snapshot.forEach((doc) => {
        memories.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('✅ Memórias carregadas do Firebase:', memories.length);
      return memories;
      
    } catch (error) {
      console.error('❌ Erro ao carregar memória do Firebase:', error);
      console.log('🔄 Tentando carregar do localStorage...');
      return await this.loadFromLocalStorage(stationId);
    }
  }

  /**
   * Obter memórias por campo específico
   */
  async getMemoriesByField(stationId, fieldName) {
    try {
      const memories = await this.loadMemories(stationId);
      return memories.filter(memory => memory.fieldName === fieldName);
    } catch (error) {
      console.error('❌ Erro ao filtrar memórias por campo:', error);
      return [];
    }
  }

  /**
   * Atualizar um prompt existente
   */
  async updatePrompt(stationId, promptId, updatedData) {
    try {
      const memoryRef = doc(db, 'memorias_prompts', stationId);
      const promptRef = doc(collection(memoryRef, 'prompts'), promptId);
      
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
      const memoryRef = doc(db, 'memorias_prompts', stationId);
      const promptRef = doc(collection(memoryRef, 'prompts'), promptId);
      
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
