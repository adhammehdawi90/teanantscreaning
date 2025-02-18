import { useEffect, useRef, useState } from 'react';
import { VideoDebug } from './VideoDebug';

interface VideoPreviewProps {
  src: string;
  type?: string;
  className?: string;
}

export function VideoPreview({ src, type = 'video/webm', className = '' }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (e: Event) => {
      console.error('Video error:', e);
      setError('Failed to load video');
    };

    video.addEventListener('error', handleError);
    return () => video.removeEventListener('error', handleError);
  }, []);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className={`w-full ${className}`}
        controls
        playsInline
        preload="metadata"
      >
        <source src={src} type={type} />
        {error || 'Your browser does not support the video tag.'}
      </video>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
          {error}
        </div>
      )}
      {process.env.NODE_ENV === 'development' && <VideoDebug src={src} />}
    </div>
  );
}
