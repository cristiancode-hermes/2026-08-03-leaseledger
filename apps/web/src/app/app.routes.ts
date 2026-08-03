import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/auth.guard';
import { LayoutShell } from './layout/layout-shell/layout-shell';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
    title: 'Sign in — LeaseLedger',
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then((m) => m.RegisterPage),
    title: 'Create account — LeaseLedger',
  },
  {
    path: '',
    component: LayoutShell,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
        title: 'Dashboard — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'my-lease',
        loadComponent: () => import('./pages/my-lease/my-lease').then((m) => m.MyLeasePage),
        title: 'My lease — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['tenant'] },
      },
      {
        path: 'properties',
        loadComponent: () => import('./pages/properties/properties').then((m) => m.PropertiesPage),
        title: 'Properties — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'properties/new',
        loadComponent: () => import('./pages/property-form/property-form').then((m) => m.PropertyFormPage),
        title: 'New property — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'properties/:id',
        loadComponent: () => import('./pages/property-detail/property-detail').then((m) => m.PropertyDetailPage),
        title: 'Property — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'properties/:id/edit',
        loadComponent: () => import('./pages/property-form/property-form').then((m) => m.PropertyFormPage),
        title: 'Edit property — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'units/:id',
        loadComponent: () => import('./pages/unit-detail/unit-detail').then((m) => m.UnitDetailPage),
        title: 'Unit — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'tenants',
        loadComponent: () => import('./pages/tenants/tenants').then((m) => m.TenantsPage),
        title: 'Tenants — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'tenants/new',
        loadComponent: () => import('./pages/tenant-form/tenant-form').then((m) => m.TenantFormPage),
        title: 'New tenant — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'tenants/:id',
        loadComponent: () => import('./pages/tenant-detail/tenant-detail').then((m) => m.TenantDetailPage),
        title: 'Tenant — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'tenants/:id/edit',
        loadComponent: () => import('./pages/tenant-form/tenant-form').then((m) => m.TenantFormPage),
        title: 'Edit tenant — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'leases/new',
        loadComponent: () => import('./pages/lease-form/lease-form').then((m) => m.LeaseFormPage),
        title: 'New lease — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'leases/:id',
        loadComponent: () => import('./pages/lease-detail/lease-detail').then((m) => m.LeaseDetailPage),
        title: 'Lease — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'payments',
        loadComponent: () => import('./pages/payments/payments').then((m) => m.PaymentsPage),
        title: 'Rent roll — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
      {
        path: 'maintenance',
        loadComponent: () => import('./pages/maintenance/maintenance').then((m) => m.MaintenancePage),
        title: 'Maintenance — LeaseLedger',
        canActivate: [roleGuard],
        data: { roles: ['landlord', 'manager'] },
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
    title: 'Not found — LeaseLedger',
  },
];
