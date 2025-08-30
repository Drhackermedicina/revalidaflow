<template>
  <v-card class="pa-4">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2">mdi-format-list-checks</v-icon>
      Gerenciador de Tarefas
    </v-card-title>

    <!-- Formulário para criar nova tarefa -->
    <v-form @submit.prevent="addTask" class="mb-4">
      <v-text-field
        v-model="newTask.title"
        label="Título da tarefa"
        required
        :disabled="loading"
        prepend-inner-icon="mdi-text"
      />
      <v-textarea
        v-model="newTask.description"
        label="Descrição"
        rows="2"
        :disabled="loading"
        prepend-inner-icon="mdi-text-box"
      />
      <v-btn
        type="submit"
        color="primary"
        :loading="loading"
        :disabled="!newTask.title.trim()"
        class="mt-2"
      >
        <v-icon left>mdi-plus</v-icon>
        Criar Tarefa
      </v-btn>
    </v-form>

    <v-divider class="my-4" />

    <!-- Lista de tarefas -->
    <v-card-subtitle v-if="tasks.length === 0" class="text-center pa-4">
      <v-icon size="48" color="grey">mdi-clipboard-text-outline</v-icon>
      <div class="mt-2 text-grey">Nenhuma tarefa criada ainda</div>
    </v-card-subtitle>

    <v-list v-else>
      <v-list-item
        v-for="task in sortedTasks"
        :key="task.id"
        class="mb-2"
        :class="{ 'task-paused': task.paused }"
      >
        <template #prepend>
          <v-avatar :color="task.paused ? 'orange' : 'green'" size="small">
            <v-icon color="white">
              {{ task.paused ? 'mdi-pause' : 'mdi-play' }}
            </v-icon>
          </v-avatar>
        </template>

        <v-list-item-content>
          <v-list-item-title class="font-weight-medium">
            {{ task.title }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="task.description">
            {{ task.description }}
          </v-list-item-subtitle>
          <v-list-item-subtitle class="text-caption mt-1">
            <v-chip size="x-small" :color="task.paused ? 'orange' : 'green'" variant="text">
              {{ task.paused ? 'Pausada' : 'Em andamento' }}
            </v-chip>
            • Criada em {{ formatDate(task.createdAt) }}
          </v-list-item-subtitle>
        </v-list-item-content>

        <template #append>
          <div class="d-flex flex-column ga-1">
            <v-btn
              :icon="task.paused ? 'mdi-play' : 'mdi-pause'"
              size="small"
              :color="task.paused ? 'green' : 'orange'"
              variant="text"
              @click="togglePause(task)"
              :disabled="loading"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              color="red"
              variant="text"
              @click="deleteTask(task)"
              :disabled="loading"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>

    <!-- Snackbar para feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
      <template #actions>
        <v-btn
          color="white"
          variant="text"
          @click="snackbar.show = false"
        >
          Fechar
        </v-btn>
      </template>
    </v-snackbar>
  </v-card>
</template>

<script setup>
import { db } from '@/plugins/firebase'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore'
import { computed, onMounted, ref } from 'vue'

// Estado local
const tasks = ref([])
const loading = ref(false)
const newTask = ref({ title: '', description: '' })
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Computed para ordenar tarefas
const sortedTasks = computed(() => {
  return [...tasks.value].sort((a, b) => {
    // Tarefas em andamento primeiro
    if (a.paused !== b.paused) {
      return a.paused ? 1 : -1
    }
    // Depois por data de criação (mais recentes primeiro)
    return b.createdAt?.seconds - a.createdAt?.seconds
  })
})

// Função para mostrar feedback
const showSnackbar = (message, color = 'success') => {
  snackbar.value = { show: true, message, color }
}

// Função para criar tarefa
const addTask = async () => {
  if (!newTask.value.title.trim()) return
  
  loading.value = true
  try {
    await addDoc(collection(db, 'tasks'), {
      title: newTask.value.title.trim(),
      description: newTask.value.description.trim(),
      paused: false,
      createdAt: Timestamp.now()
    })
    
    newTask.value = { title: '', description: '' }
    showSnackbar('Tarefa criada com sucesso!')
  } catch (error) {
    console.error('Erro ao criar tarefa:', error)
    showSnackbar('Erro ao criar tarefa', 'error')
  } finally {
    loading.value = false
  }
}

// Alternar pausa/resume
const togglePause = async (task) => {
  loading.value = true
  try {
    const taskRef = doc(db, 'tasks', task.id)
    await updateDoc(taskRef, { 
      paused: !task.paused,
      updatedAt: Timestamp.now()
    })
    
    showSnackbar(
      `Tarefa ${!task.paused ? 'pausada' : 'retomada'} com sucesso!`
    )
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error)
    showSnackbar('Erro ao atualizar tarefa', 'error')
  } finally {
    loading.value = false
  }
}

// Excluir tarefa
const deleteTask = async (task) => {
  loading.value = true
  try {
    const taskRef = doc(db, 'tasks', task.id)
    await deleteDoc(taskRef)
    showSnackbar('Tarefa excluída com sucesso!')
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error)
    showSnackbar('Erro ao excluir tarefa', 'error')
  } finally {
    loading.value = false
  }
}

// Formatar data
const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Listener em tempo real para tarefas
onMounted(() => {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'))
  
  onSnapshot(q, (snapshot) => {
    tasks.value = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }))
  }, (error) => {
    console.error('Erro ao escutar tarefas:', error)
    showSnackbar('Erro ao carregar tarefas', 'error')
  })
})
</script>

<style scoped>
.v-card {
  max-width: 800px;
  margin: auto;
}

.task-paused {
  opacity: 0.8;
}

.task-paused .v-list-item-title {
  text-decoration: line-through;
}
</style>
