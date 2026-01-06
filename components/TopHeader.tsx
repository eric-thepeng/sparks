import React from 'react';
import { FeedTab } from '../types';

interface TopHeaderProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300 border-b border-gray-50/50">
      <div className="flex items-center h-[52px] px-4 relative justify-center">
        
         {/* Centered Tabs Container */}
         <div className="flex items-center gap-6 h-full">
            <button 
              onClick={() => onTabChange('follow')}
              className={`relative transition-all px-1 ${activeTab === 'follow' ? 'text-gray-900 font-bold text-[17px] scale-105' : 'text-gray-400 font-medium text-[16px] hover:text-gray-600'}`}
            >
              Follow
              {activeTab === 'follow' && (
                <span className="absolute -bottom-1 left-1/2 w-3 h-[3px] bg-brand -translate-x-1/2 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => onTabChange('explore')}
              className={`relative transition-all px-1 ${activeTab === 'explore' ? 'text-gray-900 font-bold text-[17px] scale-105' : 'text-gray-400 font-medium text-[16px] hover:text-gray-600'}`}
            >
              Explore
              {activeTab === 'explore' && (
                <span className="absolute -bottom-1 left-1/2 w-3 h-[3px] bg-brand -translate-x-1/2 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => onTabChange('nearby')}
              className={`relative transition-all px-1 ${activeTab === 'nearby' ? 'text-gray-900 font-bold text-[17px] scale-105' : 'text-gray-400 font-medium text-[16px] hover:text-gray-600'}`}
            >
              Nearby
              {activeTab === 'nearby' && (
                <span className="absolute -bottom-1 left-1/2 w-3 h-[3px] bg-brand -translate-x-1/2 rounded-full" />
              )}
            </button>
         </div>

      </div>
    </div>
  );
};