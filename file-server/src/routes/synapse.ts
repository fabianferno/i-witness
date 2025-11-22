import { Router, Request, Response } from 'express';
import {
  checkPaymentSetup,
  setupPayment,
} from '../services/synapse.js';

const router = Router();

/**
 * GET /api/synapse/payment-status
 * Check payment setup status
 */
router.get('/payment-status', async (req: Request, res: Response) => {
  try {
    const status = await checkPaymentSetup();
    res.status(200).json({
      status: 'success',
      data: status,
    });
  } catch (error: any) {
    console.error('Payment status error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to check payment status',
    });
  }
});

/**
 * POST /api/synapse/setup-payment
 * Setup payment: deposit USDFC and approve operator
 * 
 * Body (JSON):
 * - amount: Optional deposit amount in USDFC (default: 2.5)
 */
router.post('/setup-payment', async (req: Request, res: Response) => {
  try {
    const amount = req.body.amount || '2.5';

    const result = await setupPayment(amount);

    res.status(200).json({
      status: 'success',
      message: 'Payment setup completed successfully',
      data: {
        txHash: result.txHash,
        amount,
      },
    });
  } catch (error: any) {
    console.error('Payment setup error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to setup payment',
    });
  }
});

export default router;

