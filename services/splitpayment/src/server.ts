import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import splitPaymentRoutes from './routes/splitPaymentRoutes';
import { connectDB } from './config/database';
import { swaggerSpec } from './config/swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Database Connection
connectDB();

const secret = process.env.JWT_SECRET || 'your-secret-key';
console.log(`[Config] JWT_SECRET configured: ${secret.substring(0, 5)}...`);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
    },
}));

// Routes
app.use('/api/splitpayment', splitPaymentRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'splitpayment-service' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Split Payment Service running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

export default app;