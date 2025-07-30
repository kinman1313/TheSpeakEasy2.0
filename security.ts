// For Node.js, use require and .default for dompurify
// Make sure to install dompurify and jsdom: npm install dompurify jsdom
// For TypeScript types: npm install --save-dev @types/dompurify @types/jsdom
const createDOMPurify = require('dompurify').default;
import { JSDOM } from 'jsdom';

// Setup DOMPurify for Node.js
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

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