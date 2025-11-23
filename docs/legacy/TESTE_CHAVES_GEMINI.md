# Teste das Chaves Gemini / Google AI

Este guia documenta como verificar rapidamente quais chaves Gemini (Google AI Studio) presentes no `.env` estão válidas.

## Pré-requisitos

- Ambiente Node.js configurado (mesma versão utilizada no projeto).
- Arquivo `.env` atualizado com as chaves (`GEMINI_API_KEY`, `VITE_GEMINI_API_KEY`, `GOOGLE_API_KEY_X`, `VITE_GOOGLE_API_KEY_X`).

## Como executar o teste

```bash
node scripts/test-google-keys.js
```

O script:

- Lê o `.env` e agrupa chaves com o mesmo valor (evitando chamadas duplicadas).
- Consulta `https://generativelanguage.googleapis.com/v1beta/models` com cada chave.
- Exibe resultados mascarando parcialmente os valores.

## Interpretação dos resultados

- `✅ Chave válida`: a chave respondeu com HTTP 200 e está apta para uso.
- `❌ Chave inválida`: a chave retornou erro (ex.: expirada, inválida, projeto sem API habilitada).
- `⚠️ Erro de teste`: ocorreu falha de rede ou outro problema inesperado.

Os grupos listados exibem todas as variáveis de ambiente que compartilham o mesmo valor. Após identificar as chaves inválidas, remova-as do `.env` (e dos arquivos correspondentes) para reduzir a superfície de risco.

## Boas práticas

- Mantenha o `.env` fora do versionamento (`.gitignore` já cobre isso).
- Não exponha os valores reais em commits, logs ou capturas de tela.
- Rotacione as chaves inválidas/expiradas assim que possível.

















