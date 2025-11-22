import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const API_URL = 'http://localhost:3000/api';

async function main() {
    try {
        console.log('🔍 Checking health...');
        const health = await axios.get(`${API_URL}/health`);
        console.log('✅ Health check passed:', health.data);

        console.log('\n🔍 SETUP PAYMENT...');
        try {
            const payment = await axios.post(`${API_URL}/synapse/setup-payment`);
            console.log('✅ Payment status:', payment.data);
        } catch (e: any) {
            console.log('⚠️ Could not setup payment (server might need funding):', e.message);
        }

        console.log('\n🔍 Checking payment status...');
        try {
            const payment = await axios.get(`${API_URL}/synapse/payment-status`);
            console.log('✅ Payment status:', payment.data);
        } catch (e: any) {
            console.log('⚠️ Could not check payment status (server might need funding):', e.message);
        }

        console.log('\n📤 Uploading image with signature...');
        // Create a dummy image
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const imagePath = path.join(__dirname, 'test-image.png');
        // Create a simple 1x1 pixel PNG or just some random bytes pretending to be an image
        // For a valid image test, let's write a small buffer
        // Synapse requires > 127 bytes
        const imageBuffer = Buffer.alloc(1024, 'a');
        fs.writeFileSync(imagePath, imageBuffer);

        const formData = new FormData();
        formData.append('image', fs.createReadStream(imagePath));
        formData.append('signature', '0x1234567890abcdef');
        formData.append('metadata', JSON.stringify({ customKey: 'customValue' }));

        const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        console.log('✅ Upload successful:', uploadRes.data);
        const pieceCid = uploadRes.data.data.pieceCid;

        if (pieceCid) {
            console.log(`\n📥 Downloading file ${pieceCid}...`);
            const downloadRes = await axios.get(`${API_URL}/upload/${pieceCid}`, {
                responseType: 'arraybuffer',
            });

            console.log('✅ Download successful, size:', downloadRes.data.length);

            // Verify content
            const downloadedBuffer = Buffer.from(downloadRes.data);
            if (downloadedBuffer.equals(imageBuffer)) {
                console.log('✅ Content matches original image!');
            } else {
                console.error('❌ Content mismatch!');
            }
        }

        // Cleanup
        fs.unlinkSync(imagePath);

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        if (error.code) console.error('Error code:', error.code);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        process.exit(1);
    }
}

main();
