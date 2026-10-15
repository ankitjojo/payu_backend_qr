import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';

import { paymentRoutes } from './api/routes/payment.routes';
import { errorMiddleware } from './middlewares/error.middleware';

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

// Error handling middleware (should be last)
app.use(errorMiddleware);

