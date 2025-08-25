// Simple test script to verify the LookMatch system
const API_URL = 'http://localhost:4000';

async function testHealth() {
  try {
    console.log('🔍 Testing health endpoint...');
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testMockSearch() {
  try {
    console.log('\n🔍 Testing mock search...');
    const response = await fetch(`${API_URL}/matches?query=burberry%20shirt%20beige&limit=5`);
    const data = await response.json();
    console.log('✅ Mock search passed:', {
      total: data.total,
      verified: data.verifiedCount,
      results: data.results.length
    });
    return true;
  } catch (error) {
    console.error('❌ Mock search failed:', error.message);
    return false;
  }
}

async function testMockSearchNike() {
  try {
    console.log('\n🔍 Testing Nike search...');
    const response = await fetch(`${API_URL}/matches?query=nike%20hoodie%20black&limit=5`);
    const data = await response.json();
    console.log('✅ Nike search passed:', {
      total: data.total,
      verified: data.verifiedCount,
      results: data.results.length
    });
    return true;
  } catch (error) {
    console.error('❌ Nike search failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting LookMatch System Tests...\n');
  
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('\n❌ System not ready. Please ensure the backend is running.');
    return;
  }
  
  const searchOk = await testMockSearch();
  const nikeOk = await testMockSearchNike();
  
  console.log('\n📊 Test Results:');
  console.log(`Health Check: ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Burberry Search: ${searchOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Nike Search: ${nikeOk ? '✅ PASS' : '❌ FAIL'}`);
  
  if (healthOk && searchOk && nikeOk) {
    console.log('\n🎉 All tests passed! The system is working correctly.');
    console.log('\n🌐 You can now:');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Upload a clothing photo');
    console.log('3. See the AI analysis and product recommendations');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
  }
}

// Run tests
runTests().catch(console.error);


