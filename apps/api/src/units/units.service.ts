import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Unit } from '../entities/unit.entity';
import { Property } from '../entities/property.entity';
import { Lease } from '../entities/lease.entity';
import { RentPayment } from '../entities/rent-payment.entity';
import { MaintenanceRequest } from '../entities/maintenance-request.entity';
import { AuthUser } from '../auth/auth.service';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { leaseStatusOn } from '../common/lease-rules';
import { todayStr } from '../common/dates';

export interface UnitDetail {
  unit: Unit;
  property: Property;
  currentLease: (Lease & { effectiveStatus: string }) | null;
  paymentHistory: RentPayment[];
  maintenance: MaintenanceRequest[];
}

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
    @InjectRepository(RentPayment)
    private readonly payments: Repository<RentPayment>,
    @InjectRepository(MaintenanceRequest)
    private readonly maintenance: Repository<MaintenanceRequest>,
  ) {}

  private async assertPropertyAccess(
    propertyId: string,
    user: AuthUser,
  ): Promise<Property> {
    const property = await this.props.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    const ownerOk = property.ownerId === user.id;
    const managerOk =
      user.role === 'manager' && property.managerId === user.id;
    if (!ownerOk && !managerOk) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }
    return property;
  }

  async findByProperty(propertyId: string, user: AuthUser): Promise<Unit[]> {
    await this.assertPropertyAccess(propertyId, user);
    return this.units.find({
      where: { propertyId },
      order: { number: 'ASC' },
    });
  }

  async findOne(id: string, user: AuthUser): Promise<UnitDetail> {
    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    await this.assertPropertyAccess(unit.propertyId, user);

    const property = await this.props.findOne({
      where: { id: unit.propertyId },
    });
    const today = todayStr();

    // Current lease: the non-terminated lease covering today (or the nearest future draft).
    const leases = await this.leases.find({
      where: { unitId: id },
      relations: { tenant: true },
      order: { startDate: 'DESC' },
    });
    const current =
      leases
        .map((l) => ({
          ...l,
          effectiveStatus: leaseStatusOn(l.status, l.startDate, l.endDate, today),
        }))
        .find(
          (l) =>
            l.effectiveStatus === 'active' ||
            (l.effectiveStatus === 'draft' &&
              l.startDate >= today),
        ) ?? null;

    const paymentHistory = await this.payments.find({
      where: { leaseId: current ? current.id : undefined },
      order: { dueDate: 'DESC' },
    });
    const maintenance = await this.maintenance.find({
      where: { unitId: id },
      order: { createdAt: 'DESC' },
    });

    return {
      unit,
      property: property as Property,
      currentLease: current,
      paymentHistory,
      maintenance,
    };
  }

  async create(dto: CreateUnitDto, user: AuthUser): Promise<Unit> {
    await this.assertPropertyAccess(dto.propertyId, user);
    const dup = await this.units.findOne({
      where: { propertyId: dto.propertyId, number: dto.number.trim() },
    });
    if (dup) {
      throw new ConflictException(
        `Ya existe una unidad con el número ${dto.number} en esta propiedad`,
      );
    }
    const unit = this.units.create({
      id: randomUUID(),
      propertyId: dto.propertyId,
      number: dto.number.trim(),
      bedrooms: dto.bedrooms ?? 1,
      bathrooms: dto.bathrooms ?? 1,
      area: dto.area ?? 0,
      monthlyRent: dto.monthlyRent,
      status: dto.status ?? 'available',
    } as any);
    return (await this.units.save(unit)) as unknown as Unit;
  }

  async update(
    id: string,
    dto: UpdateUnitDto,
    user: AuthUser,
  ): Promise<Unit> {
    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    await this.assertPropertyAccess(unit.propertyId, user);

    if (dto.number !== undefined) {
      const dup = await this.units.findOne({
        where: { propertyId: unit.propertyId, number: dto.number.trim() },
      });
      if (dup && dup.id !== id) {
        throw new ConflictException(
          `Ya existe una unidad con el número ${dto.number} en esta propiedad`,
        );
      }
      unit.number = dto.number.trim();
    }
    if (dto.bedrooms !== undefined) unit.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) unit.bathrooms = dto.bathrooms;
    if (dto.area !== undefined) unit.area = dto.area;
    if (dto.monthlyRent !== undefined) unit.monthlyRent = dto.monthlyRent;
    if (dto.status !== undefined) {
      await this.assertStatusChange(unit, dto.status);
      unit.status = dto.status;
    }
    return (await this.units.save(unit)) as unknown as Unit;
  }

  /** 'occupied' requires an active lease; 'available' requires no active lease. */
  private async assertStatusChange(unit: Unit, next: string): Promise<void> {
    const today = todayStr();
    const activeCount = await this.leases
      .createQueryBuilder('l')
      .where('l.unitId = :unitId', { unitId: unit.id })
      .andWhere("l.status IN ('draft','active')")
      .andWhere('l.endDate >= :today', { today })
      .getCount();
    if (next === 'occupied' && activeCount === 0) {
      throw new BadRequestException(
        'La unidad solo puede marcarse como ocupada si tiene un lease activo. Crea un lease primero.',
      );
    }
    if (next === 'available' && activeCount > 0) {
      throw new BadRequestException(
        'La unidad tiene un lease activo — no puede marcarse como disponible.',
      );
    }
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const unit = await this.units.findOne({ where: { id } });
    if (!unit) throw new NotFoundException('Unidad no encontrada');
    await this.assertPropertyAccess(unit.propertyId, user);
    const active = await this.leases
      .createQueryBuilder('l')
      .where('l.unitId = :unitId', { unitId: id })
      .andWhere("l.status IN ('draft','active')")
      .getCount();
    if (active > 0) {
      throw new ConflictException(
        'No se puede eliminar una unidad con un lease activo.',
      );
    }
    await this.units.remove(unit);
  }
}
