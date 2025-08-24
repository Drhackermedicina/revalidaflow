// src/utils/deployment-watcher.js

/**
 * Configura um manipulador de erros global para capturar falhas de importação dinâmica,
 * que normalmente ocorrem após um novo deploy.
 */
function setupDeploymentWatcher() {
  // Escuta por erros não capturados em promessas (onde os erros de importação dinâmica ocorrem)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason instanceof Error) {
      const isChunkLoadError = /Failed to fetch dynamically imported module/i.test(event.reason.message);

      if (isChunkLoadError) {
        console.warn('📦 Erro de carregamento de chunk detectado. Provavelmente uma nova versão foi implantada.');
        
        // Previne que o erro apareça no console do usuário
        event.preventDefault();
        
        // Mostra uma notificação para o usuário antes de recarregar
        showUpdateNotification();

        // Força um recarregamento completo do servidor para obter os novos assets
        // Usando um pequeno atraso para permitir que a notificação seja vista
        setTimeout(() => {
          window.location.reload(true);
        }, 3000);
      }
    }
  });
  
  console.log('🔄 Vigia de deploy configurado para lidar com atualizações automáticas.');
}

/**
 * Exibe uma notificação para o usuário sobre a atualização do aplicativo.
 */
function showUpdateNotification() {
  // Evita a criação de notificações duplicadas
  if (document.getElementById('app-update-notification')) {
    return;
  }

  const notification = document.createElement('div');
  notification.id = 'app-update-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #007BFF 0%, #0056b3 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    font-weight: 500;
    text-align: center;
    animation: fadeInDown 0.5s ease-out;
  `;

  notification.innerHTML = `
    <span>🚀 Nova versão disponível! Atualizando o aplicativo...</span>
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInDown {
      from { top: -100px; opacity: 0; }
      to { top: 20px; opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(notification);
}

// Inicia o vigia assim que o script é carregado
setupDeploymentWatcher();
