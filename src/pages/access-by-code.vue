<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="6" lg="5">
        <v-card class="pa-4 pa-md-6" elevation="4" rounded="lg">
          <v-card-title class="text-h5 font-weight-bold text-center mb-4">
            <v-icon start size="32" class="me-2">ri-key-2-line</v-icon>
            Acessar Simulação por Código
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 text-center mb-6">
              Digite o código de acesso fornecido pelo seu parceiro para entrar na sessão de simulação.
            </p>
            <v-form @submit.prevent="findAndJoinSession">
              <v-text-field
                v-model="accessCode"
                label="Código de Acesso"
                variant="outlined"
                placeholder="ABC-123"
                :rules="[rules.required]"
                :error-messages="errorMessage"
                @input="errorMessage = ''"
                class="mb-4"
              />
              <v-btn
                :loading="isLoading"
                :disabled="!accessCode"
                type="submit"
                block
                color="primary"
                size="large"
                variant="elevated"
              >
                Entrar na Simulação
              </v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { db } from '@/plugins/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const accessCode = ref('');
const isLoading = ref(false);
const errorMessage = ref('');

const rules = {
  required: value => !!value || 'O código é obrigatório.',
};

async function findAndJoinSession() {
  if (!accessCode.value) {
    errorMessage.value = 'Por favor, insira um código.';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';

  try {
    const code = accessCode.value.toUpperCase();
    const sessionsRef = collection(db, 'simulation_sessions');
    // A consulta procura por uma sessão onde o ID começa com o código inserido
    const q = query(sessionsRef, where('__name__', '>=', code), where('__name__', '<=', code + '\uf8ff'));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      errorMessage.value = 'Nenhuma sessão encontrada com este código. Verifique o código e tente novamente.';
      isLoading.value = false;
      return;
    }

    // Pega a primeira sessão encontrada (deve haver apenas uma)
    const sessionDoc = querySnapshot.docs[0];
    const sessionData = sessionDoc.data();
    const sessionId = sessionDoc.id;

    // Determina o papel do usuário que está entrando
    // Se o candidato já existe, o usuário deve ser o ator/avaliador, e vice-versa.
    const userRole = sessionData.candidateId ? 'actor' : 'candidate';

    // Navega para a simulação
    router.push({
      name: 'SimulationView',
      params: { id: sessionData.stationId },
      query: { 
        sessionId: sessionId,
        role: userRole,
        duration: sessionData.durationMinutes
      },
    });

  } catch (error) {
    console.error("Erro ao buscar sessão:", error);
    errorMessage.value = 'Ocorreu um erro ao tentar encontrar a sessão. Tente novamente.';
  } finally {
    isLoading.value = false;
  }
}
</script>
