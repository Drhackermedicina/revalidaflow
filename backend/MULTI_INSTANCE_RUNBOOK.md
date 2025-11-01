# Runbook: Troubleshooting Multi-Instance Deployment (P0-B12)

## Visão Geral

Este runbook contém procedimentos para diagnosticar e resolver problemas comuns em deployments multi-instância do REVALIDAFLOW com sessões distribuídas.

## Sistema Monitorado

- **Backend**: Cloud Run com 2-10 instâncias
- **Sessões**: Firestore (collections: sessions, session_participants, session_events)
- **Real-time**: Socket.IO com session affinity
- **Cache**: Cache local de 30s por instância

## 🚨 Alertas e Diagnósticos

### Alerta: Taxa de Erro Alta (>5%)

**Sintomas**:
- Aumento de respostas 4xx/5xx
- Usuários reportando falhas
- Dashboard Cloud Monitoring mostra picos de erros

**Diagnóstico**:
```bash
# Verificar logs de erro recentes
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=revalida-backend logName:projects/revalida-companion/logs/run.googleapis.com%2Fstderr" --limit 50 --format "table(timestamp,textPayload)"

# Verificar instâncias com problemas
gcloud run services describe revalida-backend --region southamerica-east1 --format "table(status.latestReadyRevisionCount,status.traffic)"

# Verificar latência
gcloud logging read "resource.type=cloud_run_revision resource.labels.service_name=revalida-backend metric.type=\"run.googleapis.com/request_latencies\"" --limit 20
```

**Resolução**:
1. **Se Firestore errors**: Verificar conectividade e permissões
   ```bash
   gcloud logging read "jsonPayload.message=~\"Firestore\"" --limit 20
   ```
2. **Se timeout errors**: Verificar performance das queries
   ```bash
   # Verificar queries lentas no Firestore
   gcloud logging read "jsonPayload.message=~\"slow query\"" --limit 10
   ```
3. **Se memory errors**: Escalar recursos
   ```bash
   gcloud run services update revalida-backend --region southamerica-east1 --memory "2Gi"
   ```

### Alerta: Nenhuma Instância Ativa

**Sintomas**:
- Service retorna 503 Service Unavailable
- Dashboard mostra 0 instâncias
- Health checks falhando

**Diagnóstico**:
```bash
# Verificar status do serviço
gcloud run services describe revalida-backend --region southamerica-east1

# Verificar últimas revisões
gcloud run revisions list --service=revalida-backend --region southamerica-east1 --limit 5 --format "table(name,status,createTime)"

# Verificar logs de startup
gcloud logs read "resource.type=cloud_run_revision resource.labels.service_name=revalida-backend logName:projects/revalida-companion/logs/run.googleapis.com%2Frun.googleapis.com%2Fstdout" --limit 30
```

**Resolução**:
1. **Verificar deployment recente**:
   ```bash
   # Verificar se há deployment em progresso
   gcloud run services describe revalida-backend --region southamerica-east1 --format "value(status.latestReadyRevisionName)"
   ```
2. **Rollback para versão estável**:
   ```bash
   gcloud run services update-traffic revalida-backend --region southamerica-east1 --to-revisions=revalida-backend-v1.3.0-stable=100
   ```
3. **Verificar configurações de ambiente**:
   ```bash
   gcloud run services describe revalida-backend --region southamerica-east1 --format "yaml(spec.template.spec.containers[0].env)"
   ```

### Alerta: Latência Alta (>2s)

**Sintomas**:
- Respostas lentas
- WebSocket timeouts
- UX degradada

**Diagnóstico**:
```bash
# Verificar latência por percentil
gcloud monitoring metrics list --filter="metric.type=run.googleapis.com/request_latencies" --format="table(metric.type)"

# Verificar cold starts
gcloud logging read "jsonPayload.message=~\"Cold start\"" --limit 10

# Verificar uso de CPU/Memória
gcloud monitoring timeSeries-list --filter="metric.type=run.googleapis.com/container/cpu_usage" --limit 5
```

**Resolução**:
1. **Otimizar cold starts**:
   ```bash
   # Aumentar min-instances
   gcloud run services update revalida-backend --region southamerica-east1 --min-instances "2"

   # Habilitar CPU boost
   gcloud run services update revalida-backend --region southamerica-east1 --cpu-throttling=false
   ```
2. **Otimizar performance**:
   ```bash
   # Aumentar memória
   gcloud run services update revalida-backend --region southamerica-east1 --memory "2Gi"

   # Aumentar CPU
   gcloud run services update revalida-backend --region southamerica-east1 --cpu "2"
   ```

## 🔧 Problemas Comuns de Sessões

### Sessões Não Sincronizam

**Sintomas**:
- Participantes não veem uns aos outros
- Timers não atualizam
- Estados inconsistentes

**Diagnóstico**:
```bash
# Verificar eventos de sessão no Firestore
gcloud firestore indexes composite list

# Verificar logs do SessionIntegration
gcloud logging read "jsonPayload.message=~\"SESSION INTEGRATION\"" --limit 20

# Verificar conexões WebSocket
gcloud logging read "jsonPayload.message=~\"WebSocket\"" --limit 20
```

**Resolução**:
1. **Verificar variáveis de ambiente**:
   ```bash
   gcloud run services describe revalida-backend --region southamerica-east1 --format="value(spec.template.spec.containers[0].env)" | grep SESSION
   ```
2. **Verificar permissions do Firestore**:
   ```bash
   # Verificar se service account tem permissions
   gcloud projects get-iam-policy revalida-companion --flatten="bindings[].members" --format="table(bindings.role,bindings.members)" | grep "cloud-run-sa"
   ```
3. **Testar sincronização manual**:
   ```bash
   # Executar script de teste
   node test-session-sync.js --service-url=https://your-service-url.run.app
   ```

### WebSocket Connections Falham

**Sintomas**:
- Conexões caem frequentemente
- "Connection refused" errors
- Real-time features não funcionam

**Diagnóstico**:
```bash
# Verificar logs de WebSocket
gcloud logging read "jsonPayload.message=~\"WebSocket\" OR jsonPayload.message=~\"socket.io\"" --limit 30

# Verificar session affinity
gcloud run services describe revalida-backend --region southamerica-east1 --format="value(spec.template.spec.sessionAffinity)"
```

**Resolução**:
1. **Habilitar session affinity**:
   ```bash
   gcloud run services update revalida-backend --region southamerica-east1 --session-affinity
   ```
2. **Ajustar timeouts**:
   ```bash
   gcloud run services update revalida-backend --region southamerica-east1 --timeout "600s"
   ```
3. **Verificar CORS**:
   ```bash
   # Testar CORS manualmente
   curl -H "Origin: https://www.revalidaflow.com.br" -H "Access-Control-Request-Method: GET" -X OPTIONS https://your-service-url.run.app
   ```

### Load Balancing Desigual

**Sintomas**:
- Uma instância sobrecarregada
- Outras instâncias ociosas
- Performance inconsistente

**Diagnóstico**:
```bash
# Verificar distribuição de requests
gcloud monitoring timeSeries-list --filter="metric.type=run.googleapis.com/request_count" --limit 10

# Verificar uso de recursos por instância
gcloud monitoring timeSeries-list --filter="metric.type=run.googleapis.com/container/cpu_usage" --limit 10
```

**Resolução**:
1. **Desabilitar session affinity temporariamente**:
   ```bash
   gcloud run services update revalida-backend --region southamerica-east1 --no-session-affinity
   ```
2. **Ajustar configurações de escalonamento**:
   ```bash
   gcloud run services update revalida-backend --region southamerica-east1 --max-instances "20"
   ```

## 📊 Scripts de Diagnóstico

### Script de Verificação de Saúde Completa

```bash
#!/bin/bash
# health-check-multi-instance.sh

echo "🏥 REVALIDAFLOW Multi-Instance Health Check"
echo "========================================"

SERVICE_URL=$(gcloud run services describe revalida-backend --region southamerica-east1 --format="value(status.url)")
echo "🌐 Service URL: $SERVICE_URL"

# 1. Health check básico
echo "1️⃣ Health Check Básico..."
curl -s "$SERVICE_URL/health" | jq '.' || echo "❌ Health check failed"

# 2. Verificar instâncias
echo "2️⃣ Verificando Instâncias..."
gcloud run services describe revalida-backend --region southamerica-east1 --format="table(status.latestReadyRevisionCount,status.traffic)"

# 3. Testar criação de sessão
echo "3️⃣ Testando Criação de Sessão..."
SESSION_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/create-session" \
  -H "Content-Type: application/json" \
  -d '{"stationId":"health-check-station","creatorId":"health-check","mode":"sequential","duration":300}')

echo "$SESSION_RESPONSE" | jq '.' || echo "❌ Session creation failed"

# 4. Verificar Firestore
echo "4️⃣ Verificando Firestore..."
gcloud logging read "jsonPayload.message=~\"SESSION INTEGRATION\" AND jsonPayload.message=~\"initialized\"" --limit 1 --format="value(timestamp,textPayload)" || echo "❌ Firestore connection issues"

# 5. Verificar logs de erro recentes
echo "5️⃣ Verificando Erros Recentes..."
ERROR_COUNT=$(gcloud logging read "resource.type=cloud_run_revision resource.labels.service_name=revalida-backend severity>=ERROR" --limit 100 --format="value(timestamp)" | wc -l)
echo "📊 Errors in last 100 logs: $ERROR_COUNT"

# 6. Verificar WebSocket
echo "6️⃣ Verificando WebSocket..."
WS_LOGS=$(gcloud logging read "jsonPayload.message=~\"WebSocket\" OR jsonPayload.message=~\"CONEXÃO\"" --limit 10 --format="value(timestamp,textPayload)" | head -3)
echo "$WS_LOGS" || echo "❌ No WebSocket logs found"

echo "✅ Health check concluído"
```

### Script de Teste de Carga Rápido

```bash
#!/bin/bash
# quick-load-test.sh

SERVICE_URL=${1:-"http://localhost:3000"}
CONCURRENT_REQUESTS=${2:-10}
TEST_DURATION=${3:-30}

echo "🚀 Quick Load Test - $CONCURRENT_REQUESTS requests por ${TEST_DURATION}s"

# Instalar se necessário
command -v hey >/dev/null 2>&1 || { echo "Instalando hey..."; go install github.com/rakyll/hey@latest; }

# Testar endpoint de health
echo "1️⃣ Testando /health..."
hey -n 100 -c 10 -t 10 "$SERVICE_URL/health"

# Testar criação de sessão
echo "2️⃣ Testando /api/create-session..."
hey -n 50 -c 5 -t 10 -m POST -H "Content-Type: application/json" -d '{"stationId":"load-test","creatorId":"load-test","mode":"sequential","duration":300}' "$SERVICE_URL/api/create-session"

echo "✅ Load test concluído"
```

## 🔄 Procedimentos de Manutenção

### Deploy de Nova Versão

1. **Preparação**:
   ```bash
   # Backup das configurações atuais
   gcloud run services describe revalida-backend --region southamerica-east1 --format="yaml" > current-config.yaml

   # Verificar métricas baseline
   gcloud monitoring timeSeries-list --filter="metric.type=run.googleapis.com/request_count" --limit 1
   ```

2. **Deploy Gradual**:
   ```bash
   # Deploy com tag de versão
   VERSION=$(date +%Y%m%d-%H%M%S)
   docker build -t gcr.io/revalida-companion/revalida-backend:$VERSION .
   docker push gcr.io/revalida-companion/revalida-backend:$VERSION

   # Deploy com 10% de tráfego inicial
   gcloud run deploy revalida-backend-v$VERSION --image gcr.io/revalida-companion/revalida-backend:$VERSION --region southamerica-east1 --no-traffic
   gcloud run services update-traffic revalida-backend --region southamerica-east1 --to-revisions=revalida-backend-v$VERSION=10,revalida-backend-current=90
   ```

3. **Monitoramento**:
   ```bash
   # Monitorar por 10 minutos
   gcloud logging read "resource.type=cloud_run_revision resource.labels.service_name=revalida-backend-v$VERSION severity>=ERROR" --limit 50 --freshness=10m

   # Se tudo ok, migrar 100%
   gcloud run services update-traffic revalida-backend --region southamerica-east1 --to-revisions=revalida-backend-v$VERSION=100
   ```

### Limpeza de Recursos

```bash
# Limpar revisões antigas
gcloud run revisions list --service=revalida-backend --region southamerica-east1 --limit 20 --format="value(name)" | tail -10 | xargs -I {} gcloud run revisions delete {} --region southamerica-east1 --quiet

# Limpar logs antigos
gcloud logging logs delete run.googleapis.com%2Fstdout --quiet
gcloud logging logs delete run.googleapis.com%2Fstderr --quiet
```

## 📞 Escalation

### Nível 1: Operações (0-30 min)
- Verificar scripts básicos deste runbook
- Monitorar dashboards
- Documentar todos os passos executados

### Nível 2: Desenvolvedor Backend (30+ min)
- Analisar código-fonte dos erros
- Verificar configuração do SessionIntegration
- Revisar queries do Firestore

### Nível 3: Arquiteto/DevOps (1+ hora)
- Revisar arquitetura multi-instância
- Analisar padrões de tráfego
- Considerar mudanças de infraestrutura

### Critérios para Escalation
- >5% de erro rate por >15min
- Serviço indisponível por >5min
- Perda de dados de sessão confirmada
- Performance degradada >50%

## 📚 Referências

- [Documentação completa](CLOUD_RUN_MULTI_INSTANCE.md)
- [Scripts de teste](test-multi-instance.js)
- [Testes de sincronização](test-session-sync.js)
- [Monitoring dashboards](monitoring/session-dashboard.yaml)
- [Alertas configurados](monitoring/session-alerts.yaml)
