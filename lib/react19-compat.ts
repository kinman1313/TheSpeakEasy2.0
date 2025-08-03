// React 19 Compatibility Layer
// This file handles compatibility issues between React 18 and React 19

if (typeof window !== 'undefined') {
  // Suppress React 19 ref warnings in development
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Accessing element.ref was removed in React 19') ||
       args[0].includes('Legacy ref callback') ||
       args[0].includes('String refs are deprecated'))
    ) {
      return; // Suppress these specific warnings
    }
    originalWarn.apply(console, args);
  };
}

export {};
