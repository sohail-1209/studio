
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Initialize state directly if window is available
    // This provides a more accurate initial value than defaulting to undefined or false
    if (typeof window !== "undefined") {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    // Default for environments where window is not immediately available (e.g., SSR, though this is client-side)
    // On the client, useEffect will quickly correct this if needed.
    return false; 
  });

  React.useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);
    
    // Call handler right away once component is mounted to ensure state is correct,
    // especially if the initial useState couldn't access window.innerWidth or if it changed post-SSR.
    handleResize(); 

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return isMobile; // State is now always a boolean
}

