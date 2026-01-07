import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import crypto from 'crypto';

dotenv.config();

// FIX: Let TypeScript infer the app type from express() to avoid configuration-related typing conflicts
const app = express();

// FIX: Removed unnecessary casting to express.RequestHandler to resolve overload errors in app.use
app.use(express.json());
app.use(cors());

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const processedTransactions = new Set<string>();
const pendingTransactions = new Map<string, number>();

// FIX: Use correctly imported Request and Response types from express package
app.post('/api/payments/initialize', async (req: Request, res: Response) => {
  const { email, amount, userId } = req.body;

  if (!email || !amount || !userId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: email, amount, or userId.' 
    });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ 
      success: false, 
      message: 'Amount must be a positive number.' 
    });
  }

  try {
    const amountInKobo = Math.round(amount * 100);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amountInKobo,
        callback_url: `${FRONTEND_URL}/payment-success`, 
        metadata: {
          userId,
          custom_fields: [
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: userId
            }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { authorization_url, reference } = response.data.data;
    pendingTransactions.set(reference, amountInKobo);

    return res.status(200).json({
      success: true,
      authorization_url,
      reference
    });

  } catch (error: any) {
    console.error('Paystack Initialization Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment initialization.'
    });
  }
});

// FIX: Use correctly imported Request and Response types from express package
app.get('/api/payments/verify/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Reference is required.' });
  }

  if (processedTransactions.has(reference)) {
    return res.status(200).json({ 
      success: true, 
      message: 'Transaction already processed successfully.',
      alreadyVerified: true 
    });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data.data;

    if (data.status !== 'success') {
      return res.status(400).json({ 
        success: false, 
        message: `Transaction status is ${data.status}.` 
      });
    }

    processedTransactions.add(reference);
    pendingTransactions.delete(reference);
    
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      userId: data.metadata?.userId,
      amount: data.amount / 100,
      reference: data.reference,
      paidAt: data.paid_at
    });

  } catch (error: any) {
    console.error(`[PAYMENT VERIFY] Error:`, error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during payment verification.'
    });
  }
});

// FIX: Use correctly imported Request and Response types from express package
app.post('/api/payments/webhook', async (req: Request, res: Response) => {
  const secret = PAYSTACK_SECRET_KEY || '';
  const hash = crypto.createHmac('sha512', secret)
                     .update(JSON.stringify(req.body))
                     .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('[WEBHOOK] Signature mismatch. Unauthorized access attempt.');
    return res.sendStatus(401);
  }

  const event = req.body;
  res.sendStatus(200);

  if (event.event === 'charge.success') {
    const { reference } = event.data;

    if (processedTransactions.has(reference)) {
      console.log(`[WEBHOOK] Reference ${reference} already processed. Skipping.`);
      return;
    }

    try {
      console.log(`[WEBHOOK] Verifying charge success for Ref: ${reference}`);
      const verifyRes = await axios.get(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = verifyRes.data.data;

      if (data.status === 'success') {
        processedTransactions.add(reference);
        pendingTransactions.delete(reference);
        console.log(`[WEBHOOK] Transaction ${reference} successfully logged for user ${data.metadata?.userId}`);
      }
    } catch (error: any) {
      console.error(`[WEBHOOK] Error during re-verification of ${reference}:`, error.message);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Secure Payment Backend running on port ${PORT}`);
});