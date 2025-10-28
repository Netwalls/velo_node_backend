"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = exports.createUserIfNotExists = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const createUserIfNotExists = async (email, password) => {
    const repo = database_1.AppDataSource.getRepository(User_1.User);
    const existing = await repo.findOne({ where: { email } });
    if (existing)
        return null;
    const user = repo.create({ email, password });
    await repo.save(user);
    return user;
};
exports.createUserIfNotExists = createUserIfNotExists;
const findUserByEmail = async (email) => {
    const repo = database_1.AppDataSource.getRepository(User_1.User);
    return await repo.findOne({ where: { email } });
};
exports.findUserByEmail = findUserByEmail;
