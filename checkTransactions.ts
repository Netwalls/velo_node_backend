// checkTransactions.ts
import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { FiatTransaction } from './src/entities/FiatTransaction';

async function main() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connected successfully!');

    // Fetch the 10 most recent transactions
    const transactions = await AppDataSource.getRepository(FiatTransaction).find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    console.log('Last 10 FiatTransactions:');
    console.table(transactions);

  } catch (error) {
    console.error('Error fetching transactions:', error);
  } finally {
    // Close the database connection
    await AppDataSource.destroy();
  }
}

// Run the script
main();
