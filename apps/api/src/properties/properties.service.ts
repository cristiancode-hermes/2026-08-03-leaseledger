import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Property } from '../entities/property.entity';
import { Unit } from '../entities/unit.entity';
import { Lease } from '../entities/lease.entity';
import { AuthUser } from '../auth/auth.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto/property.dto';

export interface PropertySummary {
  id: string;
  name: string;
  address: string;
  type: string;
  graceDays: number;
  lateFeeRate: number;
  unitCount: number;
  occupiedCount: number;
  monthlyRent: number;
}

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property) private readonly props: Repository<Property>,
    @InjectRepository(Unit) private readonly units: Repository<Unit>,
    @InjectRepository(Lease) private readonly leases: Repository<Lease>,
  ) {}

  /** Ownership/assignment check: owners access own properties, managers their assigned ones. */
  canAccess(property: Property, user: AuthUser): boolean {
    if (property.ownerId === user.id) return true;
    if (user.role === 'manager' && property.managerId === user.id) return true;
    return false;
  }

  async assertAccess(propertyId: string, user: AuthUser): Promise<Property> {
    const property = await this.props.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Propiedad no encontrada');
    if (!this.canAccess(property, user)) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }
    return property;
  }

  async findAll(user: AuthUser, q?: string): Promise<PropertySummary[]> {
    const where =
      user.role === 'manager'
        ? [{ managerId: user.id }, { ownerId: user.id }]
        : { ownerId: user.id };
    const props = await this.props.find({ where, order: { name: 'ASC' } });
    return this.toSummaries(props);
  }

  async findOne(id: string, user: AuthUser): Promise<Property> {
    return this.assertAccess(id, user);
  }

  async create(dto: CreatePropertyDto, user: AuthUser): Promise<Property> {
    const property = this.props.create({
      id: randomUUID(),
      ownerId: user.id,
      name: dto.name.trim(),
      address: dto.address.trim(),
      type: dto.type ?? 'residential',
      graceDays: dto.graceDays ?? 5,
      lateFeeRate: dto.lateFeeRate ?? 0.04,
    } as any);
    return (await this.props.save(property)) as unknown as Property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    user: AuthUser,
  ): Promise<Property> {
    const property = await this.assertAccess(id, user);
    if (dto.name !== undefined) property.name = dto.name.trim();
    if (dto.address !== undefined) property.address = dto.address.trim();
    if (dto.type !== undefined) property.type = dto.type;
    if (dto.graceDays !== undefined) property.graceDays = dto.graceDays;
    if (dto.lateFeeRate !== undefined) property.lateFeeRate = dto.lateFeeRate;
    if (dto.managerId !== undefined) property.managerId = dto.managerId;
    return (await this.props.save(property)) as unknown as Property;
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const property = await this.assertAccess(id, user);
    const unitCount = await this.units.count({ where: { propertyId: id } });
    if (unitCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una propiedad con unidades. Elimina las unidades primero.',
      );
    }
    await this.props.remove(property);
  }

  /** Property summaries with live occupancy + rent roll totals. */
  async toSummaries(props: Property[]): Promise<PropertySummary[]> {
    const result: PropertySummary[] = [];
    for (const p of props) {
      const units = await this.units.find({
        where: { propertyId: p.id },
        relations: { leases: true },
      });
      const unitCount = units.length;
      const occupiedCount = units.filter((u) => u.status === 'occupied').length;
      const monthlyRent = units.reduce(
        (sum, u) => sum + (u.monthlyRent || 0),
        0,
      );
      result.push({
        id: p.id,
        name: p.name,
        address: p.address,
        type: p.type,
        graceDays: p.graceDays,
        lateFeeRate: p.lateFeeRate,
        unitCount,
        occupiedCount,
        monthlyRent,
      });
    }
    return result;
  }
}
