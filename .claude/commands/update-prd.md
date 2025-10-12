Atualizar automaticamente o PRD (Product Requirements Document) e documentação do projeto:

1. **Escanear código-fonte** em src/pages/, src/components/, src/composables/, src/services/, src/stores/
2. **Contar arquivos**:
   - Páginas (*.vue em src/pages/)
   - Componentes (*.vue em src/components/ recursivamente)
   - Composables (*.js e *.ts em src/composables/)
   - Services (*.js e *.ts em src/services/)
   - Stores (*.js e *.ts em src/stores/)

3. **Atualizar docs/PRD_REVALIDAFLOW.md**:
   - Seção "Arquitetura do Código" → atualizar contadores
   - Seção "Stack Tecnológico" → revisar se há novas dependências

4. **Atualizar docs/CHANGELOG_PRD.md**:
   - Adicionar nova entrada com data de hoje
   - Listar mudanças nos contadores (antes → depois)
   - Formato: [Auto] - YYYY-MM-DD

5. **Atualizar docs/FEATURES_TRACKING.md**:
   - Seção "Estatísticas de Código" → atualizar contadores
   - Atualizar "Última sincronização"

6. **Atualizar docs/.prd-metadata.json**:
   - Campo `lastUpdated`
   - Objeto `statistics`
   - Objeto `sections.features`

7. **Identificar mudanças significativas**:
   - Novos componentes em src/components/ → descrever brevemente
   - Novas páginas em src/pages/ → descrever funcionalidade
   - Novos composables → descrever propósito
   - Mudanças em package.json → listar novas dependências

8. **Revisar e reportar**:
   - Liste todas as atualizações feitas
   - Mostre diff dos contadores (antes vs depois)
   - Sugira texto para adicionar ao PRD se houver novas features significativas
   - Indique se alguma seção do PRD precisa de atualização manual

**Importante**: 
- Seja específico nos números (Ex: "Componentes: 45 → 47")
- Se detectar nova feature importante, sugira texto para adicionar no PRD
- Sempre atualize a data no CHANGELOG e metadata
- Mantenha o tom profissional do PRD

**Ao final, confirme**:
✅ PRD atualizado
✅ CHANGELOG atualizado
✅ FEATURES_TRACKING atualizado
✅ Metadata JSON atualizado
