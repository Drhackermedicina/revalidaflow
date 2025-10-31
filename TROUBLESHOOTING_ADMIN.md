# 🔍 Troubleshooting: Admin Não Funciona

Se você adicionou o admin via Console do Firebase mas não está funcionando, siga estes passos:

## ✅ Checklist de Verificação

### 1. Verificar se o Documento Foi Criado Corretamente

**No Console Firebase:**
1. Vá em Firestore Database
2. Abra coleção `usuarios`
3. Procure pelo ID: `VOVyjOGDLPYrRwyo1fcHrLTsxXP2`
4. Verifique que tem os campos:

```javascript
{
  role: "admin",  // ← DEVE SER "admin" (string, minúscula)
  permissions: {
    canDeleteMessages: true,
    canManageUsers: true,
    canEditStations: true,
    canViewAnalytics: true,
    canManageRoles: true,
    canAccessAdminPanel: true
  }
}
```

**Erros Comuns:**
- ❌ `role: "Admin"` → ✅ `role: "admin"` (deve ser minúscula)
- ❌ `role: admin` → ✅ `role: "admin"` (deve ser string)
- ❌ `permissions` como string → ✅ `permissions` como objeto/map

### 2. Verificar Permissões do Firestore

**No Console Firebase → Rules:**
```javascript
match /usuarios/{userId} {
  allow read, write: if request.auth != null; // ← Deve estar assim
}
```

### 3. Verificar Logout/Login

**CRÍTICO**: O usuário PRECISA:
1. Fazer logout completo
2. Fechar o navegador (ou ao menos a aba)
3. Abrir novamente
4. Fazer login

O frontend usa cache e listeners - só atualiza após logout/login.

### 4. Verificar no Console do Navegador

**Abra DevTools (F12) → Console e digite:**
```javascript
// Ver role atual
console.log('Role:', $pinia.state.userStore.state.role)
console.log('Permissions:', $pinia.state.userStore.state.permissions)
console.log('Is Admin?', $pinia.state.userStore.isAdmin)

// Ver dados brutos do Firestore (no listener)
console.log('Current User UID:', $pinia.state.userStore.state.user?.uid)
```

**Se role ainda está "user":**
- Verifique se fez logout/login
- Verifique se o UID está correto
- Verifique console para erros do Firestore

### 5. Verificar UID Correto

**No Firebase Auth:**
1. Vá em Authentication
2. Procure pelo usuário
3. Compare o UID com: `VOVyjOGDLPYrRwyo1fcHrLTsxXP2`
4. **Deve ser EXATAMENTE igual** (case-sensitive)

### 6. Verificar Cache do Firestore

O Firestore pode ter cache local. Para limpar:

**No DevTools Console:**
```javascript
// Limpar cache do PWA
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name))
  })
}

// Recarregar página com cache limpo
location.reload(true)
```

### 7. Testar com Script

Se tudo acima falhar, tente o script:

```bash
cd "d:\PROJETOS VS CODE\REVALIDAFLOW\FRONTEND E BACKEND"
node scripts/add-admin-user.js VOVyjOGDLPYrRwyo1fcHrLTsxXP2
```

Ele vai:
- Mostrar o role atual
- Atualizar para admin
- Verificar se funcionou

### 8. Verificar Erros de Console

**Procure por:**
- `firestore permission-denied`
- `firestore missing-permissions`
- Qualquer erro relacionado a `usuarios`

## 🚨 Problemas Comuns

### Problema: "Documento não existe"

**Causa**: UID errado ou usuário não foi criado

**Solução**: Crie o documento manualmente no Console Firebase

### Problema: "Role não muda após logout/login"

**Causa**: Cache do navegador ou listener não reconecta

**Solução**: 
1. Limpe cache completo
2. Use modo anônimo/privado
3. Ou espere 2-3 minutos (cache do Firestore expira)

### Problema: "Permissions vazias"

**Causa**: Campo `permissions` não foi salvo corretamente

**Solução**: No Console Firebase, verifique que `permissions` é um objeto, não string

### Problema: "Funciona no console mas não no app"

**Causa**: UID diferente ou autenticação não sincronizada

**Solução**: Verifique qual UID está autenticado no app vs qual você editou

## 🔧 Debug Avançado

**Adicione logs temporários:**

```javascript
// No console do navegador
// Logar TODAS as mudanças de role
const originalFetchRole = $pinia.state.userStore.fetchUserRole
$pinia.state.userStore.fetchUserRole = function(...args) {
  console.log('[DEBUG] fetchUserRole chamado', args)
  return originalFetchRole.apply(this, args)
}

// Assistir mudanças no state
watch(() => $pinia.state.userStore.state.role, (newRole) => {
  console.log('[DEBUG] Role mudou para:', newRole)
})
```

## 📞 Próximos Passos

Se NADA funcionar:

1. **Capture screenshots de:**
   - Console Firebase mostrando o documento
   - Console do navegador com logs
   - Rules do Firestore

2. **Tente método alternativo:**
   - Script Node.js
   - API do backend
   - Ou método de hardcode nas rules (não recomendado, mas funciona)

3. **Verifique se tem outro admin ativo** para usar o endpoint `/api/admin/users/:userId/role`

