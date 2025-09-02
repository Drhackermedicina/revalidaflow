<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Teste de Chat Privado</v-card-title>
          <v-card-text>
            <div class="mb-4">
              <v-btn @click="testConnection" color="primary" class="me-2">
                Testar Conectividade
              </v-btn>
              <v-btn @click="testSendMessage" color="success" class="me-2">
                Enviar Mensagem Teste
              </v-btn>
              <v-btn @click="clearLogs" color="warning">
                Limpar Logs
              </v-btn>
            </div>
            
            <v-text-field
              v-model="testUserId"
              label="ID do usuário destinatário"
              placeholder="Ex: KiSITAxXMAY5uU3bOPW5JMQPent2"
              class="mb-4"
            />
            
            <v-text-field
              v-model="testMessage"
              label="Mensagem de teste"
              placeholder="Digite uma mensagem de teste"
              class="mb-4"
            />
            
            <v-card variant="outlined" class="pa-4" style="max-height: 400px; overflow-y: auto;">
              <div v-for="(log, index) in logs" :key="index" class="mb-2">
                <span :class="getLogClass(log.type)">{{ log.timestamp }}</span>
                <span :class="getLogClass(log.type)">{{ log.message }}</span>
              </div>
            </v-card>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { currentUser } from '@/plugins/auth';
import { db } from '@/plugins/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref } from 'vue';

const testUserId = ref('KiSITAxXMAY5uU3bOPW5JMQPent2');
const testMessage = ref('Mensagem de teste');
const logs = ref([]);

const addLog = (message, type = 'info') => {
  logs.value.push({
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  });
};

const getLogClass = (type) => {
  switch (type) {
    case 'error': return 'text-red';
    case 'success': return 'text-green';
    case 'warning': return 'text-orange';
    default: return 'text-grey-darken-1';
  }
};

const clearLogs = () => {
  logs.value = [];
};

const testConnection = async () => {
  addLog('🔧 Iniciando teste de conectividade...', 'info');
  
  try {
    if (!currentUser.value) {
      throw new Error('Usuário não autenticado');
    }
    
    addLog(`✅ Usuário autenticado: ${currentUser.value.uid}`, 'success');
    
    // Testar criação de documento simples
    const testRef = collection(db, 'test_connection');
    const testDoc = await addDoc(testRef, {
      message: 'Teste de conectividade',
      timestamp: serverTimestamp(),
      userId: currentUser.value.uid
    });
    
    addLog(`✅ Documento de teste criado: ${testDoc.id}`, 'success');
    
  } catch (error) {
    addLog(`❌ Erro: ${error.message}`, 'error');
    console.error('Erro completo:', error);
  }
};

const testSendMessage = async () => {
  addLog('📨 Iniciando teste de mensagem...', 'info');
  
  try {
    if (!currentUser.value) {
      throw new Error('Usuário não autenticado');
    }
    
    if (!testUserId.value) {
      throw new Error('ID do destinatário não fornecido');
    }
    
    const chatId = [currentUser.value.uid, testUserId.value].sort().join('_');
    addLog(`🆔 Chat ID: ${chatId}`, 'info');
    
    const chatRef = collection(db, `chatPrivado_${chatId}`);
    addLog(`📁 Coleção: ${chatRef.path}`, 'info');
    
    const messageData = {
      senderId: currentUser.value.uid,
      senderName: currentUser.value.displayName || 'Usuário Teste',
      senderPhotoURL: currentUser.value.photoURL || '',
      text: testMessage.value,
      timestamp: serverTimestamp()
    };
    
    addLog(`📋 Enviando mensagem: "${testMessage.value}"`, 'info');
    
    const docRef = await addDoc(chatRef, messageData);
    addLog(`✅ Mensagem enviada com sucesso: ${docRef.id}`, 'success');
    
  } catch (error) {
    addLog(`❌ Erro ao enviar mensagem: ${error.message}`, 'error');
    addLog(`❌ Código: ${error.code}`, 'error');
    console.error('Erro completo:', error);
  }
};
</script>
