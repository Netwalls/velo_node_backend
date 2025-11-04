// debug-user-enum.ts
import 'dotenv/config';
import { connectDB, AppDataSource } from './src/config/database';
import { User } from './src/entities/User';

async function debugUserEnum() {
    console.log('🔍 Debugging User KYC Status Enum\n');
    
    try {
        await connectDB();
        
        // Get the User entity metadata
        const userMetadata = AppDataSource.getMetadata(User);
        const kycStatusColumn = userMetadata.columns.find(col => col.propertyName === 'kycStatus');
        
        if (kycStatusColumn && kycStatusColumn.enum) {
            console.log('📋 KYC Status Enum Values:');
            console.log(kycStatusColumn.enum);
        } else {
            console.log('❌ KYC Status column not found or not an enum');
        }
        
        // Also check the database enum values
        console.log('\n📊 Checking database enum values...');
        const result = await AppDataSource.query(`
            SELECT e.enumlabel AS value 
            FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'users_kycstatus_enum'
        `);
        console.log('Database enum values:', result.map((r: any) => r.value));
        
        await AppDataSource.destroy();
        
    } catch (error: any) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugUserEnum();