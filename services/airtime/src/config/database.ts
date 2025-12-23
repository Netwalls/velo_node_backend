import { createDataSource } from '../../../../shared/config/database';
import { User } from '../entities/User';
import { AirtimePurchase } from '../entities/AirtimePurchase';

export const AppDataSource = createDataSource([User, AirtimePurchase]);
