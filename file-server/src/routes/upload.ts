import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadToStorage, downloadFromStorage } from '../services/synapse.js';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /api/upload
 * Upload an image file with signature metadata
 * 
 * Body (multipart/form-data):
 * - image: Image file
 * - signature: Signature string (metadata)
 */
router.post('/', (upload.single('image') as any), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided',
      });
    }

    const signature = req.body.signature || '';
    const additionalMetadata = req.body.metadata
      ? JSON.parse(req.body.metadata)
      : {};

    // Prepare metadata object
    const metadata: Record<string, string> = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
      ...additionalMetadata,
    };

    // Add signature to metadata
    if (signature) {
      metadata.signature = signature;
    }

    // Convert file buffer to Uint8Array
    const fileData = new Uint8Array(req.file.buffer);

    // Upload to Filecoin storage
    const result = await uploadToStorage(fileData, metadata);

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
 * Download an image file by PieceCID
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

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${pieceCid}"`);
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

