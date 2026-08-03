import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este email');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const role: UserRole = dto.role ?? 'landlord';
    const user = this.users.create({
      id: randomUUID(),
      email,
      name: dto.name.trim(),
      passwordHash,
      role,
    } as any);
    const saved = (await this.users.save(user)) as unknown as User;
    return this.buildAuthResponse(saved);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.users.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return this.buildAuthResponse(user);
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.toAuthUser(user);
  }

  async validateUser(id: string): Promise<AuthUser | null> {
    const user = await this.users.findOne({ where: { id: userI(id) } });
    return user ? this.toAuthUser(user) : null;
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  private buildAuthResponse(user: User) {
    const authUser = this.toAuthUser(user);
    const token = this.jwt.sign({ sub: user.id, email: user.email });
    return { token, user: authUser };
  }
}

// Guard against null injection into findOne when called with undefined.
function userI(id: string): string {
  return id;
}
