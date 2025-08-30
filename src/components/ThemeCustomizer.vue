<template>
  <div>
    <!-- Botão flutuante para abrir o personalizador -->
    <v-btn
      icon="mdi-cog"
      size="large"
      class="theme-customizer-button"
      elevation="8"
      @click.stop="isDrawerOpen = !isDrawerOpen"
    ></v-btn>

    <!-- Painel de personalização -->
    <v-navigation-drawer
      v-model="isDrawerOpen"
      location="right"
      temporary
      width="320"
      class="theme-customizer-drawer"
    >
      <v-container>
        <div class="d-flex align-center pa-2">
          <h5 class="text-h6 font-weight-bold">Personalizador</h5>
          <v-spacer></v-spacer>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="isDrawerOpen = false"
          ></v-btn>
        </div>
        <v-divider></v-divider>

        <div class="pa-4">
          <!-- Seletor de Tema (Light/Dark) -->
          <p class="font-weight-medium mb-2">Tema Global</p>
          <div class="d-flex justify-space-around">
            <v-btn @click="setThemeMode('light')" :variant="!isDarkMode ? 'tonal' : 'text'" color="primary">Claro</v-btn>
            <v-btn @click="setThemeMode('dark')" :variant="isDarkMode ? 'tonal' : 'text'" color="primary">Escuro</v-btn>
          </div>

          <v-divider class="my-6"></v-divider>
          
          <!-- SELETORES DE CORES INDIVIDUAIS -->

          <!-- Cor Primária (Botões de Ação, etc.) -->
          <p class="font-weight-medium mb-2">Cor Primária (Ações)</p>
          <v-color-picker
            v-model="themeColors.primary"
            @update:model-value="updateThemeColor('primary', $event)"
            mode="hex"
            hide-inputs
            show-swatches
            width="100%"
          ></v-color-picker>

          <v-divider class="my-4"></v-divider>

          <!-- Cor de Fundo do Sidebar -->
          <p class="font-weight-medium mb-2">Fundo do Menu Lateral</p>
           <v-color-picker
            v-model="themeColors.sidebar"
            @update:model-value="updateThemeColor('sidebar', $event)"
            mode="hex"
            hide-inputs
            show-swatches
            width="100%"
          ></v-color-picker>

           <v-divider class="my-4"></v-divider>

          <!-- Cor do Item Ativo no Sidebar -->
          <p class="font-weight-medium mb-2">Item Ativo do Menu</p>
           <v-color-picker
            v-model="themeColors.activeSidebarItem"
            @update:model-value="updateThemeColor('activeSidebarItem', $event)"
            mode="hex"
            hide-inputs
            show-swatches
            width="100%"
          ></v-color-picker>

          <v-divider class="my-6"></v-divider>
          
          <!-- Persistência -->
           <p class="font-weight-medium mb-2">Salvar Configurações</p>
           <div class="d-flex ga-2">
                <v-btn @click="saveSettings" color="primary" block>Salvar</v-btn>
                <v-btn @click="resetSettings" color="error" variant="outlined">Resetar</v-btn>
           </div>
        </div>
      </v-container>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { useTheme } from 'vuetify';

const isDrawerOpen = ref(false);
const theme = useTheme();
const isDarkMode = ref(theme.global.current.value.dark);

// Usamos um objeto reativo para guardar todas as nossas cores
const themeColors = reactive({
  primary: theme.themes.value.light.colors.primary,
  sidebar: theme.themes.value.light.colors.sidebar,
  activeSidebarItem: theme.themes.value.light.colors.activeSidebarItem,
});

/**
 * Altera o tema entre 'light' e 'dark'.
 */
function setThemeMode(mode) {
  theme.global.name.value = mode;
}

/**
 * Atualiza uma cor específica no tema do Vuetify.
 * @param {string} colorName - O nome da cor a ser atualizada (ex: 'primary', 'sidebar').
 * @param {string} newColorValue - O novo valor hexadecimal da cor.
 */
function updateThemeColor(colorName, newColorValue) {
  if (newColorValue) {
    // Atualiza a cor nos temas light e dark para consistência
    theme.themes.value.light.colors[colorName] = newColorValue;
    theme.themes.value.dark.colors[colorName] = newColorValue; // Adapte as cores do tema dark se necessário
  }
}

// --- PERSISTÊNCIA com localStorage ---
const THEME_SETTINGS_KEY = 'my-app-theme-settings-granular';

function saveSettings() {
    const settings = {
        mode: theme.global.name.value,
        colors: { ...themeColors } // Salva uma cópia das cores
    };
    localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem(THEME_SETTINGS_KEY);
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setThemeMode(settings.mode || 'light');
        
        // Carrega cada cor salva
        if (settings.colors) {
          Object.keys(settings.colors).forEach(colorName => {
              const colorValue = settings.colors[colorName];
              if (themeColors.hasOwnProperty(colorName)) {
                themeColors[colorName] = colorValue;
                updateThemeColor(colorName, colorValue);
              }
          });
        }
    }
}

function resetSettings() {
    localStorage.removeItem(THEME_SETTINGS_KEY);
    // Recarregue a página para obter os padrões do vuetify.js ou defina-os manualmente
    window.location.reload();
}

// Observa mudanças no tema global (light/dark) para atualizar o estado
watch(() => theme.global.name.value, (newThemeName) => {
  isDarkMode.value = theme.themes.value[newThemeName].dark;
  // Atualiza as cores reativas com base no novo tema, se necessário
  Object.keys(themeColors).forEach(colorName => {
      if (theme.themes.value[newThemeName].colors.hasOwnProperty(colorName)) {
        themeColors[colorName] = theme.themes.value[newThemeName].colors[colorName];
      }
  });
});

onMounted(() => {
    loadSettings();
});
</script>

<style scoped>
.theme-customizer-button {
  position: fixed;
  z-index: 1005;
  border-end-end-radius: 0;
  border-start-end-radius: 0;
  inset-block-start: 50%;
  inset-inline-end: 0;
  transform: translateY(-50%);
}

.theme-customizer-drawer {
  z-index: 1100;
}

/* Forçar o v-color-picker a ter um layout melhor em um espaço pequeno */
::v-deep(.v-color-picker-swatches__swatch) {
  block-size: 28px !important;
  inline-size: 28px !important;
}
</style>
