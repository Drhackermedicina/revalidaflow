<script setup>
import { useRegister } from '@/composables/useRegister.js';

const {
  loading,
  error,
  usuarioGoogle,
  form,
  loginComGoogle,
  salvarUsuarioFirestore,
  aplicarMascaraCPF,
} = useRegister()
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
        <v-btn
          v-if="!usuarioGoogle"
          @click="loginComGoogle"
          color="primary"
          block
          class="mb-4"
          :loading="loading"
          aria-label="Entrar com Google"
        >
          <v-icon left>mdi-google</v-icon>
          Entrar com Google
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
