// Funções utilitárias extraídas de SimulationView.vue

// Função para detectar se o texto já contém HTML formatado
function isRichTextContent(text: string): boolean {
  if (!text) return false;
  // Verifica se contém tags HTML válidas como <p>, <strong>, <em>, <br>, etc.
  const htmlTags = /<(p|strong|em|br|ul|li|ol|h[1-6]|div)\b[^>]*>/i;
  return htmlTags.test(text);
}

export function formatActorText(text: string, isActorOrEvaluator?: boolean): string {
  if (!text) return '';

  // Se o texto já está formatado como HTML rico, preserva a formatação
  if (isRichTextContent(text)) {
    // Remove apenas aspas simples se for ator/avaliador, mas preserva HTML
    if (isActorOrEvaluator) {
      return text.replace(/'/g, '');
    }
    return text;
  }

  // Processamento para texto plano (comportamento original)
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  let plainText = tempDiv.innerText;
  if (isActorOrEvaluator) {
    plainText = plainText.replace(/'/g, '');
  }
  const lines = plainText
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => line);
  const formattedLines = lines.map(line => {
    const hdaTracoRegex = /HISTÓRIA\s+DA\s+DOENÇA\s+ATUAL\s*-\s*(.+)/i;
    const hdaTracoMatch = line.match(hdaTracoRegex);
    if (hdaTracoMatch) {
      line = hdaTracoMatch[1].trim();
    }
    const hdaParentesisRegex = /(HISTÓRIA\s+DA\s+DOENÇA\s+ATUAL)\s*\([^)]*\)/i;
    const hdaParentesisMatch = line.match(hdaParentesisRegex);
    if (hdaParentesisMatch) {
      line = hdaParentesisMatch[1].trim();
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const label = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      if (label && value) {
        const cleanLabel = label.replace(/(<([^>]+)>)/gi, '');
        if (value.includes('. ')) {
          const subitems = value
            .split(/\.\s+/)
            .filter(item => item.trim())
            .map((item, index, array) => {
              const cleanItem = item.replace(/(<([^>]+)>)/gi, '');
              return index < array.length - 1 ? cleanItem + '.' : cleanItem;
            });
          const formattedSubitems = subitems.map(item => `<em>${item}</em>`);
          return `<p><strong>${cleanLabel}</strong>: ${formattedSubitems.join(' ')}</p>`;
        } else {
          const cleanValue = value.replace(/(<([^>]+)>)/gi, '');
          return `<p><strong>${cleanLabel}</strong>: <em>${cleanValue}</em></p>`;
        }
      }
    }
    return `<p>${line}</p>`;
  });
  return formattedLines.join('');
}

export function formatIdentificacaoPaciente(text: string, contexto: string, isActorOrEvaluator: boolean): string {
  if (!text) return '';
  if (contexto && contexto.toUpperCase().includes('IDENTIFICAÇÃO DO PACIENTE')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    let plainText = tempDiv.innerText;
    if (isActorOrEvaluator) {
      plainText = plainText.replace(/'/g, '');
    }
    plainText = plainText.replace(/\./g, '');
    let sequentialText = plainText
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line && line.length > 0)
      .join(', ');
    sequentialText = sequentialText
      .replace(/,\s*,+/g, ',')
      .replace(/,\s*$/, '');
    return `<p><em>${sequentialText}</em></p>`;
  }
  return formatActorText(text, isActorOrEvaluator);
}

export function splitIntoSentences(text: string): string[] {
  return text.split('. ').map(sentence => sentence.trim()).filter(sentence => sentence.length > 0);
}

export function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatItemDescriptionForDisplay(descriptionText: string, itemTitle = ''): string {
  if (!descriptionText || typeof descriptionText !== 'string') {
    return descriptionText || '';
  }
  let desc = descriptionText.trim();
  if (itemTitle) {
    const regex = new RegExp('^' + itemTitle.replace(/[.*+?^${}()|[\\]/g, '\\$&') + '\\s*:', 'i');
    desc = desc.replace(regex, '').trim();
  } else {
    desc = desc.replace(/^([^:]+):/, '').trim();
  }
  if (!desc) {
    return '';
  }
  desc = desc.replace(/\s+e,?\s+/g, ', ');
  desc = desc.replace(/,\s*,/g, ',');
  desc = desc.replace(/,\s*\./g, '.');
  desc = desc.replace(/,\s*$/g, '');
  desc = desc.replace(/,\s*\(/g, ' (');
  desc = desc.replace(/\n/g, '<br>').replace(/;/g, '<br>');
  desc = desc.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '<br>');
  desc = desc.replace(/(^|<br>)([^<>()\n:]+?):/g, '$1<strong>$2:</strong>');
  return desc;
}

export function splitIntoParagraphs(text: string): string[] {
  if (!text) return [];
  const textAsString = String(text);

  // Se já contém HTML formatado com tags <p>, extrai o conteúdo dos parágrafos
  if (isRichTextContent(textAsString)) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = textAsString;
    const paragraphElements = tempDiv.querySelectorAll('p');

    if (paragraphElements.length > 0) {
      return Array.from(paragraphElements).map(p => p.innerHTML.trim()).filter(p => p.length > 0);
    }

    // Se não tem <p> mas tem outras tags HTML, retorna como um parágrafo único
    return [textAsString];
  }

  // Processamento para texto plano (comportamento original)
  const paragraphs = textAsString
    .split(/<br\s*\/?>/gi)
    .flatMap(p => p.split(/\n/))
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return paragraphs.length > 0 ? paragraphs : [textAsString];
}

export function getEvaluationLabel(item: any, score: number): string {
  if (score === undefined) return 'Não avaliado';
  if (item.pontuacoes?.adequado && item.pontuacoes.adequado.pontos === score) {
    return 'Adequado';
  } else if (item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.pontos === score) {
    return 'Parcialmente Adequado';
  } else if (item.pontuacoes?.inadequado && item.pontuacoes.inadequado.pontos === score) {
    return 'Inadequado';
  }
  return 'Pontuação: ' + score.toFixed(2);
}

export function getEvaluationColor(item: any, score: number): string {
  if (score === undefined) return 'grey-lighten-1';
  if (item.pontuacoes?.adequado && item.pontuacoes.adequado.pontos === score) {
    return 'success';
  } else if (item.pontuacoes?.parcialmenteAdequado && item.pontuacoes.parcialmenteAdequado.pontos === score) {
    return 'warning';
  } else if (item.pontuacoes?.inadequado && item.pontuacoes.inadequado.pontos === score) {
    return 'error';
  }
  return 'primary';
}

// Para os ícones e cores de infraestrutura, copie as funções conforme o original, mantendo os mappings.

export function getInfrastructureIcon(infraItem: string): string {
  const cleanItem = infraItem.startsWith('- ') ? infraItem.substring(2) : infraItem;
  const text = cleanItem.toLowerCase();
  if (infraItem.startsWith('- ')) {
    return 'ri-arrow-right-s-line';
  }
  // ... (mapeamento conforme original)
  return 'ri-hospital-line';
}

export function getInfrastructureColor(infraItem: string): string {
  if (infraItem.startsWith('- ')) {
    return 'grey-darken-1';
  }
  const cleanItem = infraItem.startsWith('- ') ? infraItem.substring(2) : infraItem;
  const text = cleanItem.toLowerCase();
  // ... (mapeamento conforme original)
  return 'primary';
}

export function processInfrastructureItems(items: string[]): string[] {
  if (!items || !Array.isArray(items)) return [];
  const processedItems: string[] = [];
  items.forEach(item => {
    if (!item || !item.trim()) return;
    const trimmedItem = item.trim();
    if (trimmedItem.includes(',') || trimmedItem.includes(';') || trimmedItem.includes(':')) {
      let normalizedText = trimmedItem.replace(/;/g, ',').replace(/:/g, ',');
      const segments = normalizedText.split(',');
      if (segments[0].trim()) {
        processedItems.push(segments[0].trim());
      }
      for (let i = 1; i < segments.length; i++) {
        const subItem = segments[i].trim();
        if (subItem) {
          processedItems.push(`- ${subItem}`);
        }
      }
    } else {
      processedItems.push(trimmedItem);
    }
  });
  return processedItems.filter(item => item.length > 0);
}

export function parseEnumeratedItems(descriptionText: string): { text: string; index: number }[] {
  const items: { text: string; index: number }[] = [];
  if (!descriptionText || typeof descriptionText !== 'string') {
    return items;
  }

  // Remove o título principal e o ":" inicial se existirem
  let cleanedText = descriptionText.replace(/^[^:]+:\s*/, '').trim();

  // Regex para encontrar padrões como "(1) Texto do item"
  const regex = /\((\d+)\)\s*(.*?)(?=\s*\(\d+\)|$)/g;
  let match;

  while ((match = regex.exec(cleanedText)) !== null) {
    const index = parseInt(match[1], 10) - 1; // Ajusta para índice baseado em 0
    const text = match[2].trim();
    items.push({ text, index });
  }

  return items;
}
