import { useState, useEffect } from 'react';

interface NetworkInfo {
  isOnline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  isSlowConnection: boolean;
}

// Extend Navigator interface for network information
declare global {
  interface Navigator {
    connection?: {
      effectiveType: string;
      downlink: number;
      rtt: number;
      saveData: boolean;
    };
  }
}

export const useNetworkStatus = (): NetworkInfo => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        isOnline: true,
        isSlowConnection: false
      };
    }

    const connection = navigator.connection;
    const isSlowConnection = connection?.effectiveType === '2g' || 
                            connection?.effectiveType === 'slow-2g' ||
                            (connection?.downlink && connection.downlink < 1);

    return {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      isSlowConnection: isSlowConnection || false
    };
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = navigator.connection;
      const isSlowConnection = connection?.effectiveType === '2g' || 
                              connection?.effectiveType === 'slow-2g' ||
                              (connection?.downlink && connection.downlink < 1);

      setNetworkInfo({
        isOnline: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
        isSlowConnection: isSlowConnection || false
      });
    };

    const handleOnline = () => updateNetworkInfo();
    const handleOffline = () => updateNetworkInfo();
    const handleConnectionChange = () => updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkInfo;
};