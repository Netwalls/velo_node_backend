import { AppDataSource } from '../config/database';
import { SupportTicket, SupportTicketStatus, SupportTicketPriority } from '../entities/SupportTicket';
import { User } from '../../../../src/entities/User';
import { Notification } from '../../../../src/entities/Notification';

export class SupportService {
  private ticketRepo = AppDataSource.getRepository(SupportTicket);
  private userRepo = AppDataSource.getRepository(User);
  private notificationRepo = AppDataSource.getRepository(Notification);

  async listTickets(
    status?: SupportTicketStatus,
    assignedTo?: string,
    page: number = 1,
    limit: number = 50
  ) {
    const query = this.ticketRepo.createQueryBuilder('ticket');

    if (status) {
      query.andWhere('ticket.status = :status', { status });
    }

    if (assignedTo) {
      query.andWhere('ticket.assignedTo = :assignedTo', { assignedTo });
    }

    const [tickets, total] = await query
      .orderBy('ticket.priority', 'DESC')
      .addOrderBy('ticket.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTicketDetails(ticketId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const user = await this.userRepo.findOne({ where: { id: ticket.userId } });

    return {
      ticket,
      user,
    };
  }

  async createTicket(data: {
    userId: string;
    subject: string;
    description: string;
    priority?: SupportTicketPriority;
    metadata?: any;
  }) {
    const ticket = this.ticketRepo.create({
      ...data,
      status: SupportTicketStatus.OPEN,
      priority: data.priority || SupportTicketPriority.MEDIUM,
    });

    return await this.ticketRepo.save(ticket);
  }

  async assignTicket(ticketId: string, adminId: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.assignedTo = adminId;
    ticket.status = SupportTicketStatus.IN_PROGRESS;
    return await this.ticketRepo.save(ticket);
  }

  async updateTicketStatus(ticketId: string, status: SupportTicketStatus, adminId?: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.status = status;

    if (status === SupportTicketStatus.RESOLVED || status === SupportTicketStatus.CLOSED) {
      ticket.resolvedAt = new Date();
      ticket.resolvedBy = adminId;
    }

    return await this.ticketRepo.save(ticket);
  }

  async addInternalNote(ticketId: string, note: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const existingNotes = ticket.internalNotes || '';
    const timestamp = new Date().toISOString();
    ticket.internalNotes = `${existingNotes}\n[${timestamp}] ${note}`;

    return await this.ticketRepo.save(ticket);
  }

  async sendMessageToUser(userId: string, message: string, type: string = 'support') {
    const notification = this.notificationRepo.create({
      userId,
      type,
      title: 'Support Team Message',
      message,
    });

    return await this.notificationRepo.save(notification);
  }

  async getTicketStats() {
    const byStatus = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('ticket.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.status')
      .getRawMany();

    const byPriority = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('ticket.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ticket.priority')
      .getRawMany();

    const avgResolutionTime = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('AVG(EXTRACT(EPOCH FROM (ticket.resolvedAt - ticket.createdAt)))', 'avgSeconds')
      .where('ticket.resolvedAt IS NOT NULL')
      .getRawOne();

    return {
      byStatus,
      byPriority,
      avgResolutionTimeSeconds: avgResolutionTime?.avgSeconds || 0,
    };
  }
}
