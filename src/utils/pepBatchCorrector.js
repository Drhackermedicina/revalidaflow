import { db } from '@/plugins/firebase.js';
import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { validateAndCorrectPEP } from './pepCorrector.js';

/**
 * Utilitário para correção em lote de pontuações PEP
 */
export class PEPBatchCorrector {
  constructor() {
    this.isRunning = false;
    this.progress = {
      total: 0,
      processed: 0,
      corrected: 0,
      errors: 0,
      currentStation: null
    };
    this.results = [];
    this.callbacks = {
      onProgress: null,
      onComplete: null,
      onError: null
    };
  }

  /**
   * Registra callbacks para acompanhar progresso
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Executa correção em lote de todas as estações
   */
  async correctAllStations() {
    if (this.isRunning) {
      throw new Error('Correção em lote já está em execução');
    }

    this.isRunning = true;
    this.progress = {
      total: 0,
      processed: 0,
      corrected: 0,
      errors: 0,
      currentStation: null
    };
    this.results = [];

    try {
      // Busca todas as estações
      const stationsRef = collection(db, 'estacoes_clinicas');
      const querySnapshot = await getDocs(stationsRef);
      
      this.progress.total = querySnapshot.size;
      this._notifyProgress();

      // Processa cada estação
      for (const docSnapshot of querySnapshot.docs) {
        try {
          const stationData = { id: docSnapshot.id, ...docSnapshot.data() };
          this.progress.currentStation = stationData.tituloEstacao || `Estação ${stationData.id}`;
          this._notifyProgress();

          // Verifica se precisa de correção
          const needsCorrection = await this._needsCorrection(stationData);
          
          if (needsCorrection) {
            // Aplica correção PEP
            const correctedStation = validateAndCorrectPEP(stationData);
            
            // Prepara dados para salvar
            const dataToSave = { ...correctedStation };
            delete dataToSave.id;
            delete dataToSave.correctionLog;
            
            // Salva no Firebase
            await updateDoc(docSnapshot.ref, dataToSave);
            
            this.progress.corrected++;
            this.results.push({
              id: stationData.id,
              title: stationData.tituloEstacao || 'Sem título',
              status: 'corrected',
              originalScore: this._getTotalScore(stationData),
              newScore: correctedStation.padraoEsperadoProcedimento?.pontuacaoTotalEstacao || 10.0,
              log: correctedStation.correctionLog || ''
            });
          } else {
            this.results.push({
              id: stationData.id,
              title: stationData.tituloEstacao || 'Sem título',
              status: 'skipped',
              originalScore: this._getTotalScore(stationData),
              newScore: this._getTotalScore(stationData),
              log: 'Pontuação já estava correta'
            });
          }
          
        } catch (error) {
          this.progress.errors++;
          this.results.push({
            id: docSnapshot.id,
            title: 'Erro ao processar',
            status: 'error',
            originalScore: 0,
            newScore: 0,
            log: error.message
          });
        }

        this.progress.processed++;
        this._notifyProgress();
      }

      this._notifyComplete();
      return this.results;

    } catch (error) {
      this._notifyError(error);
      throw error;
    } finally {
      this.isRunning = false;
      this.progress.currentStation = null;
    }
  }

  /**
   * Verifica se uma estação precisa de correção
   */
  async _needsCorrection(stationData) {
    const totalScore = this._getTotalScore(stationData);
    const tolerance = 0.01;
    
    // Verifica se a pontuação total não é exatamente 10.0
    if (Math.abs(totalScore - 10.0) > tolerance) {
      return true;
    }

    // Verifica se há pontuações não quantizadas (não múltiplas de 0.25)
    const items = stationData.padraoEsperadoProcedimento?.itensAvaliacao || [];
    for (const item of items) {
      const adequado = item.pontuacoes?.adequado?.pontos || 0;
      const parcial = item.pontuacoes?.parcialmenteAdequado?.pontos || 0;
      const inadequado = item.pontuacoes?.inadequado?.pontos || 0;
      
      if (adequado > 2.0 || 
          Math.abs(adequado - Math.round(adequado * 4) / 4) > 0.001 ||
          Math.abs(parcial - Math.round(parcial * 4) / 4) > 0.001 ||
          Math.abs(inadequado - Math.round(inadequado * 4) / 4) > 0.001) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calcula pontuação total atual
   */
  _getTotalScore(stationData) {
    const items = stationData.padraoEsperadoProcedimento?.itensAvaliacao || [];
    return items.reduce((sum, item) => sum + (item.pontuacoes?.adequado?.pontos || 0), 0);
  }

  /**
   * Notifica progresso
   */
  _notifyProgress() {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress({ ...this.progress });
    }
  }

  /**
   * Notifica conclusão
   */
  _notifyComplete() {
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete({
        results: this.results,
        summary: {
          total: this.progress.total,
          processed: this.progress.processed,
          corrected: this.progress.corrected,
          errors: this.progress.errors,
          skipped: this.progress.processed - this.progress.corrected - this.progress.errors
        }
      });
    }
  }

  /**
   * Notifica erro
   */
  _notifyError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  /**
   * Gera relatório detalhado
   */
  generateReport() {
    const summary = {
      total: this.progress.total,
      processed: this.progress.processed,
      corrected: this.progress.corrected,
      errors: this.progress.errors,
      skipped: this.progress.processed - this.progress.corrected - this.progress.errors
    };

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.results,
      corrections: this.results.filter(r => r.status === 'corrected'),
      errors: this.results.filter(r => r.status === 'error'),
      skipped: this.results.filter(r => r.status === 'skipped')
    };

    return report;
  }
}

// Instância singleton para uso global
export const pepBatchCorrector = new PEPBatchCorrector();
