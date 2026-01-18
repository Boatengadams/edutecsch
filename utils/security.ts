/**
 * Edutec High-Security Utility
 * Implements strict validation, sanitization, and rate-limiting logic.
 */

export const sanitizeHTML = (html: string): string => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Remove all active content
  const scripts = div.getElementsByTagName('script');
  for (let i = scripts.length - 1; i >= 0; i--) {
    scripts[i].parentNode?.removeChild(scripts[i]);
  }
  
  const iframes = div.getElementsByTagName('iframe');
  for (let i = iframes.length - 1; i >= 0; i--) {
    iframes[i].parentNode?.removeChild(iframes[i]);
  }
  
  const allElements = div.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i];
    const attributes = el.attributes;
    for (let j = attributes.length - 1; j >= 0; j--) {
      const attrName = attributes[j].name.toLowerCase();
      // Block all on* handlers and javascript: URIs
      if (attrName.startsWith('on') || 
          (['src', 'href', 'xlink:href'].includes(attrName) && 
           attributes[j].value.toLowerCase().startsWith('javascript:'))) {
        el.removeAttribute(attributes[j].name);
      }
    }
  }
  return div.innerHTML;
};

const rateLimits: Record<string, number[]> = {};

export const checkRateLimit = (actionKey: string, limit: number = 5, windowMs: number = 60000): boolean => {
  const now = Date.now();
  if (!rateLimits[actionKey]) {
    rateLimits[actionKey] = [now];
    return true;
  }
  rateLimits[actionKey] = rateLimits[actionKey].filter(ts => now - ts < windowMs);
  if (rateLimits[actionKey].length >= limit) return false;
  rateLimits[actionKey].push(now);
  return true;
};

export const validateString = (input: any, min: number = 1, max: number = 5000): string => {
  if (typeof input !== 'string') throw new Error('Security: Expected string input');
  const trimmed = input.trim();
  if (trimmed.length < min || trimmed.length > max) {
      throw new Error(`Security: Input violates length constraints (${min}-${max})`);
  }
  return trimmed;
};