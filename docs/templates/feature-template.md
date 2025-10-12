# Feature: [NOME DA FEATURE]

**Status**: 🚧 Em Desenvolvimento / ✅ Implementada / 📋 Planejada
**Prioridade**: Alta / Média / Baixa
**Data de Início**: YYYY-MM-DD
**Data de Conclusão**: YYYY-MM-DD
**Responsável**: [Nome do Dev]

---

## 📋 Descrição

[Descrição breve e clara da feature em 2-3 frases]

---

## 🎯 Motivação

### Problema que Resolve
- [Descreva o problema ou necessidade do usuário]
- [Por que essa feature é importante?]

### Valor de Negócio
- [Como essa feature agrega valor ao produto?]
- [Qual o impacto esperado?]

---

## 👥 Personas Afetadas

- [ ] Candidato ao REVALIDA
- [ ] Ator/Avaliador
- [ ] Administrador
- [ ] Todos os usuários

---

## 💻 Implementação Técnica

### Arquivos Criados/Modificados

**Páginas**:
- `src/pages/XYZ.vue` - [descrição]

**Componentes**:
- `src/components/ABC.vue` - [descrição]

**Composables**:
- `src/composables/useXYZ.js` - [descrição]

**Services**:
- `src/services/xyzService.js` - [descrição]

**Backend** (se aplicável):
- `backend/routes/xyz.js` - [descrição]
- Endpoint: `POST /api/xyz` - [descrição]

### Dependências Adicionadas

\`\`\`json
{
  "package-name": "^1.0.0"
}
\`\`\`

### Variáveis de Ambiente

\`\`\`env
VITE_NEW_CONFIG=value
\`\`\`

---

## 🎨 Interface do Usuário

### Mockups/Screenshots
[Adicione imagens ou links para Figma]

### Fluxo de Tela
1. Usuário acessa [página]
2. Clica em [botão]
3. Sistema executa [ação]
4. Resultado: [o que acontece]

---

## 🔄 Fluxo de Usuário Detalhado

### Fluxo Principal (Happy Path)
1. **Passo 1**: [Descrição]
   - Entrada: [dados necessários]
   - Ação: [o que o usuário faz]
   - Saída: [resultado esperado]

2. **Passo 2**: [...]

### Fluxos Alternativos
- **Erro [tipo]**: [como o sistema lida]
- **Caso especial [X]**: [comportamento]

---

## ✅ Critérios de Aceitação

Essa feature estará completa quando:

- [ ] [Critério 1: específico e mensurável]
- [ ] [Critério 2: ex: "Usuário consegue fazer X em menos de 3 cliques"]
- [ ] [Critério 3: ex: "Sistema valida Y corretamente"]
- [ ] [Critério 4: ex: "Performance: carrega em < 2s"]
- [ ] Testes unitários criados e passando
- [ ] Testes E2E criados e passando
- [ ] Documentação atualizada (PRD, README)
- [ ] Code review aprovado
- [ ] Deploy em staging testado
- [ ] Aprovação do Product Owner

---

## 🧪 Plano de Testes

### Testes Unitários
- `tests/unit/useXYZ.test.js` - [descrição dos testes]

### Testes E2E
- `tests/e2e/feature-xyz.spec.js` - [cenários testados]

### Testes Manuais
1. **Cenário 1**: [passo a passo]
   - Resultado esperado: [...]
2. **Cenário 2**: [...]

---

## 📊 Métricas de Sucesso

### KPIs Afetados
- [Nome do KPI]: Meta = [X%], Baseline = [Y%]
- [Exemplo: Taxa de conversão de cadastros: Meta = 15%, Baseline = 10%]

### Como Medir
- Google Analytics: [evento específico]
- Firestore: [query para extrair dados]
- Feedback direto dos usuários

---

## 🔐 Segurança e Privacidade

### Considerações de Segurança
- [ ] Validação de inputs (XSS, SQL injection)
- [ ] Autenticação/Autorização necessária
- [ ] Dados sensíveis criptografados
- [ ] Rate limiting implementado

### LGPD Compliance
- [ ] Dados pessoais coletados: [listar]
- [ ] Consentimento explícito: [como é obtido]
- [ ] Direito de exclusão: [como usuário pode exercer]

---

## 📱 Responsividade

- [ ] Mobile (< 600px)
- [ ] Tablet (600-960px)
- [ ] Desktop (> 960px)
- [ ] Testes em navegadores: Chrome, Firefox, Safari, Edge

---

## ♿ Acessibilidade

- [ ] Navegação por teclado funcional
- [ ] ARIA labels implementados
- [ ] Contraste de cores adequado (WCAG 2.1 AA)
- [ ] Testado com screen reader

---

## 🚀 Plano de Deploy

### Pré-requisitos
- [ ] [Ex: Configurar variável de ambiente X]
- [ ] [Ex: Rodar migration no Firestore]

### Passos
1. Merge para `develop`
2. Deploy em staging
3. Testes de aceitação
4. Merge para `main`
5. Deploy em produção
6. Monitoramento por 24h

### Rollback Plan
- Como reverter: [descrever]
- Tempo estimado: [X minutos]

---

## 📝 Atualização do PRD

### Seções do PRD a Atualizar

- [ ] `## X. [Nome da Seção]` - Adicionar descrição da feature
- [ ] `## Funcionalidades Principais` - Adicionar item na lista
- [ ] `## Roadmap` - Mover de "Planejado" para "Implementado"
- [ ] `## Stack Tecnológico` - Adicionar novas dependências (se houver)

### Entrada no CHANGELOG

\`\`\`markdown
## [X.Y.Z] - YYYY-MM-DD

### Adicionado
- Feature: [Nome da Feature]
- Componente: \`NomeDoComponente.vue\`
- Endpoint: \`POST /api/xyz\`

### Alterado
- Atualizado contador de componentes: 45 → 46
- Seção "Roadmap Q1" movida para "Implementado"
\`\`\`

---

## 📚 Documentação Adicional

### Links Úteis
- [Design no Figma](https://figma.com/...)
- [Spec técnica detalhada](./tech-specs/xyz-spec.md)
- [Ticket no Jira/Linear](https://jira.com/...)

### Referências
- [API externa utilizada](https://docs.example.com)
- [Biblioteca X - Documentação](https://library.com/docs)

---

## 💬 Notas e Comentários

### Decisões Importantes
- [Data]: Decidimos usar [X] ao invés de [Y] porque [razão]

### Dívidas Técnicas
- [ ] [Descrever tech debt introduzido e plano para resolver]

### Melhorias Futuras
- [Ideia de melhoria não implementada agora]
- [Feature relacionada a adicionar depois]

---

## ✍️ Changelog desta Feature

### v1.0.0 - YYYY-MM-DD
- Implementação inicial

### v1.1.0 - YYYY-MM-DD
- Adicionado [X]
- Corrigido [Y]

---

**Autor**: [Seu Nome]
**Reviewers**: [Nome 1], [Nome 2]
**Data de Criação**: YYYY-MM-DD
**Última Atualização**: YYYY-MM-DD
