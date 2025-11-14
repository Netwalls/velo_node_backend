// test-airtime-console.ts
import "dotenv/config";
import { connectDB, AppDataSource } from "./config/database";
import { airtimeService } from "./services/airtimeService";
import { MobileNetwork, Blockchain } from "./entities/AirtimePurchase";
import { User } from "./entities/User";

async function testAirtimeService() {
  console.log("🧪 Testing Airtime Service via Console\n");

  try {
    // 1. Connect to database
    console.log("📊 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected successfully!\n");

    // 2. Create a test user first
    console.log("👤 Creating test user...");
    const userRepository = AppDataSource.getRepository(User);
    const testUser = new User();
    testUser.email = `test-console-${Date.now()}@example.com`;
    testUser.password = "test123";
    testUser.firstName = "Console";
    testUser.lastName = "Test";
    testUser.phoneNumber = "2348012345678";
    testUser.isEmailVerified = true;

    // USE CORRECT KYC STATUS: 'pending', 'approved', or 'rejected'
    testUser.kycStatus = "approved" as any; // ✅ CORRECT VALUE

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
      throw new Error("Failed to create user - no ID generated");
    }

    const userId = testUser.id;
    console.log(`✅ Test user created with ID: ${userId}\n`);

    // 3. Test Scenario 1: Get expected crypto amount
    console.log("💰 Testing crypto amount calculation...");
    const expectedAmount = await airtimeService.getExpectedCryptoAmount(
      1000,
      Blockchain.BITCOIN
    );
    console.log("Expected crypto amount:", expectedAmount);
    console.log("");
    console.log("🛒 Testing airtime purchase processing...");
    const purchaseResult = await airtimeService.processAirtimePurchase(userId, {
      type: "airtime",
      amount: 1000,
      chain: Blockchain.BITCOIN,
      phoneNumber: "2349125381992",
      mobileNetwork: MobileNetwork.AIRTEL,
      transactionHash:
        "69a72e1268d86f5e36ebdbbe05dd8212ce873227aeae7462a363d55abddbffad",
    });
    console.log("✅ Purchase result:", JSON.stringify(purchaseResult, null, 2));
    console.log("");

    // 5. Test Scenario 3: Get purchase history
    console.log("📜 Testing purchase history...");
    const history = await airtimeService.getUserAirtimeHistory(userId, 5);
    console.log(`📋 Found ${history.length} purchases:`);
    history.forEach((purchase, index) => {
      console.log(
        `   ${index + 1}. ${purchase.network}: ${purchase.fiat_amount} NGN - ${
          purchase.status
        }`
      );
    });

    console.log("🎉 ALL CONSOLE TESTS COMPLETED SUCCESSFULLY! 🎉");
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack trace:", error.stack);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log("\n📊 Database connection closed");
    }
  }
}

// Run the test
testAirtimeService();
