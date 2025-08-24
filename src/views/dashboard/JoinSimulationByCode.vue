<script setup>
import { db } from '@/plugins/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const sessionId = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const router = useRouter();

const joinSession = async () => {
  if (!sessionId.value.trim()) {
    errorMessage.value = 'Por favor, insira um código de sessão.';
    return;
  }
  isLoading.value = true;
  errorMessage.value = '';

  try {
    // Assume-se uma coleção 'sessions' onde cada documento é um ID de sessão
    // e contém o ID da estação correspondente.
    const sessionDocRef = doc(db, 'sessions', sessionId.value.trim());
    const sessionSnap = await getDoc(sessionDocRef);

    if (sessionSnap.exists()) {
      const stationId = sessionSnap.data().stationId;
      if (stationId) {
        // O usuário que entra pelo código é sempre um candidato.
        // A rota 'station-simulation' é o nome esperado para a view de simulação.
        router.push({
          name: 'station-simulation',
          params: { id: stationId },
          query: {
            sessionId: sessionId.value.trim(),
            role: 'candidate'
          }
        });
      } else {
        errorMessage.value = 'A sessão é inválida (não contém ID da estação).';
      }
    } else {
      errorMessage.value = 'Código de sessão não encontrado.';
    }
  } catch (error) {
    console.error("Erro ao buscar sessão:", error);
    errorMessage.value = 'Ocorreu um erro ao tentar entrar na simulação.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <VCard title="Entrar em Simulação por Código">
    <VCardText>
      <p class="mb-4">
        Se você recebeu um código de acesso, insira-o abaixo para se juntar à estação clínica como candidato.
      </p>
      <VTextField
        v-model="sessionId"
        label="Código de Acesso da Simulação"
        placeholder="Cole o código aqui"
        class="my-4"
        @keyup.enter="joinSession"
        :error-messages="errorMessage"
        clearable
      />
    </VCardText>
    <VCardActions>
      <VSpacer />
      <VBtn
        @click="joinSession"
        :loading="isLoading"
        :disabled="isLoading || !sessionId"
        color="primary"
      >
        <VIcon start>ri-arrow-right-s-line</VIcon>
        Entrar na Simulação
      </VBtn>
    </VCardActions>
  </VCard>
</template>
