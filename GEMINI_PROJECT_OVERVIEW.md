# Visão Geral do Projeto: REVALIDAFLOW

## 1. Objetivo Principal
Criar uma plataforma de estudos completa para médicos, com foco atual em simulações práticas para a 2ª fase da prova de residência Revalida.

## 2. Atores Principais
- **Avaliador/Ator:** Conduz a simulação, avalia o candidato e libera informações.
- **Candidato:** Participa da simulação com acesso restrito a informações, que são liberadas pelo ator.

## 3. Fluxo Principal da Simulação
1.  O **Avaliador/Ator** acessa `src/pages/StationList.vue`.
2.  Ele escolhe uma estação e, opcionalmente, um **Candidato**.
3.  A simulação é iniciada e ambos são direcionados para `src/pages/SimulationView.vue`.
4.  Um link de simulação é gerado para o candidato.
5.  A simulação começa quando ambos os participantes confirmam que estão prontos.
6.  A avaliação final é registrada, com uma regra de negócio para evitar fraude (a simulação não pode ser interrompida manualmente para a nota contar).

## 4. Arquitetura Técnica
- **Frontend (`./src`):** Aplicação Vue.js.
- **Backend (`./backend`):** API em Node.js (provavelmente Express, a ser confirmado).
- **Agente IA (`./backend-python-agent`):** Serviço em Python para geração automática de estações.

## 5. Estado Atual e Pontos de Atenção
- **Funcional:** O fluxo principal de simulação parece estar implementado.
- **Bug:** A funcionalidade de convite via chat está quebrada.
- **Problema:** O `backend-python-agent` é instável e precisa de melhorias.
- **Guia:** Meu papel é guiar o desenvolvedor (médico, iniciante em programação) na análise, manutenção e evolução do código.
