
'use client';

import { useState, useEffect, useCallback } from 'react';

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    // This part runs only on the client initially
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  // useEffect to update local storage when the state changes
  useEffect(() => {
    // This effect should only run on the client
    if (typeof window !== 'undefined') {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = storedValue;
            // Save state
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            // A more advanced implementation would handle the error case
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }
     // Only re-run the effect if storedValue changes
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, storedValue]);


  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = useCallback((value: T | ((val: T) => T)) => {
        // Allow value to be a function so we have the same API as useState
        setStoredValue(prevValue => {
            const valueToStore = value instanceof Function ? value(prevValue) : value;
             return valueToStore;
        });

  }, []);


   // Re-hydrate state from localStorage on mount if it differs from initial server render
   // This prevents hydration mismatches if localStorage was populated on a previous visit
   useEffect(() => {
    if (typeof window !== 'undefined') {
        try {
            const item = window.localStorage.getItem(key);
            const localValue = item ? JSON.parse(item) : initialValue;
             // Check if the current state is different from localStorage and update if necessary
             // Use JSON.stringify for comparison to handle object/array equality correctly
            if (JSON.stringify(storedValue) !== JSON.stringify(localValue)) {
                setStoredValue(localValue);
            }
        } catch (error) {
             console.error(`Error re-hydrating localStorage key “${key}”:`, error);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [key]); // Run only once on mount

  return [storedValue, setValue];
}

export default useLocalStorage;
