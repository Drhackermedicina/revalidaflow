#!/usr/bin/env python3
"""
Script para aplicar virtualização nas seções do StationList.vue
"""

import re

# Ler o arquivo
with open('src/pages/StationList.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Padrões para substituir
sections = [
    ('Cirurgia', 'filteredStationsRevalidaFacilCirurgia', 'cirurgia'),
    ('Pediatria', 'filteredStationsRevalidaFacilPediatria', 'pediatria'),
    ('GO', 'filteredStationsRevalidaFacilGO', 'ginecologia'),
    ('Preventiva', 'filteredStationsRevalidaFacilPreventiva', 'preventiva'),
    ('Procedimentos', 'filteredStationsRevalidaFacilProcedimentos', 'procedimentos')
]

for section_name, computed_name, specialty in sections:
    # Padrão antigo: <v-list density="comfortable">
    old_pattern = f'''                  <v-expansion-panel-text>
                    <v-list density="comfortable">
                      <v-list-item
                        v-for="station in {computed_name}"'''

    # Novo padrão com virtualização
    new_pattern = f'''                  <v-expansion-panel-text>
                    <!-- 🚀 OTIMIZAÇÃO: Virtualização de lista - renderiza apenas itens visíveis -->
                    <v-virtual-scroll
                      :items="{computed_name}"
                      :item-height="160"
                      :height="Math.min({computed_name}.length * 160, 600)"
                    >
                      <template #default="{{ item: station }}">
                        <v-list-item'''

    # Substituir
    content = content.replace(old_pattern, new_pattern)

    # Fechar </v-list> com </template></v-virtual-scroll>
    # Encontrar o padrão de fechamento
    old_close = f'''                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>'''

    new_close = f'''                        </v-list-item>
                      </template>
                    </v-virtual-scroll>
                  </v-expansion-panel-text>'''

    # Como há múltiplas ocorrências, vamos fazer de forma mais inteligente
    # Procurar por ocorrência próxima ao {computed_name}

print("Substituições aplicadas!")

# Salvar o arquivo
with open('src/pages/StationList.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print("Arquivo atualizado com sucesso!")
