import React, { useState, useEffect } from 'react';
import { ChevronLeft, Heart, Star, MessageCircle, Share2, AlertCircle } from 'lucide-react';
import { Post } from '../types';

interface PostDetailProps {
  post: Post;
  onBack: () => void;
  onLikeToggle: (id: string) => void;
}

// 简单的 Markdown 渲染组件，支持加粗和列表
const SimpleMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const renderLine = (line: string, lineIndex: number) => {
    // 处理加粗文本 **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // 加粗文本
        return (
          <strong key={`${lineIndex}-${partIndex}`} className="font-bold text-gray-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={`${lineIndex}-${partIndex}`}>{part}</span>;
    });
  };

  const lines = content.split('\n');
  
  return (
    <>
      {lines.map((line, index) => {
        // 处理列表项 (* 或 - 开头)
        const listMatch = line.match(/^(\*|\-)\s+(.+)$/);
        if (listMatch) {
          return (
            <div key={index} className="flex gap-2 my-1">
              <span className="text-brand">•</span>
              <span>{renderLine(listMatch[2], index)}</span>
            </div>
          );
        }
        
        // 处理数字列表 (1. 开头)
        const numListMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numListMatch) {
          return (
            <div key={index} className="flex gap-2 my-1">
              <span className="text-brand font-medium">{numListMatch[1]}.</span>
              <span>{renderLine(numListMatch[2], index)}</span>
            </div>
          );
        }

        // 普通段落
        return (
          <React.Fragment key={index}>
            {renderLine(line, index)}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const PostDetail: React.FC<PostDetailProps> = ({ post, onBack, onLikeToggle }) => {
  const [isCollected, setIsCollected] = useState(post.isCollected);
  const [localIsLiked, setLocalIsLiked] = useState(post.isLiked);
  const [localLikes, setLocalLikes] = useState(post.likes);

  // Image Logic
  const [hasError, setHasError] = useState(false);

  // Reset when post changes
  useEffect(() => {
    setHasError(false);
  }, [post.imageUrl]);

  const handleLike = () => {
    const newLikedState = !localIsLiked;
    setLocalIsLiked(newLikedState);
    setLocalLikes(prev => newLikedState ? prev + 1 : prev - 1);
    onLikeToggle(post.id);
  };

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-200">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 h-[52px] border-b border-gray-50 shrink-0 bg-white/95 backdrop-blur-sm z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-800 hover:bg-gray-50 rounded-full active:scale-90 transition-transform">
           <ChevronLeft size={26} />
        </button>
        
        <div className="flex items-center gap-2 flex-1 ml-1 mr-4 min-w-0">
            <img src={post.user.avatar} className="w-8 h-8 rounded-full border border-gray-100 shrink-0" alt="avatar" />
            <span className="text-[15px] font-semibold text-gray-900 truncate flex-1">{post.user.name}</span>
            <button className="text-brand text-xs font-bold border border-brand px-3 py-1 rounded-full hover:bg-brand/5 transition-colors">
                Follow
            </button>
        </div>

        <button className="p-2 text-gray-800 hover:bg-gray-50 rounded-full">
            <Share2 size={22} />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-white pb-20">
         {/* Main Media */}
         <div className="w-full relative min-h-[300px] bg-gray-50">
             {!hasError ? (
                <img 
                    src={post.imageUrl} 
                    className="w-full h-auto object-cover block" 
                    alt="post content"
                    onError={handleError}
                />
             ) : (
                <div className="w-full h-[400px] flex flex-col items-center justify-center text-gray-300 bg-gray-50 p-6 border-b border-gray-100">
                    <AlertCircle size={48} className="mb-2 text-gray-300" />
                    <span className="text-sm text-gray-400 font-medium mb-1">Image Not Found</span>
                </div>
             )}
         </div>

         {/* Content Body */}
         <div className="px-4 py-4">
            <h1 className="text-lg font-bold text-gray-900 leading-snug mb-3">
                {post.title}
            </h1>
            <div className="text-[16px] text-gray-800 leading-relaxed mb-4 font-normal">
                <SimpleMarkdown content={post.description} />
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag, idx) => (
                    <span key={idx} className="text-brand text-[15px] font-medium">#{tag}</span>
                ))}
            </div>

            <div className="text-xs text-gray-400 mb-8 font-medium">
                {post.date}
            </div>

            <div className="h-px bg-gray-100 my-6" />

            {/* Comments Section */}
            <div className="space-y-6">
                <div className="text-sm font-medium text-gray-600">Total {post.comments} comments</div>
                
                {/* Mock Comments */}
                <div className="flex gap-3 items-start">
                    <img src="https://picsum.photos/id/10/50/50" className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                    <div className="flex-1">
                        <div className="text-[13px] text-gray-500 font-medium mb-1">Forest Hiker</div>
                        <div className="text-[14px] text-gray-800 leading-snug">This is absolutely beautiful! Where is this? 😍</div>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-gray-400">
                        <Heart size={14} />
                        <span className="text-[10px]">12</span>
                    </div>
                </div>

                <div className="flex gap-3 items-start">
                     <img src="https://picsum.photos/id/20/50/50" className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
                     <div className="flex-1">
                         <div className="text-[13px] text-gray-500 font-medium mb-1">City Lights</div>
                         <div className="text-[14px] text-gray-800 leading-snug">Love the indigo theme 💜</div>
                     </div>
                     <div className="flex flex-col items-center gap-1 text-gray-400">
                         <Heart size={14} />
                         <span className="text-[10px]">5</span>
                     </div>
                </div>
            </div>
            
            {/* End padding */}
            <div className="h-10" />
         </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 h-[58px] px-4 flex items-center gap-4 z-20 pb-1">
          <div className="flex-1 bg-gray-100 h-10 rounded-full flex items-center px-4 text-gray-400 text-[14px]">
             <span className="mr-2">Say something...</span>
          </div>
          
          <div className="flex items-center gap-6 text-gray-600">
             <button onClick={handleLike} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                <Heart size={24} className={`transition-colors duration-300 ${localIsLiked ? "fill-brand text-brand" : "text-gray-600"}`} />
                <span className="text-[11px] font-medium text-gray-500">{localLikes > 0 ? localLikes : 'Like'}</span>
             </button>
             <button onClick={() => setIsCollected(!isCollected)} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                <Star size={24} className={`transition-colors duration-300 ${isCollected ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
                <span className="text-[11px] font-medium text-gray-500">{isCollected ? 'Saved' : 'Collect'}</span>
             </button>
             <button className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
                <MessageCircle size={24} className="text-gray-600" />
                <span className="text-[11px] font-medium text-gray-500">{post.comments > 0 ? post.comments : 'Comment'}</span>
             </button>
          </div>
      </div>
    </div>
  );
};