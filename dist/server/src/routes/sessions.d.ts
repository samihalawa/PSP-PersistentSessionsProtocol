import { Application } from 'express';
import { StorageProvider } from '../../core/src';
/**
 * Sets up session routes
 */
export declare function setupSessionRoutes(app: Application, storageProvider: StorageProvider): void;
