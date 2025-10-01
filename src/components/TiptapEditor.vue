<template>
  <div 
    :class="[
      'editor-wrapper',
      isDarkTheme ? 'editor-wrapper--dark' : 'editor-wrapper--light'
    ]"
  >
    <div 
      :class="[
        'editor-toolbar',
        isDarkTheme ? 'editor-toolbar--dark' : 'editor-toolbar--light'
      ]"
    >
      <button
        @click="editor?.chain().focus().toggleBold().run()"
        :class="{ 
          'is-active': editor?.isActive('bold'),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        B
      </button>
      <button
        @click="editor?.chain().focus().toggleItalic().run()"
        :class="{ 
          'is-active': editor?.isActive('italic'),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        I
      </button>
      <button
        @click="editor?.chain().focus().toggleUnderline().run()"
        :class="{ 
          'is-active': editor?.isActive('underline'),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        U
      </button>
      <div 
        :class="[
          'toolbar-separator',
          isDarkTheme ? 'toolbar-separator--dark' : 'toolbar-separator--light'
        ]"
      ></div>
      <button
        @click="editor?.chain().focus().setTextAlign('left').run()"
        :class="{ 
          'is-active': editor?.isActive({ textAlign: 'left' }),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        ←
      </button>
      <button
        @click="editor?.chain().focus().setTextAlign('center').run()"
        :class="{ 
          'is-active': editor?.isActive({ textAlign: 'center' }),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        ↔
      </button>
      <button
        @click="editor?.chain().focus().setTextAlign('right').run()"
        :class="{ 
          'is-active': editor?.isActive({ textAlign: 'right' }),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        →
      </button>
      <div 
        :class="[
          'toolbar-separator',
          isDarkTheme ? 'toolbar-separator--dark' : 'toolbar-separator--light'
        ]"
      ></div>
      <button
        @click="editor?.chain().focus().toggleBulletList().run()"
        :class="{ 
          'is-active': editor?.isActive('bulletList'),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        • Lista
      </button>
      <button
        @click="editor?.chain().focus().toggleOrderedList().run()"
        :class="{ 
          'is-active': editor?.isActive('orderedList'),
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
      >
        1. Lista
      </button>
      <div 
        :class="[
          'toolbar-separator',
          isDarkTheme ? 'toolbar-separator--dark' : 'toolbar-separator--light'
        ]"
      ></div>
      <button
        v-if="isActorScript"
        @click="formatActorText"
        :class="{ 
          'is-active': false,
          'toolbar-button--dark': isDarkTheme,
          'toolbar-button--light': !isDarkTheme
        }"
        class="toolbar-button"
        title="Formatar texto do ator"
      >
        ¶
      </button>
    </div>
    <EditorContent 
      :editor="editor" 
      :class="[
        'tiptap-content',
        isDarkTheme ? 'tiptap-content--dark' : 'tiptap-content--light'
      ]"
    />
  </div>
</template>

<script setup>
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useTheme } from 'vuetify'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  isActorScript: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const theme = useTheme()
const isDarkTheme = computed(() => theme.global.name.value === 'dark')

const editor = ref(null)

// Inicializa o editor quando o componente é montado
editor.value = new Editor({
  extensions: [
    StarterKit,
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph']
    })
  ],
  content: props.modelValue,
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  }
})

// Atualiza o conteúdo do editor quando o v-model muda externamente
watch(() => props.modelValue, (newValue) => {
  const isSame = newValue === editor.value?.getHTML()
  if (!isSame) {
    editor.value?.commands.setContent(newValue, false)
  }
})

// Função para formatar o texto do campo de informação do ator
const formatActorText = () => {
  if (editor.value && props.isActorScript) {
    const content = editor.value.getHTML();
    // Remove tags HTML existentes mantendo o texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.innerText;
    // Separa o texto em linhas, considerando múltiplos tipos de quebras
    const lines = plainText
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line);
    // Formata cada linha e seus subitens
    const formattedLines = lines.map(line => {
      // Primeiro, procura por ":"
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const label = line.substring(0, colonIndex).trim();
        let value = line.substring(colonIndex + 1).trim();
        // Só formata se tivermos texto antes e depois dos dois pontos
        if (label && value) {
          // Remove tags HTML que possam estar presentes
          const cleanLabel = label.replace(/(<([^>]+)>)/gi, '');
          // Se houver pontos finais no valor, trata como subitens
          if (value.includes('. ')) {
            const subitems = value
              .split(/\.\s+/)
              .filter(item => item.trim())
              .map((item, index, array) => {
                const cleanItem = item.replace(/(<([^>]+)>)/gi, '');
                // Adiciona ponto final de volta em todos exceto o último
                return index < array.length - 1 ? cleanItem + '.' : cleanItem;
              });
            // Formata cada subitem em itálico
            const formattedSubitems = subitems.map(item => `<em>${item}</em>`);
            return `<p><strong>${cleanLabel}</strong>: ${formattedSubitems.join(' ')}</p>`;
          } else {
            // Sem subitens, formata normalmente
            const cleanValue = value.replace(/(<([^>]+)>)/gi, '');
            return `<p><strong>${cleanLabel}</strong>: <em>${cleanValue}</em></p>`;
          }
        }
      }
      return `<p>${line}</p>`;
    });
    // Define o novo conteúdo formatado
    editor.value.commands.setContent(formattedLines.join(''));
  }
}

// Limpa o editor quando o componente é destruído
onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.editor-wrapper {
  margin-bottom: 1rem;
}

/* Estilos do wrapper baseados no tema */
.editor-wrapper--light {
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 0.375rem;
}

.editor-wrapper--dark {
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 0.375rem;
}

/* Estilos da toolbar baseados no tema */
.editor-toolbar {
  padding: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-top-left-radius: 0.375rem;
  border-top-right-radius: 0.375rem;
}

.editor-toolbar--light {
  border-bottom: 1px solid rgb(var(--v-theme-outline));
  background-color: rgb(var(--v-theme-surface-variant));
}

.editor-toolbar--dark {
  border-bottom: 1px solid rgb(var(--v-theme-outline));
  background-color: rgb(var(--v-theme-surface-variant));
}

/* Estilos dos botões baseados no tema */
.toolbar-button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;
}

.toolbar-button--light {
  border: 1px solid rgb(var(--v-theme-outline));
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.toolbar-button--light:hover {
  background-color: rgb(var(--v-theme-surface-bright));
}

.toolbar-button--light.is-active {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.toolbar-button--dark {
  border: 1px solid rgb(var(--v-theme-outline));
  background-color: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}

.toolbar-button--dark:hover {
  background-color: rgb(var(--v-theme-surface-bright));
}

.toolbar-button--dark.is-active {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

/* Separadores baseados no tema */
.toolbar-separator {
  width: 1px;
  align-self: stretch;
}

.toolbar-separator--light {
  background-color: rgb(var(--v-theme-outline));
}

.toolbar-separator--dark {
  background-color: rgb(var(--v-theme-outline));
}

/* Conteúdo do editor baseado no tema */
.tiptap-content {
  transition: background-color 0.2s ease, color 0.2s ease;
  min-height: 150px;
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 0.375rem;
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  overflow: hidden;
}

.tiptap-content--light {
  background-color: #ffffff !important;
  color: #1a1a1a !important;
  border-color: #d0d7de !important;
}

.tiptap-content--dark {
  background-color: #0d1117 !important;
  color: #e6edf3 !important;
  border-color: #30363d !important;
}

/* Estilos do ProseMirror (área de edição) */
:deep(.ProseMirror) {
  padding: 1rem;
  min-height: 150px;
  outline: none;
  color: inherit !important;
  background-color: transparent !important;
  font-family: inherit;
}

:deep(.ProseMirror p) {
  margin: 0.5em 0;
  color: inherit !important;
}

:deep(.ProseMirror *) {
  color: inherit !important;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.5em;
}

/* Estilos para seleção de texto no editor */
:deep(.ProseMirror::selection) {
  background-color: #0969da !important;
  color: #ffffff !important;
}

:deep(.ProseMirror *::selection) {
  background-color: #0969da !important;
  color: #ffffff !important;
}

/* Seleção global para o editor inteiro */
.tiptap-content *::selection {
  background-color: #0969da !important;
  color: #ffffff !important;
}

.tiptap-content::selection {
  background-color: #0969da !important;
  color: #ffffff !important;
}

/* Placeholder styles */
:deep(.ProseMirror p.is-empty::before) {
  color: rgb(var(--v-theme-on-surface-variant)) !important;
  content: attr(data-placeholder);
  float: left;
  pointer-events: none;
  height: 0;
  opacity: 0.6;
}
</style>
