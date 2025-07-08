const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Test the upload endpoint
async function testUpload() {
  try {
    // Create a simple test image file
    const testImageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG header
    const form = new FormData();
    form.append('receipt', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    const response = await axios.post('http://localhost:3000/api/receipts/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer your-token-here' // You'll need to replace this with a valid token
      }
    });
    
    console.log('Upload response:', response.data);
    
    // Test progress endpoint
    if (response.data.jobId) {
      const progressResponse = await axios.get(`http://localhost:3000/api/receipts/progress/${response.data.jobId}`);
      console.log('Progress response:', progressResponse.data);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testUpload();