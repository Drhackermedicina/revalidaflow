<script setup>
import { ref } from 'vue';
/* import { generateText } from '@/services/ollamaService'; // Importa nossa função */

const prompt = ref('');
const resposta = ref('');
const loading = ref(false);

const enviarPrompt = async () => {
  if (!prompt.value) return;

  loading.value = true;
  resposta.value = '';

  try {
    // Chama o serviço que criamos
    const resultado = await generateText(prompt.value);
    resposta.value = resultado;
  } catch (error) {
    resposta.value = error.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <VCard title="Integração com Ollama">
    <VCardText>
      <p>
        Digite uma pergunta ou um comando abaixo e clique em "Enviar" para obter uma resposta da IA rodando localmente no seu computador.
      </p>

      <VTextarea
        v-model="prompt"
        label="Seu Prompt"
        placeholder="Ex: Escreva um poema sobre programação"
        class="mt-4"
      />

      <VBtn
        @click="enviarPrompt"
        :loading="loading"
        :disabled="loading"
        class="mt-4"
      >
        Enviar
      </VBtn>

      <VCard
        v-if="resposta"
        title="Resposta da IA"
        class="mt-6"
        variant="tonal"
      >
        <VCardText style="white-space: pre-wrap;">
          {{ resposta }}
        </VCardText>
      </VCard>
    </VCardText>
  </VCard>
</template>
