import DOMPurify from 'dompurify';

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