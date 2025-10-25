import { collection, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/plugins/firebase.js'
import Logger from '@/utils/logger'

const logger = new Logger('simulationInviteCleanup')

/**
 * Remove convites pendentes da coleção `simulationInvites`.
 * Aceita parâmetros opcionais para restringir a query e evitar exclusões indevidas.
 *
 * @param {Object} params
 * @param {string} params.candidateUid - UID do candidato (obrigatório).
 * @param {string} [params.senderUid] - UID de quem enviou o convite.
 * @param {string} [params.stationTitle] - Título da estação (apenas para filtros específicos).
 * @param {string} [params.inviteLink] - Link único gerado para o convite.
 * @returns {Promise<number>} Número de convites removidos.
 */
export async function deleteInviteFromFirestore({
  candidateUid,
  senderUid,
  stationTitle,
  inviteLink
} = {}) {
  if (!candidateUid) {
    logger.warn('deleteInviteFromFirestore chamado sem candidateUid. Abortando limpeza.')
    return 0
  }

  try {
    const invitesRef = collection(db, 'simulationInvites')
    const filters = [
      where('candidateUid', '==', candidateUid),
      where('status', '==', 'pending')
    ]

    if (senderUid) {
      filters.push(where('senderUid', '==', senderUid))
    }

    if (stationTitle) {
      filters.push(where('stationTitle', '==', stationTitle))
    }

    if (inviteLink) {
      filters.push(where('inviteLink', '==', inviteLink))
    }

    const invitesQuery = query(invitesRef, ...filters)
    const snapshot = await getDocs(invitesQuery)

    if (snapshot.empty) {
      return 0
    }

    await Promise.all(snapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref)))

    return snapshot.docs.length
  } catch (error) {
    logger.error('Erro ao deletar convites pendentes do Firestore:', error)
    throw error
  }
}
