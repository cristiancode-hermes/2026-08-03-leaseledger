import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  root() {
    return {
      name: 'LeaseLedger API',
      version: '1.0.0',
      docs: '/api/docs',
    };
  }

  health() {
    return { status: 'ok', time: new Date().toISOString() };
  }
}
