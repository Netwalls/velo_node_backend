// services/auth-service/src/config/database.ts
import { createDataSource } from '../../../../shared/config/database';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';

export const AppDataSource = createDataSource([User, RefreshToken]);