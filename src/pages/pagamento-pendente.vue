<template>
  <VContainer class="pagamento-resultado-container">
    <VRow justify="center" align="center" class="min-height-screen">
      <VCol cols="12" md="6" lg="5">
        <VCard class="resultado-card" elevation="8">
          <VCardText class="text-center pa-8">
            <VIcon
              icon="ri-time-line"
              size="100"
              color="warning"
              class="mb-6"
            />
            <h2 class="text-h3 font-weight-bold mb-4 text-dark">Pagamento Pendente</h2>
            <p class="text-body-1 mb-6 text-grey-darken-1">
              Seu pagamento está sendo processado. Você receberá uma confirmação assim que o pagamento for aprovado.
            </p>

            <VAlert type="warning" variant="tonal" class="mb-6">
              <strong class="text-dark">Aguardando Confirmação</strong><br>
              <span class="text-dark">Para pagamentos via boleto, a confirmação pode levar até 3 dias úteis.</span>
            </VAlert>

            <VProgressCircular
              indeterminate
              color="primary"
              size="64"
              width="6"
              class="mb-6"
            />

            <VBtn
              size="large"
              color="primary"
              variant="text"
              @click="voltarInicio"
              block
            >
              <VIcon icon="ri-home-line" start />
              Voltar para Início
            </VBtn>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const referenceId = ref('')

onMounted(() => {
  // Obter ID de referência da URL
  referenceId.value = route.query.reference || 'N/A'
  
  // Log para debug
  if (import.meta.env.DEV) {
    console.log('Pagamento pendente:', referenceId.value)
  }
})

const voltarInicio = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.pagamento-resultado-container {
  background: radial-gradient(circle at top, rgba(255, 152, 0, 0.15), transparent 55%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resultado-card {
  background: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(20px);
  border-radius: 24px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25) !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.text-dark {
  color: #333 !important;
}
</style>


