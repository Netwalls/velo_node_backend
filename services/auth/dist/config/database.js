"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.AppDataSource = void 0;
require("reflect-metadata");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const RefreshToken_1 = require("../entities/RefreshToken");
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/velo_dev',
    synchronize: process.env.NODE_ENV === 'development',
    logging: false,
    entities: [User_1.User, RefreshToken_1.RefreshToken],
});
const connectDB = async () => {
    try {
        await exports.AppDataSource.initialize();
        console.log('Auth: PostgreSQL Connected successfully');
    }
    catch (error) {
        console.error('Auth: Database connection failed:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
