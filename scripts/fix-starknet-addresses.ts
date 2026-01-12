/**
 * Migration script to fix unpadded Starknet addresses in the database.
 * Adds missing leading zeros to ensure all addresses are properly padded
 * to 66 characters (0x + 64 hex chars).
 *
 * Usage: npx ts-node scripts/fix-starknet-addresses.ts
 *
 * This script reads DATABASE_URL from environment variables and connects to PostgreSQL
 */

import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "../src/config/database";
import { UserAddress } from "../src/entities/UserAddress";
import { ChainType } from "../src/types";

async function padAddress(address: string | undefined): Promise<string> {
  if (!address || !address.startsWith("0x")) return address || "";
  return "0x" + address.slice(2).padStart(64, "0");
}

async function main() {
  try {
    console.log("🔧 Connecting to PostgreSQL database...");
    console.log(
      `📍 Database URL: ${process.env.DATABASE_URL?.replace(
        /:[^:]*@/,
        ":***@"
      )}`
    );

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const addressRepo = AppDataSource.getRepository(UserAddress);

    console.log("🔍 Finding all Starknet addresses...");
    const starknetAddresses = await addressRepo.find({
      where: { chain: ChainType.STARKNET },
    });

    console.log(`Found ${starknetAddresses.length} Starknet addresses`);

    if (starknetAddresses.length === 0) {
      console.log("✨ No Starknet addresses found in database");
      return;
    }

    let fixedCount = 0;
    let noChangeCount = 0;

    for (const addr of starknetAddresses) {
      const originalAddress = addr.address;
      const paddedAddress = await padAddress(originalAddress);

      if (originalAddress !== paddedAddress && paddedAddress) {
        console.log(`\n✏️  Fixing address:`);
        console.log(`   Before: ${originalAddress}`);
        console.log(`   After:  ${paddedAddress}`);
        console.log(`   User:   ${addr.userId}`);
        console.log(`   Network: ${addr.network}`);

        addr.address = paddedAddress;
        await addressRepo.save(addr);
        fixedCount++;
      } else {
        noChangeCount++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Fixed: ${fixedCount} addresses`);
    console.log(`   Already correct: ${noChangeCount} addresses`);

    if (fixedCount > 0) {
      console.log(
        `\n🎉 Successfully fixed ${fixedCount} Starknet address(es)!`
      );
    } else {
      console.log(`\n✨ All Starknet addresses are already properly padded!`);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

main();
