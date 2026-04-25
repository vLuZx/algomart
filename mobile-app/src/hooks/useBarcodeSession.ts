import { useRef, useState } from 'react';

export function useBarcodeSession() {
  const scanned = useRef<Set<string>>(new Set());
  const [results, setResults] = useState<string[]>([]);

  const onBarcodeScanned = (barcode: string) => {
    if (!scanned.current.has(barcode)) {
      scanned.current.add(barcode);
      setResults((prev) => [...prev, barcode]);
      return true;
    }
    return false;
  };

  const resetSession = () => {
    scanned.current.clear();
    setResults([]);
  };

  return { results, onBarcodeScanned, resetSession };
}
