#!/usr/bin/env ts-node
/*
  deleteUser.ts
  Usage: npx ts-node services/auth/scripts/deleteUser.ts <userId>
  This script initializes the auth TypeORM DataSource and deletes the user
  and related user_addresses and refresh_tokens inside a single transaction.
*/
import 'dotenv/config';
import { AppDataSource } from '../src/config/database';
import { User } from '../src/entities/User';
import { UserAddress } from '../src/entities/UserAddress';
import { RefreshToken } from '../src/entities/RefreshToken';

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npx ts-node services/auth/scripts/deleteUser.ts <userId>');
    process.exit(2);
  }

  try {
    if (!AppDataSource.isInitialized) {
      console.log('Initializing data source...');
      await AppDataSource.initialize();
      console.log('Data source initialized');
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Delete user addresses
      const addrRes = await queryRunner.manager.delete(UserAddress, { userId });
      console.log('Deleted addresses count (raw):', (addrRes as any).affected || addrRes);

      // Delete refresh tokens
      const tokRes = await queryRunner.manager.delete(RefreshToken, { userId });
      console.log('Deleted refresh tokens count (raw):', (tokRes as any).affected || tokRes);

      // Delete the user
      const userRes = await queryRunner.manager.delete(User, { id: userId });
      console.log('Deleted user count (raw):', (userRes as any).affected || userRes);

      await queryRunner.commitTransaction();
      console.log(`Successfully deleted user ${userId} and related rows (if any).`);
    } catch (err) {
      console.error('Error during deletion, rolling back:', err);
      await queryRunner.rollbackTransaction();
      process.exitCode = 1;
    } finally {
      await queryRunner.release();
      // Optionally destroy the data source
      try { await AppDataSource.destroy(); } catch (e) {}
    }
  } catch (err) {
    console.error('Failed to initialize or run deletion:', err);
    process.exitCode = 1;
  }
}

main();
