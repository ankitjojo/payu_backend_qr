import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';

import { paymentRoutes } from './api/routes/payment.routes';
import { subscriptionRoutes } from './api/routes/subscription.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { decryptJojoResponse, isJojoDecryptionConfigured } from './utils/jojo-decrypt.util';

export const app: Application = express();

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets (CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// Render the EJS UI
app.get('/', (req: Request, res: Response) => {
  res.render('index');
});

// Success/Failure pages (redirected to after PayU callback)
app.get('/success', (req: Request, res: Response) => {
  res.render('success', { data: req.query });
});

app.get('/failure', (req: Request, res: Response) => {
  res.render('failure', { data: req.query });
});

// API Routes
app.use('/api/payments', paymentRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// UPI subscription S2S test page (verify mandate, pre-debit, recurring, verify payment)
app.get('/subscription-ops', (_req: Request, res: Response) => {
  res.render('subscription-ops');
});

// Jojo integration page
app.get('/jojo', (_req: Request, res: Response) => {
  res.render('jojo');
});

// Proxy: forwards Jojo API calls to localhost:8000 to avoid CORS issues in the browser
app.post('/api/jojo/initiate-payment', async (req: Request, res: Response) => {
  const { headers: fwdHeaders = {}, body: fwdBody = {} } = req.body ?? {};
  try {
    const response = await axios.post(
      'http://localhost:8000/user/initiate-factory-payment',
      fwdBody,
      {
        headers: {
          'Content-Type': 'application/json',
          ...fwdHeaders,
        },
        timeout: 15000,
      },
    );

    const raw = response.data;

    // If the response is an encrypted envelope {"data":"<hex>"}, decrypt it
    if (raw && typeof raw === 'object' && typeof raw.data === 'string' && /^[0-9a-f]+$/i.test(raw.data)) {
      const result = decryptJojoResponse(raw.data);
      return res.status(response.status).json({
        _encrypted: raw.data,
        _decrypted: result.ok ? result.json : null,
        _decryptError: result.ok ? undefined : result.reason,
        _decryptionConfigured: isJojoDecryptionConfigured(),
      });
    }

    return res.status(response.status).json(raw);
  } catch (err: any) {
    const status = err.response?.status ?? 502;
    const data   = err.response?.data   ?? { error: err.message };
    res.status(status).json(data);
  }
});

// Error handling middleware (should be last)
app.use(errorMiddleware);

