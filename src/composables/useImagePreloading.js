/**
 * useImagePreloading.js
 *
 * Composable para gerenciar pré-carregamento de imagens
 * Extrai lógica de cache e preload do SimulationView.vue
 *
 * Responsabilidades:
 * - Cache de imagens pré-carregadas
 * - Retry logic com tentativas progressivas
 * - Status de carregamento por imagem
 * - Pré-carregamento em background
 * - Zoom de imagens
 */

import { ref } from 'vue'
import Logger from '@/utils/logger';
const logger = new Logger('useImagePreloading');


/**
 * @typedef {Object} ImagePreloadingParams
 * @property {Ref<any>} stationData
 */

export function useImagePreloading({ stationData }) {

  // --- Estado de cache de imagens ---
  const imageLoadAttempts = ref({})
  const imageLoadSources = ref({})
  const imagesPreloadStatus = ref({})
  const allImagesPreloaded = ref(false)

  // --- Estado de zoom ---
  const zoomedImageSrc = ref('')
  const zoomedImageAlt = ref('')
  const imageZoomDialog = ref(false)

  /**
   * Gera ID único para imagem
   */
  function getImageId(impressoId, context) {
    return `${impressoId}-${context}`
  }

  /**
   * Obtém source da imagem do cache ou força preload
   */
  function getImageSource(imagePath, imageId) {
    // Se a imagem foi pré-carregada, retorna a URL do cache
    if (imageLoadSources.value[imageId]) {
      return imageLoadSources.value[imageId]
    }

    // Registra no cache para evitar múltiplas tentativas
    imageLoadSources.value = {
      ...imageLoadSources.value,
      [imageId]: imagePath
    }

    // Força pré-carregamento em background
    ensureImageIsPreloaded(imagePath, imageId, 'Imagem do impresso')

    return imagePath
  }

  /**
   * Handler de sucesso no carregamento
   */
  function handleImageLoad(imageId) {
    // Reset tentativas quando carrega com sucesso
    if (imageLoadAttempts.value[imageId]) {
      delete imageLoadAttempts.value[imageId]
    }
  }

  /**
   * Handler de erro no carregamento com retry
   */
  function handleImageError(imagePath, imageId) {
    // Incrementa tentativas
    const attempts = (imageLoadAttempts.value[imageId] || 0) + 1
    imageLoadAttempts.value = {
      ...imageLoadAttempts.value,
      [imageId]: attempts
    }

    // Máximo de 3 tentativas
    if (attempts <= 3) {
      // Força recarregamento adicionando timestamp
      const separator = imagePath.includes('?') ? '&' : '?'
      const newUrl = `${imagePath}${separator}reload=${Date.now()}&attempt=${attempts}`

      // Atualiza a fonte da imagem
      imageLoadSources.value = {
        ...imageLoadSources.value,
        [imageId]: newUrl
      }

      // Tenta novamente após um delay progressivo
      setTimeout(() => {
        preloadSingleImage(newUrl, imageId, 'Imagem do impresso')
      }, 1000 * attempts)

    } else {
      // Remove do cache para permitir tentativa manual posterior
      if (imageLoadSources.value[imageId]) {
        delete imageLoadSources.value[imageId]
        imageLoadSources.value = { ...imageLoadSources.value }
      }
    }
  }

  /**
   * Limpa cache de imagens
   */
  function clearImageCache() {
    imageLoadSources.value = {}
    imageLoadAttempts.value = {}
    imagesPreloadStatus.value = {}
    allImagesPreloaded.value = false
  }

  /**
   * Pré-carrega uma única imagem
   */
  function preloadSingleImage(imagePath, imageId, _altText) {
    if (!imagePath || !imageId) {
      return
    }

    // Verifica se já foi pré-carregada
    if (imageLoadSources.value[imageId]) {
      return
    }

    // Cria nova imagem para pré-carregamento
    const img = new Image()

    img.onload = () => {
      imageLoadSources.value = {
        ...imageLoadSources.value,
        [imageId]: imagePath
      }
      handleImageLoad(imageId)
    }

    img.onerror = () => {
      handleImageError(imagePath, imageId)
    }

    img.src = imagePath
  }

  /**
   * Pré-carrega imagem com callback de sucesso
   */
  function preloadSingleImageAdvanced(
    imagePath,
    imageId,
    altText,
    onSuccess,
    onError
  ) {
    if (!imagePath || !imageId) {
      return
    }

    // Verifica se já foi pré-carregada
    if (imageLoadSources.value[imageId]) {
      if (onSuccess) onSuccess()
      return
    }

    // Cria nova imagem para pré-carregamento
    const img = new Image()

    img.onload = () => {
      imageLoadSources.value = {
        ...imageLoadSources.value,
        [imageId]: imagePath
      }
      imagesPreloadStatus.value[imageId] = 'loaded'
      handleImageLoad(imageId)
      if (onSuccess) onSuccess()
    }

    img.onerror = () => {
      logger.error(`[PRELOAD] ❌ Erro ao pré-carregar: ${imageId} - ${imagePath}`)
      imagesPreloadStatus.value[imageId] = 'error'
      handleImageError(imagePath, imageId)
      if (onError) onError()
    }

    img.src = imagePath
  }

  /**
   * Pré-carrega todas as imagens dos impressos
   */
  function preloadImpressoImages() {
    if (!stationData.value?.materiaisDisponiveis?.impressos) {
      return
    }

    const impressosComImagem = stationData.value.materiaisDisponiveis.impressos.filter(
      (impresso) => impresso.tipoConteudo === 'imagem_com_texto' &&
        impresso.conteudo?.caminhoImagem
    )

    if (impressosComImagem.length === 0) {
      allImagesPreloaded.value = true
      return
    }

    // Reset status de pré-carregamento
    allImagesPreloaded.value = false
    imagesPreloadStatus.value = {}

    const imagesToPreload = []

    impressosComImagem.forEach((impresso) => {
      const imagePath = impresso.conteudo.caminhoImagem

      // IDs para ator e candidato
      const actorImageId = getImageId(impresso.idImpresso, 'actor-img-texto')
      const candidateImageId = getImageId(impresso.idImpresso, 'candidate-img-texto')

      imagesToPreload.push({ path: imagePath, id: actorImageId, title: impresso.tituloImpresso })
      imagesToPreload.push({ path: imagePath, id: candidateImageId, title: impresso.tituloImpresso })
    })

    // Inicializa status de todas as imagens
    imagesToPreload.forEach(img => {
      imagesPreloadStatus.value[img.id] = 'loading'
    })

    // Pré-carrega todas as imagens e monitora conclusão
    let loadedCount = 0
    const totalImages = imagesToPreload.length

    imagesToPreload.forEach(img => {
      preloadSingleImageAdvanced(
        img.path,
        img.id,
        img.title,
        () => {
          loadedCount++
          imagesPreloadStatus.value[img.id] = 'loaded'

          if (loadedCount === totalImages) {
            allImagesPreloaded.value = true
          }
        },
        () => {
          loadedCount++
          imagesPreloadStatus.value[img.id] = 'error'

          if (loadedCount === totalImages) {
            allImagesPreloaded.value = true
          }
        }
      )
    })
  }

  /**
   * Verifica se imagem está pré-carregada
   */
  function isImagePreloaded(imageId) {
    return !!imageLoadSources.value[imageId]
  }

  /**
   * Garante que imagem está pré-carregada
   */
  function ensureImageIsPreloaded(imagePath, imageId, altText) {
    if (!isImagePreloaded(imageId)) {
      preloadSingleImage(imagePath, imageId, altText)
    }
  }

  /**
   * Abre zoom da imagem
   */
  function openImageZoom(imageSrc, imageAlt) {
    if (!imageSrc || imageSrc.trim() === '') {
      logger.error(`[ZOOM] ❌ Erro: URL da imagem está vazia ou inválida: "${imageSrc}"`)
      return
    }

    // Verifica se a imagem está pré-carregada
    const imageId = Object.keys(imageLoadSources.value).find(id =>
      imageLoadSources.value[id] === imageSrc
    )

    if (imageId && imagesPreloadStatus.value[imageId] === 'loaded') {
      // Imagem está garantidamente carregada
    } else if (allImagesPreloaded.value) {
      // Todas foram pré-carregadas
    } else {
      // Fallback: força carregamento imediato
      const img = new Image()
      img.src = imageSrc
    }

    zoomedImageSrc.value = imageSrc
    zoomedImageAlt.value = imageAlt || 'Imagem ampliada'
    imageZoomDialog.value = true
  }

  /**
   * Fecha zoom da imagem
   */
  function closeImageZoom() {
    imageZoomDialog.value = false
    zoomedImageSrc.value = ''
    zoomedImageAlt.value = ''
  }

  return {
    // Estado
    imageLoadAttempts,
    imageLoadSources,
    imagesPreloadStatus,
    allImagesPreloaded,
    zoomedImageSrc,
    zoomedImageAlt,
    imageZoomDialog,

    // Métodos
    getImageId,
    getImageSource,
    handleImageLoad,
    handleImageError,
    clearImageCache,
    preloadSingleImage,
    preloadSingleImageAdvanced,
    preloadImpressoImages,
    isImagePreloaded,
    ensureImageIsPreloaded,
    openImageZoom,
    closeImageZoom
  }
}
