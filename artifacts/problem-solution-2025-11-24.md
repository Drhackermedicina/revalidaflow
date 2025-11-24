# Problem Solving Session: Resolvendo 280+ alterações pendentes no Git

**Date:** 2025-11-24
**Problem Solver:** Doutor e sempre em portugues
**Problem Category:** Controle de versão / Gestão de repositório Git

---

## 🎯 PROBLEM DEFINITION

### Initial Problem Statement

O usuário possui 280+ alterações pendentes no controle de código fonte (Git) e precisa entender por que isso está acontecendo e como resolver.

### Refined Problem Statement

O repositório do projeto está com um número excessivo de arquivos modificados no Git, principalmente devido a arquivos gerados automaticamente que não estão devidamente configurados no arquivo .gitignore, resultando em dificuldade de gerenciar o versionamento e identificar mudanças relevantes.

### Problem Context

Projeto REVALIDAFLOW - uma aplicação para estudantes de medicina focada em simulações de estações clínicas em tempo real. O projeto utiliza Vue.js no frontend e Express no backend, com diversas ferramentas de automação e geração de código.

### Success Criteria

1. Reduzir significativamente o número de alterações pendentes no Git
2. Configurar adequadamente o .gitignore para evitar futuros problemas
3. Limpar o histórico do Git removendo arquivos que não deveriam ser versionados
4. Estabelecer um fluxo de trabalho mais eficiente para o controle de versão

---

## 🔍 DIAGNOSIS AND ROOT CAUSE ANALYSIS

### Problem Boundaries (Is/Is Not)

O problema OCORRE em:
- Arquivos gerados automaticamente pelo sistema de build
- Arquivos de definição de tipos TypeScript (auto-imports.d.ts, components.d.ts)
- Diretórios de cache e configuração de ferramentas

O problema NÃO OCORRE em:
- Arquivos de código fonte reais do projeto
- Documentação intencional do projeto
- Arquivos de configuração essenciais

### Root Cause Analysis

**Método: Five Whys Root Cause**

1. Por que existem 280+ alterações pendentes?
   - Porque muitos arquivos gerados automaticamente estão sendo rastreados pelo Git.

2. Por que esses arquivos estão sendo rastreados pelo Git?
   - Porque não estão incluídos no arquivo .gitignore.

3. Por que não estão incluídos no .gitignore?
   - Porque o .gitignore está incompleto para ferramentas modernas e plugins do projeto.

4. Por que o .gitignore está incompleto?
   - Porque o projeto evoluiu com novas ferramentas (unplugin-auto-import, unplugin-vue-components) que geram arquivos não previstos na configuração inicial.

5. Por que isso não foi identificado antes?
   - Porque o acúmulo de alterações foi gradual e não havia um processo sistemático de revisão do .gitignore.

### Contributing Factors

- Múltiplos plugins e ferramentas de automação que geram arquivos em tempo de desenvolvimento
- Processo de instalação de dependências que regera arquivos (postinstall)
- Falta de revisão periódica do que está sendo versionado no repositório
- Possível formatação automática aplicada em múltiplos arquivos simultaneamente

### System Dynamics

O sistema atual apresenta um ciclo vicioso: novas ferramentas são adicionadas → geram novos arquivos → estes arquivos não são ignorados → acumulam-se no Git → dificultam a identificação de mudanças reais → mais ferramentas são adicionadas para resolver problemas → ciclo continua.

---

## 📊 ANALYSIS

### Force Field Analysis

**Driving Forces (Supporting Solution):**
- Estrutura clara do projeto com separação entre código fonte e arquivos gerados
- Existência de um arquivo .gitignore (embora incompleto)
- Ferramentas de automação que padronizam o ambiente
- Consciência do problema e desejo de resolvê-lo

**Restraining Forces (Blocking Solution):**
- Grande quantidade de alterações pendentes cria resistência psicológica para resolver
- Medo de perder dados importantes ao limpar o histórico
- Falta de conhecimento sobre quais arquivos podem ser seguramente ignorados
- Histórico de commits poluído com arquivos gerados

### Constraint Identification

A restrição principal é o tempo e esforço necessários para:
1. Identificar todos os arquivos que devem ser ignorados
2. Atualizar corretamente o .gitignore
3. Limpar o histórico do Git
4. Reorganizar as alterações pendentes em commits lógicos

### Key Insights

1. O problema é principalmente de configuração (gitignore incompleto) e não de código
2. Arquivos gerados por ferramentas nunca deveriam ser versionados
3. É necessário um processo sistemático para limpar o repositório
4. A prevenção futura é mais importante que a correção imediata

---

## 💡 SOLUTION GENERATION

### Methods Used

1. **Systematic approach:** Análise do .gitignore existente e comparação com estrutura do projeto
2. **Problem Statement Refinement:** Transformar "muitas alterações" em problema específico sobre arquivos gerados automaticamente

### Generated Solutions

1. **Atualizar .gitignore:** Adicionar entradas para todos os arquivos gerados automaticamente
2. **Limpar o Git Remoto:** Remover do histórico remoto os arquivos que não deveriam ser versionados
3. **Criar Commits Estratégicos:** Agrupar as alterações válidas em commits lógicos
4. **Configurar Pre-commit Hooks:** Implementar verificações automáticas para evitar futuros problemas
5. **Documentar o Processo:** Criar documentação sobre como gerenciar arquivos gerados no futuro

### Creative Alternatives

1. **Abordagem Radical:** Criar um novo repositório limpo e migrar apenas o código essencial
2. **Estratégia de Branching:** Criar um novo branch "limpo" a partir de um ponto anterior no histórico
3. **Ferramenta de Análise:** Desenvolver um script para analisar periodicamente o repositório e identificar arquivos suspeitos
4. **Solução Educativa:** Realizar um workshop sobre boas práticas de Git para a equipe

---

## ⚖️ SOLUTION EVALUATION

### Evaluation Criteria

- Efetividade: A solução realmente resolve a causa raiz?
- Viabilidade: É possível implementar com o conhecimento e ferramentas atuais?
- Risco: Qual a probabilidade de perda de dados?
- Sustentabilidade: A solução previne recorrências futuras?

### Solution Analysis

**Opção 1: Atualizar .gitignore + Limpar Git + Commits Estratégicos + Pre-commit hooks**
- Efetividade: Alta - ataca a causa raiz
- Viabilidade: Alta - usa Git e ferramentas padrão
- Risco: Baixo - se feito corretamente, não há perda de dados
- Sustentabilidade: Alta - previnine futuros problemas

**Opção 2: Abordagem Radical (novo repositório)**
- Efetividade: Média - resolve o problema atual mas não previneine futuros
- Viabilidade: Média - requer migração de histórico e configuração
- Risco: Alto - pode perder metadados ou histórico relevante
- Sustentabilidade: Baixa - o problema pode recorrer se não houver mudança de processo

### Recommended Solution

**Implementar a Opção 1:** Atualizar .gitignore + Limpar Git + Commits Estratégicos + Pre-commit hooks

Esta abordagem é mais conservadora, mantém todo o histórico relevante, resolve o problema atual e estabelece mecanismos para evitar recorrências.

### Solution Rationale

A solução escolhida atinge o equilíbrio ideal entre:
1. Resolver imediatamente o problema existente
2. Preservar o histórico importante do projeto
3. Estabelecer um processo sustentável para o futuro
4. Utilizar ferramentas e práticas padrão do Git

---

## 🚀 IMPLEMENTATION PLAN

### Implementation Approach

Estratégia de implementação em fases:
1. Fase 1: Análise e planejamento (identificar exatamente o que precisa ser feito)
2. Fase 2: Atualização do .gitignore (bloquear futuros problemas)
3. Fase 3: Limpeza do Git (remover arquivos problemáticos do histórico)
4. Fase 4: Reorganização das alterações pendentes
5. Fase 5: Implementação de pre-commit hooks (prevenção)

### Action Steps

1. **Fase 1: Análise detalhada**
   - Executar `git status --porcelain` para listar todos os arquivos modificados
   - Categorizar cada arquivo como: código-fonte, configuração ou gerado automaticamente
   - Identificar padrões de arquivos gerados

2. **Fase 2: Atualizar .gitignore**
   - Adicionar ao .gitignore todos os padrões de arquivos gerados identificados
   - Incluir padrões específicos para arquivos TypeScript gerados (auto-imports.d.ts, components.d.ts)
   - Adicionar diretórios de ferramentas (.firebase, .gemini, .vscode, etc.)

3. **Fase 3: Limpar o Git**
   - Remover do índice do Git os arquivos que não devem ser rastreados
   - Remover do histórico remoto usando BFG Repo-Cleaner ou `git filter-branch`
   - Forçar o push das alterações para o repositório remoto

4. **Fase 4: Reorganizar alterações pendentes**
   - Agrupar alterações relacionadas logicamente
   - Criar commits seguindo o padrão do projeto: `<type>: <summary>` em português
   - Garantir que cada commit tenha uma única responsabilidade clara

5. **Fase 5: Implementar pre-commit hooks**
   - Configurar husky para executar hooks antes de commits
   - Adicionar verificação de arquivos não rastreados
   - Implementar verificação de padrões proibidos no .gitignore
   - Adicionar verificação automática de formatação (se aplicável)

### Timeline and Milestones

- **Milestone 1 (Fase 1):** Concluir análise detalhada em 1-2 horas
- **Milestone 2 (Fase 2):** Atualizar .gitignore em 30 minutos
- **Milestone 3 (Fase 3):** Limpeza do Git em 1-2 horas
- **Milestone 4 (Fase 4):** Reorganização das alterações em 2-3 horas
- **Milestone 5 (Fase 5):** Implementação de hooks em 1 hora

### Resource Requirements

- Acesso ao repositório Git com permissões de escrita
- Ferramenta BFG Repo-Cleaner (opcional, recomendada para limpeza eficiente)
- Conhecimento básico de comandos Git
- Acesso para instalar/configurar hooks de pre-commit

### Responsible Parties

- Desenvolvedor principal: Responsável por executar todos os passos
- Equipe (se aplicável): Avisar sobre a manutenção planejada do repositório
- Revisores: Ajudar a validar os commits reorganizados

---

## 📈 MONITORING AND VALIDATION

### Success Metrics

- Número de arquivos modificados no status do Git reduzido para menos de 20
- Tempo médio para executar `git status` reduzido significativamente
- Nenhum arquivo gerado automaticamente aparecendo em futuros commits
- Feedback positivo da equipe sobre a melhoria na usabilidade do repositório

### Validation Plan

1. Verificar `git status` após cada fase para confirmar redução no número de alterações
2. Testar a criação de novos arquivos gerados automaticamente para confirmar que são ignorados
3. Clonar o repositório em um diretório limpo para verificar que todos os arquivos essenciais estão presentes
4. Solicitar feedback da equipe sobre a experiência melhorada

### Risk Mitigation

- **Risco:** Perda acidental de dados importantes durante a limpeza do Git
  **Mitigação:** Fazer backup completo do repositório antes de iniciar a limpeza

- **Risco:** Arquivos essenciais sendo adicionados ao .gitignore
  **Mitigação:** Verificação cuidadosa de cada padrão adicionado ao .gitignore

- **Risco:** Resistência da equipe às mudanças no fluxo de trabalho
  **Mitigação:** Comunicação clara sobre os benefícios e treinamento sobre o novo processo

### Adjustment Triggers

- Se após Fase 2 o número de alterações não diminuir significativamente, revisar e expandir o .gitignore
- Se durante a Fase 3 forem identificados problemas complexos de histórico, considerar uso de BFG Repo-Cleaner
- Se após a conclusão, novas ferramentas forem adicionadas ao projeto, revisar e atualizar o .gitignore

---

## 📝 LESSONS LEARNED

### Key Learnings

- Arquivos gerados automaticamente nunca deveriam ser versionados
- A revisão periódica do .gitignore é essencial em projetos com muitas ferramentas
- Pequenos problemas de configuração podem se acumular em grandes obstáculos ao longo do tempo
- A prevenção é mais eficiente que a correção quando se trata de controle de versão

### What Worked

- Abordagem sistemática de diagnóstico usando a metodologia de cinco porquês
- Análise detalhada da estrutura do projeto para identificar todos os tipos de arquivos
- Planejamento por fases com critérios de sucesso claros para cada etapa

### What to Avoid

- Permitir que arquivos gerados automaticamente sejam versionados
- Ignorar pequenos acúmulos de alterações "irrelevantes" no Git
- Adicionar ferramentas ao projeto sem revisar seu impacto no fluxo de controle de versão

---

_Generated using BMAD Creative Intelligence Suite - Problem Solving Workflow_