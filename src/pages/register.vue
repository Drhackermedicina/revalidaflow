<script setup>
import { onMounted } from 'vue'
import { useRegister } from '@/composables/useRegister.js';

console.log('[Register] Iniciando componente de registro...')

// Usando o composable completo com todas as funcionalidades
const {
  loading,
  error,
  usuarioGoogle,
  form,
  loginComGoogle,
  salvarUsuarioFirestore,
  processarRedirectResult,
  aplicarMascaraCPF,
} = useRegister()

// Processar resultado de redirect quando o usuário volta da autenticação
onMounted(async () => {
  console.log('[Register] Verificando resultado de redirect...')
  await processarRedirectResult()
})

// Função wrapper para adicionar logs de diagnóstico
async function handleGoogleLogin() {
  console.log('[Register] Botão "Entrar com Google" clicado!')
  console.log('[Register] Estado atual antes do login:', {
    loading: loading.value,
    error: error.value,
    usuarioGoogle: usuarioGoogle.value,
    form: form.value
  })
  
  try {
    await loginComGoogle()
    console.log('[Register] loginComGoogle executado com sucesso.')
  } catch (e) {
    console.error('[Register] Erro capturado ao executar loginComGoogle:', e)
  }
}

console.log('[Register] Componente inicializado com useRegister:', {
  loading: loading.value,
  error: error.value,
  usuarioGoogle: usuarioGoogle.value,
  form: form.value
})

// Teste automático para debug (remover após testes)
setTimeout(() => {
  console.log('[Register] Simulando usuário Google logado para testes...')
  // Simular usuário Google logado
  usuarioGoogle.value = {
    uid: 'test-user-123',
    displayName: 'Usuário Teste',
    email: 'teste@example.com',
    photoURL: null
  }
  console.log('[Register] Usuário Google simulado:', usuarioGoogle.value)
}, 2000)
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center" style="background: #f5f5f9;">
    <v-card class="pa-6" max-width="500" elevation="10" rounded="lg">
      <v-card-title class="justify-center">
        <v-avatar color="primary" size="48" class="mb-2">
          <v-icon size="32">mdi-account-plus</v-icon>
        </v-avatar>
      </v-card-title>
      <v-card-subtitle class="text-center mb-4">
        <span class="text-h5 font-weight-bold">Cadastro</span>
        <div class="text-body-2 mt-1">Cadastre-se com Google e complete seus dados</div>
      </v-card-subtitle>
      <v-card-text>
        <!-- Botão de teste para debug -->
        <v-btn
          v-if="!usuarioGoogle"
          @click="handleGoogleLogin"
          @mousedown="() => console.log('[Register] Botão Google - mousedown detectado')"
          @mouseup="() => console.log('[Register] Botão Google - mouseup detectado')"
          color="primary"
          block
          class="mb-2"
          :loading="loading"
          aria-label="Entrar com Google"
          id="google-login-btn"
        >
          <v-icon left>mdi-google</v-icon>
          Entrar com Google
        </v-btn>
        
        <!-- Botão de teste alternativo -->
        <v-btn
          v-if="!usuarioGoogle"
          @click="handleGoogleLogin"
          color="secondary"
          block
          class="mb-4"
          :loading="loading"
          aria-label="Testar Login Google"
        >
          <v-icon left>mdi-test-tube</v-icon>
          Testar Login (Debug)
        </v-btn>

        <v-form v-if="usuarioGoogle" @submit.prevent="salvarUsuarioFirestore">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.nome" label="Nome" required prepend-inner-icon="mdi-account" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.sobrenome" label="Sobrenome" required prepend-inner-icon="mdi-account-outline" />
            </v-col>
            <v-col cols="12" sm="12">
              <v-text-field
                v-model="form.cpf"
                label="CPF"
                required
                prepend-inner-icon="mdi-card-account-details"
                maxlength="14"
                hint="Digite apenas números"
                persistent-hint
                @input="form.cpf = aplicarMascaraCPF(form.cpf)"
              />
            </v-col>
            <v-col cols="12" sm="12">
              <v-text-field
                v-model="form.inviteCode"
                label="Código de convite (opcional)"
                prepend-inner-icon="mdi-ticket-account"
                hint="Informe o código recebido para liberar 30 dias de acesso"
                persistent-hint
                maxlength="16"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.cidade" label="Cidade" prepend-inner-icon="mdi-city" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.paisOrigem" label="País de Origem" prepend-inner-icon="mdi-earth" />
            </v-col>
          </v-row>

          <v-checkbox
            v-model="form.aceitouTermos"
            label="Li e aceito os termos de uso"
            required
            class="mt-2"
          />

          <v-alert v-if="error" type="error" class="my-2" dense>
            <v-icon left>mdi-alert-circle</v-icon>
            {{ error }}
          </v-alert>

          <v-btn
            :loading="loading"
            type="submit"
            color="success"
            block
            class="mt-4"
            :disabled="!form.nome || !form.sobrenome || !form.cpf || !form.aceitouTermos"
            aria-label="Salvar e Continuar"
          >
            <v-icon left>mdi-arrow-right-bold</v-icon>
            Salvar e Continuar
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>
