"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const authRoute_1 = __importDefault(require("./routes/authRoute"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.get('/health', (_req, res) => res.json({ ok: true, service: 'auth' }));
app.use('/api/auth', authRoute_1.default);
const port = process.env.PORT || 3002;
(0, database_1.connectDB)().then(() => {
    app.listen(port, () => {
        console.log(`Auth service listening on ${port}`);
    });
}).catch((err) => {
    console.error('Failed to start auth service:', err);
    process.exit(1);
});
