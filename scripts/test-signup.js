// Test signup API endpoint
async function testSignup() {
  const timestamp = Date.now();
  const testData = {
    email: `john.doe${timestamp}@gmail.com`,
    password: 'TestPassword123!',
    userData: {
      name: 'Test User',
      brand: 'Test Mining Co',
      desc: 'A test mining company',
      category: 'mining',
      website: 'https://example.com',
      founded: '2020'
    }
  };

  try {
    console.log('Testing signup with:', testData.email);
    
    const response = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);
    
    if (result.success) {
      console.log('✅ Signup successful!');
    } else {
      console.log('❌ Signup failed:', result.message);
    }
  } catch (error) {
    console.error('Error testing signup:', error);
  }
}

testSignup();
