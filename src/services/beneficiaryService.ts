import { AppDataSource } from "../config/database";
import { Beneficiary, BeneficiaryRecipient } from "../entities/Beneficiary";

export class BeneficiaryService {
  /**
   * Create a new beneficiary list
   */
  static async createBeneficiary(
    userId: string,
    name: string,
    recipients: BeneficiaryRecipient[],
    chain: string,
    network: string,
    description?: string
  ): Promise<Beneficiary> {
    const beneficiaryRepo = AppDataSource.getRepository(Beneficiary);

    const beneficiary = beneficiaryRepo.create({
      userId,
      name,
      description,
      chain,
      network,
      recipients,
      recipientCount: recipients.length,
      isActive: true,
      usageCount: 0,
    });

    return await beneficiaryRepo.save(beneficiary);
  }

  /**
   * Get all beneficiaries for a user
   */
  static async getBeneficiaries(userId: string): Promise<Beneficiary[]> {
    const beneficiaryRepo = AppDataSource.getRepository(Beneficiary);
    return await beneficiaryRepo.find({
      where: { userId, isActive: true },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Get a single beneficiary by ID
   */
  static async getBeneficiary(
    id: string,
    userId: string
  ): Promise<Beneficiary | null> {
    const beneficiaryRepo = AppDataSource.getRepository(Beneficiary);
    return await beneficiaryRepo.findOne({
      where: { id, userId },
    });
  }

  /**
   * Update a beneficiary
   */
  static async updateBeneficiary(
    id: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      recipients?: BeneficiaryRecipient[];
    }
  ): Promise<Beneficiary | null> {
    const beneficiaryRepo = AppDataSource.getRepository(Beneficiary);
    const beneficiary = await beneficiaryRepo.findOne({
      where: { id, userId },
    });

    if (!beneficiary) {
      return null;
    }

    if (updates.name) beneficiary.name = updates.name;
    if (updates.description !== undefined)
      beneficiary.description = updates.description;
    if (updates.recipients) {
      beneficiary.recipients = updates.recipients;
      beneficiary.recipientCount = updates.recipients.length;
    }

    return await beneficiaryRepo.save(beneficiary);
  }

  /**
   * Delete a beneficiary (soft delete)
   */
  static async deleteBeneficiary(
    id: string,
    userId: string
  ): Promise<boolean> {
    const beneficiaryRepo = AppDataSource.getRepository(Beneficiary);
    const beneficiary = await beneficiaryRepo.findOne({
      where: { id, userId },
    });

    if (!beneficiary) {
      return false;
    }

    beneficiary.isActive = false;
    await beneficiaryRepo.save(beneficiary);
    return true;
  }

  /**
   * Increment usage count when a beneficiary is used
   */
  static async incrementUsage(id: string): Promise<void> {
    const beneficiaryRepo = AppDataSource.getRepository(Beneficiary);
    await beneficiaryRepo.increment({ id }, "usageCount", 1);
    await beneficiaryRepo.update({ id }, { lastUsedAt: new Date() });
  }
}
