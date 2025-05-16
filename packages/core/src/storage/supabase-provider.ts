import { StorageProvider } from './provider';

/**
 * Supabase Storage Provider Configuration Options
 */
export interface SupabaseStorageProviderOptions {
  /** Supabase project URL */
  url: string;

  /** Supabase API key */
  apiKey: string;

  /** Storage bucket to use */
  bucket: string;

  /** Path prefix for session files */
  prefix?: string;
}

/**
 * Supabase Storage Provider for Persistent Sessions Protocol
 * 
 * Stores session data in Supabase Storage and optionally tracks metadata
 * in a Supabase database table.
 */
export class SupabaseStorageProvider implements StorageProvider {
  private url: string;
  private apiKey: string;
  private bucket: string;
  private prefix: string;

  /**
   * Create a new Supabase storage provider
   */
  constructor(options: SupabaseStorageProviderOptions) {
    this.url = options.url;
    this.apiKey = options.apiKey;
    this.bucket = options.bucket;
    this.prefix = options.prefix || 'sessions/';

    // Ensure prefix ends with a slash
    if (!this.prefix.endsWith('/')) {
      this.prefix += '/';
    }
  }

  /**
   * Create Supabase client dynamically
   */
  private async getClient() {
    try {
      // Dynamic import to avoid bundling issues
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(this.url, this.apiKey);
    } catch (error) {
      throw new Error(`Failed to create Supabase client: ${(error as Error).message}. Make sure @supabase/supabase-js is installed.`);
    }
  }

  /**
   * Save session data to Supabase Storage
   */
  async save(id: string, data: any): Promise<void> {
    const supabase = await this.getClient();
    const filePath = `${this.prefix}${id}.json`;
    
    // Serialize data
    const serializedData = JSON.stringify(data);
    const blob = new Blob([serializedData], { type: 'application/json' });
    
    // Upload file
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(filePath, blob, {
        upsert: true,
        contentType: 'application/json'
      });

    if (error) {
      throw new Error(`Failed to save session to Supabase: ${error.message}`);
    }

    // Update metadata in database if enabled and data contains metadata
    if (data.metadata) {
      await this.saveMetadata(id, data.metadata);
    }
  }

  /**
   * Load session data from Supabase Storage
   */
  async load(id: string): Promise<any> {
    const supabase = await this.getClient();
    const filePath = `${this.prefix}${id}.json`;
    
    // Download file
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(filePath);

    if (error) {
      if (error.message.includes('Not Found')) {
        throw new Error(`Session not found: ${id}`);
      }
      throw new Error(`Failed to load session from Supabase: ${error.message}`);
    }

    // Parse JSON
    const text = await data.text();
    return JSON.parse(text);
  }

  /**
   * Delete session data from Supabase Storage
   */
  async delete(id: string): Promise<void> {
    const supabase = await this.getClient();
    const filePath = `${this.prefix}${id}.json`;
    
    // Delete file
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete session from Supabase: ${error.message}`);
    }

    // Also delete from metadata table if enabled
    await this.deleteMetadata(id);
  }

  /**
   * List available sessions in Supabase Storage
   */
  async list(filter?: any): Promise<any[]> {
    const supabase = await this.getClient();
    
    // If using database metadata and filter is provided, query from database
    if (filter && Object.keys(filter).length > 0) {
      return this.listFromMetadata(filter);
    }
    
    // Otherwise list from storage
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .list(this.prefix, {
        limit: 1000,
        offset: filter?.offset || 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw new Error(`Failed to list sessions from Supabase: ${error.message}`);
    }

    // Extract session IDs from file paths
    return (data || [])
      .filter(item => item.name.endsWith('.json'))
      .map(item => ({
        id: item.name.replace('.json', ''),
        size: item.metadata?.size,
        lastModified: item.metadata?.lastModified
      }));
  }

  /**
   * Check if a session exists in Supabase Storage
   */
  async exists(id: string): Promise<boolean> {
    try {
      const supabase = await this.getClient();
      const filePath = `${this.prefix}${id}.json`;
      
      const { data, error } = await supabase.storage
        .from(this.bucket)
        .list(this.prefix, {
          limit: 1,
          search: id
        });

      if (error || !data || !data.length) {
        return false;
      }

      return data.some(item => item.name === `${id}.json`);
    } catch (error) {
      return false;
    }
  }

  /**
   * Save session metadata to Supabase database
   */
  private async saveMetadata(id: string, metadata: any): Promise<void> {
    const supabase = await this.getClient();
    
    // Check if the sessions table exists
    const { error: tableCheckError } = await supabase
      .from('psp_sessions')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, skip metadata
    if (tableCheckError) {
      return;
    }
    
    // Prepare metadata record
    const record = {
      id,
      name: metadata.name || `Session ${id}`,
      description: metadata.description,
      origin: metadata.origin,
      created_at: metadata.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: metadata.expires_at,
      tags: metadata.tags || [],
      created_by: metadata.created_by,
      framework: metadata.framework
    };
    
    // Insert or update metadata
    const { error } = await supabase
      .from('psp_sessions')
      .upsert(record);
    
    if (error) {
      console.warn(`Failed to save session metadata: ${error.message}`);
    }
  }

  /**
   * Delete session metadata from Supabase database
   */
  private async deleteMetadata(id: string): Promise<void> {
    const supabase = await this.getClient();
    
    // Check if the sessions table exists
    const { error: tableCheckError } = await supabase
      .from('psp_sessions')
      .select('id')
      .limit(1);
    
    // If table doesn't exist, nothing to do
    if (tableCheckError) {
      return;
    }
    
    // Delete metadata
    const { error } = await supabase
      .from('psp_sessions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.warn(`Failed to delete session metadata: ${error.message}`);
    }
  }

  /**
   * List sessions from metadata table with filtering
   */
  private async listFromMetadata(filter: any): Promise<any[]> {
    const supabase = await this.getClient();
    
    // Start query
    let query = supabase
      .from('psp_sessions')
      .select('*');
    
    // Apply filters
    if (filter.name) {
      query = query.ilike('name', `%${filter.name}%`);
    }
    
    if (filter.origin) {
      query = query.ilike('origin', `%${filter.origin}%`);
    }
    
    if (filter.tags && filter.tags.length) {
      query = query.contains('tags', filter.tags);
    }
    
    if (filter.created_after) {
      query = query.gte('created_at', filter.created_after);
    }
    
    if (filter.created_before) {
      query = query.lte('created_at', filter.created_before);
    }
    
    if (filter.created_by) {
      query = query.eq('created_by', filter.created_by);
    }
    
    if (filter.framework) {
      query = query.eq('framework', filter.framework);
    }
    
    // Pagination
    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    
    if (filter.offset) {
      query = query.offset(filter.offset);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.warn(`Failed to list sessions from metadata: ${error.message}`);
      return [];
    }
    
    return data || [];
  }
}