"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-airtime-console.ts
require("dotenv/config");
const database_1 = require("./src/config/database");
const airtimeService_1 = require("./src/services/airtimeService");
const AirtimePurchase_1 = require("./src/entities/AirtimePurchase");
const User_1 = require("./src/entities/User");
async function testAirtimeService() {
    console.log('🧪 Testing Airtime Service via Console\n');
    try {
        // 1. Connect to database
        console.log('📊 Connecting to database...');
        await (0, database_1.connectDB)();
        console.log('✅ Database connected successfully!\n');
        // 2. Create a test user first
        console.log('👤 Creating test user...');
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const testUser = new User_1.User();
        testUser.email = `test-console-${Date.now()}@example.com`;
        testUser.password = 'test123';
        testUser.firstName = 'Console';
        testUser.lastName = 'Test';
        testUser.phoneNumber = '2348012345678';
        testUser.isEmailVerified = true;
        // USE CORRECT KYC STATUS: 'pending', 'approved', or 'rejected'
        testUser.kycStatus = 'approved'; // ✅ CORRECT VALUE
        // Set default balances
        testUser.usdtBalance = 10;
        testUser.ethBalance = 1;
        testUser.strkBalance = 100;
        testUser.solBalance = 5;
        testUser.btcBalance = 0.1;
        testUser.xlmBalance = 1000;
        testUser.dotBalance = 50;
        await userRepository.save(testUser);
        // TYPE-SAFE: Ensure we have a valid user ID
        if (!testUser.id) {
            throw new Error('Failed to create user - no ID generated');
        }
        const userId = testUser.id;
        console.log(`✅ Test user created with ID: ${userId}\n`);
        // 3. Test Scenario 1: Get expected crypto amount
        console.log('💰 Testing crypto amount calculation...');
        const expectedAmount = await airtimeService_1.airtimeService.getExpectedCryptoAmount(1000, AirtimePurchase_1.Blockchain.SOLANA);
        console.log('Expected crypto amount:', expectedAmount);
        console.log('');
        // 4. Test Scenario 2: Process airtime purchase
        console.log('🛒 Testing airtime purchase processing...');
        const purchaseResult = await airtimeService_1.airtimeService.processAirtimePurchase(userId, {
            type: 'airtime',
            amount: 50,
            chain: AirtimePurchase_1.Blockchain.SOLANA,
            phoneNumber: '2349125381992',
            mobileNetwork: AirtimePurchase_1.MobileNetwork.AIRTEL,
            transactionHash: '5J3wXxpMXH2Q9YyYWehHf7Cu415R441QadK4NBnrxiS93Az4JD6FTbKCQdwVW6bJy3ieo7h4MFQiSsH87Ed3rogx'
        });
        console.log('✅ Purchase result:', JSON.stringify(purchaseResult, null, 2));
        console.log('');
        // 5. Test Scenario 3: Get purchase history
        console.log('📜 Testing purchase history...');
        const history = await airtimeService_1.airtimeService.getUserAirtimeHistory(userId, 5);
        console.log(`📋 Found ${history.length} purchases:`);
        history.forEach((purchase, index) => {
            console.log(`   ${index + 1}. ${purchase.network}: ${purchase.fiat_amount} NGN - ${purchase.status}`);
        });
        console.log('🎉 ALL CONSOLE TESTS COMPLETED SUCCESSFULLY! 🎉');
    }
    catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
    finally {
        if (database_1.AppDataSource.isInitialized) {
            await database_1.AppDataSource.destroy();
            console.log('\n📊 Database connection closed');
        }
    }
}
// Run the test
testAirtimeService();
//# sourceMappingURL=test-airtime.js.map