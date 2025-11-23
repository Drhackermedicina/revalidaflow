# Sistema de Convites Automáticos para Treino

## 📋 Visão Geral

Este sistema permite que usuários convidem outros usuários online para treinar diretamente do chat de grupo, com fluxo automatizado desde o convite até a seleção da estação clínica.

## 🚀 Funcionalidades

### 1. **Convites via Chat de Grupo**
- Ícone `+` ao lado de usuários online no `ChatGroupView.vue`
- Apenas usuários com status "Disponível" podem ser convidados
- Envio automático de convite ao clicar no `+`

### 2. **Chat Privado Interativo**
- Abertura automática do chat privado após envio do convite
- Mensagem formatada com botões **SIM/NÃO**
- Resposta processada em tempo real

### 3. **Fluxo de Aceitação**
- Ao aceitar: redirecionamento automático para `StationList.vue`
- Candidato pré-selecionado automaticamente
- Notificação visual de convite aceito

### 4. **Integração Completa**
- Seleção de estação → `SimulationView.vue` (fluxo existente)
- Geração automática de links de convite
- Persistência de estados no Firebase

## 🏗️ Arquitetura

### Componentes Modificados

1. **`ChatGroupView.vue`**
   - Adicionado ícone `+` para convites
   - Função `inviteToTraining(user)`
   - Integração com sistema de convites

2. **`ChatPrivateView.vue`**
   - Detecção de mensagens de convite
   - Botões interativos SIM/NÃO
   - Processamento de respostas

3. **`StationList.vue`**
   - Processamento de parâmetros URL
   - Auto-preenchimento de candidato
   - Notificação de convite aceito

### Novo Composable

4. **`useTrainingInvites.js`**
   - Gerenciamento completo de convites
   - Estados no Firebase
   - Formatação de mensagens
   - Navegação automática

### Estrutura de Dados (Firebase)

```javascript
// Coleção: trainingInvites
{
  id: "invite_123",
  fromUserId: "user_1",
  toUserId: "user_2",
  fromUserName: "João Silva",
  toUserName: "Maria Santos",
  status: "pending|accepted|rejected|expired",
  createdAt: timestamp,
  expiresAt: timestamp,
  type: "training_invite"
}
```

## 🔄 Fluxo Completo

### Passo 1: Envio de Convite
1. Usuário A clica no `+` ao lado do Usuário B no chat de grupo
2. Sistema cria convite no Firebase
3. Chat privado com Usuário B abre automaticamente
4. Mensagem "Oi! Quer treinar comigo?" é enviada com botões

### Passo 2: Resposta ao Convite
**Cenário A - Aceite:**
1. Usuário B clica em "Sim, quero treinar!"
2. Status do convite atualizado para "accepted"
3. Mensagem de confirmação aparece no chat
4. Usuário B é redirecionado para `StationList.vue`
5. Usuário A aparece como candidato pré-selecionado

**Cenário B - Rejeição:**
1. Usuário B clica em "Não, obrigado"
2. Status do convite atualizado para "rejected"
3. Mensagem de rejeição aparece no chat
4. Fluxo encerrado

### Passo 3: Seleção de Estação
1. Usuário B seleciona uma estação clínica
2. Fluxo normal continua para `SimulationView.vue`
3. Link de convite gerado automaticamente

## 🛠️ Configuração

### Firebase Rules
Garanta que as regras do Firestore permitam acesso à coleção `trainingInvites`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trainingInvites/{inviteId} {
      allow read, write: if request.auth != null && (
        request.auth.uid == resource.data.fromUserId ||
        request.auth.uid == resource.data.toUserId
      );
    }
  }
}
```

### Variáveis de Ambiente
Nenhuma configuração adicional necessária - usa as mesmas credenciais Firebase do projeto.

## 🎨 Estilização e UI

### Cores e Temas
- **Mensagens de convite:** Verde com destaque especial
- **Botões:** Success (aceitar) / Error (rejeitar)
- **Notificações:** Tema consistente com design atual

### Responsividade
- **Desktop:** Botões horizontais, efeitos hover
- **Mobile:** Botões verticais, layout otimizado
- **Animações:** Pulsar em convites, slide-in notificações

## 🧪 Testes

Execute os testes de integração:

```javascript
// No console do navegador
testTrainingInvites.runAllTests()

// Testes individuais
testTrainingInvites.testInviteSending()
testTrainingInvites.testInviteResponse()
testTrainingInvites.testStationListUrlGeneration()
testTrainingInvites.testMessageFormatting()
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Convite não aparece no chat**
   - Verificar se o listener do Firebase foi inicializado
   - Confirmar que o usuário está online

2. **Botões não funcionam**
   - Verificar se o composable `useTrainingInvites` foi importado
   - Confirmar que o convite está com status "pending"

3. **Redirecionamento não funciona**
   - Verificar parâmetros URL
   - Confirmar que `processAcceptedInviteFromUrl()` foi chamado

4. **Candidato não é pré-selecionado**
   - Verificar se os dados do convite foram processados
   - Confirmar que `selectedCandidate` está sendo atualizado

### Logs de Debug

```javascript
// Ativar logs detalhados
console.log('Convites:', invites.value)
console.log('Convites pendentes:', pendingInvites.value)
console.log('Dados do convite aceito:', inviteAcceptedData.value)
```

## 📈 Performance

### Otimizações Implementadas
- **Lazy loading:** Componentes carregados sob demanda
- **Cache local:** Estados persistidos em memória
- **Cleanup:** Listeners Firebase removidos automaticamente
- **Debouncing:** Prevenção de múltiplos convites

### Monitoramento
- Use Firebase Performance Monitoring
- Monitore uso da coleção `trainingInvites`
- Verifique tempos de resposta do sistema

## 🔮 Futuras Melhorias

### Versão 2.0 (Planejada)
- [ ] Convites em grupo
- [ ] Agendamento de convites
- [ ] Histórico de convites
- [ ] Notificações push
- [ ] Filtros de disponibilidade
- [ ] Status personalizados

### Integrações
- [ ] Google Calendar
- [ ] Sistema de notificações por email
- [ ] Analytics de uso
- [ ] Relatórios de engajamento

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console
2. Execute os testes automatizados
3. Consulte o troubleshooting acima
4. Abra issue no repositório do projeto

---

**Versão:** 1.0.0
**Data:** 26/10/2025
**Desenvolvido por:** Claude Code Assistant