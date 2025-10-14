# 📦 Setup do Documento de Metadata

## 🚀 SOLUÇÃO RÁPIDA: Criar Manualmente no Firebase Console

Siga estes passos para criar o documento `_metadata/station_counts`:

### Passo 1: Acessar Firebase Console
1. Abra [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto REVALIDAFLOW
3. Navegue para **Firestore Database**

### Passo 2: Criar Coleção `_metadata`
1. Clique em **"Start collection"** ou **"+ Add collection"**
2. Nome da coleção: `_metadata`
3. Clique em "Next"

### Passo 3: Criar Documento `station_counts`
1. Document ID: `station_counts`
2. Adicione os seguintes campos:

```
total (number): 0

inep (map):
  ├─ 2025.1 (number): 0
  ├─ 2024.2 (number): 0
  ├─ 2024.1 (number): 0
  ├─ 2023.2 (number): 0
  ├─ 2023.1 (number): 0
  ├─ 2022.2 (number): 0
  ├─ 2022.1 (number): 0
  ├─ 2021 (number): 0
  ├─ 2020 (number): 0
  ├─ 2017 (number): 0
  ├─ 2016 (number): 0
  ├─ 2015 (number): 0
  ├─ 2014 (number): 0
  ├─ 2013 (number): 0
  ├─ 2012 (number): 0
  └─ 2011 (number): 0

revalidaFacil (map):
  ├─ clinica-medica (number): 0
  ├─ cirurgia (number): 0
  ├─ pediatria (number): 0
  ├─ ginecologia (number): 0
  ├─ preventiva (number): 0
  ├─ procedimentos (number): 0
  └─ geral (number): 0

metadata (map):
  ├─ lastUpdate (timestamp): [data/hora atual]
  ├─ version (string): "1.0"
  ├─ generatedBy (string): "manual"
  └─ note (string): "Contagens de estações por categoria"
```

3. Clique em **"Save"**

### Passo 4: Popular com Contagens Reais

Agora você tem duas opções:

#### Opção A: Preencher Manualmente
1. Navegue até a coleção `estacoes_clinicas`
2. Use os filtros para contar:
   - INEP por período: `where inepPeriod == "2024.2"`
   - Revalida por especialidade: `where idEstacao starts with "REVALIDA_FACIL_CLINICA_MEDICA"`
3. Atualize os números no documento `_metadata/station_counts`

#### Opção B: Usar Script com Service Account (automático)

Veja instruções abaixo para configurar autenticação admin.

---

## 🔐 SOLUÇÃO COMPLETA: Script com Service Account

### Pré-requisitos
1. Ter acesso admin ao projeto Firebase
2. Baixar service account key

### Passo 1: Baixar Service Account Key
1. Firebase Console → **Project Settings** (engrenagem)
2. Aba **Service Accounts**
3. Clique em **"Generate new private key"**
4. Salvar arquivo como: `backend/revalidaflow-firebase-adminsdk.json`
5. ⚠️ **IMPORTANTE**: Adicionar ao `.gitignore` para não commitar credenciais!

### Passo 2: Verificar .gitignore
Adicione ao `.gitignore` se não existir:
```
# Firebase Service Account
backend/*-adminsdk.json
backend/service-account.json
*-firebase-adminsdk*.json
```

### Passo 3: Executar Script
```bash
npm run populate-counts
```

O script irá:
- ✅ Conectar ao Firestore com admin SDK
- ✅ Buscar todas as estações
- ✅ Contar por categoria
- ✅ Criar/atualizar documento `_metadata/station_counts`
- ✅ Mostrar resumo completo

---

## 📊 Exemplo de Saída Esperada

```
🚀 Iniciando contagem de estações...

📥 Buscando todas as estações do Firestore...
✅ Encontradas 677 estações

🔢 Processando e contando por categoria...

📊 RESUMO DA CONTAGEM:

  Total de estações: 677
  ├─ INEP: 245
  ├─ Revalida Fácil: 432
  └─ Não classificadas: 0

  INEP por período:
    - 2025.1: 45
    - 2024.2: 52
    - 2024.1: 48
    - 2023.2: 35
    ...

  Revalida Fácil por especialidade:
    - clinica-medica: 78
    - cirurgia: 65
    - pediatria: 54
    - ginecologia: 43
    - preventiva: 67
    - procedimentos: 125

💾 Salvando no Firestore (_metadata/station_counts)...
✅ Contagens salvas com sucesso!

🎉 Processo concluído com sucesso!
```

---

## 🔍 Verificar Documento Criado

Firestore Console:
```
_metadata/
  └─ station_counts/
     ├─ total: 677
     ├─ inep: { "2024.2": 52, ... }
     ├─ revalidaFacil: { "clinica-medica": 78, ... }
     └─ metadata: { lastUpdate, version, ... }
```

---

## ⚠️ Problemas Comuns

### "Missing or insufficient permissions"
**Causa**: Firestore Rules não permitem write em `_metadata`

**Solução**: Adicionar regra temporária:
```javascript
match /_metadata/{document=**} {
  allow read, write: if request.auth != null &&
    get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.isAdmin == true;
}
```

### "Cannot find module 'firebase/app'"
**Causa**: Dependências não instaladas

**Solução**:
```bash
npm install
```

### Script demora muito
**Causa**: Muitas estações (1000+)

**Solução**: Normal, aguarde. Processo leva ~30s para 1000 estações.

---

## 📝 Próximos Passos

Após criar o documento:

1. ✅ Verificar documento no Firebase Console
2. ✅ Testar `fetchStationCounts()` em `useStationData.js`
3. ✅ Atualizar `StationList.vue` para usar contagens
4. ✅ Implementar Cloud Function para auto-update
5. ✅ Testar carregamento da página (deve ser < 500ms)

---

**Criado por**: Claude Code
**Data**: 2025-01-12
**Versão**: 1.0
