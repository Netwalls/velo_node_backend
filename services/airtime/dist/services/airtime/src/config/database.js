"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const database_1 = require("../../../../shared/config/database");
const User_1 = require("../entities/User");
const AirtimePurchase_1 = require("../entities/AirtimePurchase");
exports.AppDataSource = (0, database_1.createDataSource)([User_1.User, AirtimePurchase_1.AirtimePurchase]);
