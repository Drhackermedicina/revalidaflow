# Configuração do Sentry para REVALIDAFLOW

O Sentry está configurado para monitorar erros em tempo real tanto no frontend (Vue.js) quanto no backend (Node.js).

## 1. Criar Conta no Sentry

1. Acesse [sentry.io](https://sentry.io)
2. Crie uma conta gratuita
3. Crie um novo projeto para **Vue.js** (frontend)
4. Crie um novo projeto para **Node.js** (backend)

## 2. Configurar DSNs

Após criar os projetos, você receberá dois DSNs (Data Source Names):

### Frontend DSN
```bash
# No arquivo .env, adicione:
VITE_SENTRY_DSN=https://your-frontend-dsn@sentry.io/project-id
VITE_APP_VERSION=1.0.0
```

### Backend DSN
```bash
# No arquivo backend/.env, adicione:
SENTRY_DSN=https://your-backend-dsn@sentry.io/project-id
SENTRY_TRACES_SAMPLE_RATE=0.1   # Opcional: ajustar taxa de amostragem
```

## 3. Monitoramento Configurado

### Frontend (Vue.js)
- ✅ Captura erros Vue automática
- ✅ Performance monitoring
- ✅ Session replay em erros
- ✅ Tracking de rotas
- ✅ Filtragem de erros de extensões

### Backend (Node.js)
- ✅ Captura erros Express automática
- ✅ Performance profiling
- ✅ WebSocket error tracking
- ✅ Firebase error tracking
- ✅ Filtragem de health checks

## 4. Funções Personalizadas

### Frontend
```javascript
import { captureSimulationError, captureWebSocketError, captureFirebaseError } from '@/plugins/sentry'

// Capturar erro de simulação
captureSimulationError(error, {
  sessionId: 'session_123',
  userRole: 'candidate',
  stationId: 'station_456'
})

// Capturar erro de WebSocket
captureWebSocketError(error, {
  socketId: 'socket_123',
  sessionId: 'session_456',
  connectionState: 'disconnected'
})

// Capturar erro do Firebase
captureFirebaseError(error, {
  operation: 'getUserData',
  collection: 'usuarios',
  userId: 'user_123'
})
```

### Backend
```javascript
const { captureSimulationError, captureWebSocketError, captureFirebaseError } = require('./config/sentry')

// Uso similar ao frontend
captureSimulationError(error, context)
```

## 5. Alertas Recomendados

Configure alertas no Sentry para:

- **Alto número de erros** (> 10 erros/minuto)
- **Erros críticos** (falhas de autenticação, WebSocket)
- **Performance degradada** (> 5s response time)
- **Erros de simulação** (falhas durante estações)

## 6. Dashboards Importantes

Monitore no Sentry:

1. **Errors by Route** - Quais páginas têm mais erros
2. **WebSocket Errors** - Problemas de conectividade
3. **Firebase Errors** - Problemas de banco/auth
4. **Simulation Errors** - Falhas durante treinamento
5. **Performance Issues** - Páginas lentas

## 7. Privacy e Compliance

- ✅ IPs são masked automaticamente
- ✅ Dados sensíveis filtrados
- ✅ Session replay apenas em erros
- ✅ Sampling configurado (10% produção)

## 8. Troubleshooting

### Problema: Sentry não captura erros
**Solução:**
1. Verifique se `VITE_SENTRY_DSN` está definida
2. Confirme que está em produção ou com DSN configurada
3. Verifique console por erros de inicialização

### Problema: Muitos erros de ruído
**Solução:**
1. Ajuste filtros em `src/plugins/sentry.js`
2. Configure alerts mais específicos
3. Use tags para filtrar por tipo

### Problema: Backend não reporta erros
**Solução:**
1. Verifique `SENTRY_DSN` no backend/.env
2. Confirme middleware antes das rotas
3. Verifique logs por "Sentry inicializado"

## 9. Custo

- **Free tier**: 5,000 errors/mês
- **Recomendado**: Team plan ($26/mês) para 50,000 errors
- **Performance**: Incluído no Team plan

Para REVALIDAFLOW, o free tier deve ser suficiente inicialmente.
