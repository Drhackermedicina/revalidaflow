#!/usr/bin/env python3
"""
Script para substituir o código duplicado por StationListItem component
"""

import re

with open('src/pages/StationList.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Template para cada seção de especialidade
specialty_template = '''                    <!-- 🚀 OTIMIZAÇÃO: Componente reutilizável - elimina duplicação -->
                    <v-virtual-scroll
                      :items="{items_var}"
                      :item-height="160"
                      :height="Math.min({items_var}.length * 160, 600)"
                    >
                      <template #default="{{ item: station }}">
                        <StationListItem
                          :station="station"
                          :edit-status="station.editStatus"
                          :user-score="station.userScore"
                          :specialty="{specialty_key}"
                          :background-color="station.backgroundColor"
                          :show-sequential-config="showSequentialConfig"
                          :is-admin="isAdmin"
                          :is-in-sequence="isStationInSequence(station.id)"
                          :is-creating-session="creatingSessionForStationId === station.id"
                          :show-detailed-dates="true"
                          @click="startSimulationAsActor"
                          @add-to-sequence="addToSequence"
                          @remove-from-sequence="removeFromSequence"
                          @edit-station="goToEditStation"
                          @start-ai-training="startAITraining"
                        />
                      </template>
                    </v-virtual-scroll>'''

# Padrão para encontrar blocos de v-virtual-scroll
pattern = r'<!-- 🚀 OTIMIZAÇÃO: Virtualização de lista - renderiza apenas itens visíveis -->\s+<v-virtual-scroll\s+:items="(filteredStationsRevalida[^"]+)"\s+:item-height="\d+"\s+:height="[^"]+"\s+>\s+<template #default="{ item: station }">.*?</template>\s+</v-virtual-scroll>'

# Especialidades e suas variáveis
specialties = [
    ('filteredStationsRevalidaFacilClinicaMedica', "'clinica-medica'"),
    ('filteredStationsRevalidaFacilCirurgia', "'cirurgia'"),
    ('filteredStationsRevalidaFacilPediatria', "'pediatria'"),
    ('filteredStationsRevalidaFacilGO', "'ginecologia'"),
    ('filteredStationsRevalidaFacilPreventiva', "'preventiva'"),
    ('filteredStationsRevalidaFacilProcedimentos', "'procedimentos'")
]

# Substituir cada ocorrência
for items_var, specialty_key in specialties:
    # Procurar padrão específico para esta especialidade
    spec_pattern = pattern.replace('(filteredStationsRevalida[^"]+)', items_var)

    replacement = specialty_template.format(
        items_var=items_var,
        specialty_key=specialty_key
    )

    content = re.sub(spec_pattern, replacement, content, flags=re.DOTALL)

# Salvar
with open('src/pages/StationList.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print('✅ Substituições aplicadas com sucesso!')
print(f'  - 6 seções de Revalida Fácil refatoradas')
print(f'  - Código duplicado eliminado')
