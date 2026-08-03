import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from '../entities/maintenance-request.entity';
import { Unit } from '../entities/unit.entity';
import { Property } from '../entities/property.entity';
import { Lease } from '../entities/lease.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { AuthUser } from '../auth/auth.service';
import {
  AssignMaintenanceDto,
  CreateMaintenanceDto,
  ResolveMaintenanceDto,
} from './dto/maintenance.dto';
import { canTransition, isActionable } from '../common/maintenance-rules';
import { todayStr } from '../common/dates';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private readonly requests: Repository<MaintenanceRequest>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private async assertUnitAccess(unitId: string, user: AuthUser) {
    const unit = await this.units.findOne({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    const property = await this.props.findOne({
      where: { id: unit.propertyId },
    });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    const ownerOk = property.ownerId === user.id;
    const managerOk =
      user.role === 'manager' && property.managerId === user.id;
    if (!ownerOk && !managerOk) {
      throw new ForbiddenException('No tienes acceso a esta unidad');
    }
    return { unit, property };
  }

  /** Tenant self-service: the unit must belong to an active lease of the tenant matching the user's email. */
  private async assertTenantUnit(unitId: string, user: AuthUser) {
    const tenant = await this.tenants.findOne({
      where: { email: user.email.toLowerCase() },
    });
    if (!tenant) {
      throw new ForbiddenException(
        'No hay un perfil de inquilino asociado a esta cuenta',
      );
    }
    const lease = await this.leases
      .createQueryBuilder('l')
      .where('l.tenantId = :tenantId', { tenantId: tenant.id })
      .andWhere('l.unitId = :unitId', { unitId })
      .andWhere("l.status IN ('draft','active')")
      .getOne();
    if (!lease) {
      throw new ForbiddenException(
        'Solo puedes reportar incidencias en tu propia unidad',
      );
    }
    return { tenant, lease };
  }

  async findAll(
    user: AuthUser,
    filters: { status?: string; priority?: string; unitId?: string } = {},
  ) {
    const props = await this.props.find({
      where:
        user.role === 'manager'
          ? [{ managerId: user.id }, { ownerId: user.id }]
          : { ownerId: user.id },
    });
    const propIds = props.map((p) => p.id);
    if (propIds.length === 0) return [];

    const qb = this.requests
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.unit', 'unit')
      .leftJoinAndSelect('m.assignee', 'assignee')
      .innerJoin('unit.property', 'property')
      .where('property.id IN (:...propIds)', { propIds });
    if (filters.status) qb.andWhere('m.status = :status', { status: filters.status });
    if (filters.priority) qb.andWhere('m.priority = :priority', { priority: filters.priority });
    if (filters.unitId) qb.andWhere('m.unitId = :unitId', { unitId: filters.unitId });
    return qb.orderBy('m.createdAt', 'DESC').getMany();
  }

  /** Tenant's own requests (my-lease view). */
  async findMine(user: AuthUser) {
    const tenant = await this.tenants.findOne({
      where: { email: user.email.toLowerCase() },
    });
    if (!tenant) return [];
    const leaseIds = (
      await this.leases.find({ where: { tenantId: tenant.id } })
    ).map((l) => l.id);
    if (leaseIds.length === 0) return [];
    return this.requests
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.unit', 'unit')
      .where('m.leaseId IN (:...leaseIds)', { leaseIds })
      .orderBy('m.createdAt', 'DESC')
      .getMany();
  }

  async create(dto: CreateMaintenanceDto, user: AuthUser) {
    let leaseId: string | null = null;
    let reportedById: string | null = user.id;
    if (user.role === 'tenant') {
      const { tenant, lease } = await this.assertTenantUnit(dto.unitId, user);
      leaseId = lease.id;
      reportedById = null; // link to tenant entity instead of user id
      const currentLease = await this.leases.findOne({
        where: { id: lease.id },
      });
      if (currentLease) leaseId = currentLease.id;
      void tenant;
    } else {
      const { unit } = await this.assertUnitAccess(dto.unitId, user);
      // Link to the current active lease of the unit if any.
      const active = await this.leases
        .createQueryBuilder('l')
        .where('l.unitId = :unitId', { unitId: unit.id })
        .andWhere("l.status = 'active'")
        .getOne();
      leaseId = active?.id ?? null;
    }

    const request = this.requests.create({
      id: randomUUID(),
      unitId: dto.unitId,
      leaseId,
      reportedById: user.role === 'tenant' ? null : reportedById,
      assignedTo: null,
      category: dto.category,
      priority: dto.priority,
      description: dto.description.trim(),
      status: 'open',
      cost: null,
      resolvedAt: null,
    } as any) as unknown as MaintenanceRequest;
    return (await this.requests.save(request)) as unknown as MaintenanceRequest;
  }

  private async loadRequest(id: string): Promise<MaintenanceRequest> {
    const request = await this.requests.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    return request;
  }

  async assign(
    id: string,
    dto: AssignMaintenanceDto,
    user: AuthUser,
  ): Promise<MaintenanceRequest> {
    await this.assertUnitAccess((await this.loadRequest(id)).unitId, user);
    const request = await this.loadRequest(id);
    this.assertTransition(request.status, 'assigned');
    const assignee = await this.users.findOne({
      where: { id: dto.assignedTo },
    });
    if (!assignee) throw new NotFoundException('Asignado no encontrado');
    request.assignedTo = dto.assignedTo;
    request.status = 'assigned';
    return (await this.requests.save(request)) as unknown as MaintenanceRequest;
  }

  async start(id: string, user: AuthUser): Promise<MaintenanceRequest> {
    const request = await this.loadRequest(id);
    await this.assertUnitAccess(request.unitId, user);
    this.assertTransition(request.status, 'in-progress');
    request.status = 'in-progress';
    return (await this.requests.save(request)) as unknown as MaintenanceRequest;
  }

  async resolve(
    id: string,
    dto: ResolveMaintenanceDto,
    user: AuthUser,
  ): Promise<MaintenanceRequest> {
    const request = await this.loadRequest(id);
    await this.assertUnitAccess(request.unitId, user);
    this.assertTransition(request.status, 'resolved');
    request.status = 'resolved';
    request.cost = dto.cost ?? null;
    request.resolvedAt = todayStr();
    return (await this.requests.save(request)) as unknown as MaintenanceRequest;
  }

  private assertTransition(from: MaintenanceStatus, to: MaintenanceStatus) {
    if (!canTransition(from, to)) {
      throw new BadRequestException(
        `Transición inválida: ${from} → ${to}. El flujo es open → assigned → in-progress → resolved.`,
      );
    }
    if (!isActionable(from)) {
      throw new BadRequestException('La solicitud ya está resuelta');
    }
  }
}
