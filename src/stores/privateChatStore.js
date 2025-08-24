import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const usePrivateChatStore = defineStore('privateChat', () => {
  const state = reactive({
    messages: [],
    users: [],
    isConnected: false,
  })

  function addMessage(message) {
    state.messages.push(message)
  }

  function clearMessages() {
    state.messages = []
  }

  return { state, addMessage, clearMessages }
})
