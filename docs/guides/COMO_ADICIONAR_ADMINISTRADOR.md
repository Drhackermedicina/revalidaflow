# Como Adicionar um Novo Usuário como Administrador

## Visão Geral

O sistema REVALIDAFLOW utiliza um sistema de roles baseado em Firestore:
- **Role**: Define o nível de acesso (`admin`, `moderator`, `user`)
- **Permissions**: Permissões granulares específicas

## Método 1: Via Console do Firebase (Recomendado)

Este é o método mais simples e direto.

### Passo 1: Acessar o Console do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto REVALIDAFLOW
3. Vá para **Firestore Database**

### Passo 2: Localizar ou Criar o Documento do Usuário

1. Na coleção `usuarios`, procure pelo UID do usuário
2. Se o documento não existir, crie um novo com o ID = UID do usuário
3. Clique no documento

### Passo 3: Adicionar Campos de Admin

**⚠️ CRÍTICO - Como adicionar corretamente:**

No Console do Firebase:

1. **Campo `role`:**
   - Tipo: `string`
   - Valor: `admin` (exatamente assim, minúscula)

2. **Campo `permissions`:**
   - Tipo: `map` (OBJETO, não string!)
   - Para adicionar: clique em "+ Add field" → nome: `permissions` → tipo: `map`
   - Dentro do map, adicione cada campo (clique no map para expandir):
     - `canDeleteMessages`: `boolean` = `true`
     - `canManageUsers`: `boolean` = `true`
     - `canEditStations`: `boolean` = `true`
     - `canViewAnalytics`: `boolean` = `true`
     - `canManageRoles`: `boolean` = `true`
     - `canAccessAdminPanel`: `boolean` = `true`

3. **Campos opcionais:**
   - `roleUpdatedAt`: `timestamp` (data/hora atual)
   - `roleUpdatedBy`: `string` = `"manual-{seu-nome}"`

**❌ ERRO COMUM:**
- Não use `permissions` como string JSON!
- Deve ser um objeto Map com campos booleanos individuais

### Passo 4: Verificar

Após salvar, o usuário precisará:
1. Fazer logout
2. Fazer login novamente
3. As permissões de admin serão carregadas automaticamente

Se não funcionar, veja `TROUBLESHOOTING_ADMIN.md`

---

## Método 2: Via Script Node.js

Se você tem acesso local com credenciais do Firebase Admin.

### Pré-requisitos

1. Ter o arquivo de credenciais do Firebase Admin:
   - Ou `backend/serviceAccountKey.json`
   - Ou variáveis de ambiente configuradas no `backend/.env`

2. Node.js instalado

### Executar o Script

```bash
# Navegar até a raiz do projeto
cd "d:\PROJETOS VS CODE\REVALIDAFLOW\FRONTEND E BACKEND"

# Executar o script
node scripts/add-admin-user.js VOVyjOGDLPYrRwyo1fcHrLTsxXP2
```

### Configurar Variáveis de Ambiente (se necessário)

Se não tiver `serviceAccountKey.json`, configure no `backend/.env`:

```env
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=seu-project.appspot.com
```

---

## Método 3: Via API Backend (Requer Admin Existente)

Se você já é admin e quer adicionar outro admin via interface.

### Endpoint

```
PUT /api/admin/users/:userId/role
```

### Headers

```
Authorization: Bearer {seu-token-jwt}
Content-Type: application/json
```

### Body

```json
{
  "newRole": "admin"
}
```

### Exemplo com cURL

```bash
curl -X PUT http://localhost:3000/api/admin/users/VOVyjOGDLPYrRwyo1fcHrLTsxXP2/role \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"newRole": "admin"}'
```

---

## Método 4: Via Firestore Rules (Fallback - DEPRECADO)

⚠️ **ATENÇÃO**: Este método está marcado como DEPRECADO e não é recomendado para novos admins.

No arquivo `firestore.rules`, existe uma lista de UIDs hardcoded:

```javascript
// ⚠️ FALLBACK: UIDs hardcoded (DEPRECADO - para compatibilidade apenas)
request.auth != null && request.auth.uid in [
  'KiSITAxXMAY5uU3bOPW5JMQPent2',  // Taís Zocche - DEPRECADO
  'RtfNENOqMUdw7pvgeeaBVSuin662',  // Usuário atual - DEPRECADO
  'J1Q8Zn9DuXaPmx7GMKHCQZ0NhUH3',  // alexandre - DEPRECADO
  'Iehedj0FJtN36tGfDyIojpdiJGi2',  // Stefferon - DEPRECADO
  'VOVyjOGDLPYrRwyo1fcHrLTsxXP2'   // Novo admin - ADICIONAR AQUI
]
```

Se quiser usar esse método (não recomendado):
1. Adicione o UID na lista
2. Execute `firebase deploy --only firestore:rules`

---

## Verificação de Permissões

### No Frontend (Vue DevTools)

```javascript
// No console do navegador
console.log({
  role: $pinia.state.userStore.state.role,
  permissions: $pinia.state.userStore.state.permissions,
  isAdmin: $pinia.state.userStore.isAdmin
});
```

### No Backend

O middleware `verifyAuth` carrega automaticamente as permissões do Firestore para cada requisição.

---

## Troubleshooting

### Problema: "Role não mudou após atualizar"

**Solução**: O usuário precisa fazer logout e login novamente.

### Problema: "Permissões não estão sendo aplicadas"

**Verificar**:
1. O documento no Firestore tem os campos corretos?
2. O usuário está autenticado com o UID correto?
3. Os listeners de Firestore estão ativos? (verificar console do navegador)

### Problema: "Script retorna erro de autenticação"

**Solução**: 
- Verifique as credenciais do Firebase Admin
- Certifique-se de que o ambiente está configurado corretamente
- Tente usar o Método 1 (Console do Firebase)

---

## Permissões Disponíveis

| Permissão | Admin | Moderator | User |
|-----------|-------|-----------|------|
| canDeleteMessages | ✅ | ✅ | ❌ |
| canManageUsers | ✅ | ❌ | ❌ |
| canEditStations | ✅ | ✅ | ❌ |
| canViewAnalytics | ✅ | ✅ | ❌ |
| canManageRoles | ✅ | ❌ | ❌ |
| canAccessAdminPanel | ✅ | ❌ | ❌ |

---

## Referências

- **Backend Auth**: `backend/middleware/auth.js`
- **Admin Auth**: `backend/middleware/adminAuth.js`
- **User Store**: `src/stores/userStore.js`
- **Firestore Rules**: `firestore.rules`

---

## Histórico de Mudanças

| Data | Admin | UID | Método | Observação |
|------|-------|-----|--------|------------|
| 2024-01-XX | Stefferon | Iehedj0FJtN36tGfDyIojpdiJGi2 | Rules hardcoded | Admin original |
| 2024-01-XX | Alexandre | J1Q8Zn9DuXaPmx7GMKHCQZ0NhUH3 | Rules hardcoded | Admin original |
| 2024-01-XX | Usuário Atual | RtfNENOqMUdw7pvgeeaBVSuin662 | Rules hardcoded | Admin original |
| 2024-01-XX | Taís Zocche | KiSITAxXMAY5uU3bOPW5JMQPent2 | Rules hardcoded | Admin original |
| YYYY-MM-DD | Novo Admin | VOVyjOGDLPYrRwyo1fcHrLTsxXP2 | Firestore | Adicionar aqui |

