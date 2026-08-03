import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('leaseledger_token');
  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: 'Bearer '.concat(token) },
    });
    return next(cloned);
  }
  return next(req);
};
