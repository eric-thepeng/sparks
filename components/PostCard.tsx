import React, { useState, useEffect } from 'react';
import { Heart, Play, AlertCircle } from 'lucide-react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLikeToggle: (id: string) => void;
  onClick: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onLikeToggle, onClick }) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when the post prop changes
  useEffect(() => {
    setHasError(false);
  }, [post.imageUrl]);

  const handleError = () => {
    console.warn(`Image failed to load for: ${post.title}, URL: ${post.imageUrl}`);
    setHasError(true);
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
              src={post.imageUrl} 
              alt={post.title} 
              className="w-full h-auto object-cover block min-h-[150px]"
              loading="lazy"
              onError={handleError}
            />
        ) : (
            <div 
                className="w-full flex flex-col items-center justify-center bg-red-50 border-2 border-dashed border-red-200 text-gray-400 p-4 relative"
                style={{ aspectRatio: `${post.width}/${post.height}` }}
            >
                <AlertCircle size={24} className="mb-2 text-red-400" />
                <span className="text-[10px] font-bold text-red-400 mb-1">图片加载失败</span>
                <span className="text-[8px] text-red-300 break-all px-2">{post.imageUrl}</span>
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