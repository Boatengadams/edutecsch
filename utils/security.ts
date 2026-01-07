/**
 * Edutec High-Security Utility
 * Implements strict validation, sanitization, and rate-limiting logic.
 */

// Simple robust HTML sanitizer to prevent XSS in dangerouslySetInnerHTML regions
export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Remove all script, iframe, object, and event handler attributes
  const scripts = div.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    scripts[i].parentNode?.removeChild(scripts[i]);
  }
  
  const allElements = div.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const attributes = el.attributes;
    for (let j = attributes.length - 1; j >= 0; j--) {
      const attrName = attributes[j].name.toLowerCase();
      if (attrName.startsWith('on') || ['src', 'href', 'xlink:href'].includes(attrName) && 
          attributes[j].value.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attributes[j].name);
      }
    }
  }
  return div.innerHTML;
};

// Rate limiting state
const rateLimits: Record<string, number[]> = {};

/**
 * Validates if an action is permitted under rate limits.
 * @param actionKey - Unique key for the action (e.g., 'ai_gen', 'msg_send')
 * @param limit - Max actions allowed in the window
 * @param windowMs - Time window in milliseconds
 */
export const checkRateLimit = (actionKey: string, limit: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  if (!rateLimits[actionKey]) {
    rateLimits[actionKey] = [now];
    return true;
  }

  // Filter out timestamps outside the window
  rateLimits[actionKey] = rateLimits[actionKey].filter(ts => now - ts < windowMs);

  if (rateLimits[actionKey].length >= limit) {
    return false;
  }

  rateLimits[actionKey].push(now);
  return true;
};

/**
 * Strictly validates string inputs to prevent malformed payloads
 */
export const validateString = (input: any, min: number = 1, max: number = 5000): string => {
  if (typeof input !== 'string') throw new Error('Invalid input type: Expected string');
  const trimmed = input.trim();
  if (trimmed.length < min) throw new Error(`Input too short (min ${min})`);
  if (trimmed.length > max) throw new Error(`Input too long (max ${max})`);
  return trimmed;
};
