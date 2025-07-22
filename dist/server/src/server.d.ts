import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { StorageProvider } from '@psp/core';
export interface ServerConfig {
    port: number;
    host: string;
    storageType: 'local' | 'redis' | 'database' | 'cloud';
    storageOptions?: Record<string, any>;
    authEnabled?: boolean;
    corsOptions?: cors.CorsOptions;
}
/**
 * Main server class for PSP
 */
export declare class Server {
    private app;
    private server;
    private wss;
    private storageProvider;
    private config;
    private logger;
    private isInitialized;
    /**
     * Create a new server instance
     */
    constructor(config: ServerConfig);
    /**
     * Initialize the server
     */
    initialize(): Promise<void>;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get the Express app
     */
    getApp(): express.Application;
    /**
     * Get the HTTP server
     */
    getServer(): http.Server | null;
    /**
     * Get the WebSocket server
     */
    getWss(): WebSocketServer | null;
    /**
     * Get the storage provider
     */
    getStorageProvider(): StorageProvider | null;
}
