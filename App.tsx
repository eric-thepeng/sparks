import React, { useState, useEffect } from 'react';
import { TopHeader } from './components/TopHeader';
import { MasonryFeed } from './components/MasonryFeed';
import { BottomNav } from './components/BottomNav';
import { PostDetail } from './components/PostDetail';
import { NavTab, FeedTab, Post } from './types';
import { feedService } from './services/feed';

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavTab>('explore');
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>('explore');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await feedService.getPosts(1, 20);
        setPosts(data);
      } catch (error) {
        console.error("Failed to load feed", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Handle like toggle
  const handleLikeToggle = (id: string) => {
    setPosts(currentPosts => 
      currentPosts.map(post => 
        post.id === id 
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes : post.likes + 1 } 
          : post
      )
    );
  };

  return (
    <div className="h-[100dvh] bg-gray-50 text-gray-900 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col">
      
      {/* Header - Stays static at the top, visible mainly on Explore feed */}
      {activeNav === 'explore' && (
        <TopHeader activeTab={activeFeedTab} onTabChange={setActiveFeedTab} />
      )}

      {/* Main Content Area - Scrolls independently */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative bg-gray-50/50">
        {activeNav === 'explore' && (
          <div className="min-h-full">
            {loading ? (
               <div className="flex items-center justify-center pt-20">
                  <div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin"></div>
               </div>
            ) : (
               <MasonryFeed 
                 posts={posts} 
                 onLikeToggle={handleLikeToggle} 
                 onPostClick={setSelectedPost}
               />
            )}
          </div>
        )}
        
        {/* Placeholders for other tabs */}
        {activeNav !== 'explore' && (
          <div className="flex flex-col items-center justify-center h-full pb-20 text-gray-400 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 text-brand shadow-sm">
               {activeNav === 'following' && <span className="text-4xl">👥</span>}
               {activeNav === 'search' && <span className="text-4xl">🔍</span>}
               {activeNav === 'messages' && <span className="text-4xl">💬</span>}
               {activeNav === 'me' && <span className="text-4xl">👤</span>}
            </div>
            <h2 className="text-lg font-bold text-gray-800 capitalize mb-2">{activeNav}</h2>
            <p className="text-sm text-gray-500">
              This feature is under construction for the IndigoNote demo.
            </p>
            <button 
                onClick={() => setActiveNav('explore')}
                className="mt-6 px-6 py-2.5 bg-brand text-white rounded-full text-sm font-semibold active:scale-95 transition-transform shadow-lg shadow-brand/20"
            >
                Back to Explore
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeNav} onTabChange={setActiveNav} />

      {/* Post Detail Overlay */}
      {selectedPost && (
        <PostDetail 
          post={selectedPost} 
          onBack={() => setSelectedPost(null)}
          onLikeToggle={handleLikeToggle}
        />
      )}
    </div>
  );
};

export default App;