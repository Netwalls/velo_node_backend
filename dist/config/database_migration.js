"use strict";
// Thin wrapper: re-export the canonical DB connection from `database.ts`.
// This keeps the original simple structure and prevents duplicated configs
// introduced by the recent merge.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = exports.connectDB = void 0;
const database_1 = require("./database");
Object.defineProperty(exports, "connectDB", { enumerable: true, get: function () { return database_1.connectDB; } });
Object.defineProperty(exports, "AppDataSource", { enumerable: true, get: function () { return database_1.AppDataSource; } });
//# sourceMappingURL=database_migration.js.map