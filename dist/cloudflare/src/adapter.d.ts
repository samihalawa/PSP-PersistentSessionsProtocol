import { Adapter, BrowserSessionState, AdapterOptions } from '@psp/core';
/**
 * Cloudflare KV namespace storage configuration
 */
interface CloudflareKVConfig {
    /**
     * Type identifier for Cloudflare KV storage
     */
    type: 'cloudflare-kv';
    /**
     * KV namespace to use for storage
     */
    namespace: KVNamespace;
    /**
     * Optional prefix for keys in the KV namespace
     */
    keyPrefix?: string;
}
/**
 * Options for configuring the Cloudflare adapter
 */
export interface CloudflareAdapterOptions extends AdapterOptions {
    /**
     * Cloudflare-specific storage configuration
     */
    storageProvider?: CloudflareKVConfig;
}
/**
 * Adapter implementation for Cloudflare Browser Rendering
 */
export declare class CloudflareAdapter extends Adapter {
    private renderer;
    private options;
    /**
     * Creates a new CloudflareAdapter instance
     *
     * @param options Configuration options for the adapter
     */
    constructor(options?: CloudflareAdapterOptions);
    /**
     * Connects the adapter to a Cloudflare browser renderer instance
     *
     * @param renderer The Cloudflare browser renderer instance
     */
    connect(renderer: any): Promise<void>;
    /**
     * Captures the current browser state
     *
     * @returns The captured browser session state
     */
    captureState(): Promise<BrowserSessionState>;
    /**
     * Applies a previously captured browser state to the current renderer
     *
     * @param state The browser session state to apply
     */
    applyState(state: BrowserSessionState): Promise<void>;
    /**
     * Normalizes cookies to a common format
     *
     * @param cookies The cookies array from Cloudflare
     * @returns Normalized cookies array
     */
    private normalizeCookies;
    /**
     * Maps storage objects to the PSP storage format
     *
     * @param storageObj The storage object (localStorage or sessionStorage)
     * @param origin The origin for which the storage applies
     * @returns Mapped storage in PSP format
     */
    private mapStorage;
}
export {};
