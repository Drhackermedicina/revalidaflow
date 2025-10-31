# 🚀 Como Adicionar Administrador - Guia Rápido

## Para o UID: `VOVyjOGDLPYrRwyo1fcHrLTsxXP2`

### ✅ Método Mais Simples: Console do Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto REVALIDAFLOW
3. Vá em **Firestore Database**
4. Abra a coleção **usuarios**
5. Procure ou crie um documento com ID: `VOVyjOGDLPYrRwyo1fcHrLTsxXP2`
6. Adicione/edite estes campos:

```javascript
role: "admin"

permissions: {
  canDeleteMessages: true,
  canManageUsers: true,
  canEditStations: true,
  canViewAnalytics: true,
  canManageRoles: true,
  canAccessAdminPanel: true
}
```

**⚠️ ATENÇÃO IMPORTANTE:**

- `role` deve ser **"admin"** (string, minúscula)
- `permissions` deve ser um **objeto Map** (não string!)
- No Console Firebase, ao adicionar `permissions`, clique em "map" → "Add field"

7. **CRÍTICO**: O usuário precisa fazer logout e login novamente
8. Se ainda não funcionar, verifique o arquivo `TROUBLESHOOTING_ADMIN.md`

---

### 🔧 Método Alternativo: Script Node.js

```bash
node scripts/add-admin-user.js VOVyjOGDLPYrRwyo1fcHrLTsxXP2
```

**Requisitos**: Credenciais do Firebase Admin configuradas (backend/.env)

---

### 📚 Documentação Completa

Veja `docs/guides/COMO_ADICIONAR_ADMINISTRADOR.md` para todos os métodos disponíveis.

---

## ⚠️ Importante

- Após adicionar o admin, o usuário deve fazer **logout e login** novamente
- As permissões são carregadas automaticamente do Firestore
- Não é necessário reiniciar o servidor

