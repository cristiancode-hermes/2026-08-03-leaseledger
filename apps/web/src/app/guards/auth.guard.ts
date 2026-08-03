import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.hasToken()) return true;
  return router.parseUrl('/login');
};

/** Role gate — reads route data.roles and compares with the current user's role. */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = (route.data?.['roles'] as string[] | undefined) ?? [];
  const user = auth.currentUser();
  if (allowed.length === 0) return true;
  if (user && allowed.includes(user.role)) return true;
  // Fall back: user may exist but not be loaded yet — try to fetch once.
  if (user === null) {
    void auth.loadUser().then(() => {
      const u = auth.currentUser();
      if (u && allowed.includes(u.role)) void router.navigate(['/dashboard']);
      else void router.navigate(['/login']);
    });
    return false;
  }
  return router.parseUrl('/login');
};
