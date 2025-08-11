// Setup DOMPurify for Node.js with jsdom (ESM style imports)
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Setup DOMPurify for Node.js
const windowInstance = new JSDOM('').window;
// Create a WindowLike object (jsdom window already has needed constructors, casting to globalThis shape satisfies types)
const DOMPurify = createDOMPurify(windowInstance as unknown as typeof globalThis);

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  });
};

export const validateMessage = (message: string): boolean => {
  if (!message || message.trim().length === 0) return false;
  if (message.length > 2000) return false; // Max length
  return true;
};