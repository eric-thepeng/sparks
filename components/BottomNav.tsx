import React from 'react';
import { Plus } from 'lucide-react';
import { NavTab } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const getTabClass = (tab: NavTab) => 
    `flex items-center justify-center w-full h-full transition-all duration-200 ${
      activeTab === tab ? 'text-gray-900 font-bold text-[16px]' : 'text-gray-400 font-medium text-[16px] hover:text-gray-600'
    }`;

  return (
    <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 h-[56px] z-50">
      {/* Grid layout ensures every item has exactly 20% width */}
      <div className="grid grid-cols-5 h-full items-center">
        
        <button onClick={() => onTabChange('home')} className={getTabClass('home')}>
          Home
        </button>

        <button onClick={() => onTabChange('shop')} className={getTabClass('shop')}>
          Shop
        </button>

        {/* Create Button - Contained within the bar, no pop-up */}
        <div className="flex items-center justify-center h-full">
            <button 
              onClick={() => onTabChange('create')}
              className="bg-brand text-white rounded-[12px] w-12 h-8 flex items-center justify-center shadow-sm active:opacity-90 transition-opacity"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
        </div>

        <button onClick={() => onTabChange('messages')} className={getTabClass('messages')}>
           Message
        </button>

        <button onClick={() => onTabChange('me')} className={getTabClass('me')}>
          Me
        </button>

      </div>
    </div>
  );
};