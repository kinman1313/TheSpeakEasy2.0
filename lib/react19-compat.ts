// React 19 Compatibility Utilities
// This file helps suppress warnings and provides compatibility for React 19 changes

export function suppressReact19RefWarnings() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // List of React 19 warnings to suppress
  const suppressedWarnings = [
    'Accessing element.ref was removed in React 19',
    'ref is now a regular prop',
    'It will be removed from the JSX Element type in a future release'
  ];

  // Override console.error
  console.error = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      const shouldSuppress = suppressedWarnings.some(warning => 
        message.includes(warning)
      );
      if (shouldSuppress) {
        return; // Suppress the warning
      }
    }
    originalError.apply(console, args);
  };

  // Override console.warn
  console.warn = (...args: any[]) => {
    const message = args[0];
    if (typeof message === 'string') {
      const shouldSuppress = suppressedWarnings.some(warning => 
        message.includes(warning)
      );
      if (shouldSuppress) {
        return; // Suppress the warning
      }
    }
    originalWarn.apply(console, args);
  };

  // Log that suppression is active
  console.log('🔧 React 19 ref warnings suppressed in development mode');
}

// Utility to check if we're in a React 19 compatible environment
export function isReact19Compatible(): boolean {
  try {
    // Check if React version supports the new ref behavior
    const React = require('react');
    const version = React.version;
    const majorVersion = parseInt(version.split('.')[0], 10);
    return majorVersion >= 19;
  } catch {
    return false;
  }
}

// Initialize suppression when this module is imported
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  suppressReact19RefWarnings();
} 