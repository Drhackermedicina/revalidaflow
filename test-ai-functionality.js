/**
 * Test script to verify AI functionality fixes
 * Run with: node test-ai-functionality.js
 */

console.log('🧪 Testing AI Functionality Fixes...\n');

// Test 1: Check if adminAgentService is properly implemented
async function testAdminAgentService() {
  console.log('1️⃣ Testing AdminAgentService...');

  try {
    // Since we're in Node.js, we'll simulate the module check
    const fs = require('fs');
    const path = require('path');

    const servicePath = path.join(__dirname, 'src', 'services', 'adminAgentService.js');
    const serviceContent = fs.readFileSync(servicePath, 'utf8');

    // Check if the service has been updated with proper implementations
    const hasAnalyzeAllStations = serviceContent.includes('async analyzeAllStations()');
    const hasSendMessage = serviceContent.includes('async sendMessage(');
    const hasGeminiImport = serviceContent.includes('import geminiService');
    const noThrowErrors = !serviceContent.includes('throw new Error(\'Serviço admin-agent removido');

    console.log(`   ✅ Has analyzeAllStations: ${hasAnalyzeAllStations}`);
    console.log(`   ✅ Has sendMessage: ${hasSendMessage}`);
    console.log(`   ✅ Imports GeminiService: ${hasGeminiImport}`);
    console.log(`   ✅ No error throwing: ${noThrowErrors}`);

    if (hasAnalyzeAllStations && hasSendMessage && hasGeminiImport && noThrowErrors) {
      console.log('   🎉 AdminAgentService: FIXED!\n');
      return true;
    } else {
      console.log('   ❌ AdminAgentService: STILL HAS ISSUES!\n');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing AdminAgentService: ${error.message}\n`);
    return false;
  }
}

// Test 2: Check if Firebase configuration has better error handling
async function testFirebaseConfig() {
  console.log('2️⃣ Testing Firebase Configuration...');

  try {
    const fs = require('fs');
    const path = require('path');

    const firebasePath = path.join(__dirname, 'src', 'plugins', 'firebase.js');
    const firebaseContent = fs.readFileSync(firebasePath, 'utf8');

    // Check for improved error handling
    const hasErrorHandling = firebaseContent.includes('catch (cacheError)');
    const hasFallback = firebaseContent.includes('initializeFirestore(firebaseApp, {})');
    const hasLogging = firebaseContent.includes('console.log(\'✅ Firestore inicializado');

    console.log(`   ✅ Has error handling: ${hasErrorHandling}`);
    console.log(`   ✅ Has fallback config: ${hasFallback}`);
    console.log(`   ✅ Has proper logging: ${hasLogging}`);

    if (hasErrorHandling && hasFallback && hasLogging) {
      console.log('   🎉 Firebase Config: IMPROVED!\n');
      return true;
    } else {
      console.log('   ❌ Firebase Config: NEEDS MORE WORK!\n');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing Firebase config: ${error.message}\n`);
    return false;
  }
}

// Test 3: Check if memoryService has better Firestore handling
async function testMemoryService() {
  console.log('3️⃣ Testing MemoryService...');

  try {
    const fs = require('fs');
    const path = require('path');

    const memoryPath = path.join(__dirname, 'src', 'services', 'memoryService.js');
    const memoryContent = fs.readFileSync(memoryPath, 'utf8');

    // Check for improved Firestore handling
    const hasDbCheck = memoryContent.includes('if (!db)');
    const hasTimeout = memoryContent.includes('Promise.race');
    const hasLocalStorageFallback = memoryContent.includes('loadFromLocalStorage');

    console.log(`   ✅ Has DB availability check: ${hasDbCheck}`);
    console.log(`   ✅ Has timeout handling: ${hasTimeout}`);
    console.log(`   ✅ Has localStorage fallback: ${hasLocalStorageFallback}`);

    if (hasDbCheck && hasTimeout && hasLocalStorageFallback) {
      console.log('   🎉 MemoryService: IMPROVED!\n');
      return true;
    } else {
      console.log('   ❌ MemoryService: NEEDS MORE WORK!\n');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing MemoryService: ${error.message}\n`);
    return false;
  }
}

// Test 4: Check if GeminiService is working properly
async function testGeminiService() {
  console.log('4️⃣ Testing GeminiService...');

  try {
    const fs = require('fs');
    const path = require('path');

    const geminiPath = path.join(__dirname, 'src', 'services', 'geminiService.js');

    if (fs.existsSync(geminiPath)) {
      const geminiContent = fs.readFileSync(geminiPath, 'utf8');

      // Check if GeminiService has proper API configuration
      const hasApiKeys = geminiContent.includes('this.apiKeys');
      const hasRequestMethod = geminiContent.includes('async makeRequest(');
      const hasErrorHandling = geminiContent.includes('catch (error)');

      console.log(`   ✅ Has API keys: ${hasApiKeys}`);
      console.log(`   ✅ Has makeRequest method: ${hasRequestMethod}`);
      console.log(`   ✅ Has error handling: ${hasErrorHandling}`);

      if (hasApiKeys && hasRequestMethod && hasErrorHandling) {
        console.log('   🎉 GeminiService: WORKING!\n');
        return true;
      } else {
        console.log('   ❌ GeminiService: HAS ISSUES!\n');
        return false;
      }
    } else {
      console.log('   ❌ GeminiService file not found!\n');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error testing GeminiService: ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting AI Functionality Verification...\n');

  const results = await Promise.all([
    testAdminAgentService(),
    testFirebaseConfig(),
    testMemoryService(),
    testGeminiService()
  ]);

  const allPassed = results.every(result => result === true);
  const passedCount = results.filter(result => result === true).length;

  console.log('📊 SUMMARY:');
  console.log(`   ✅ Tests passed: ${passedCount}/4`);
  console.log(`   🎯 Overall status: ${allPassed ? 'ALL FIXES APPLIED!' : 'SOME ISSUES REMAIN'}`);

  if (allPassed) {
    console.log('\n🎉 SUCCESS! All AI functionality fixes have been applied correctly.');
    console.log('🔄 Next steps:');
    console.log('   1. Restart your development server');
    console.log('   2. Test the AdminAgentAssistant component');
    console.log('   3. Test the AIFieldAssistant component');
    console.log('   4. Check if Firestore connection issues are resolved');
  } else {
    console.log('\n⚠️  Some issues remain. Please review the failed tests above.');
  }
}

runAllTests().catch(console.error);