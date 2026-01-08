"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_1 = require("./config/swagger");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const env_1 = require("../../../shared/config/env");
const database_1 = require("./config/database");
const database_2 = require("../../../shared/config/database");
const airtimeRoute_1 = __importDefault(require("./routes/airtimeRoute"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: env_1.env.NODE_ENV === 'production'
        ? ['https://yourapp.com', 'https://app.yourapp.com']
        : '*',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, morgan_1.default)('dev'));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/airtime', limiter);
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'airtime-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.use('/api/airtime', airtimeRoute_1.default);
(0, swagger_1.setupSwagger)(app);
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
const PORT = process.env.AIRTIME_PORT || 4004; // Different port than Auth (4000)
async function startServer() {
    try {
        await (0, database_2.connectDB)(database_1.AppDataSource);
        app.listen(PORT, () => {
            console.log('AIRTIME-SERVICE RUNNING');
            console.log(`Port: ${PORT}`);
            console.log(`Health: http://localhost:${PORT}/health`);
            console.log(`Docs: http://localhost:${PORT}/api-docs`);
        });
    }
    catch (error) {
        console.error('Failed to start airtime-service:', error);
        process.exit(1);
    }
}
startServer();
