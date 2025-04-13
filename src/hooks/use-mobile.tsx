'use client'

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);
    
    // Create an event listener
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    
    // Add the listener to watch for changes
    mediaQuery.addEventListener("change", handler);
    
    // Remove the listener when component is unmounted
    return () => {
      mediaQuery.removeEventListener("change", handler);
    };
  }, [query]);

  return matches;
}
