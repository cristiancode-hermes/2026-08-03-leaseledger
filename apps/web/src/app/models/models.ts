export type UserRole = 'landlord' | 'manager' | 'tenant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type PropertyType = 'residential' | 'commercial' | 'garage';

export interface Property {
  id: string;
  ownerId: string;
  managerId: string | null;
  name: string;
  address: string;
  type: PropertyType;
  graceDays: number;
  lateFeeRate: number;
  createdAt: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  address: string;
  type: PropertyType;
  graceDays: number;
  lateFeeRate: number;
  unitCount: number;
  occupiedCount: number;
  monthlyRent: number;
}

export type UnitStatus = 'available' | 'occupied' | 'maintenance';

export interface Unit {
  id: string;
  propertyId: string;
  number: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  monthlyRent: number;
  status: UnitStatus;
  createdAt: string;
}

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  terminatedAt: string | null;
  terms: { includes?: string[]; pets?: boolean; notes?: string } | null;
  createdAt: string;
  unit?: Unit & { property?: Property };
  tenant?: Tenant;
  effectiveStatus?: string;
  unitNumber?: string;
  propertyName?: string;
  tenantName?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nif: string | null;
  emergencyContact: { name?: string; phone?: string; relation?: string } | null;
  createdAt: string;
}

export type PaymentStatus = 'due' | 'paid' | 'late' | 'overdue' | 'partial';

export interface RentPayment {
  id: string;
  leaseId: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  method: 'transfer' | 'cash' | 'card' | null;
  paidAt: string | null;
  status: PaymentStatus;
  lateFee: number | null;
  createdAt: string;
}

export interface RentRollRow {
  leaseId: string;
  unitNumber: string;
  propertyName: string;
  tenantName: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  method: string | null;
  paidAt: string | null;
  lateFee: number | null;
  paymentId: string | null;
}

export interface RentRoll {
  month: string;
  rows: RentRollRow[];
  totals: { due: number; collected: number; arrears: number };
}

export type MaintenanceStatus = 'open' | 'assigned' | 'in-progress' | 'resolved';
export type MaintenancePriority = 'low' | 'med' | 'high';
export type MaintenanceCategory = 'plumbing' | 'electrical' | 'heating' | 'appliance' | 'other';

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  leaseId: string | null;
  reportedById: string | null;
  assignedTo: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  description: string;
  status: MaintenanceStatus;
  cost: number | null;
  resolvedAt: string | null;
  createdAt: string;
  unit?: Unit;
  assignee?: User | null;
}

export interface DashboardData {
  kpis: {
    rentDue: number;
    collected: number;
    overdue: number;
    arrears: number;
    occupancy: number;
  };
  expiringLeases: {
    leaseId: string;
    unitNumber: string;
    tenantName: string;
    endDate: string;
    daysLeft: number;
  }[];
  unpaidUnits: {
    leaseId: string;
    unitNumber: string;
    tenantName: string;
    dueDate: string;
    amount: number;
    status: string;
  }[];
  openMaintenance: {
    id: string;
    unitNumber: string;
    description: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
  }[];
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
