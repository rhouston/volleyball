import type { ServiceRegistry } from './interfaces';
import { createInMemoryServices } from './in_memory_services';

const globalServices = globalThis as unknown as { serviceRegistry?: ServiceRegistry };

export const services: ServiceRegistry = globalServices.serviceRegistry ?? createInMemoryServices();

if (!globalServices.serviceRegistry) {
  globalServices.serviceRegistry = services;
}
