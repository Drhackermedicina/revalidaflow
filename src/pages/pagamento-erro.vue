<template>
  <VContainer class="pagamento-resultado-container">
    <VRow justify="center" align="center" class="min-height-screen">
      <VCol cols="12" md="6" lg="5">
        <VCard class="resultado-card" elevation="8">
          <VCardText class="text-center pa-8">
            <VIcon
              icon="ri-error-warning-fill"
              size="100"
              color="error"
              class="mb-6"
            />
            <h2 class="text-h3 font-weight-bold mb-4 text-dark">Pagamento Recusado</h2>
            <p class="text-body-1 mb-6 text-grey-darken-1">
              O pagamento não foi processado. Verifique os dados do seu cartão ou tente outra forma de pagamento.
            </p>

            <VAlert type="error" variant="tonal" class="mb-6">
              <strong class="text-dark">Não foi possível processar o pagamento</strong><br>
              <span class="text-dark">Por favor, tente novamente ou entre em contato conosco se o problema persistir.</span>
            </VAlert>

            <VBtn
              size="x-large"
              color="primary"
              variant="flat"
              @click="tentarNovamente"
              class="mb-4"
              block
            >
              <VIcon icon="ri-refresh-line" start />
              Tentar Novamente
            </VBtn>

            <VBtn
              size="large"
              color="grey"
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
    console.log('Pagamento recusado:', referenceId.value)
  }
})

const tentarNovamente = () => {
  router.push({ name: 'pagamento' })
}

const voltarInicio = () => {
  router.push('/')
}
</script>

<style scoped lang="scss">
.pagamento-resultado-container {
  background: radial-gradient(circle at top, rgba(244, 67, 54, 0.15), transparent 55%);
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


