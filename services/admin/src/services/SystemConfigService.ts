import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import { Fee } from '../../../../src/entities/Fee';
import { AdminAuditLog, AuditAction } from '../entities/AdminAuditLog';

export class SystemConfigService {
  private configRepo = AppDataSource.getRepository(SystemConfig);
  private feeRepo = AppDataSource.getRepository(Fee);
  private auditRepo = AppDataSource.getRepository(AdminAuditLog);

  async getConfig(key: string): Promise<string | null> {
    const config = await this.configRepo.findOne({ where: { key } });
    return config?.value || null;
  }

  async setConfig(
    key: string,
    value: string,
    adminId: string,
    adminEmail: string,
    description?: string,
    ipAddress?: string
  ) {
    let config = await this.configRepo.findOne({ where: { key } });

    const oldValue = config?.value;

    if (config) {
      config.value = value;
      config.description = description || config.description;
      config.updatedBy = adminId;
      config.updatedAt = new Date();
    } else {
      config = this.configRepo.create({
        key,
        value,
        description,
        updatedBy: adminId,
      });
    }

    await this.configRepo.save(config);

    // Audit log
    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.CONFIG_UPDATE,
      description: `Config updated: ${key}`,
      metadata: { key, oldValue, newValue: value },
      ipAddress,
    });

    return config;
  }

  async listAllConfigs() {
    return await this.configRepo.find({ order: { key: 'ASC' } });
  }

  async getMaintenanceMode(): Promise<boolean> {
    const value = await this.getConfig('maintenance_mode');
    return value === 'true';
  }

  async setMaintenanceMode(
    enabled: boolean,
    adminId: string,
    adminEmail: string,
    ipAddress?: string
  ) {
    await this.setConfig(
      'maintenance_mode',
      enabled.toString(),
      adminId,
      adminEmail,
      'Platform maintenance mode',
      ipAddress
    );

    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.MAINTENANCE_TOGGLE,
      description: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      metadata: { enabled },
      ipAddress,
    });

    return { maintenanceMode: enabled };
  }

  async getProviderStatus(provider: string): Promise<boolean> {
    const value = await this.getConfig(`provider_${provider}_enabled`);
    return value !== 'false'; // Default to enabled if not set
  }

  async toggleProvider(
    provider: string,
    enabled: boolean,
    adminId: string,
    adminEmail: string,
    ipAddress?: string
  ) {
    await this.setConfig(
      `provider_${provider}_enabled`,
      enabled.toString(),
      adminId,
      adminEmail,
      `${provider} provider status`,
      ipAddress
    );

    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.PROVIDER_TOGGLE,
      description: `Provider ${provider} ${enabled ? 'enabled' : 'disabled'}`,
      metadata: { provider, enabled },
      ipAddress,
    });

    return { provider, enabled };
  }

  async updatePlatformFee(
    feeType: string,
    percentage: number,
    adminId: string,
    adminEmail: string,
    ipAddress?: string
  ) {
    // Update or create fee configuration
    let fee = await this.feeRepo.findOne({ where: { type: feeType } });

    if (fee) {
      fee.percentage = percentage;
    } else {
      fee = this.feeRepo.create({
        type: feeType,
        percentage,
      });
    }

    await this.feeRepo.save(fee);

    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.FEE_UPDATE,
      description: `Fee updated for ${feeType}: ${percentage}%`,
      metadata: { feeType, percentage },
      ipAddress,
    });

    return fee;
  }

  async getRateLimits(): Promise<any> {
    const configs = await this.configRepo
      .createQueryBuilder('config')
      .where("config.key LIKE 'rate_limit_%'")
      .getMany();

    return configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as any);
  }

  async setRateLimit(
    endpoint: string,
    limit: number,
    windowMs: number,
    adminId: string,
    adminEmail: string,
    ipAddress?: string
  ) {
    await this.setConfig(
      `rate_limit_${endpoint}`,
      JSON.stringify({ limit, windowMs }),
      adminId,
      adminEmail,
      `Rate limit for ${endpoint}`,
      ipAddress
    );

    await this.auditRepo.save({
      adminId,
      adminEmail,
      action: AuditAction.LIMIT_UPDATE,
      description: `Rate limit updated for ${endpoint}`,
      metadata: { endpoint, limit, windowMs },
      ipAddress,
    });

    return { endpoint, limit, windowMs };
  }
}
