
import React, { useState, useEffect } from 'react';
import { TopHeader } from './components/TopHeader';
import { MasonryFeed } from './components/MasonryFeed';
import { BottomNav } from './components/BottomNav';
import { PostDetail } from './components/PostDetail';
import { NavTab, FeedTab, Post } from './types';
import { INITIAL_POSTS } from './data';

const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavTab>('home');
  const [activeFeedTab, setActiveFeedTab] = useState<FeedTab>('explore');
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

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

  // Pull-to-refresh simulation (visual only for this example)
  useEffect(() => {
    document.body.classList.add('bg-gray-50');
    return () => document.body.classList.remove('bg-gray-50');
  }, []);

  return (
    <div className="h-[100dvh] bg-gray-50 text-gray-900 font-sans max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col">
      {/* 
        Container is now h-[100dvh] (viewport height) to simulate a real app window.
        Scrolling happens inside main.
      */}
      
      {/* Header - Stays static at the top */}
      <TopHeader activeTab={activeFeedTab} onTabChange={setActiveFeedTab} />

      {/* Main Content Area - Scrolls independently */}
      <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative bg-gray-50/50">
        {activeNav === 'home' && (
          <MasonryFeed 
            posts={posts} 
            onLikeToggle={handleLikeToggle} 
            onPostClick={setSelectedPost}
          />
        )}
        
        {/* Placeholders for other tabs */}
        {activeNav !== 'home' && (
          <div className="flex flex-col items-center justify-center h-full pb-20 text-gray-400 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 text-brand shadow-sm">
               {activeNav === 'shop' && <span className="text-4xl">🛍️</span>}
               {activeNav === 'create' && <span className="text-4xl">✨</span>}
               {activeNav === 'messages' && <span className="text-4xl">💬</span>}
               {activeNav === 'me' && <span className="text-4xl">👤</span>}
            </div>
            <h2 className="text-lg font-bold text-gray-800 capitalize mb-2">{activeNav}</h2>
            <p className="text-sm text-gray-500">
              This feature is under construction for the IndigoNote demo.
            </p>
            <button 
                onClick={() => setActiveNav('home')}
                className="mt-6 px-6 py-2.5 bg-brand text-white rounded-full text-sm font-semibold active:scale-95 transition-transform shadow-lg shadow-brand/20"
            >
                Back to Feed
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Absolute positioned at bottom of container */}
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
