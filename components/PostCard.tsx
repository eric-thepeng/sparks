
import React from 'react';
import { Heart, Play } from 'lucide-react';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
  onLikeToggle: (id: string) => void;
  onClick: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, onLikeToggle, onClick }) => {
  // Format huge numbers for display
  const formatLikes = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div 
      className="bg-white rounded-xl overflow-hidden shadow-sm break-inside-avoid mb-2 group cursor-pointer transition-transform hover:-translate-y-1 duration-300"
      onClick={() => onClick(post)}
    >
      <div className="relative overflow-hidden">
        {/* Aspect ratio handling via img tag directly for masonry simplicity */}
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="w-full h-auto object-cover block"
          loading="lazy"
        />
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
