# Arquitetura do Sistema

**Estrutura principal:**
- Frontend em Vue.js (src/, src/components/, src/pages/, src/layouts/)
- Backend/serviços em Node.js (scripts/, integração com Firebase)
- Estilos em SCSS (src/@core/scss/, src/assets/styles/)
- Imagens e assets organizados em src/assets/
- Configurações em arquivos como package.json, firebase.json, .env.example
- Build e deployment (.firebase/, vite.config.js)
- Ambiente de desenvolvimento (.vscode/, jsconfig.json)
- Banco de memória (.kilocode/)

**Principais caminhos de código:**
- src/main.js: ponto de entrada do frontend
- src/App.vue: componente raiz
- src/components/: componentes reutilizáveis
- src/pages/: páginas do sistema (dashboard, login, ranking, simulação, etc.)
- src/layouts/: layouts e componentes de navegação
- scripts/: scripts utilitários para migração, validação e administração
- src/composables/: composables Vue para lógica reutilizável
- src/stores/: stores Pinia para gerenciamento de estado
- src/plugins/: plugins Vue para funcionalidades específicas
- src/utils/: utilitários e helpers
- src/services/: serviços de API e integrações

**Decisões técnicas:**
- Uso de Vue.js para interface e experiência do usuário
- Node.js para scripts e integração backend
- Firebase para autenticação, banco de dados e deploy
- SCSS para estilos modulares e organizados
- Organização modular por especialidade e funcionalidade

**Padrões de organização:**
- Separação clara entre componentes, páginas, layouts e utilitários
- Assets agrupados por tipo e finalidade
- Configurações centralizadas para fácil manutenção

**Relações entre arquivos:**
- Componentes são importados em páginas e layouts
- Scripts interagem com Firebase e banco de dados
- Estilos são aplicados globalmente e por componente

**Documentação e comentários:**
- Estrutura de arquivos facilita documentação futura
- Comentários presentes em scripts e componentes principais

**Caminhos críticos de implementação:**
- src/main.js → src/App.vue → src/pages/ → src/components/
- scripts/ → integração com Firebase e banco de dados
