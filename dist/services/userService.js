"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserIfNotExists = createUserIfNotExists;
exports.saveUserAddresses = saveUserAddresses;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const UserAddress_1 = require("../entities/UserAddress");
async function createUserIfNotExists(email, password) {
    const userRepository = database_1.AppDataSource.getRepository(User_1.User);
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser)
        return null;
    const user = userRepository.create({ email, password });
    await userRepository.save(user);
    return user;
}
async function saveUserAddresses(user, addresses) {
    const addressRepo = database_1.AppDataSource.getRepository(UserAddress_1.UserAddress);
    for (const addr of addresses) {
        try {
            await addressRepo.save({ ...addr, user, userId: user.id });
            console.log('[DEBUG] Saved address:', { ...addr, userId: user.id });
        }
        catch (err) {
            console.error('[DEBUG] Failed to save address:', { ...addr, userId: user.id }, err);
        }
    }
    return addressRepo.find({ where: { userId: user.id } });
}
//# sourceMappingURL=userService.js.map