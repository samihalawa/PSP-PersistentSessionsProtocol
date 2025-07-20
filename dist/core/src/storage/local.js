"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
/**
 * A storage provider that saves sessions to the local filesystem
 */
class LocalStorageProvider {
    /**
     * Creates a new LocalStorageProvider
     * @param options.directory Directory to store sessions in (defaults to ~/.psp/sessions)
     */
    constructor(options) {
        this.baseDir =
            options?.directory || path.join(os.homedir(), '.psp', 'sessions');
        // Ensure the directory exists
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    /**
     * Save a session to storage
     */
    async save(session) {
        const filePath = this.getFilePath(session.metadata.id);
        // Ensure the session directory exists
        const dirPath = path.dirname(filePath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        // Convert Maps to objects for serialization
        const serializedState = this.serializeState(session.state);
        // Write the session to disk
        fs.writeFileSync(filePath, JSON.stringify({
            metadata: session.metadata,
            state: serializedState,
        }, null, 2));
    }
    /**
     * Load a session from storage
     */
    async load(id) {
        const filePath = this.getFilePath(id);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Session with ID ${id} not found`);
        }
        // Read and parse the session
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Convert objects back to Maps
        const deserializedState = this.deserializeState(data.state);
        return {
            metadata: data.metadata,
            state: deserializedState,
        };
    }
    /**
     * Delete a session from storage
     */
    async delete(id) {
        const filePath = this.getFilePath(id);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    /**
     * List sessions matching the filter
     */
    async list(filter) {
        // Get all session files
        const sessionFiles = this.getSessionFiles();
        // Read and parse metadata from each file
        const metadata = [];
        for (const file of sessionFiles) {
            try {
                const data = JSON.parse(fs.readFileSync(file, 'utf8'));
                metadata.push(data.metadata);
            }
            catch (error) {
                console.error(`Error reading session file: ${file}`, error);
            }
        }
        // Apply filters
        let filtered = metadata;
        if (filter) {
            if (filter.name) {
                filtered = filtered.filter((m) => m.name.toLowerCase().includes(filter.name.toLowerCase()));
            }
            if (filter.tags && filter.tags.length > 0) {
                filtered = filtered.filter((m) => filter.tags.every((tag) => m.tags?.includes(tag)));
            }
            if (filter.created) {
                if (filter.created.from) {
                    filtered = filtered.filter((m) => m.createdAt >= filter.created.from);
                }
                if (filter.created.to) {
                    filtered = filtered.filter((m) => m.createdAt <= filter.created.to);
                }
            }
            if (filter.updated) {
                if (filter.updated.from) {
                    filtered = filtered.filter((m) => m.updatedAt >= filter.updated.from);
                }
                if (filter.updated.to) {
                    filtered = filtered.filter((m) => m.updatedAt <= filter.updated.to);
                }
            }
            // Sort by updated time (newest first)
            filtered.sort((a, b) => b.updatedAt - a.updatedAt);
            // Apply limit and offset
            if (filter.offset) {
                filtered = filtered.slice(filter.offset);
            }
            if (filter.limit) {
                filtered = filtered.slice(0, filter.limit);
            }
        }
        return filtered;
    }
    /**
     * Check if a session exists
     */
    async exists(id) {
        const filePath = this.getFilePath(id);
        return fs.existsSync(filePath);
    }
    /**
     * Gets the file path for a session ID
     */
    getFilePath(id) {
        // Create a directory structure to avoid too many files in one directory
        // Use the first 2 characters of the ID for the directory
        const prefix = id.substring(0, 2);
        return path.join(this.baseDir, prefix, `${id}.json`);
    }
    /**
     * Get all session files
     */
    getSessionFiles() {
        const files = [];
        // Get all subdirectories
        const dirs = fs
            .readdirSync(this.baseDir)
            .filter((file) => fs.statSync(path.join(this.baseDir, file)).isDirectory());
        // Get all JSON files in each subdirectory
        for (const dir of dirs) {
            const dirPath = path.join(this.baseDir, dir);
            const dirFiles = fs
                .readdirSync(dirPath)
                .filter((file) => file.endsWith('.json'))
                .map((file) => path.join(dirPath, file));
            files.push(...dirFiles);
        }
        return files;
    }
    /**
     * Serialize state for JSON storage (convert Maps to objects)
     */
    serializeState(state) {
        const serialized = { ...state };
        // Convert localStorage Map
        if (state.storage?.localStorage instanceof Map) {
            serialized.storage = { ...serialized.storage };
            const localStorage = {};
            for (const [origin, storage] of state.storage.localStorage.entries()) {
                localStorage[origin] = Object.fromEntries(storage);
            }
            serialized.storage.localStorage = localStorage;
        }
        // Convert sessionStorage Map
        if (state.storage?.sessionStorage instanceof Map) {
            serialized.storage = { ...serialized.storage };
            const sessionStorage = {};
            for (const [origin, storage] of state.storage.sessionStorage.entries()) {
                sessionStorage[origin] = Object.fromEntries(storage);
            }
            serialized.storage.sessionStorage = sessionStorage;
        }
        // Convert other Maps in the state (recursively if needed)
        return serialized;
    }
    /**
     * Deserialize state from JSON storage (convert objects to Maps)
     */
    deserializeState(state) {
        const deserialized = { ...state };
        // Convert localStorage object to Map
        if (state.storage?.localStorage &&
            typeof state.storage.localStorage === 'object') {
            deserialized.storage = { ...deserialized.storage };
            const localStorage = new Map();
            for (const [origin, storage] of Object.entries(state.storage.localStorage)) {
                localStorage.set(origin, new Map(Object.entries(storage)));
            }
            deserialized.storage.localStorage = localStorage;
        }
        // Convert sessionStorage object to Map
        if (state.storage?.sessionStorage &&
            typeof state.storage.sessionStorage === 'object') {
            deserialized.storage = { ...deserialized.storage };
            const sessionStorage = new Map();
            for (const [origin, storage] of Object.entries(state.storage.sessionStorage)) {
                sessionStorage.set(origin, new Map(Object.entries(storage)));
            }
            deserialized.storage.sessionStorage = sessionStorage;
        }
        // Convert other objects to Maps (recursively if needed)
        return deserialized;
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
