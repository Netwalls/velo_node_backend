import { createDataSource } from '../../../../shared/config/database';
import { AdminAuditLog } from '../entities/AdminAuditLog';
import { Blocklist } from '../entities/Blocklist';
import { SupportTicket } from '../entities/SupportTicket';
import { SystemConfig } from '../entities/SystemConfig';
import { FraudAlert } from '../entities/FraudAlert';

// Import monolith entities needed for admin operations
import { User } from '../../../../src/entities/User';
import { Transaction } from '../../../../src/entities/Transaction';
import { KYCDocument } from '../../../../src/entities/KYCDocument';
import { FiatOrder } from '../../../../src/entities/FiatOrder';
import { Notification } from '../../../../src/entities/Notification';
import { Fee } from '../../../../src/entities/Fee';
import { AirtimePurchase } from '../../../../src/entities/AirtimePurchase';
import { DataPurchase } from '../../../../src/entities/DataPurchase';
import { ElectricityPurchase } from '../../../../src/entities/ElectricityPurchase';
import { MerchantPayment } from '../../../../src/entities/MerchantPayment';
import { SplitPayment } from '../../../../src/entities/SplitPayment';
import { ProviderOrder } from '../../../../src/entities/ProviderOrder';
import { UserTransaction } from '../../../../src/entities/UserTransaction';
import { UserAddress } from '../../../../src/entities/UserAddress';
import { RefreshToken } from '../../../../src/entities/RefreshToken';
import { SplitPaymentRecipient } from '../../../../src/entities/SplitPaymentRecipient';
import { SplitPaymentExecution } from '../../../../src/entities/SplitPaymentExecution';
import { SplitPaymentExecutionResult } from '../../../../src/entities/SplitPaymentExecutionResult';

export const AppDataSource = createDataSource([
  // Admin-specific entities
  AdminAuditLog,
  Blocklist,
  SupportTicket,
  SystemConfig,
  FraudAlert,
  // Monolith entities for admin queries
  User,
  Transaction,
  KYCDocument,
  FiatOrder,
  Notification,
  Fee,
  AirtimePurchase,
  DataPurchase,
  ElectricityPurchase,
  MerchantPayment,
  SplitPayment,
  ProviderOrder,
  UserTransaction,
  UserAddress,
  RefreshToken,
  SplitPaymentRecipient,
  SplitPaymentExecution,
  SplitPaymentExecutionResult,
]);
