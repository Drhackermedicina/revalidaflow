import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotificationStore = defineStore('notification', () => {
  const snackbar = ref({ show: false, text: '', color: 'primary' })

  function notify({ text, color = 'primary', timeout = 4000 }) {
    snackbar.value = { show: false, text: '', color } // reset
    setTimeout(() => {
      snackbar.value = { show: true, text, color, timeout }
    }, 50)
  }

  function close() {
    snackbar.value.show = false
  }

  return { snackbar, notify, close }
})
