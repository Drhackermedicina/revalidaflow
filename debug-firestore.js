// Script temporário para debug dos dados do Firestore
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

async function debugStationsData() {
  try {
    console.log('Buscando estações do REVALIDA FÁCIL...');
    
    // Busca algumas estações para analisar a estrutura
    const q = query(collection(db, 'estacoes_clinicas'), limit(5));
    const snapshot = await getDocs(q);
    
    console.log(`Encontradas ${snapshot.size} estações`);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('\n=== ESTAÇÃO ===');
      console.log('ID:', doc.id);
      console.log('Título:', data.tituloEstacao);
      console.log('Especialidade:', data.especialidade);
      console.log('Estrutura completa:', Object.keys(data));
    });
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

debugStationsData();
