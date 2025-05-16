/**
 * Form validation utilities
 */

/**
 * Validates a session name
 * @param name The session name to validate
 * @returns Error message or null if valid
 */
export function validateSessionName(name: string): string | null {
  if (!name.trim()) {
    return 'Session name is required';
  }
  
  if (name.length < 3) {
    return 'Session name must be at least 3 characters';
  }
  
  if (name.length > 50) {
    return 'Session name must be less than 50 characters';
  }
  
  return null;
}

/**
 * Validates a session description
 * @param description The session description to validate
 * @returns Error message or null if valid
 */
export function validateSessionDescription(description: string): string | null {
  if (description && description.length > 200) {
    return 'Description must be less than 200 characters';
  }
  
  return null;
}

/**
 * Validates a tag
 * @param tag The tag to validate
 * @returns Error message or null if valid
 */
export function validateTag(tag: string): string | null {
  if (!tag.trim()) {
    return 'Tag cannot be empty';
  }
  
  if (tag.length > 20) {
    return 'Tag must be less than 20 characters';
  }
  
  if (!/^[a-zA-Z0-9-_]+$/.test(tag)) {
    return 'Tag can only contain letters, numbers, hyphens, and underscores';
  }
  
  return null;
}

/**
 * Validates an array of tags
 * @param tags The tags to validate
 * @returns Error message or null if valid
 */
export function validateTags(tags: string[]): string | null {
  if (tags.length > 10) {
    return 'Maximum of 10 tags allowed';
  }
  
  for (const tag of tags) {
    const error = validateTag(tag);
    if (error) {
      return `Invalid tag "${tag}": ${error}`;
    }
  }
  
  // Check for duplicates
  const uniqueTags = new Set(tags);
  if (uniqueTags.size !== tags.length) {
    return 'Duplicate tags are not allowed';
  }
  
  return null;
}

/**
 * Validates a comma-separated string of tags
 * @param tagsString The comma-separated tags string
 * @returns Array of valid tags and array of errors
 */
export function validateTagsString(tagsString: string): { 
  tags: string[], 
  errors: string[] 
} {
  if (!tagsString.trim()) {
    return { tags: [], errors: [] };
  }
  
  const tags = tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  const errors: string[] = [];
  const validTags: string[] = [];
  
  for (const tag of tags) {
    const error = validateTag(tag);
    if (error) {
      errors.push(`Invalid tag "${tag}": ${error}`);
    } else {
      validTags.push(tag);
    }
  }
  
  // Check for duplicates
  const uniqueTags = new Set(validTags);
  if (uniqueTags.size !== validTags.length) {
    errors.push('Duplicate tags are not allowed');
  }
  
  return { 
    tags: [...uniqueTags],
    errors
  };
}

/**
 * Validates a URL
 * @param url The URL to validate
 * @returns Error message or null if valid
 */
export function validateUrl(url: string): string | null {
  if (!url.trim()) {
    return 'URL is required';
  }
  
  try {
    new URL(url);
    return null;
  } catch (e) {
    return 'Invalid URL format';
  }
}

/**
 * Validates a session cookie
 * @param cookie The cookie to validate
 * @returns Error message or null if valid
 */
export function validateCookie(cookie: { 
  name: string; 
  value: string; 
  domain: string; 
  path: string;
}): string | null {
  if (!cookie.name.trim()) {
    return 'Cookie name is required';
  }
  
  if (!cookie.domain.trim()) {
    return 'Cookie domain is required';
  }
  
  if (!cookie.path.trim()) {
    return 'Cookie path is required';
  }
  
  return null;
}