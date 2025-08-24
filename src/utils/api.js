// src/utils/api.js
// Centralização dos endpoints da API utilizados pelo frontend

const BASE_URL = 'http://localhost:8080'; // Altere conforme ambiente (produção/dev)

export const API_ENDPOINTS = {
  START_CREATION: `${BASE_URL}/api/agent/start-creation`,
  GENERATE_FINAL_STATION: `${BASE_URL}/api/agent/generate-final-station`,
  ANALYZE_STATION: `${BASE_URL}/api/agent/analyze-station`,
  APPLY_AUDIT: `${BASE_URL}/api/agent/apply-audit`,
  TEST_GEMINI: `${BASE_URL}/api/test-gemini`,
  // Adicione outros endpoints conforme necessário
};

// Exemplo de uso:
// import { API_ENDPOINTS } from '@/utils/api';
// fetch(API_ENDPOINTS.START_CREATION, { ... })
