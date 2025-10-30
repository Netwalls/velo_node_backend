/**
 * End-to-End Test for Multi-Currency to USDT Conversion
 *
 * This script demonstrates the complete workflow:
 * 1. User pays with ETH
 * 2. System detects payment
 * 3. Converts ETH to USDT
 * 4. Transfers USDT to user's address
 * 5. Updates balance
 */
export declare class E2ETestRunner {
    /**
     * Run end-to-end test for conversion workflow
     */
    static runConversionTest(userId: string): Promise<void>;
    /**
     * Test manual conversion workflow
     */
    static runManualConversionTest(userId: string): Promise<void>;
    /**
     * Test price feed service
     */
    static runPriceFeedTest(): Promise<void>;
}
export default E2ETestRunner;
//# sourceMappingURL=e2eTest.d.ts.map