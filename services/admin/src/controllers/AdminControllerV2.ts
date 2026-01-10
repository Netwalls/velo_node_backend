import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { UserManagementService } from '../services/UserManagementService';
import { TransactionMonitoringService } from '../services/TransactionMonitoringService';
import { KYCComplianceService } from '../services/KYCComplianceService';
import { FraudRiskService } from '../services/FraudRiskService';
import { SupportService } from '../services/SupportService';
import { AnalyticsService } from '../services/AnalyticsService';
import { SystemConfigService } from '../services/SystemConfigService';

// Initialize services
const userService = new UserManagementService();
const txnService = new TransactionMonitoringService();
const kycService = new KYCComplianceService();
const fraudService = new FraudRiskService();
const supportService = new SupportService();
const analyticsService = new AnalyticsService();
const configService = new SystemConfigService();

export default class AdminControllerV2 {
  // ==================== USER MANAGEMENT ====================

  static async listUsers(req: Request, res: Response) {
    try {
      const { search, status, kycStatus, page = 1, limit = 50 } = req.query;
      
      const result = await userService.listUsers(
        {
          search: search as string,
          status: status as string,
          kycStatus: kycStatus as string,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.json(result);
    } catch (error: any) {
      console.error('Error listing users:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getUserDetails(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const details = await userService.getUserDetails(userId);
      return res.json(details);
    } catch (error: any) {
      console.error('Error getting user details:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async suspendUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const user = await userService.suspendUser(userId, adminId, adminEmail, reason, ipAddress);
      return res.json({ message: 'User suspended successfully', user });
    } catch (error: any) {
      console.error('Error suspending user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async banUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const user = await userService.banUser(userId, adminId, adminEmail, reason, ipAddress);
      return res.json({ message: 'User banned successfully', user });
    } catch (error: any) {
      console.error('Error banning user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async unlockUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const user = await userService.unlockUser(userId, adminId, adminEmail, ipAddress);
      return res.json({ message: 'User unlocked successfully', user });
    } catch (error: any) {
      console.error('Error unlocking user:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getUserSegmentation(req: Request, res: Response) {
    try {
      const segmentation = await userService.getUserSegmentation();
      return res.json(segmentation);
    } catch (error: any) {
      console.error('Error getting user segmentation:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== TRANSACTION MONITORING ====================

  static async listTransactions(req: Request, res: Response) {
    try {
      const {
        userId,
        type,
        status,
        chain,
        minAmount,
        maxAmount,
        startDate,
        endDate,
        search,
        page = 1,
        limit = 50,
      } = req.query;

      const result = await txnService.listTransactions(
        {
          userId: userId as string,
          type: type as string,
          status: status as string,
          chain: chain as string,
          minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
          maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          search: search as string,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.json(result);
    } catch (error: any) {
      console.error('Error listing transactions:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getTransactionDetails(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const details = await txnService.getTransactionDetails(transactionId);
      return res.json(details);
    } catch (error: any) {
      console.error('Error getting transaction details:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async flagTransaction(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const transaction = await txnService.flagTransaction(
        transactionId,
        adminId,
        adminEmail,
        reason,
        ipAddress
      );
      return res.json({ message: 'Transaction flagged successfully', transaction });
    } catch (error: any) {
      console.error('Error flagging transaction:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getTransactionStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await txnService.getTransactionStats({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      return res.json(stats);
    } catch (error: any) {
      console.error('Error getting transaction stats:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async exportTransactions(req: Request, res: Response) {
    try {
      const { userId, type, status, startDate, endDate } = req.query;
      const data = await txnService.exportTransactions({
        userId: userId as string,
        type: type as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      return res.json(data);
    } catch (error: any) {
      console.error('Error exporting transactions:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== KYC/AML COMPLIANCE ====================

  static async listPendingKYC(req: Request, res: Response) {
    try {
      const { status, verificationType, page = 1, limit = 50 } = req.query;
      const result = await kycService.listPendingKYC(
        {
          status: status as string,
          verificationType: verificationType as string,
        },
        parseInt(page as string),
        parseInt(limit as string)
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Error listing KYC documents:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getKYCDetails(req: Request, res: Response) {
    try {
      const { kycId } = req.params;
      const details = await kycService.getKYCDetails(kycId);
      return res.json(details);
    } catch (error: any) {
      console.error('Error getting KYC details:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async approveKYC(req: Request, res: Response) {
    try {
      const { kycId } = req.params;
      const { notes } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const kycDoc = await kycService.approveKYC(kycId, adminId, adminEmail, notes, ipAddress);
      return res.json({ message: 'KYC approved successfully', kycDoc });
    } catch (error: any) {
      console.error('Error approving KYC:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async rejectKYC(req: Request, res: Response) {
    try {
      const { kycId } = req.params;
      const { reason } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      if (!reason) {
        return res.status(400).json({ error: 'Reason is required for rejection' });
      }

      const kycDoc = await kycService.rejectKYC(kycId, adminId, adminEmail, reason, ipAddress);
      return res.json({ message: 'KYC rejected successfully', kycDoc });
    } catch (error: any) {
      console.error('Error rejecting KYC:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getKYCStats(req: Request, res: Response) {
    try {
      const stats = await kycService.getKYCStats();
      return res.json(stats);
    } catch (error: any) {
      console.error('Error getting KYC stats:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== FRAUD & RISK ====================

  static async listFraudAlerts(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 50 } = req.query;
      const result = await fraudService.listFraudAlerts(
        status as any,
        parseInt(page as string),
        parseInt(limit as string)
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Error listing fraud alerts:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async reviewFraudAlert(req: Request, res: Response) {
    try {
      const { alertId } = req.params;
      const { status, notes } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const alert = await fraudService.reviewFraudAlert(
        alertId,
        adminId,
        adminEmail,
        status,
        notes,
        ipAddress
      );
      return res.json({ message: 'Fraud alert reviewed', alert });
    } catch (error: any) {
      console.error('Error reviewing fraud alert:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async addToBlocklist(req: Request, res: Response) {
    try {
      const { type, value, reason, expiresAt } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const entry = await fraudService.addToBlocklist(
        type,
        value,
        reason,
        adminId,
        adminEmail,
        expiresAt ? new Date(expiresAt) : undefined,
        ipAddress
      );
      return res.json({ message: 'Added to blocklist', entry });
    } catch (error: any) {
      console.error('Error adding to blocklist:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async removeFromBlocklist(req: Request, res: Response) {
    try {
      const { blocklistId } = req.params;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const entry = await fraudService.removeFromBlocklist(blocklistId, adminId, adminEmail, ipAddress);
      return res.json({ message: 'Removed from blocklist', entry });
    } catch (error: any) {
      console.error('Error removing from blocklist:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async listBlocklist(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await fraudService.listBlocklist(
        parseInt(page as string),
        parseInt(limit as string)
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Error listing blocklist:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getFraudStats(req: Request, res: Response) {
    try {
      const stats = await fraudService.getFraudStats();
      return res.json(stats);
    } catch (error: any) {
      console.error('Error getting fraud stats:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== SUPPORT ====================

  static async listSupportTickets(req: Request, res: Response) {
    try {
      const { status, assignedTo, page = 1, limit = 50 } = req.query;
      const result = await supportService.listTickets(
        status as any,
        assignedTo as string,
        parseInt(page as string),
        parseInt(limit as string)
      );
      return res.json(result);
    } catch (error: any) {
      console.error('Error listing support tickets:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getSupportTicketDetails(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const details = await supportService.getTicketDetails(ticketId);
      return res.json(details);
    } catch (error: any) {
      console.error('Error getting ticket details:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async assignSupportTicket(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const adminId = (req as any).adminId || 'system';

      const ticket = await supportService.assignTicket(ticketId, adminId);
      return res.json({ message: 'Ticket assigned', ticket });
    } catch (error: any) {
      console.error('Error assigning ticket:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateSupportTicketStatus(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;
      const adminId = (req as any).adminId || 'system';

      const ticket = await supportService.updateTicketStatus(ticketId, status, adminId);
      return res.json({ message: 'Ticket status updated', ticket });
    } catch (error: any) {
      console.error('Error updating ticket status:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async addSupportNote(req: Request, res: Response) {
    try {
      const { ticketId } = req.params;
      const { note } = req.body;

      const ticket = await supportService.addInternalNote(ticketId, note);
      return res.json({ message: 'Note added', ticket });
    } catch (error: any) {
      console.error('Error adding note:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getSupportStats(req: Request, res: Response) {
    try {
      const stats = await supportService.getTicketStats();
      return res.json(stats);
    } catch (error: any) {
      console.error('Error getting support stats:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== ANALYTICS ====================

  static async getDailyActiveUsers(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getDailyActiveUsers(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      return res.json(data);
    } catch (error: any) {
      console.error('Error getting DAU:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getTransactionVolumeChart(req: Request, res: Response) {
    try {
      const { startDate, endDate, granularity = 'day' } = req.query;
      const data = await analyticsService.getTransactionVolumeChart(
        new Date(startDate as string),
        new Date(endDate as string),
        granularity as any
      );
      return res.json(data);
    } catch (error: any) {
      console.error('Error getting transaction volume chart:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getProviderPerformance(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getProviderPerformance(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      return res.json(data);
    } catch (error: any) {
      console.error('Error getting provider performance:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async getRevenueMetrics(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const data = await analyticsService.getRevenueMetrics(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      return res.json(data);
    } catch (error: any) {
      console.error('Error getting revenue metrics:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ==================== SYSTEM CONFIGURATION ====================

  static async listSystemConfigs(req: Request, res: Response) {
    try {
      const configs = await configService.listAllConfigs();
      return res.json(configs);
    } catch (error: any) {
      console.error('Error listing configs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updateSystemConfig(req: Request, res: Response) {
    try {
      const { key, value, description } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const config = await configService.setConfig(
        key,
        value,
        adminId,
        adminEmail,
        description,
        ipAddress
      );
      return res.json({ message: 'Config updated', config });
    } catch (error: any) {
      console.error('Error updating config:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async toggleMaintenanceMode(req: Request, res: Response) {
    try {
      const { enabled } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const result = await configService.setMaintenanceMode(enabled, adminId, adminEmail, ipAddress);
      return res.json(result);
    } catch (error: any) {
      console.error('Error toggling maintenance mode:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async toggleProvider(req: Request, res: Response) {
    try {
      const { provider, enabled } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const result = await configService.toggleProvider(provider, enabled, adminId, adminEmail, ipAddress);
      return res.json(result);
    } catch (error: any) {
      console.error('Error toggling provider:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  static async updatePlatformFee(req: Request, res: Response) {
    try {
      const { feeType, percentage } = req.body;
      const adminId = (req as any).adminId || 'system';
      const adminEmail = (req as any).adminEmail || 'system@velo.com';
      const ipAddress = req.ip;

      const fee = await configService.updatePlatformFee(feeType, percentage, adminId, adminEmail, ipAddress);
      return res.json({ message: 'Fee updated', fee });
    } catch (error: any) {
      console.error('Error updating fee:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}
