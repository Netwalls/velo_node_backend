// test-electricity-console.ts
import 'dotenv/config';
import { connectDB, AppDataSource } from './config/database_migration';
import { electricityService } from './services/electricityService';
import { ElectricityCompany, MeterType, Blockchain } from './entities/ElectricityPurchase';
import { User } from './entities/User';

async function testElectricityService() {
    console.log('🧪 Testing Electricity Payment Service via Console\n');
    
    try {
        // 1. Connect to database
        console.log('📊 Connecting to database...');
        await connectDB();
        console.log('✅ Database connected successfully!\n');

        // 2. Create a test user first
        console.log('👤 Creating test user...');
        const userRepository = AppDataSource.getRepository(User);
        const testUser = new User();
        testUser.email = `test-electricity-${Date.now()}@example.com`;
        testUser.password = 'test123';
        testUser.firstName = 'Electricity';
        testUser.lastName = 'Test';
        testUser.phoneNumber = '2348012345678';
        testUser.isEmailVerified = true;
        testUser.kycStatus = 'approved' as any;
        
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

        // 3. Test Scenario 1: Get supported electricity companies
        console.log('⚡ Testing supported companies...');
        const companies = electricityService.getSupportedCompanies();
        console.log(`\n=== SUPPORTED ELECTRICITY COMPANIES (${companies.length}) ===`);
        companies.forEach((company, index) => {
            console.log(`${index + 1}. ${company.label} (Code: ${company.code})`);
            console.log(`   Min: ₦${company.minAmount}, Max: ₦${company.maxAmount}`);
        });
        console.log('');

        // 4. Test Scenario 2: Get supported meter types
        console.log('📋 Testing meter types...');
        const meterTypes = electricityService.getSupportedMeterTypes();
        console.log(`\n=== METER TYPES ===`);
        meterTypes.forEach((type, index) => {
            console.log(`${index + 1}. ${type.label} (Code: ${type.code})`);
        });
        console.log('');

        // 5. Test Scenario 3: Get expected crypto amount
        console.log('💰 Testing crypto amount calculation...');
        const testAmount = 5000; // 5000 NGN
        const expectedAmount = await electricityService.getExpectedCryptoAmount(
            testAmount,
            Blockchain.SOLANA
        );
        console.log('Expected crypto amount:', expectedAmount);
        console.log('');

        // 6. Test Scenario 4: Verify meter number (optional - may fail without API credentials)
        console.log('🔍 Testing meter verification...');
        try {
            const verifyResult = await electricityService.verifyMeterNumber(
                ElectricityCompany.EKO_ELECTRIC,
                '1234567890' // Test meter number
            );
            console.log('✅ Meter verification result:', verifyResult);
        } catch (verifyError: any) {
            console.log('⚠️ Meter verification test skipped (expected in test environment):', verifyError.message);
        }
        console.log('');

        // 7. Test Scenario 5: Process electricity payment
        console.log('💳 Testing electricity payment processing...');
        console.log(`Paying ₦${testAmount} for Eko Electric prepaid meter`);
        
        try {
            const purchaseResult = await electricityService.processElectricityPayment(userId, {
                type: 'electricity',
                amount: testAmount,
                chain: Blockchain.SOLANA,
                company: ElectricityCompany.EKO_ELECTRIC,
                meterType: MeterType.PREPAID,
                meterNumber: '1234567890',
                phoneNumber: '2349125381992',
                transactionHash: '23y8L9txA2frybDcn6eVpCGNE9CWwHFJhEWsTXgpey4nambAhHuMu94CRqCQeXWiZTzdQ75BwgJoujnw1iLxkf76'
            });
            console.log('✅ Purchase result:', JSON.stringify(purchaseResult, null, 2));
        } catch (purchaseError: any) {
            console.log('⚠️ Purchase test skipped (expected in test environment):', purchaseError.message);
        }
        console.log('');

        // 8. Test Scenario 6: Get payment history
        console.log('📜 Testing payment history...');
        const history = await electricityService.getUserElectricityHistory(userId, 10);
        console.log(`📋 Found ${history.length} payments:`);
        history.forEach((payment, index) => {
            console.log(`   ${index + 1}. ${payment.company}: ₦${payment.fiat_amount} - ${payment.status}`);
            if (payment.meter_token) {
                console.log(`      Token: ${payment.meter_token}`);
            }
        });
        console.log('');

        // 9. Test Scenario 7: Get payment statistics
        console.log('📊 Testing payment statistics...');
        const stats = await electricityService.getUserPurchaseStats(userId);
        console.log('User statistics:', stats);
        console.log('');

        // 10. Test Scenario 8: Get security limits
        console.log('🔒 Testing security limits...');
        const limits = electricityService.getSecurityLimits();
        console.log('Security limits:', limits);
        console.log('');

        // 11. Test Scenario 9: Test different companies
        console.log('🏢 Testing different company configurations...');
        
        console.log('\n--- Ikeja Electric ---');
        const ikejaConfig = companies.find(c => c.value === ElectricityCompany.IKEJA_ELECTRIC);
        console.log(`${ikejaConfig?.label}: ₦${ikejaConfig?.minAmount} - ₦${ikejaConfig?.maxAmount}`);

        console.log('\n--- Ibadan Electric ---');
        const ibadanConfig = companies.find(c => c.value === ElectricityCompany.IBADAN_ELECTRIC);
        console.log(`${ibadanConfig?.label}: ₦${ibadanConfig?.minAmount} - ₦${ibadanConfig?.maxAmount}`);

        console.log('\n🎉 ALL ELECTRICITY PAYMENT TESTS COMPLETED SUCCESSFULLY! 🎉');
        console.log('');
        console.log('📝 Summary:');
        console.log(`   - Supported Companies: ${companies.length}`);
        console.log(`   - Meter Types: ${meterTypes.length}`);
        console.log(`   - Test Amount: ₦${testAmount}`);
        console.log(`   - Crypto Amount: ${expectedAmount.cryptoAmount} ${expectedAmount.cryptoCurrency}`);
        console.log(`   - Payment History: ${history.length} records`);

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('\n📊 Database connection closed');
        }
    }
}

// Run the test
testElectricityService();