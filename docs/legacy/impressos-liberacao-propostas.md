# Estratégia de Liberação de Impressos – Análise e Propostas

Última atualização: _(preencher na próxima revisão)_

## Contexto Atual

- **Onde ocorre**: Toda a análise de pedidos é feita no frontend (`src/composables/useAiChat.js`). O backend apenas responde pelo chat (`POST /ai-chat/chat`) e não envia `materialsReleased`.
- **Fluxo**: o candidato precisa falar “solicito …”; o texto é normalizado, comparado com títulos/conteúdo via heurística (similaridade + fallback), e a liberação ocorre localmente em milissegundos.
- **Problema**: como os impressos são quase todos “exames”, termos genéricos ativam o fallback e liberam documentos incorretos. A telemetria de liberação também fica restrita ao navegador.

## Proposta 1 (implantação imediata no frontend)

**Objetivo**: liberar apenas quando o título (ou parte literal dele) estiver presente na fala, mantendo resposta instantânea.

### Detalhes técnicos

1. **Matching pelo título**  
   - Normalizar ambos (lowercase, sem acentos).  
   - Ignorar tokens banidos (`exame`, `exames`, etc.).  
   - Verificar:  
     - Se a fala contém uma sequência literal do título com ≥ 6 caracteres; ou  
     - Se compartilha ≥ 2 tokens consecutivos do título; ou  
     - Se ≥ 50% dos tokens do título aparecem no pedido (após remover banidos).
2. **Resposta ao candidato**: substituir “Considere solicitado.” por `"<Título> liberado"`.
3. **Performance**: a lógica continua no navegador (sem round-trip adicional); apenas substituímos o heurístico existente.

### Vantagens

- Experiência permanece instantânea.
- Implementação simples (apenas `useAiChat`).
- Garante aderência ao requisito: só libera quando o título é citado.

### Desvantagens

- Telemetria limitada: sabemos que liberou, mas não temos logs server-side.
- Regras residem num único arquivo gigante; qualquer bug é distribuído para todos os clientes sem observabilidade.

## Proposta 2 – Migrar lógica de liberação para o backend `/ai-chat`

### O que muda

- Implementar o mesmo matching (baseado em título) no `aiChatRouter`.  
- `/ai-chat/chat` passa a retornar `materialsReleased`/`materialToRelease`; o frontend apenas exibe.

### Vantagens

1. **Observabilidade**: podemos logar cada pedido, título correspondente e usuário. Ajuda na auditoria e ajustes de conteúdo.
2. **Consistência multi-plataforma**: qualquer cliente (web, mobile, desktop) usa a mesma regra.
3. **Telemetria real**: facilita análises (“quais impressos são mais solicitados?”).

### Desvantagens / Custos

- **Complexidade**: precisamos transportar `stationData` (ou IDs) e garantir que o backend tenha os mesmos dados dos impressos.  
- **Infra**: pequenas chamadas extras no backend; sem custos relevantes, mas aumenta o código a manter.  
- **Time**: é necessário testar a rota em ambientes distintos e garantir autenticação correta.

### Quando vale a pena

- Quando for necessário monitorar e/ou auditar liberação.
- Se houver planos de levar o mesmo fluxo para outros clientes além do SPA atual.

## Proposta 3 – Slug/ID canônico para matching

### Conceito

- Gerar um “slug” (ex.: `sinais-vitais-exame-fisico-geral`) e armazenar junto ao impresso.  
- Matching passa a comparar slugs ou combos de n-grams do slug, reduzindo ambiguidade.

### Vantagens

1. **Robustez**: evita divergências provocadas por sinais, acentos, espaços extras.  
2. **Expansibilidade**: é fácil criar aliases (`slug_aliases`) para títulos muito semelhantes.  
3. **Portabilidade**: podemos reutilizar os slugs em filtros, buscas e análises.

### Desvantagens / Custos

- **Conteúdo**: todos os impressos existentes precisam ganhar o slug (migração).  
- **Ferramental**: precisamos garantir que qualquer importação futura gere o slug automaticamente.  
- **Complexidade**: matching fica mais rígido; candidatos precisam pronunciar palavras bem próximas ao slug.

### Observações

- Esta proposta complementa a 1 ou a 2 (não é exclusiva).  
- Foi numerada como “3” porque a “4” da lista original referia-se a melhorias de feedback (absorvidas pela 1). Por isso, pulamos de 3 para 5.

## Proposta 5 – Documentação e Testes Automatizados

### Conteúdo

- Escrever um guia curto (“Como nomear impressos para a IA”) explicando a regra de matching.  
- Criar testes unitários (por exemplo, Vitest) para `findSpecificMaterial`, cobrindo:
  - matching literal do título;
  - rejeição quando apenas conteúdo bate;
  - casos com ruído (“solicito exame …”).

### Vantagens

1. **Confiança**: qualquer alteração na heurística passa por testes.  
2. **Onboarding**: quem cria novas estações sabe como batizar os impressos.

### Desvantagens / Custos

- **Tempo inicial**: configurar casos de teste e manter documentado.  
- **Disciplina**: toda vez que o conteúdo muda, precisamos atualizar os testes relevantes.

## Frontend x Backend – Resumo

| Aspecto                | Somente Frontend                                           | Backend Centralizado                                      |
|------------------------|-----------------------------------------------------------|-----------------------------------------------------------|
| Latência               | Instantânea (já está no browser)                          | Similar (decisão no servidor, mesma requisição)          |
| Observabilidade        | Limitada; logs só no cliente                              | Completa; registramos pedidos com userId/station         |
| Complexidade           | Baixa (um arquivo)                                        | Moderada (rotas, auth, payloads)                         |
| Custos de Infra        | Nenhum adicional                                          | Mínimo (mesmas requisições, mais processamento)          |
| Reuso multi-plataforma | Depende de replicar lógica em cada cliente               | Automático (qualquer cliente consome a rota)             |
| Atualizações           | Deploy do frontend                                        | Deploy backend (uma vez)                                 |

## Próximos Passos Sugeridos

1. Aplicar Proposta 1 (matching estrito por título + resposta “<Título> liberado”) no frontend para atender a urgência.  
2. Avaliar migração para o backend (Proposta 2) quando quisermos telemetria/Auditoria.  
3. Introduzir slugs (Proposta 3) quando houver disponibilidade de ajustar os dados no Firestore.  
4. Documentar e testar (Proposta 5) para evitar regressões.

---

_Este documento servirá de base para as discussões sobre migração e ajustes. Atualize-o sempre que novas regras forem aprovadas._
