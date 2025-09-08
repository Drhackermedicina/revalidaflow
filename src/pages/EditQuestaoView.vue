<script setup>
import { currentUser } from '@/plugins/auth.js';
import { db, storage } from '@/plugins/firebase.js';
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

const route = useRoute();
const router = useRouter();
const theme = useTheme();

// Computed para detectar tema escuro
const isDarkTheme = computed(() => theme.global.name.value === 'dark');

const questaoId = ref(null);
const isLoading = ref(true);
const errorMessage = ref('');
const successMessage = ref('');
const isSaving = ref(false);

// Variáveis para controle de upload de imagens
const uploadingImages = ref({});
const uploadProgress = ref({});

// Função para obter o estado inicial do formulário
function getInitialFormData() {
  return {
    id: '',
    banca: '',
    ano: null,
    numero: null,
    area: [],
    especialidade: '',
    'sub-especialidade': '',
    temaDoença: '',
    enunciado: '',
    opcoes: {
      a: '',
      b: '',
      c: '',
      d: '',
      e: ''
    },
    respostaCorreta: '',
    explicacao: '',
    imagens: [], // Array de URLs de imagens
    // Metadados
    createdAt: null,
    updatedAt: null,
    createdBy: '',
    updatedBy: ''
  };
}

const formData = ref(getInitialFormData());

// Estrutura das especialidades médicas
const especialidadesMedicas = {
  'Clínica Médica': [
    'Cardiologia',
    'Neurologia',
    'Endocrinologia',
    'Pneumologia',
    'Gastroenterologia',
    'Nefrologia',
    'Reumatologia',
    'Hematologia',
    'Oncologia',
    'Dermatologia',
    'Infectologia',
    'Medicina Interna',
    'Geriatria',
    'Imunologia',
    'Psiquiatria'
  ],
  'Cirurgia': [
    'Cirurgia Vascular',
    'Urologia',
    'Ortopedia',
    'Neurocirurgia',
    'Cirurgia Plástica',
    'Cirurgia Torácica',
    'Cirurgia Cardíaca',
    'Cirurgia do Aparelho Digestivo',
    'Coloproctologia',
    'Cirurgia Oncológica'
  ],
  'Pediatria': [
    'Neonatologia',
    'Cardiologia Pediátrica',
    'Neurologia Pediátrica',
    'Endocrinologia Pediátrica',
    'Pneumologia Pediátrica',
    'Gastroenterologia Pediátrica',
    'Nefrologia Pediátrica',
    'Hemato-oncologia Pediátrica',
    'Infectologia Pediátrica'
  ],
  'Ginecologia & Obstetrícia': [
    'Ginecologia',
    'Obstetrícia',
    'Reprodução Humana',
    'Oncologia Ginecológica',
    'Mastologia',
    'Endoscopia Ginecológica',
    'Medicina Fetal',
    'Climatério'
  ],
  'Medicina da Família e Comunidade': [
    'Medicina Preventiva',
    'Saúde Coletiva',
    'Epidemiologia',
    'Medicina do Trabalho',
    'Medicina Comunitária',
    'Atenção Primária',
    'Saúde Pública',
    'Medicina Social'
  ]
};

// Computed para especialidades disponíveis
const especialidadesDisponiveis = computed(() => {
  return Object.keys(especialidadesMedicas).map(esp => ({
    title: esp,
    value: esp
  }));
});

// Computed para subespecialidades disponíveis
const subespecialidadesDisponiveis = computed(() => {
  if (!formData.value.especialidade) return [];
  const subs = especialidadesMedicas[formData.value.especialidade] || [];
  return subs.map(sub => ({
    title: sub,
    value: sub
  }));
});

// Verifica se o usuário atual é admin
const isAdmin = computed(() => {
  return currentUser.value && (
    currentUser.value.uid === 'KiSITAxXMAY5uU3bOPW5JMQPent2' ||
    currentUser.value.uid === 'RtfNENOqMUdw7pvgeeaBVSuin662' ||
    currentUser.value.uid === '24aZT7dURHd9r9PcCZe5U1WHt0A3  ' ||
    currentUser.value.uid === 'lNwhdYgMwLhS1ZyufRzw9xLD10y1'
  );
});

// **FUNÇÕES DE INICIALIZAÇÃO**
onMounted(async () => {
  questaoId.value = route.params.id;
  if (questaoId.value) {
    await loadQuestao();
  } else {
    errorMessage.value = 'ID da questão não fornecido.';
    isLoading.value = false;
  }
});

async function loadQuestao() {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    const questaoRef = doc(db, 'questoes', questaoId.value);
    const questaoSnap = await getDoc(questaoRef);
    
    if (questaoSnap.exists()) {
      const questaoData = questaoSnap.data();
      
      // Transforma os dados para compatibilidade
      const dadosTransformados = {
        ...getInitialFormData(),
        ...questaoData,
        id: questaoSnap.id,
        // Compatibilidade com formatos antigos
        especialidade: questaoData.especialidade || questaoData.area || '',
        'sub-especialidade': questaoData['sub-especialidade'] || questaoData.subespecialidade || '',
        temaDoença: questaoData.temaDoença || questaoData.tema || ''
      };
      
      // Converte opções para formato antigo se necessário (para o editor)
      if (Array.isArray(questaoData.opcoes)) {
        dadosTransformados.opcoes = {
          a: questaoData.opcoes.find(opt => opt.letra === 'A')?.texto || '',
          b: questaoData.opcoes.find(opt => opt.letra === 'B')?.texto || '',
          c: questaoData.opcoes.find(opt => opt.letra === 'C')?.texto || '',
          d: questaoData.opcoes.find(opt => opt.letra === 'D')?.texto || '',
          e: questaoData.opcoes.find(opt => opt.letra === 'E')?.texto || ''
        };
      }
      
      // Carrega os dados transformados no formulário
      formData.value = dadosTransformados;
      
    } else {
      errorMessage.value = 'Questão não encontrada.';
    }
  } catch (error) {
    console.error('Erro ao carregar questão:', error);
    errorMessage.value = `Erro ao carregar questão: ${error.message}`;
  } finally {
    isLoading.value = false;
  }
}

// **FUNÇÕES DE UPLOAD DE IMAGEM**
async function uploadImageToStorage(file, imagemIndex) {
  if (!file) {
    return null;
  }

  const maxFileSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxFileSize) {
    throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
  }

  try {
    // --- INÍCIO DA MODIFICAÇÃO: COMPRESSÃO DE IMAGEM ---
    // console.log('Compressing image...');
    const options = {
      maxSizeMB: 1,           // (max file size in MB)
      maxWidthOrHeight: 1920, // (max width or height in pixels)
      useWebWorker: true,     // (use web worker for faster compression)
      fileType: 'image/webp'  // (output file type)
    };
    let compressedFile = file;
    try {
      compressedFile = await imageCompression(file, options);
      // console.log(`Image compressed from ${(file.size / 1024 / 1024).toFixed(2)} MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error compressing image:', error);
      // Continue sem compressão se houver erro
    }
    // --- FIM DA MODIFICAÇÃO: COMPRESSÃO DE IMAGEM ---

    uploadingImages.value[imagemIndex] = true;
    uploadProgress.value[imagemIndex] = 0;

    // Gera nome único para a imagem
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const fileName = `questoes/${questaoId.value}/imagem_${imagemIndex}_${timestamp}_${randomSuffix}.${fileExtension}`;


    // Cria a referência no Storage
    const imageRef = storageRef(storage, fileName);

    // --- INÍCIO DA MODIFICAÇÃO: METADADOS COM CACHE-CONTROL ---
    const metadata = {
      contentType: compressedFile.type, // Use o tipo do arquivo comprimido
      cacheControl: 'public, max-age=31536000', // Cache por 1 ano
    };
    // --- FIM DA MODIFICAÇÃO: METADADOS COM CACHE-CONTROL ---

    // Faz o upload
    const uploadResult = await uploadBytes(imageRef, compressedFile, metadata); // Use compressedFile e metadata

    // Atualiza progresso
    uploadProgress.value[imagemIndex] = 50;

    // Obtém a URL de download
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Progresso final
    uploadProgress.value[imagemIndex] = 100;

    return downloadURL;

  } catch (error) {
    console.error('Erro detalhado no upload:', error);

    let errorMsg = 'Erro desconhecido no upload.';

    if (error.code === 'storage/unauthorized') {
      errorMsg = 'Sem permissão para fazer upload. Verifique as regras do Storage.';
    } else if (error.code === 'storage/quota-exceeded') {
      errorMsg = 'Cota de storage excedida.';
    } else if (error.code === 'storage/invalid-format') {
      errorMsg = 'Formato de arquivo inválido.';
    } else if (error.code === 'storage/invalid-argument') {
      errorMsg = 'Argumento inválido fornecido.';
    } else if (error.message) {
      errorMsg = error.message;
    }

    throw new Error(errorMsg);

  } finally {
    uploadingImages.value[imagemIndex] = false;
    delete uploadProgress.value[imagemIndex];
  }
}

async function handleImageUpload(event, imagemIndex) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imageUrl = await uploadImageToStorage(file, imagemIndex);
    
    if (imageUrl) {
      // Adiciona a nova imagem ao array
      if (!formData.value.imagens) {
        formData.value.imagens = [];
      }
      
      // Se o índice já existe, substitui; senão, adiciona
      if (imagemIndex < formData.value.imagens.length) {
        formData.value.imagens[imagemIndex] = imageUrl;
      } else {
        formData.value.imagens.push(imageUrl);
      }
      
      successMessage.value = 'Imagem enviada com sucesso!';
      setTimeout(() => { successMessage.value = ''; }, 3000);
    }
  } catch (error) {
    console.error('Erro no upload da imagem:', error);
    errorMessage.value = `Erro ao enviar imagem: ${error.message}`;
    setTimeout(() => { errorMessage.value = ''; }, 5000);
  }
}

function removeImage(imagemIndex) {
  if (formData.value.imagens && imagemIndex < formData.value.imagens.length) {
    formData.value.imagens.splice(imagemIndex, 1);
    successMessage.value = 'Imagem removida com sucesso!';
    setTimeout(() => { successMessage.value = ''; }, 3000);
  }
}

function addNewImageSlot() {
  if (!formData.value.imagens) {
    formData.value.imagens = [];
  }
  formData.value.imagens.push(''); // Adiciona slot vazio
}

// Função para limpar subespecialidade quando especialidade muda
function onEspecialidadeChange() {
  formData.value['sub-especialidade'] = '';
}

// **FUNÇÕES DE GERENCIAMENTO DE ÁREAS**
function addArea() {
  if (!formData.value.area) {
    formData.value.area = [];
  }
  formData.value.area.push('');
}

function removeArea(index) {
  if (formData.value.area && index < formData.value.area.length) {
    formData.value.area.splice(index, 1);
  }
}

// **FUNÇÕES DE SALVAMENTO**
async function saveQuestao() {
  if (!isAdmin.value) {
    errorMessage.value = 'Apenas administradores podem editar questões.';
    return;
  }

  if (!formData.value.id || !formData.value.banca || !formData.value.enunciado || !formData.value.especialidade || !formData.value.temaDoença) {
    errorMessage.value = 'Por favor, preencha os campos obrigatórios: ID, Banca, Especialidade, Tema/Doença e Enunciado.';
    return;
  }

  try {
    isSaving.value = true;
    errorMessage.value = '';
    successMessage.value = '';

    // Prepara os dados para salvamento
    const questaoData = {
      ...formData.value,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.value?.uid || 'unknown'
    };

    // Converte as opções de volta para o formato de array de objetos para o Firestore
    questaoData.opcoes = Object.keys(formData.value.opcoes).map(letra => ({
      letra: letra.toUpperCase(), // Garante que a letra seja maiúscula (A, B, C, D, E)
      texto: formData.value.opcoes[letra] || ''
    }));

    // Se for uma nova questão, adiciona campos de criação
    if (!formData.value.createdAt) {
      questaoData.createdAt = serverTimestamp();
      questaoData.createdBy = currentUser.value?.uid || 'unknown';
    }

    // Remove campos vazios do array de imagens
    if (questaoData.imagens) {
      questaoData.imagens = questaoData.imagens.filter(img => img && img.trim() !== '');
    }

    // Remove áreas vazias
    if (questaoData.area) {
      questaoData.area = questaoData.area.filter(area => area && area.trim() !== '');
    }


    const questaoRef = doc(db, 'questoes', questaoId.value);
    await updateDoc(questaoRef, questaoData);

    successMessage.value = 'Questão salva com sucesso!';
    setTimeout(() => { successMessage.value = ''; }, 3000);

  } catch (error) {
    console.error('Erro ao salvar questão:', error);
    errorMessage.value = `Erro ao salvar questão: ${error.message}`;
  } finally {
    isSaving.value = false;
  }
}

async function deleteQuestao() {
  if (!isAdmin.value) {
    errorMessage.value = 'Apenas administradores podem excluir questões.';
    return;
  }

  if (!confirm('Tem certeza que deseja excluir esta questão? Esta ação não pode ser desfeita.')) {
    return;
  }

  try {
    isSaving.value = true;
    errorMessage.value = '';
    
    const questaoRef = doc(db, 'questoes', questaoId.value);
    await deleteDoc(questaoRef);
    
    successMessage.value = 'Questão excluída com sucesso!';
    
    // Redireciona após 2 segundos
    setTimeout(() => {
      router.push('/app/questoes');
    }, 2000);
    
  } catch (error) {
    console.error('Erro ao excluir questão:', error);
    errorMessage.value = `Erro ao excluir questão: ${error.message}`;
  } finally {
    isSaving.value = false;
  }
}

function goBack() {
  router.push('/app/questoes');
}
</script>

<template>
  <div class="edit-questao-container">
    <!-- Header -->
    <div class="header-section">
      <div class="header-content">
        <button @click="goBack" class="back-button">
          ← Voltar para Questões
        </button>
        <h1>Editar Questão</h1>
        <div v-if="formData.id" class="questao-info">
          <span class="questao-id">ID: {{ formData.id }}</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Carregando questão...</p>
    </div>

    <!-- Messages -->
    <div v-if="errorMessage" class="message error-message">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="message success-message">
      {{ successMessage }}
    </div>

    <!-- Main Content -->
    <div v-if="!isLoading" class="main-content">
      
      <!-- Informações Básicas -->
      <div class="form-section">
        <h2>Informações Básicas</h2>
        <div class="form-grid">
          <div class="form-group">
            <label for="questao-id">ID da Questão *</label>
            <input 
              id="questao-id"
              v-model="formData.id" 
              type="text" 
              placeholder="Ex: FAMERP_2023_01"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="banca">Banca *</label>
            <input 
              id="banca"
              v-model="formData.banca" 
              type="text" 
              placeholder="Ex: FAMERP"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="ano">Ano</label>
            <input 
              id="ano"
              v-model.number="formData.ano" 
              type="number" 
              placeholder="Ex: 2023"
              min="2000"
              max="2030"
            />
          </div>
          
          <div class="form-group">
            <label for="numero">Número da Questão</label>
            <input 
              id="numero"
              v-model.number="formData.numero" 
              type="number" 
              placeholder="Ex: 1"
              min="1"
            />
          </div>
          
          <div class="form-group">
            <label for="resposta-correta">Resposta Correta</label>
            <select id="resposta-correta" v-model="formData.respostaCorreta">
              <option value="">Selecione</option>
              <option value="a">A</option>
              <option value="b">B</option>
              <option value="c">C</option>
              <option value="d">D</option>
              <option value="e">E</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Especialidades e Classificação -->
      <div class="form-section">
        <h2>Especialidades e Classificação</h2>
        <div class="form-grid">
          <div class="form-group">
            <label for="especialidade">Especialidade *</label>
            <select 
              id="especialidade" 
              v-model="formData.especialidade"
              @change="onEspecialidadeChange"
              required
            >
              <option value="">Selecione uma especialidade...</option>
              <option 
                v-for="esp in especialidadesDisponiveis" 
                :key="esp.value" 
                :value="esp.value"
              >
                {{ esp.title }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="sub-especialidade">Subespecialidade</label>
            <select 
              id="sub-especialidade" 
              v-model="formData['sub-especialidade']"
              :disabled="!formData.especialidade"
            >
              <option value="">Selecione uma subespecialidade...</option>
              <option 
                v-for="sub in subespecialidadesDisponiveis" 
                :key="sub.value" 
                :value="sub.value"
              >
                {{ sub.title }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="tema-doenca">Tema/Doença *</label>
            <input 
              id="tema-doenca"
              v-model="formData.temaDoença"
              type="text"
              placeholder="Ex: Pneumonia Comunitária, Diabetes Mellitus"
              required
            />
          </div>
        </div>
      </div>

      <!-- Áreas de Conhecimento -->
      <div class="form-section">
        <h2>Áreas de Conhecimento</h2>
        <div class="dynamic-list">
          <div v-for="(area, index) in formData.area" :key="'area-' + index" class="dynamic-item">
            <input 
              v-model="formData.area[index]" 
              type="text" 
              placeholder="Ex: Cardiologia, Clínica Médica"
            />
            <button @click="removeArea(index)" class="remove-button" type="button">
              Remover
            </button>
          </div>
          <button @click="addArea" class="add-button" type="button">
            + Adicionar Área
          </button>
        </div>
      </div>

      <!-- Enunciado -->
      <div class="form-section">
        <h2>Enunciado da Questão *</h2>
        <div class="form-group">
          <textarea 
            v-model="formData.enunciado" 
            placeholder="Digite o enunciado completo da questão..."
            rows="8"
            required
          ></textarea>
        </div>
      </div>

      <!-- Opções de Resposta -->
      <div class="form-section">
        <h2>Opções de Resposta</h2>
        <div class="opcoes-grid">
          <div v-for="letra in ['a', 'b', 'c', 'd', 'e']" :key="letra" class="opcao-group">
            <label :for="'opcao-' + letra">{{ letra.toUpperCase() }}</label>
            <textarea 
              :id="'opcao-' + letra"
              v-model="formData.opcoes[letra]" 
              :placeholder="'Opção ' + letra.toUpperCase()"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Explicação -->
      <div class="form-section">
        <h2>Explicação/Comentário</h2>
        <div class="form-group">
          <textarea 
            v-model="formData.explicacao" 
            placeholder="Explicação da resposta correta, comentários adicionais..."
            rows="6"
          ></textarea>
        </div>
      </div>

      <!-- Imagens -->
      <div class="form-section">
        <h2>Imagens da Questão</h2>
        <p class="section-description">
          Adicione imagens relacionadas à questão (exames, gráficos, figuras, etc.)
        </p>
        
        <div class="images-container">
          <div 
            v-for="(imagem, index) in (formData.imagens || [])" 
            :key="'imagem-' + index" 
            class="image-item"
          >
            <div class="image-header">
              <h4>Imagem {{ index + 1 }}</h4>
              <button @click="removeImage(index)" class="remove-button" type="button">
                Remover
              </button>
            </div>
            
            <div v-if="imagem && imagem.trim() !== ''" class="image-preview">
              <img :src="imagem" :alt="'Imagem ' + (index + 1)" />
              <p class="image-url">{{ imagem }}</p>
            </div>
            
            <div class="image-upload">
              <label :for="'image-upload-' + index" class="upload-label">
                {{ imagem && imagem.trim() !== '' ? 'Substituir Imagem' : 'Selecionar Imagem' }}
              </label>
              <input 
                :id="'image-upload-' + index"
                type="file" 
                accept="image/*"
                @change="(event) => handleImageUpload(event, index)"
                style="display: none;"
              />
            </div>
            
            <div v-if="uploadingImages[index]" class="upload-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: (uploadProgress[index] || 0) + '%' }"
                ></div>
              </div>
              <p>Enviando... {{ uploadProgress[index] || 0 }}%</p>
            </div>
          </div>
          
          <button @click="addNewImageSlot" class="add-button" type="button">
            + Adicionar Nova Imagem
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-section">
        <button @click="saveQuestao" :disabled="isSaving || !isAdmin" class="save-button">
          {{ isSaving ? 'Salvando...' : 'Salvar Questão' }}
        </button>
        
        <button @click="deleteQuestao" :disabled="isSaving || !isAdmin" class="delete-button">
          {{ isSaving ? 'Processando...' : 'Excluir Questão' }}
        </button>
        
        <button @click="goBack" class="cancel-button">
          Cancelar
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.edit-questao-container {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
}

.header-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.back-button {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.3s;
}

.back-button:hover {
  background: #5a6268;
}

.header-content h1 {
  margin: 0;
  color: #333;
}

.questao-info {
  margin-left: auto;
}

.questao-id {
  background: #e9ecef;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9em;
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.message {
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.success-message {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.form-section h2 {
  margin: 0 0 15px 0;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.section-description {
  color: #666;
  margin-bottom: 15px;
  font-style: italic;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 600;
  color: #555;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

.dynamic-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dynamic-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.dynamic-item input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.opcoes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.opcao-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.opcao-group label {
  font-weight: bold;
  color: #333;
  font-size: 16px;
}

.images-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.image-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: #fafafa;
}

.image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.image-header h4 {
  margin: 0;
  color: #333;
}

.image-preview {
  margin-bottom: 15px;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.image-url {
  font-size: 0.8em;
  color: #666;
  word-break: break-all;
  margin-top: 5px;
}

.image-upload {
  margin-bottom: 10px;
}

.upload-label {
  display: inline-block;
  padding: 10px 15px;
  background: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.upload-label:hover {
  background: #0056b3;
}

.upload-progress {
  margin-top: 10px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s ease;
}

.add-button,
.remove-button {
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.add-button {
  background: #28a745;
  color: white;
}

.add-button:hover {
  background: #218838;
}

.remove-button {
  background: #dc3545;
  color: white;
}

.remove-button:hover {
  background: #c82333;
}

.actions-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.save-button,
.delete-button,
.cancel-button {
  padding: 12px 24px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.3s;
  flex: 1;
  min-width: 150px;
}

.save-button {
  background: #007bff;
  color: white;
}

.save-button:hover:not(:disabled) {
  background: #0056b3;
}

.save-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.delete-button {
  background: #dc3545;
  color: white;
}

.delete-button:hover:not(:disabled) {
  background: #c82333;
}

.delete-button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.cancel-button {
  background: #6c757d;
  color: white;
}

.cancel-button:hover {
  background: #5a6268;
}

/* Responsive */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .questao-info {
    margin-left: 0;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .opcoes-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-section {
    flex-direction: column;
  }
  
  .save-button,
  .delete-button,
  .cancel-button {
    min-width: unset;
  }
}
</style>
