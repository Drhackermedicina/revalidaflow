import { db } from '@/plugins/firebase';
import { arrayUnion, doc, getDoc, runTransaction, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Registra a conclusão/avaliação de uma estação por um usuário.
 * Atualiza a estação (média, total, lista de usuários) e o usuário (histórico, nível).
 * @param {Object} params - Parâmetros da avaliação
 * @param {string} params.uid - ID do usuário
 * @param {string} params.idEstacao - ID da estação
 * @param {number} params.nota - Nota atribuída
 * @param {Date} params.data - Data da avaliação
 * @param {boolean} [params.useTransaction=false] - Se deve usar transação (padrão: false)
 */
export async function registrarConclusaoEstacao({ uid, idEstacao, nota, data, useTransaction = false }) {
  if (!uid || !idEstacao || typeof nota !== 'number' || !data) {
    throw new Error('Parâmetros inválidos: uid, idEstacao, nota e data são obrigatórios.');
  }

  if (!useTransaction) {
    try {
      const usuarioRef = doc(db, 'usuarios', uid);
      const estacaoRef = doc(db, 'estacoes_clinicas', idEstacao);
      
      // Buscar dados atuais do usuário e da estação
      const [usuarioSnap, estacaoSnap] = await Promise.all([
        getDoc(usuarioRef),
        getDoc(estacaoRef)
      ]);
      
      if (!usuarioSnap.exists()) throw new Error('Usuário não encontrado.');
      if (!estacaoSnap.exists()) throw new Error('Estação não encontrada.');
      
      const usuarioData = usuarioSnap.data();
      const estacaoData = estacaoSnap.data();
      
      // Criar registro para o array estacoesConcluidas
      const registro = {
        idEstacao,
        nota,
        data: data instanceof Date ? Timestamp.fromDate(data) : data,
        nomeEstacao: estacaoData.tituloEstacao || 'Estação sem título',
        especialidade: estacaoData.especialidade || 'Não especificada',
        origem: estacaoData.origem || 'Desconhecida'
      };
      
      // Calcular nivelHabilidade
      const estacoesConcluidas = Array.isArray(usuarioData.estacoesConcluidas) 
        ? usuarioData.estacoesConcluidas : [];
      
      const novaLista = [...estacoesConcluidas, registro];
      const somaNotas = novaLista.reduce((acc, item) => acc + (item.nota || 0), 0);
      const nivelHabilidade = novaLista.length ? somaNotas / novaLista.length : 0;
      
      // Atualizar estatísticas
      const statistics = usuarioData.statistics || {};
      
      // Estatísticas por especialidade
      const especialidadeStats = statistics[estacaoData.especialidade] || {
        total: 0,
        concluidas: 0,
        somaNotas: 0,
        mediaNotas: 0
      };
      
      especialidadeStats.total = (especialidadeStats.total || 0) + 1;
      especialidadeStats.concluidas = (especialidadeStats.concluidas || 0) + 1;
      especialidadeStats.somaNotas = (especialidadeStats.somaNotas || 0) + nota;
      especialidadeStats.mediaNotas = especialidadeStats.somaNotas / especialidadeStats.concluidas;
      
      statistics[estacaoData.especialidade] = especialidadeStats;
      
      // Estatísticas gerais
      const geral = statistics.geral || {
        total: 0,
        concluidas: 0,
        somaNotas: 0,
        mediaNotas: 0
      };
      
      geral.total = (geral.total || 0) + 1;
      geral.concluidas = (geral.concluidas || 0) + 1;
      geral.somaNotas = (geral.somaNotas || 0) + nota;
      geral.mediaNotas = geral.somaNotas / geral.concluidas;
      
      statistics.geral = geral;
      
      // Cálculo do ranking (baseado no número de estações e média de notas)
      // Fórmula: (número de estações concluídas * 5) + (média de notas * 10)
      const ranking = (novaLista.length * 5) + (nivelHabilidade * 10);
      
      // Atualizar documento do usuário
      await setDoc(usuarioRef, {
        estacoesConcluidas: arrayUnion(registro),
        statistics,
        nivelHabilidade,
        ranking,
        status: 'disponivel' // Atualiza status após concluir a avaliação
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('Erro ao registrar conclusão da estação (método simples):', error);
      throw error;
    }
  }

  const estacaoRef = doc(db, 'estacoes_clinicas', idEstacao);
  const usuarioRef = doc(db, 'usuarios', uid);

  try {
    await runTransaction(db, async (transaction) => {
      const estacaoSnap = await transaction.get(estacaoRef);
      const usuarioSnap = await transaction.get(usuarioRef);

      if (!estacaoSnap.exists()) throw new Error('Estação não encontrada.');
      if (!usuarioSnap.exists()) throw new Error('Usuário não encontrado.');

      // Dados da estação
      const estacaoDataTx = estacaoSnap.data();
      const totalAvaliacoes = (estacaoDataTx.totalAvaliacoes || 0) + 1;
      const somaNotas = (estacaoDataTx.mediaNotas || 0) * (estacaoDataTx.totalAvaliacoes || 0) + nota;
      const novaMedia = somaNotas / totalAvaliacoes;

      // Dados do usuário
      const usuarioData = usuarioSnap.data();
      const estacoesConcluidas = Array.isArray(usuarioData.estacoesConcluidas) ? usuarioData.estacoesConcluidas : [];
      const novaLista = [...estacoesConcluidas, { 
        idEstacao, 
        nota, 
        data: data instanceof Date ? Timestamp.fromDate(data) : data,
        nomeEstacao: estacaoDataTx.tituloEstacao || 'Estação sem título',
        especialidade: estacaoDataTx.especialidade || 'Não especificada',
        origem: estacaoDataTx.origem || 'Desconhecida'
      }];
      const somaNotasUser = novaLista.reduce((acc, item) => acc + (item.nota || 0), 0);
      const nivelHabilidade = novaLista.length ? somaNotasUser / novaLista.length : 0;
      
      // Atualizar estatísticas
      const statistics = usuarioData.statistics || {};
      
      // Estatísticas por especialidade
      const especialidadeStats = statistics[estacaoDataTx.especialidade] || {
        total: 0,
        concluidas: 0,
        somaNotas: 0,
        mediaNotas: 0
      };
      
      especialidadeStats.total = (especialidadeStats.total || 0) + 1;
      especialidadeStats.concluidas = (especialidadeStats.concluidas || 0) + 1;
      especialidadeStats.somaNotas = (especialidadeStats.somaNotas || 0) + nota;
      especialidadeStats.mediaNotas = especialidadeStats.somaNotas / especialidadeStats.concluidas;
      
      statistics[estacaoDataTx.especialidade] = especialidadeStats;
      
      // Estatísticas gerais
      const geral = statistics.geral || {
        total: 0,
        concluidas: 0,
        somaNotas: 0,
        mediaNotas: 0
      };
      
      geral.total = (geral.total || 0) + 1;
      geral.concluidas = (geral.concluidas || 0) + 1;
      geral.somaNotas = (geral.somaNotas || 0) + nota;
      geral.mediaNotas = geral.somaNotas / geral.concluidas;
      
      statistics.geral = geral;
      
      // Cálculo do ranking (baseado no número de estações e média de notas)
      // Fórmula: (número de estações concluídas * 5) + (média de notas * 10)
      const ranking = (novaLista.length * 5) + (nivelHabilidade * 10);

      transaction.update(estacaoRef, {
        totalAvaliacoes,
        mediaNotas: novaMedia,
        usuariosQueConcluíram: arrayUnion({ uid, nota, data }),
      });

      transaction.update(usuarioRef, {
        estacoesConcluidas: arrayUnion({ 
          idEstacao, 
          nota, 
          data: data instanceof Date ? Timestamp.fromDate(data) : data,
          nomeEstacao: estacaoDataTx.tituloEstacao || 'Estação sem título',
          especialidade: estacaoDataTx.especialidade || 'Não especificada',
          origem: estacaoDataTx.origem || 'Desconhecida'
        }),
        nivelHabilidade,
        statistics,
        ranking,
        status: 'disponivel' // Atualiza status após concluir a avaliação
      });
    });

    return true;
  } catch (error) {
    console.error('Erro ao registrar conclusão da estação (método com transação):', error);
    throw error;
  }
}

// Usar método simples (apenas registra a avaliação)
// await registrarConclusaoEstacao({
//   uid: currentUser.value.uid,
//   idEstacao: stationId.value,
//   nota: totalScore.value,
//   data: new Date()
// });

// OU usar transação completa (atualiza estatísticas)
// await registrarConclusaoEstacao({
//   uid: currentUser.value.uid,
//   idEstacao: stationId.value,
//   nota: totalScore.value,
//   data: new Date(),
