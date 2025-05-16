/**
 * Form validation utilities
 */
/**
 * Validates a session name
 * @param name The session name to validate
 * @returns Error message or null if valid
 */
export declare function validateSessionName(name: string): string | null;
/**
 * Validates a session description
 * @param description The session description to validate
 * @returns Error message or null if valid
 */
export declare function validateSessionDescription(description: string): string | null;
/**
 * Validates a tag
 * @param tag The tag to validate
 * @returns Error message or null if valid
 */
export declare function validateTag(tag: string): string | null;
/**
 * Validates an array of tags
 * @param tags The tags to validate
 * @returns Error message or null if valid
 */
export declare function validateTags(tags: string[]): string | null;
/**
 * Validates a comma-separated string of tags
 * @param tagsString The comma-separated tags string
 * @returns Array of valid tags and array of errors
 */
export declare function validateTagsString(tagsString: string): {
    tags: string[];
    errors: string[];
};
/**
 * Validates a URL
 * @param url The URL to validate
 * @returns Error message or null if valid
 */
export declare function validateUrl(url: string): string | null;
/**
 * Validates a session cookie
 * @param cookie The cookie to validate
 * @returns Error message or null if valid
 */
export declare function validateCookie(cookie: {
    name: string;
    value: string;
    domain: string;
    path: string;
}): string | null;
