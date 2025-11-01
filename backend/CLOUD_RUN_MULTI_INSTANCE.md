# Deploy Multi-Instance no Cloud Run (Teste P0-B12)

Este documento descreve a configuração otimizada para deployment multi-instância do backend com sessões distribuídas.

## Configuração Atualizada para Multi-Instância

### 1. Variáveis de Ambiente Adicionais

```bash
# Identificação da instância para sessões distribuídas
INSTANCE_ID=revalida-backend-$(date +%s)-$(shuf -i 1000-9999 -n 1)

# Configurações de sessão distribuída
SESSION_DISTRIBUTED_MODE=true
SESSION_CACHE_TIMEOUT=30000

# Configurações de Firestore para sessões
SESSIONS_COLLECTION=sessions
PARTICIPANTS_COLLECTION=session_participants
SESSION_EVENTS_COLLECTION=session_events

# Monitoramento e debugging
ENABLE_SESSION_DEBUG=false
SESSION_HEARTBEAT_INTERVAL=30000
```

### 2. Deploy Command Otimizado

```powershell
# Build da imagem com label de versão
$VERSION = "v1.4.0-multi-instance"
$BUILD_TIME = Get-Date -Format "yyyy-MM-dd-HHmm"

docker build -t gcr.io/revalida-companion/revalida-backend:$VERSION-$BUILD_TIME .
docker push gcr.io/revalida-companion/revalida-backend:$VERSION-$BUILD_TIME

# Deploy com configuração multi-instância
gcloud run deploy revalida-backend `
  --image gcr.io/revalida-companion/revalida-backend:$VERSION-$BUILD_TIME `
  --platform managed `
  --region southamerica-east1 `
  --allow-unauthenticated `
  --service-account "cloud-run-sa@revalida-companion.iam.gserviceaccount.com" `
  --set-env-vars "NODE_ENV=production,FRONTEND_URL=https://www.revalidaflow.com.br,INSTANCE_ID=revalida-backend-$(date +%s)-$(shuf -i 1000-9999 -n 1),SESSION_DISTRIBUTED_MODE=true,SESSION_CACHE_TIMEOUT=30000,SESSIONS_COLLECTION=sessions,PARTICIPANTS_COLLECTION=session_participants,SESSION_EVENTS_COLLECTION=session_events,ENABLE_SESSION_DEBUG=false,SESSION_HEARTBEAT_INTERVAL=30000" `
  --set-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest" `
  --set-secrets "FIREBASE_CLIENT_EMAIL=firebase-client-email:latest" `
  --set-secrets "FIREBASE_PROJECT_ID=firebase-project-id:latest" `
  --set-secrets "FIREBASE_STORAGE_BUCKET=firebase-storage-bucket:latest" `
  --memory "512Mi" `
  --cpu "1" `
  --min-instances "0" `
  --max-instances "10" `
  --concurrency "80" `
  --timeout "300s" `
  --port "3000" `
  --scaling-mode "automatic" `
  --cpu-boost `
  --session-affinity `
  --ingress "all"
```

### 3. Configurações de Escalabilidade

- **min-instances: 2** - Mantém no mínimo 2 instâncias ativas
- **max-instances: 10** - Permite escalonar até 10 instâncias
- **memory: 1Gi** - Memória suficiente para cache local de sessões
- **session-affinity** - Mantém WebSocket connections na mesma instância quando possível
- **cpu-boost** - Performance extra para inicialização rápida

### 4. Configuração de Firestore Indexes

Criar indexes para performance das queries de sessões:

```javascript
// firestore.indexes.json - adicionar ao existing indexes
{
  "indexes": [
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "stationId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "metadata.lastActivity",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "session_participants",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "sessionId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "lastSeen",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "session_events",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "sessionId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

### 5. Testes de Validação

Após deploy, executar:

```powershell
# 1. Health check básico
$SERVICE_URL = gcloud run services describe revalida-backend --platform managed --region southamerica-east1 --format "value(status.url)"
Invoke-RestMethod -Uri "$SERVICE_URL/health" -Method GET

# 2. Verificar instâncias ativas
gcloud run services describe revalida-backend --region southamerica-east1 --format "table(status.latestReadyRevisionCount, status.url)"

# 3. Testar criação de sessão distribuída
$SESSION_TEST = @{
    stationId = "test-station-multi-instance"
    creatorId = "test-user"
    mode = "sequential"
    duration = 600
} | ConvertTo-Json

Invoke-RestMethod -Uri "$SERVICE_URL/api/create-session" -Method POST -Body $SESSION_TEST -ContentType "application/json"

# 4. Verificar logs das instâncias
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=revalida-backend" --limit 50 --format "table(timestamp,textPayload)"
```

### 6. Monitoramento

Configurar monitoring no Cloud Monitoring:

```bash
# Dashboard para sessões distribuídas
gcloud monitoring dashboards create --config-from-file=monitoring/session-dashboard.yaml

# Alertas para falhas de sincronização
gcloud monitoring policies create --policy-from-file=monitoring/session-alerts.yaml
```

### 7. Teste de Carga Multi-Instância

Usar script `test-multi-instance.js` (ver arquivo separado) para:

1. Criar múltiplas sessões simultâneas
2. Distribuir carga entre instâncias
3. Validar sincronização de participantes
4. Testar persistência durante scaling

## Procedimento de Rollback

Se ocorrerem problemas:

```powershell
# Voltar para versão anterior
gcloud run services update-traffic revalida-backend `
  --region southamerica-east1 `
  --to-revisions=revalida-backend-v1.3.0-stable=100

# Reduzir para instância única se necessário
gcloud run services update revalida-backend `
  --region southamerica-east1 `
  --min-instances "0" `
  --max-instances "1"
```

## Validação de Funcionamento

Verificar que:

- [ ] Múltiplas instâncias estão rodando (≥2)
- [ ] Sessões são criadas e persistidas no Firestore
- [ ] Participantes conseguem se conectar a diferentes instâncias
- [ ] Timers sincronizam entre instâncias
- [ ] Load balancing distribui requests corretamente
- [ ] WebSockets mantém conexões estáveis
- [ ] Não há perda de dados durante scaling

## Troubleshooting Comum

1. **Sessões não sincronizam**: Verificar `SESSION_DISTRIBUTED_MODE=true`
2. **WebSockets se desconectam**: Habilitar `session-affinity`
3. **Alta latência**: Verificar indexes do Firestore
4. **Memory leak**: Monitorar uso de memória por instância
