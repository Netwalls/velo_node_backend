/**
 * Username utility functions for validation and availability checking
 */
export declare class UsernameService {
    /**
     * Check if a username is available (not taken by any user)
     * @param username The username to check
     * @returns true if available, false if taken
     */
    static isUsernameAvailable(username: string): Promise<boolean>;
    /**
     * Check if a username is available for a specific user (excluding their current username)
     * @param username The username to check
     * @param excludeUserId The user ID to exclude from the check (current user)
     * @returns true if available, false if taken
     */
    static isUsernameAvailableForUser(username: string, excludeUserId: string): Promise<boolean>;
    /**
     * Validate username format
     * @param username The username to validate
     * @returns object with isValid boolean and error message if invalid
     */
    static validateUsernameFormat(username: string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Generate username suggestions based on name
     * @param firstName User's first name
     * @param lastName User's last name
     * @returns array of suggested usernames
     */
    static generateUsernameSuggestions(firstName?: string, lastName?: string): Promise<string[]>;
}
//# sourceMappingURL=usernameService.d.ts.map