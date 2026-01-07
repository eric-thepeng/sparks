import React from 'react';
import { FeedTab } from '../types';

interface TopHeaderProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: FeedTab; label: string }[] = [
    { id: 'follow', label: 'Follow' },
    { id: 'explore', label: 'Explore' },
    { id: 'nearby', label: 'Nearby' },
  ];

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm transition-all duration-300 border-b border-gray-50/50">
      <div className="flex items-center h-[52px] px-4 relative justify-center">
        
         {/* Centered Tabs Container */}
         <div className="flex items-center gap-8 h-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="relative flex items-center justify-center h-full"
                >
                   {/* 
                     Layout Stabilizer: 
                     This invisible text is always bold and at the largest size.
                     It reserves the necessary width so the button doesn't expand/contract
                     and push neighbors when the state changes.
                   */}
                   <span className="invisible font-bold text-[17px] px-1 select-none">
                     {tab.label}
                   </span>

                   {/* Visible Text Layer */}
                   <span className={`absolute flex items-center justify-center transition-colors duration-200 ${
                     isActive 
                       ? 'text-gray-900 font-bold text-[17px]' 
                       : 'text-gray-400 font-medium text-[16px] hover:text-gray-600'
                   }`}>
                      {tab.label}
                   </span>

                   {/* Indicator Line */}
                   {isActive && (
                    <span className="absolute bottom-[6px] w-4 h-[3px] bg-brand rounded-full transition-transform duration-200" />
                   )}
                </button>
              );
            })}
         </div>

      </div>
    </div>
  );
};