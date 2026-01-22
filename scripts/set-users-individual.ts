import { AppDataSource } from "../src/config/database";

async function setUsersAsIndividual() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log("Database connected successfully");

    // Update all users with NULL userType to 'individual'
    const result = await AppDataSource.query(`
      UPDATE users 
      SET "userType" = 'individual' 
      WHERE "userType" IS NULL
    `);

    console.log("Users updated:", result);

    // Also update any empty string values
    const result2 = await AppDataSource.query(`
      UPDATE users 
      SET "userType" = 'individual' 
      WHERE "userType" = ''
    `);

    console.log("Users with empty userType updated:", result2);

    // Show count of users by type
    const counts = await AppDataSource.query(`
      SELECT "userType", COUNT(*) as count 
      FROM users 
      GROUP BY "userType"
    `);

    console.log("\nUser counts by type:");
    console.table(counts);

    await AppDataSource.destroy();
    console.log("\nDatabase connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error updating users:", error);
    process.exit(1);
  }
}

setUsersAsIndividual();
