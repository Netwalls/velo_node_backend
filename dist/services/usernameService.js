"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameService = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
/**
 * Username utility functions for validation and availability checking
 */
class UsernameService {
    /**
     * Check if a username is available (not taken by any user)
     * @param username The username to check
     * @returns true if available, false if taken
     */
    static async isUsernameAvailable(username) {
        try {
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const existingUser = await userRepository.findOne({
                where: { username },
                select: ['id'], // Only select id for performance
            });
            return !existingUser; // Available if no user found
        }
        catch (error) {
            console.error('Username availability check error:', error);
            return false; // Assume not available on error for safety
        }
    }
    /**
     * Check if a username is available for a specific user (excluding their current username)
     * @param username The username to check
     * @param excludeUserId The user ID to exclude from the check (current user)
     * @returns true if available, false if taken
     */
    static async isUsernameAvailableForUser(username, excludeUserId) {
        try {
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const existingUser = await userRepository
                .createQueryBuilder('user')
                .where('user.username = :username', { username })
                .andWhere('user.id != :excludeUserId', { excludeUserId })
                .getOne();
            return !existingUser; // Available if no other user found
        }
        catch (error) {
            console.error('Username availability check error:', error);
            return false; // Assume not available on error for safety
        }
    }
    /**
     * Validate username format
     * @param username The username to validate
     * @returns object with isValid boolean and error message if invalid
     */
    static validateUsernameFormat(username) {
        // Check length
        if (username.length < 3 || username.length > 30) {
            return {
                isValid: false,
                error: 'Username must be between 3 and 30 characters long',
            };
        }
        // Check format (alphanumeric and underscores only)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return {
                isValid: false,
                error: 'Username can only contain letters, numbers, and underscores',
            };
        }
        // Check that it doesn't start or end with underscore
        if (username.startsWith('_') || username.endsWith('_')) {
            return {
                isValid: false,
                error: 'Username cannot start or end with an underscore',
            };
        }
        // Check for consecutive underscores
        if (username.includes('__')) {
            return {
                isValid: false,
                error: 'Username cannot contain consecutive underscores',
            };
        }
        // Check for reserved usernames
        const reservedUsernames = [
            'admin',
            'administrator',
            'root',
            'support',
            'help',
            'api',
            'www',
            'mail',
            'ftp',
            'localhost',
            'velo',
            'system',
            'test',
            'demo',
            'user',
            'guest',
            'null',
            'undefined',
            'true',
            'false',
        ];
        if (reservedUsernames.includes(username.toLowerCase())) {
            return {
                isValid: false,
                error: 'This username is reserved and cannot be used',
            };
        }
        return { isValid: true };
    }
    /**
     * Generate username suggestions based on name
     * @param firstName User's first name
     * @param lastName User's last name
     * @returns array of suggested usernames
     */
    static async generateUsernameSuggestions(firstName, lastName) {
        const suggestions = [];
        if (firstName && lastName) {
            const baseNames = [
                `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
                `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
                `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}`,
                `${firstName.toLowerCase().charAt(0)}${lastName.toLowerCase()}`,
            ];
            for (const baseName of baseNames) {
                // Add base name
                suggestions.push(baseName);
                // Add variations with numbers
                for (let i = 1; i <= 99; i++) {
                    suggestions.push(`${baseName}${i}`);
                    if (suggestions.length >= 10)
                        break;
                }
                if (suggestions.length >= 10)
                    break;
            }
        }
        else if (firstName) {
            const baseName = firstName.toLowerCase();
            suggestions.push(baseName);
            for (let i = 1; i <= 99; i++) {
                suggestions.push(`${baseName}${i}`);
                if (suggestions.length >= 10)
                    break;
            }
        }
        // Filter only available suggestions
        const availableSuggestions = [];
        for (const suggestion of suggestions) {
            if (this.validateUsernameFormat(suggestion).isValid) {
                const isAvailable = await this.isUsernameAvailable(suggestion);
                if (isAvailable) {
                    availableSuggestions.push(suggestion);
                }
            }
            if (availableSuggestions.length >= 5)
                break;
        }
        return availableSuggestions;
    }
}
exports.UsernameService = UsernameService;
//# sourceMappingURL=usernameService.js.map