import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function main() {
    try {
        console.log('🔍 Checking health...');
        const health = await axios.get(`${API_URL}/health`);
        console.log('✅ Health check passed:', health.data);

        // console.log('\n🔍 SETUP PAYMENT...');
        // try {
        //     const payment = await axios.post(`${API_URL}/synapse/setup-payment`);
        //     console.log('✅ Payment status:', payment.data);
        // } catch (e: any) {
        //     console.log('⚠️ Could not setup payment (server might need funding):', e.message);
        // }

        console.log('\n🔍 Checking payment status...');
        try {
            const payment = await axios.get(`${API_URL}/synapse/payment-status`);
            console.log('✅ Payment status:', payment.data);
        } catch (e: any) {
            console.log('⚠️ Could not check payment status (server might need funding):', e.message);
        }

        console.log('\n📤 Uploading JSON metadata...');

        // Create test metadata JSON with signature
        const testMetadata = {
            data: {
                timestamp: Date.now(),
                baseImage: 'test_base64_image_data',
                depthImage: 'test_depth_base64_image_data',
                depthData: {
                    shape: [480, 640],
                    dtype: 'float32',
                    min: 0.0,
                    max: 100.0,
                    mean: 50.0,
                    valid_pixels: 1000
                }
            },
            signature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
        };

        const uploadRes = await axios.post(`${API_URL}/upload`, testMetadata, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('✅ Upload successful:', JSON.stringify(uploadRes.data, null, 2));

        // Extract pieceCid - handle both object and string formats
        let pieceCid = uploadRes.data.data.pieceCid;
        if (pieceCid && typeof pieceCid === 'object' && '/' in pieceCid) {
            pieceCid = pieceCid['/'];
        }

        if (!pieceCid) {
            console.error('❌ No PieceCID returned in response');
            process.exit(1);
        }

        console.log('📋 PieceCID:', pieceCid);

        console.log(`\n📥 Downloading file ${pieceCid}...`);
        const downloadRes = await axios.get(`${API_URL}/upload/${pieceCid}`, {
            responseType: 'arraybuffer',
        });

        console.log('✅ Download successful, size:', downloadRes.data.length);

        // Verify content
        const downloadedBuffer = Buffer.from(downloadRes.data);
        const originalJsonString = JSON.stringify(testMetadata);
        const downloadedJsonString = downloadedBuffer.toString('utf-8');

        try {
            const downloadedJson = JSON.parse(downloadedJsonString);
            const originalJson = JSON.parse(originalJsonString);

            // Compare JSON objects (order-independent)
            if (JSON.stringify(downloadedJson) === JSON.stringify(originalJson)) {
                console.log('✅ Content matches original JSON!');
            } else {
                console.error('❌ Content mismatch!');
                console.log('Original:', originalJsonString.substring(0, 100));
                console.log('Downloaded:', downloadedJsonString.substring(0, 100));
            }
        } catch (e) {
            console.error('❌ Failed to parse downloaded JSON:', e);
        }

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
