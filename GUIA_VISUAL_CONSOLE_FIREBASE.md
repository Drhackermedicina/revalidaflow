# 🎯 Guia Visual: Como Adicionar Admin no Console Firebase

## Passo a Passo Detalhado

### 1️⃣ Acesse o Firestore

```
Firebase Console
    ↓
Firestore Database
    ↓
Collection: usuarios
```

### 2️⃣ Procure ou Crie o Documento

```
Documentos na collection usuarios:
┌────────────────────────────────────────────────┐
│ [VOVyjOGDLPYrRwyo1fcHrLTsxXP2]  ← Este é o ID │
└────────────────────────────────────────────────┘

Se não existir, clique em "Add document"
ID do documento: VOVyjOGDLPYrRwyo1fcHrLTsxXP2
```

### 3️⃣ Adicionar Campo `role` (Passo 1/2)

```
Campo atual:
+ Add field
    ↓
Field name: role
Field type: [string] ← SELECIONE "string"
Value: admin ← ESCREVA "admin" (minúscula)

✓ Resultado:
┌─────────────────────────┐
│ role: "admin"           │
└─────────────────────────┘
```

### 4️⃣ Adicionar Campo `permissions` (Passo 2/2)

Este é o PASSOS MAIS IMPORTANTE! Muita gente erra aqui.

```
Campo atual:
+ Add field
    ↓
Field name: permissions
Field type: [map] ← SELECIONE "map" (OBJETO, não string!)

✓ Resultado:
┌─────────────────────────┐
│ permissions: [map]      │ ← Clique aqui para expandir
└─────────────────────────┘
    ↓ (clique para expandir)
┌─────────────────────────────────────┐
│ permissions: [map]                  │
│   + Add field                       │
└─────────────────────────────────────┘
```

### 5️⃣ Dentro do Map `permissions`, Adicionar 6 Campos Booleanos

**Para CADA campo, repita este processo:**

```
┌─────────────────────────────────────┐
│ permissions: [map]                  │
│   + Add field                       │ ← Clique aqui
└─────────────────────────────────────┘
    ↓
Field name: canDeleteMessages
Field type: [boolean] ← SELECIONE "boolean"
Value: true

Field name: canManageUsers
Field type: [boolean]
Value: true

Field name: canEditStations
Field type: [boolean]
Value: true

Field name: canViewAnalytics
Field type: [boolean]
Value: true

Field name: canManageRoles
Field type: [boolean]
Value: true

Field name: canAccessAdminPanel
Field type: [boolean]
Value: true
```

### 6️⃣ Resultado Final

O documento deve ficar assim:

```
Document: usuarios/VOVyjOGDLPYrRwyo1fcHrLTsxXP2
┌─────────────────────────────────────────────────────┐
│ field         type      value                       │
├─────────────────────────────────────────────────────┤
│ role          string    "admin"                     │
│ permissions   map                                   │
│   ├─ canDeleteMessages  boolean   true              │
│   ├─ canManageUsers     boolean   true              │
│   ├─ canEditStations    boolean   true              │
│   ├─ canViewAnalytics   boolean   true              │
│   ├─ canManageRoles     boolean   true              │
│   └─ canAccessAdminPanel boolean  true              │
└─────────────────────────────────────────────────────┘
```

### 7️⃣ Salvar e Fazer Logout/Login

```
1. Clique em "Save" (ou "Update")
2. No app: LOGOUT completo
3. Fechar navegador/aba
4. Abrir novamente
5. LOGIN
6. Deve funcionar! ✨
```

---

## ❌ ERROS COMUNS

### ERRO 1: permissions como String

```
❌ ERRADO:
Field name: permissions
Field type: string ← ERRADO!
Value: {canDeleteMessages: true, ...} ← ERRADO!

✓ CORRETO:
Field name: permissions
Field type: map ← CORRETO!
```

### ERRO 2: role com Letra Maiúscula

```
❌ ERRADO:
role: "Admin" ← ERRADO!

✓ CORRETO:
role: "admin" ← CORRETO!
```

### ERRO 3: permissions vazio ou mal formatado

```
❌ ERRADO:
permissions: {}
permissions: null
permissions: []

✓ CORRETO:
permissions: {
  canDeleteMessages: true,
  canManageUsers: true,
  canEditStations: true,
  canViewAnalytics: true,
  canManageRoles: true,
  canAccessAdminPanel: true
}
```

---

## 🔍 Como Verificar se Está Correto

### No Firebase Console

O campo `permissions` deve aparecer assim:

```
permissions: [map] 6 fields
```

Ao clicar, deve mostrar os 6 campos booleanos.

### No App (Após Logout/Login)

Abra o DevTools Console (F12):

```javascript
console.log('Role:', $pinia.state.userStore.state.role)
// Deve mostrar: Role: "admin"

console.log('Is Admin?', $pinia.state.userStore.isAdmin)
// Deve mostrar: Is Admin? true

console.log('Permissions:', $pinia.state.userStore.state.permissions)
// Deve mostrar:
// {
//   canDeleteMessages: true,
//   canManageUsers: true,
//   canEditStations: true,
//   canViewAnalytics: true,
//   canManageRoles: true,
//   canAccessAdminPanel: true
// }
```

Se mostrar `Role: "user"` ou `Is Admin? false`, veja `TROUBLESHOOTING_ADMIN.md`.

---

## 📸 Screenshot da Estrutura Correta

Se puder, tire um screenshot da estrutura correta após salvar e compare com o que você fez.

A estrutura visual no console deve mostrar:
- `role` como uma linha simples
- `permissions` como uma linha que pode ser expandida
- Ao expandir `permissions`, deve mostrar 6 campos dentro

---

## 🆘 Ainda Não Funciona?

1. Verifique `TROUBLESHOOTING_ADMIN.md`
2. Tente o script: `node scripts/add-admin-user.js VOVyjOGDLPYrRwyo1fcHrLTsxXP2`
3. Verifique se fez logout/login completo
4. Limpe cache do navegador
5. Use modo anônimo/privado para testar

