import { Router, Request, Response } from 'express';
import { uploadToStorage, downloadFromStorage } from '../services/synapse.js';
import { savePostHash } from '../services/mongodb.js';

const router = Router();

/**
 * POST /api/upload
 * Upload JSON metadata
 * 
 * Body (application/json):
 * - JSON object containing metadata (including signature field)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get JSON body directly
    const jsonContent = req.body;

    if (!jsonContent || typeof jsonContent !== 'object') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON body provided',
      });
    }

    // Extract signature from JSON (if present)
    const signature = jsonContent.signature || '';

    // Prepare metadata object from the JSON content
    // Include all top-level fields from the JSON as metadata
    const metadata: Record<string, any> = {
      uploadedAt: new Date().toISOString(),
    };

    // Add signature to metadata if present
    if (signature) {
      metadata.signature = signature;
    }

    // Include other metadata fields from the JSON (excluding signature which is already added)
    // Store the full JSON structure for reference
    if (jsonContent.data) {
      metadata.data = jsonContent.data;
    }

    // Add any other top-level fields from the JSON
    Object.keys(jsonContent).forEach(key => {
      if (key !== 'signature' && key !== 'data') {
        metadata[key] = jsonContent[key];
      }
    });

    // Convert JSON to string and then to Uint8Array for storage
    const jsonString = JSON.stringify(jsonContent);
    const fileData = new Uint8Array(Buffer.from(jsonString, 'utf-8'));

    // Upload to Filecoin storage
    const result = await uploadToStorage(fileData, metadata);

    console.log('result:', JSON.stringify(result, null, 2));

    // Save hash to MongoDB after successful upload
    try {
      await savePostHash(result.pieceCid, {
        size: result.size,
        ...metadata,
      });
    } catch (mongoError: any) {
      // Log MongoDB error but don't fail the upload response
      // The file was successfully uploaded to Filecoin
      console.error('Failed to save hash to MongoDB:', mongoError);
    }

    res.status(200).json({
      status: 'success',
      data: {
        pieceCid: result.pieceCid,
        size: result.size,
        metadata,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upload file',
    });
  }
});

/**
 * GET /api/upload/:pieceCid
 * Download a JSON metadata file by PieceCID
 */
router.get('/:pieceCid', async (req: Request, res: Response) => {
  try {
    const { pieceCid } = req.params;

    if (!pieceCid) {
      return res.status(400).json({
        status: 'error',
        message: 'PieceCID is required',
      });
    }

    // Download from Filecoin storage
    const data = await downloadFromStorage(pieceCid);

    // Set appropriate headers for JSON file
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${pieceCid}.json"`);
    res.setHeader('Content-Length', data.length.toString());

    // Send the file data
    res.send(Buffer.from(data));
  } catch (error: any) {
    console.error('Download error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to download file',
    });
  }
});

export default router;

