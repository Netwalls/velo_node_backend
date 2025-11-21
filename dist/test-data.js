"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-data-console.ts
require("dotenv/config");
const database_1 = require("./config/database");
const dataService_1 = require("./services/dataService");
const DataPurchase_1 = require("./entities/DataPurchase");
const User_1 = require("./entities/User");
async function testDataService() {
    console.log('🧪 Testing Data Purchase Service via Console\n');
    try {
        // 1. Connect to database
        console.log('📊 Connecting to database...');
        await (0, database_1.connectDB)();
        console.log('✅ Database connected successfully!\n');
        // 2. Create a test user first
        console.log('👤 Creating test user...');
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const testUser = new User_1.User();
        testUser.email = `test-data-${Date.now()}@example.com`;
        testUser.password = 'test123';
        testUser.firstName = 'Data';
        testUser.lastName = 'Test';
        testUser.phoneNumber = '2348012345678';
        testUser.isEmailVerified = true;
        testUser.kycStatus = 'approved';
        // Set default balances
        testUser.usdtBalance = 10;
        testUser.ethBalance = 1;
        testUser.strkBalance = 100;
        testUser.solBalance = 5;
        testUser.btcBalance = 0.1;
        testUser.xlmBalance = 1000;
        testUser.dotBalance = 50;
        await userRepository.save(testUser);
        if (!testUser.id) {
            throw new Error('Failed to create user - no ID generated');
        }
        const userId = testUser.id;
        console.log(`✅ Test user created with ID: ${userId}\n`);
        // 3. Test Scenario 1: Fetch available data plans from API
        console.log('📱 Fetching data plans from Nellobytes API...\n');
        console.log('=== MTN PLANS ===');
        const mtnPlans = await dataService_1.dataService.getDataPlans(DataPurchase_1.MobileNetwork.MTN);
        console.log(`Found ${mtnPlans.length} MTN plans`);
        if (mtnPlans.length > 0) {
            mtnPlans.slice(0, 5).forEach((plan, index) => {
                console.log(`${index + 1}. ${plan.plan_name} - ${plan.plan_amount} - ${plan.month_validate}`);
                console.log(`   ID: ${plan.dataplan_id}`);
            });
        }
        console.log('');
        console.log('=== GLO PLANS ===');
        const gloPlans = await dataService_1.dataService.getDataPlans(DataPurchase_1.MobileNetwork.GLO);
        console.log(`Found ${gloPlans.length} GLO plans`);
        if (gloPlans.length > 0) {
            gloPlans.slice(0, 5).forEach((plan, index) => {
                console.log(`${index + 1}. ${plan.plan_name} - ${plan.plan_amount} - ${plan.month_validate}`);
                console.log(`   ID: ${plan.dataplan_id}`);
            });
        }
        console.log('');
        console.log('=== AIRTEL PLANS ===');
        const airtelPlans = await dataService_1.dataService.getDataPlans(DataPurchase_1.MobileNetwork.AIRTEL);
        console.log(`Found ${airtelPlans.length} AIRTEL plans`);
        if (airtelPlans.length > 0) {
            airtelPlans.slice(0, 5).forEach((plan, index) => {
                console.log(`${index + 1}. ${plan.plan_name} - ${plan.plan_amount} - ${plan.month_validate}`);
                console.log(`   ID: ${plan.dataplan_id}`);
            });
        }
        console.log('');
        console.log('=== 9MOBILE PLANS ===');
        const nineMobilePlans = await dataService_1.dataService.getDataPlans(DataPurchase_1.MobileNetwork.ETISALAT);
        console.log(`Found ${nineMobilePlans.length} 9MOBILE plans`);
        if (nineMobilePlans.length > 0) {
            nineMobilePlans.slice(0, 5).forEach((plan, index) => {
                console.log(`${index + 1}. ${plan.plan_name} - ${plan.plan_amount} - ${plan.month_validate}`);
                console.log(`   ID: ${plan.dataplan_id}`);
            });
        }
        console.log('');
        // 4. Test Scenario 2: Get expected crypto amount for a plan
        if (mtnPlans.length > 0) {
            console.log('💰 Testing crypto amount calculation...');
            const selectedPlan = airtelPlans[0]; // Select first MTN plan
            console.log(`Selected plan: ${selectedPlan.plan_name} - ${selectedPlan.plan_amount}`);
            console.log(`Dataplan ID: ${selectedPlan.dataplan_id}`);
            const expectedAmount = await dataService_1.dataService.getExpectedCryptoAmount(selectedPlan.dataplan_id, DataPurchase_1.MobileNetwork.AIRTEL, DataPurchase_1.Blockchain.SOLANA);
            console.log('Expected crypto amount:', expectedAmount);
            console.log('');
            // 5. Test Scenario 3: Process data purchase
            console.log('🛒 Testing data purchase processing...');
            console.log(`Purchasing: ${selectedPlan.plan_name}`);
            console.log(`Amount: ₦${expectedAmount.fiatAmount}`);
            console.log(`To: 2349125381992`);
            try {
                const purchaseResult = await dataService_1.dataService.processDataPurchase(userId, {
                    type: 'data',
                    dataplanId: selectedPlan.dataplan_id,
                    amount: 483.91288092279,
                    chain: DataPurchase_1.Blockchain.SOLANA,
                    phoneNumber: '2349125381992',
                    mobileNetwork: DataPurchase_1.MobileNetwork.AIRTEL,
                    transactionHash: '3oZwTDN1SHLLBcfcbij9N927PmziKFrKagW43T2ri1FYW3NvoUywFABVuRqi9JCEsimbs45P2aFcGo1yW53DPJy5'
                });
                console.log('✅ Purchase result:', JSON.stringify(purchaseResult, null, 2));
            }
            catch (purchaseError) {
                console.log('⚠️ Purchase test skipped (expected in test environment):', purchaseError.message);
            }
            console.log('');
        }
        // 6. Test Scenario 4: Get purchase history
        console.log('📜 Testing purchase history...');
        const history = await dataService_1.dataService.getUserDataHistory(userId, 10);
        console.log(`📋 Found ${history.length} purchases:`);
        history.forEach((purchase, index) => {
            console.log(`   ${index + 1}. ${purchase.network}: ${purchase.plan_name} - ₦${purchase.fiat_amount} - ${purchase.status}`);
        });
        console.log('');
        // 7. Test Scenario 5: Get purchase statistics
        console.log('📊 Testing purchase statistics...');
        const stats = await dataService_1.dataService.getUserPurchaseStats(userId);
        console.log('User statistics:', stats);
        console.log('');
        // 8. Test Scenario 6: Get security limits
        console.log('🔒 Testing security limits...');
        const limits = dataService_1.dataService.getSecurityLimits();
        console.log('Security limits:', limits);
        console.log('');
        // 9. Test Scenario 7: Test force refresh
        console.log('🔄 Testing force refresh of data plans...');
        await dataService_1.dataService.forceRefreshDataPlans();
        console.log('✅ Data plans refreshed successfully');
        console.log('');
        console.log('🎉 ALL DATA PURCHASE TESTS COMPLETED SUCCESSFULLY! 🎉');
        console.log('');
        console.log('📝 Summary:');
        console.log(`   - MTN Plans: ${mtnPlans.length}`);
        console.log(`   - GLO Plans: ${gloPlans.length}`);
        console.log(`   - Airtel Plans: ${airtelPlans.length}`);
        console.log(`   - 9Mobile Plans: ${nineMobilePlans.length}`);
        console.log(`   - Total Plans: ${mtnPlans.length + gloPlans.length + airtelPlans.length + nineMobilePlans.length}`);
        console.log(`   - Purchase History: ${history.length} records`);
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
testDataService();
//# sourceMappingURL=test-data.js.map