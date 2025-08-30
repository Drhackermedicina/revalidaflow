// src/utils/editionStatus.js

/**
 * Função para verificar status de edição de uma estação.
 * Retorna objeto com: hasBeenEdited, totalEdits, lastEditDate, lastEditBy, createdDate, createdBy.
 * Suporta múltiplos formatos de dados (moderno, legacy, boolean, etc).
 * Exemplo de uso:
 *   import { verificarEdicaoHibrida } from '@/utils/editionStatus'
 *   const status = verificarEdicaoHibrida(station)
 */

const editStatusCache = new Map();

function clearEditStatusCache() {
  editStatusCache.clear();
}

function isValidTimestamp(timestamp) {
  if (!timestamp) return false;
  try {
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
  } catch {
    return false;
  }
}

function safeToISOString(timestamp) {
  try {
    if (!timestamp) return null;
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

export function verificarEdicaoHibrida(station) {
  const cacheKey = `${station.id}_${station.hasBeenEdited}_${station.atualizadoEmTimestamp}_${station.criadoEmTimestamp}`;
  if (editStatusCache.has(cacheKey)) {
    return editStatusCache.get(cacheKey);
  }

  let result;

  // 0. PRIORIDADE MÁXIMA: Campo hasBeenEdited do banco (após recálculo)
  if (typeof station.hasBeenEdited === 'boolean') {
    const lastEdit = station.editHistory && station.editHistory.length > 0 
      ? station.editHistory[station.editHistory.length - 1] 
      : null;
    result = {
      hasBeenEdited: station.hasBeenEdited,
      method: 'database',
      totalEdits: station.totalEdits || (station.editHistory ? station.editHistory.length : 0),
      lastEditDate: lastEdit?.timestamp || station.atualizadoEmTimestamp,
      lastEditBy: lastEdit?.editadoPor || station.atualizadoPor || station.criadoPor,
      createdDate: station.criadoEmTimestamp || station.dataCadastro,
      createdBy: station.criadoPor
    };
  }
  // 1. Verificação moderna (prioritária) - só se não tiver campo do banco
  else if (station.editHistory && Array.isArray(station.editHistory)) {
    const hasModernEdit = station.editHistory.length > 0;
    const lastEdit = hasModernEdit ? station.editHistory[station.editHistory.length - 1] : null;
    result = {
      hasBeenEdited: hasModernEdit,
      method: 'modern',
      totalEdits: station.editHistory.length,
      lastEditDate: lastEdit?.timestamp || null,
      lastEditBy: lastEdit?.editadoPor || null,
      createdDate: station.criadoEmTimestamp || station.dataCadastro || null,
      createdBy: station.criadoPor || null
    };
  }
  // 2. Verificação legacy (múltiplos formatos de campos)
  else {
    const criadoEm = station.criadoEmTimestamp || station.dataCadastro;
    const atualizadoEm = station.atualizadoEmTimestamp || station.dataUltimaAtualizacao;
    const editadoPor = station.atualizadoPor || station.editadoPor || station.criadoPor || null;

    if (isValidTimestamp(criadoEm) && isValidTimestamp(atualizadoEm)) {
      const cadastro = criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm);
      const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
      const hasLegacyEdit = ultimaAtualizacao.getTime() !== cadastro.getTime();
      result = {
        hasBeenEdited: hasLegacyEdit,
        method: 'legacy',
        totalEdits: hasLegacyEdit ? 1 : 0,
        lastEditDate: hasLegacyEdit ? ultimaAtualizacao : null,
        lastEditBy: hasLegacyEdit ? editadoPor : null,
        createdDate: cadastro,
        createdBy: station.criadoPor || editadoPor
      };
    } else if (isValidTimestamp(atualizadoEm)) {
      const ultimaAtualizacao = atualizadoEm.toDate ? atualizadoEm.toDate() : new Date(atualizadoEm);
      result = {
        hasBeenEdited: true,
        method: 'legacy',
        totalEdits: 1,
        lastEditDate: ultimaAtualizacao,
        lastEditBy: editadoPor,
        createdDate: null,
        createdBy: station.criadoPor || editadoPor
      };
    }
    // 3. Verificação por campo hasBeenEdited isolado
    else if (station.hasBeenEdited !== undefined) {
      result = {
        hasBeenEdited: !!station.hasBeenEdited,
        method: 'boolean',
        totalEdits: station.hasBeenEdited ? 1 : 0,
        lastEditDate: null,
        lastEditBy: editadoPor,
        createdDate: criadoEm ? (criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm)) : null,
        createdBy: station.criadoPor || editadoPor
      };
    }
    // 4. Padrão: não editada
    else {
      result = {
        hasBeenEdited: false,
        method: 'none',
        totalEdits: 0,
        lastEditDate: null,
        lastEditBy: null,
        createdDate: criadoEm ? (isValidTimestamp(criadoEm) ? (criadoEm.toDate ? criadoEm.toDate() : new Date(criadoEm)) : null) : null,
        createdBy: station.criadoPor || null
      };
    }
  }

  editStatusCache.set(cacheKey, result);
  return result;
}

export { clearEditStatusCache };
