import { useEffect, useState } from 'react';

interface VideoDebugProps {
  src: string;
}

export function VideoDebug({ src }: VideoDebugProps) {
  const [debug, setDebug] = useState<{exists: boolean; size?: number; error?: string}>();

  useEffect(() => {
    const checkVideo = async () => {
      try {
        const response = await fetch(src, { method: 'HEAD' });
        if (response.ok) {
          setDebug({
            exists: true,
            size: Number(response.headers.get('content-length')),
          });
        } else {
          setDebug({
            exists: false,
            error: `HTTP ${response.status}: ${response.statusText}`
          });
        }
      } catch (error) {
        setDebug({
          exists: false,
          error: error.message
        });
      }
    };

    checkVideo();
  }, [src]);

  return (
    <div className="text-sm text-gray-500 mt-2">
      <p>Video URL: {src}</p>
      <p>Status: {debug?.exists ? 'Available' : 'Not available'}</p>
      {debug?.size && <p>Size: {(debug.size / 1024 / 1024).toFixed(2)} MB</p>}
      {debug?.error && <p className="text-red-500">Error: {debug.error}</p>}
    </div>
  );
}
