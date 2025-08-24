
import { computed } from 'vue';

// Esta função será o nosso composable principal
export function useTextFormatting(isActorOrEvaluator) {

  // Função para formatar texto do roteiro do ator
  function formatActorText(text) {
    if (!text) return '';
    
    // Remove tags HTML existentes mantendo o texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    let plainText = tempDiv.innerText;
    
    // Remove aspas simples apenas para ator/avaliador
    // Acessa o valor do ref/computed passado como argumento
    if (isActorOrEvaluator.value) {
      plainText = plainText.replace(/'/g, '');
    }
    
    // Separa o texto em linhas, considerando múltiplos tipos de quebras
    const lines = plainText
      .split(/[
]+/)
      .map(line => line.trim())
      .filter(line => line);
    
    // Formata cada linha e seus subitens
    const formattedLines = lines.map(line => {
      // Verifica se é um caso de "HISTÓRIA DA DOENÇA ATUAL - X"
      const hdaTracoRegex = /HISTÓRIA\s+DA\s+DOENÇA\s+ATUAL\s*-\s*(.+)/i;
      const hdaTracoMatch = line.match(hdaTracoRegex);
      if (hdaTracoMatch) {
        // Substitui "HISTÓRIA DA DOENÇA ATUAL - X" por "X"
        line = hdaTracoMatch[1].trim();
      }
      
      // Verifica se é um caso de "HISTÓRIA DA DOENÇA ATUAL (HDA)"
      const hdaParentesisRegex = /(HISTÓRIA\s+DA\s+DOENÇA\s+ATUAL)\s*\([^)]*\)/i;
      const hdaParentesisMatch = line.match(hdaParentesisRegex);
      if (hdaParentesisMatch) {
        // Substitui "HISTÓRIA DA DOENÇA ATUAL (HDA)" por "HISTÓRIA DA DOENÇA ATUAL"
        line = hdaParentesisMatch[1].trim();
      }
      
      // Primeiro, procura por ":"
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const label = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        
        // Só formata se tivermos texto antes e depois dos dois pontos
        if (label && value) {
          // Remove tags HTML que possam estar presentes
          const cleanLabel = label.replace(/(<([^>]+)>)/gi, '');
          
          // Se houver pontos finais no valor, trata como subitens
          if (value.includes('. ')) {
            const subitems = value
              .split(/\.\s+/)
              .filter(item => item.trim())
              .map((item, index, array) => {
                const cleanItem = item.replace(/(<([^>]+)>)/gi, '');
                // Adiciona ponto final de volta em todos exceto o último
                return index < array.length - 1 ? cleanItem + '.' : cleanItem;
              });

            // Formata cada subitem em itálico
            const formattedSubitems = subitems.map(item => `<em>${item}</em>`);
            
            return `<p><strong>${cleanLabel}</strong>: ${formattedSubitems.join(' ')}</p>`;
          } else {
            // Sem subitens, formata normalmente
            const cleanValue = value.replace(/(<([^>]+)>)/gi, '');
            
            return `<p><strong>${cleanLabel}</strong>: <em>${cleanValue}</em></p>`;
          }
        }
      }
      
      // Para linhas sem ":", formatação padrão
      return `<p>${line}</p>`;
    });
    
    return formattedLines.join('');
  }

  // Função específica para formatar identificação do paciente
  function formatIdentificacaoPaciente(text, contexto) {
    if (!text) return '';
    
    // Verifica se é especificamente "IDENTIFICAÇÃO DO PACIENTE"
    if (contexto && contexto.toUpperCase().includes('IDENTIFICAÇÃO DO PACIENTE')) {
      // Remove tags HTML e converte quebras de linha em vírgulas
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = text;
      let plainText = tempDiv.innerText;
      
      // Remove aspas simples se for ator/avaliador
      if (isActorOrEvaluator.value) {
        plainText = plainText.replace(/'/g, '');
      }
      
      // NOVA FUNCIONALIDADE: Remove pontos finais
      plainText = plainText.replace(/\./g, '');
      
      // Converte quebras de linha e parágrafos em vírgulas
      let sequentialText = plainText
        .split(/[
]+/) // Divide por quebras de linha
        .map(line => line.trim()) // Remove espaços extras
        .filter(line => line && line.length > 0) // Remove linhas vazias
        .join(', '); // Junta com vírgulas
      
      // NOVA FUNCIONALIDADE: Remove vírgulas duplas e múltiplas
      sequentialText = sequentialText
        .replace(/,\s*,+/g, ',') // Remove vírgulas duplas/múltiplas
        .replace(/,\s*$/, ''); // Remove vírgula final
      
      return `<p><em>${sequentialText}</em></p>`;
    }
    
    // Se não for identificação do paciente, usa formatação padrão
    return formatActorText(text);
  }

  // Computed property para processar o roteiro
  const processRoteiro = computed(() => {
    return (text) => {
      if (!text) return '';
      return formatActorText(text);
    }
  });

  // Computed property para processar o roteiro do ator
  const processRoteiroActor = computed(() => {
    return (text) => {
      if (!text) return '';
      // A lógica original foi simplificada, pois ambas as branches chamavam a mesma função.
      // A verificação de isActorOrEvaluator já está dentro de formatActorText.
      return formatActorText(text);
    }
  });

  // Retorna as funções e computed properties para serem usadas no componente
  return {
    formatActorText,
    formatIdentificacaoPaciente,
    processRoteiro,
    processRoteiroActor
  };
}
