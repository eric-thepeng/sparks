import React, { useState, useEffect, useMemo } from 'react';
import { Heart, Play, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLikeToggle: (id: string) => void;
  onClick: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onLikeToggle, onClick }) => {
  // Image Loading Logic
  const [currentSrc, setCurrentSrc] = useState(post.imageUrl);
  const [attemptIndex, setAttemptIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Reset state when the post prop changes (e.g. during shuffling or filtering)
  useEffect(() => {
    setCurrentSrc(post.imageUrl);
    setAttemptIndex(0);
    setHasError(false);
  }, [post.imageUrl]);

  // Generate candidates for auto-correction
  const candidates = useMemo(() => {
    const originalUrl = post.imageUrl;
    // Strip extension to get base path: /tempData/images/abc
    const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('.')); 
    
    // Check if the folder might be singular 'image' instead of 'images'
    const singularPath = originalUrl.replace('/images/', '/image/');

    return [
        // 1. Base path (no extension)
        basePath,
        // 2. Uppercase PNG (common issue on case-sensitive servers)
        basePath + '.PNG',
        // 3. JPG alternatives
        basePath + '.jpg',
        basePath + '.jpeg',
        // 4. Singular folder path
        singularPath
    ];
  }, [post.imageUrl]);

  const handleError = () => {
    // 1. If we are currently showing a fallback image and IT failed, show the error UI.
    if (currentSrc.includes('picsum.photos')) {
        setHasError(true);
        return;
    }

    // 2. Try next local candidate
    if (attemptIndex < candidates.length) {
        const nextSrc = candidates[attemptIndex];
        setAttemptIndex(prev => prev + 1);
        setCurrentSrc(nextSrc);
    } 
    // 3. If all local attempts fail, switch to a high-quality online placeholder
    else {
        // Use post ID as seed to ensure the same post always gets the same random image
        const fallbackUrl = `https://picsum.photos/seed/${post.id}/${post.width}/${post.height}`;
        console.warn(`Local image failed for ${post.title}. Falling back to: ${fallbackUrl}`);
        setCurrentSrc(fallbackUrl);
    }
  };

  const formatLikes = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div 
      className="bg-white rounded-xl overflow-hidden shadow-sm break-inside-avoid mb-2 group cursor-pointer transition-transform hover:-translate-y-1 duration-300"
      onClick={() => onClick(post)}
    >
      <div className="relative overflow-hidden w-full bg-gray-100">
        {!hasError ? (
            <img 
              src={currentSrc} 
              alt={post.title} 
              className="w-full h-auto object-cover block min-h-[150px]"
              loading="lazy"
              onError={handleError}
            />
        ) : (
            <div 
                className="w-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 text-gray-400 p-4 relative"
                style={{ aspectRatio: `${post.width}/${post.height}` }}
            >
                <AlertCircle size={24} className="mb-2 text-red-400" />
                <span className="text-[10px] font-bold text-red-400 mb-1">Image Unavailable</span>
            </div>
        )}

        {post.type === 'video' && (
             <div className="absolute top-2 right-2 bg-black/30 backdrop-blur-sm rounded-full p-1">
                 <Play size={12} className="text-white fill-white" />
             </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-gray-900 font-medium text-[15px] leading-snug line-clamp-2 mb-2">
          {post.title}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <img 
              src={post.user.avatar} 
              alt={post.user.name} 
              className="w-4 h-4 rounded-full object-cover shrink-0 border border-gray-100"
            />
            <span className="text-xs text-gray-500 truncate">{post.user.name}</span>
          </div>

          <div 
            className="flex items-center gap-1 shrink-0 cursor-pointer group/like"
            onClick={(e) => {
                e.stopPropagation();
                onLikeToggle(post.id);
            }}
          >
            <Heart 
              size={14} 
              className={`transition-all duration-300 ${post.isLiked ? 'fill-brand text-brand scale-110' : 'text-gray-400 group-hover/like:text-gray-600'}`} 
            />
            <span className={`text-xs ${post.isLiked ? 'text-gray-700' : 'text-gray-400'}`}>
              {post.isLiked ? formatLikes(post.likes + 1) : formatLikes(post.likes)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};