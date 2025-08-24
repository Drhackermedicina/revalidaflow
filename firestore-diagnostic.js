// Script para diagnosticar estrutura do Firestore - especialidades e editHistory
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDuakOooHv9a5slO0I3o3gttSBlSXD0aWw",
  authDomain: "revalida-companion.firebaseapp.com",
  projectId: "revalida-companion",
  storageBucket: "revalida-companion.appspot.com",
  messagingSenderId: "772316263153",
  appId: "1:772316263153:web:d0af4ecc404b6ca16a2f50"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeFirestoreStructure() {
  try {
    console.log('🔍 DIAGNÓSTICO FIRESTORE - ANÁLISE COMPLETA\n');
    
    // 1. Buscar estações editadas (com editHistory)
    console.log('1️⃣ Buscando estações com editHistory...');
    const editedQuery = query(
      collection(db, 'estacoes_clinicas'), 
      limit(10)
    );
    
    const editedSnapshot = await getDocs(editedQuery);
    
    let editedStations = [];
    let allSpecialties = new Set();
    
    editedSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Coletar especialidades
      if (data.especialidade) {
        allSpecialties.add(data.especialidade);
      }
      
      // Verificar se tem editHistory
      if (data.editHistory && Array.isArray(data.editHistory) && data.editHistory.length > 0) {
        editedStations.push({
          id: doc.id,
          titulo: data.tituloEstacao,
          especialidade: data.especialidade,
          editHistory: data.editHistory,
          criadoEm: data.criadoEmTimestamp,
          atualizadoEm: data.atualizadoEmTimestamp
        });
      }
    });
    
    console.log(`✅ Encontradas ${editedStations.length} estações com editHistory de ${editedSnapshot.size} analisadas\n`);
    
    // 2. Analisar especialidades
    console.log('2️⃣ ESPECIALIDADES ENCONTRADAS:');
    Array.from(allSpecialties).sort().forEach(esp => {
      console.log(`   • ${esp}`);
    });
    console.log('');
    
    // 3. Analisar estrutura editHistory
    if (editedStations.length > 0) {
      console.log('3️⃣ ESTRUTURA DO EDITHISTORY:');
      editedStations.slice(0, 3).forEach((station, index) => {
        console.log(`\n--- ESTAÇÃO ${index + 1}: ${station.titulo.substring(0, 50)}... ---`);
        console.log(`ID: ${station.id}`);
        console.log(`Especialidade: ${station.especialidade}`);
        console.log(`Total de edições: ${station.editHistory.length}`);
        
        station.editHistory.forEach((edit, editIndex) => {
          console.log(`\n  Edição ${editIndex + 1}:`);
          console.log(`    Campos disponíveis:`, Object.keys(edit));
          
          if (edit.timestamp) {
            console.log(`    timestamp: ${edit.timestamp}`);
          }
          if (edit.userName) {
            console.log(`    userName: ${edit.userName}`);
          }
          if (edit.userId) {
            console.log(`    userId: ${edit.userId}`);
          }
          if (edit.editadoPor) {
            console.log(`    editadoPor: ${edit.editadoPor}`);
          }
        });
      });
    }
    
    // 4. Diagnosticar problemas encontrados
    console.log('\n4️⃣ DIAGNÓSTICO DE PROBLEMAS:');
    
    if (editedStations.length === 0) {
      console.log('❌ PROBLEMA: Nenhuma estação com editHistory encontrada');
      console.log('   Possível causa: Sistema ainda não criou editHistory para edições');
    } else {
      console.log('✅ EditHistory funcional detectado');
      
      // Verificar campos em editHistory
      const firstEdit = editedStations[0].editHistory[0];
      if (!firstEdit.timestamp) {
        console.log('❌ PROBLEMA: Campo timestamp ausente em editHistory');
      }
      if (!firstEdit.userName && !firstEdit.editadoPor) {
        console.log('❌ PROBLEMA: Campo userName/editadoPor ausente em editHistory');
      }
    }
    
    console.log('\n5️⃣ SOLUÇÃO RECOMENDADA:');
    console.log('✅ Atualizar função formatDate para lidar com string timestamp');
    console.log('✅ Corrigir mapping de especialidades com nomes exatos do Firestore');
    console.log('✅ Usar editHistory[último].timestamp para última edição');
    console.log('✅ Usar editHistory[último].userName para usuário que editou');
    
  } catch (error) {
    console.error('❌ ERRO no diagnóstico:', error);
  }
}

analyzeFirestoreStructure();
