import { useState, useEffect } from 'react';
import { storage } from '../core/storage/storageManager';

export function useLocalAsset(assetId: string | null | undefined): { objectUrl: string | null; error: boolean; loading: boolean } {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!assetId) {
      setObjectUrl(null);
      setError(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    let active = true;

    storage.getAsset(assetId)
      .then((asset) => {
        if (!active) return;
        if (asset && asset.data) {
          const blob = asset.data instanceof Blob ? asset.data : new Blob([asset.data], { type: asset.mimeType });
          const url = URL.createObjectURL(blob);
          setObjectUrl(url);
          setError(false);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load local asset:', err);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      // Because setObjectUrl will lose the previous url reference, we can cleanup via a function state update trick, or better:
      // cleanup object url when unmounted or when objectUrl is replaced by new assetId
      setObjectUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, [assetId]);

  return { objectUrl, error, loading };
}
