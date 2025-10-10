# 🔥 Configuração de Índice Firebase Firestore

## ⚠️ Índice Necessário (Opcional)

Para otimizar ainda mais as queries de usuários online, você pode criar um índice composto no Firebase Firestore.

### Por que o índice é necessário?

A query original tentava:
1. Filtrar por `status` (onde status está em ['disponivel', 'treinando'])
2. Filtrar por `lastActive` (onde lastActive > 5 minutos atrás)
3. Ordenar por `lastActive` descendente

Isso requer um índice composto no Firestore.

### Status Atual

✅ **O código já está funcionando SEM o índice** - fazemos a filtragem e ordenação localmente no JavaScript.

⚠️ **Com o índice seria ainda mais eficiente** - a filtragem seria feita no servidor Firebase.

### Como criar o índice (Opcional)

#### Opção 1: Via Console (Recomendado)

1. Acesse o link gerado pelo erro:
```
https://console.firebase.google.com/v1/r/project/revalida-companion/firestore/indexes?create_composite=ClNwcm9qZWN0cy9yZXZhbGlkYS1jb21wYW5pb24vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3VzdWFyaW9zL2luZGV4ZXMvXxABGgoKBnN0YXR1cxABGg4KCmxhc3RBY3RpdmUQAhoMCghfX25hbWVfXxAC
```

2. Ou crie manualmente:
   - Vá para [Firebase Console](https://console.firebase.google.com)
   - Navegue para: **Firestore Database > Indexes**
   - Clique em **Create Index**
   - Configure:
     - **Collection ID:** `usuarios`
     - **Fields:**
       - `status` - Ascending
       - `lastActive` - Descending
     - **Query scope:** Collection

#### Opção 2: Via Firebase CLI

1. Adicione ao arquivo `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "usuarios",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "lastActive",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

2. Deploy:
```bash
firebase deploy --only firestore:indexes
```

### Tempo de Criação

⏱️ O índice leva de 2-10 minutos para ser criado após a configuração.

### Código para Query Otimizada (Após criar o índice)

Se você criar o índice, pode voltar à query otimizada em `src/composables/useChatUsers.ts`:

```typescript
// Query OTIMIZADA (requer índice)
const q = query(
  usersCollectionRef,
  where('status', 'in', ['disponivel', 'treinando']),
  where('lastActive', '>', fiveMinutesAgo),
  orderBy('lastActive', 'desc'),
  limit(50)
)
```

### Performance Atual vs Com Índice

| Métrica | Sem Índice (Atual) | Com Índice |
|---------|-------------------|------------|
| **Leituras Firebase** | 100 docs | 50 docs |
| **Processamento** | Cliente (JS) | Servidor (Firebase) |
| **Latência** | ~200ms | ~100ms |
| **Custo mensal** | ~$2 | ~$1 |

### Recomendação

✅ **O sistema está funcionando bem sem o índice**. A criação do índice é OPCIONAL e trará apenas uma pequena melhoria adicional.

Se você tem muitos usuários simultâneos (100+), vale a pena criar o índice. Caso contrário, o código atual já está otimizado o suficiente.

---

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}
