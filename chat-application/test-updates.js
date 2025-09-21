// Simple test script to verify the Live Updates API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3001'; // Adjust based on your server port
const TEST_GROUP_ID = 'your-test-group-id'; // Replace with actual group ID
const TEST_TOKEN = 'your-test-token'; // Replace with actual JWT token

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

async function testUpdatesAPI() {
  console.log('🧪 Testing Live Updates API...\n');

  try {
    // Test 1: Check if user is group admin
    console.log('1. Testing group admin check...');
    const adminCheck = await apiClient.get(`/api/updates/group/${TEST_GROUP_ID}/admin`);
    console.log('✅ Admin status:', adminCheck.data.isGroupAdmin);

    // Test 2: Get latest updates
    console.log('\n2. Testing get latest updates...');
    const latestUpdates = await apiClient.get(`/api/updates/group/${TEST_GROUP_ID}/latest`);
    console.log('✅ Latest updates:', latestUpdates.data.updates.length, 'updates found');

    // Test 3: Create a new update (if admin)
    if (adminCheck.data.isGroupAdmin) {
      console.log('\n3. Testing create update...');
      const newUpdate = await apiClient.post(`/api/updates/group/${TEST_GROUP_ID}`, {
        title: 'Test Update',
        description: 'This is a test update created via API',
        link: 'https://example.com',
        priority: 5,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      });
      console.log('✅ Update created:', newUpdate.data.update.title);

      const updateId = newUpdate.data.update._id;

      // Test 4: Update the created update
      console.log('\n4. Testing update update...');
      const updatedUpdate = await apiClient.put(`/api/updates/${updateId}`, {
        title: 'Updated Test Update',
        description: 'This update has been modified',
        priority: 10
      });
      console.log('✅ Update updated:', updatedUpdate.data.update.title);

      // Test 5: Delete the update
      console.log('\n5. Testing delete update...');
      const deleteResult = await apiClient.delete(`/api/updates/${updateId}`);
      console.log('✅ Update deleted:', deleteResult.data.message);

    } else {
      console.log('\n❌ User is not group admin, skipping create/update/delete tests');
    }

    // Test 6: Get all updates with pagination
    console.log('\n6. Testing get all updates with pagination...');
    const allUpdates = await apiClient.get(`/api/updates/group/${TEST_GROUP_ID}?limit=5&page=1`);
    console.log('✅ All updates:', allUpdates.data.updates.length, 'updates found');
    console.log('✅ Pagination info:', allUpdates.data.pagination);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the tests
testUpdatesAPI();
