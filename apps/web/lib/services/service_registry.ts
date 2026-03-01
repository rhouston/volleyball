import type { ServiceRegistry } from './interfaces';
import { createInMemoryServices } from './in_memory_services';
import { getEnv } from '@/lib/config/env';
import { createRequire } from 'node:module';

const globalServices = globalThis as unknown as { serviceRegistry?: ServiceRegistry };
const require = createRequire(import.meta.url);

function resolveServiceBackend(): 'memory' | 'prisma' {
  const env = getEnv();

  if (env.NODE_ENV === 'test') {
    return 'memory';
  }

  if (env.SERVICE_BACKEND === 'memory' || env.SERVICE_BACKEND === 'prisma') {
    return env.SERVICE_BACKEND;
  }

  return env.DATABASE_URL ? 'prisma' : 'memory';
}

function createServices(): ServiceRegistry {
  if (resolveServiceBackend() === 'prisma') {
    const { createPrismaServices } = require('../../server/services/prisma_services') as {
      createPrismaServices: () => ServiceRegistry;
    };
    return createPrismaServices();
  }

  return createInMemoryServices();
}

export const services: ServiceRegistry = globalServices.serviceRegistry ?? createServices();

if (!globalServices.serviceRegistry) {
  globalServices.serviceRegistry = services;
}
