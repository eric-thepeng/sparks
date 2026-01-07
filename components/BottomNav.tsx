import React from 'react';
import { Compass, Users, Search, MessageSquareText, User } from 'lucide-react';
import { NavTab } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const NavItem = ({ tab, label, icon: Icon }: { tab: NavTab; label: string; icon: any }) => {
    const isActive = activeTab === tab;
    return (
      <button 
        onClick={() => onTabChange(tab)} 
        className={`flex flex-col items-center justify-center w-full h-full gap-[3px] active:scale-95 transition-all duration-200 ${
          isActive ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <Icon 
            size={24} 
            strokeWidth={isActive ? 2.5 : 2} 
            className={`transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}
        />
        <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="absolute bottom-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100 h-[58px] z-50">
      <div className="grid grid-cols-5 h-full items-center">
        
        <NavItem tab="explore" label="Explore" icon={Compass} />
        <NavItem tab="following" label="Following" icon={Users} />

        {/* Search Button - Contained within the bar, distinct style */}
        <div className="flex items-center justify-center h-full">
            <button 
              onClick={() => onTabChange('search')}
              className="bg-brand text-white rounded-[14px] w-12 h-9 flex items-center justify-center shadow-lg shadow-brand/20 active:scale-90 transition-all hover:bg-brand-dark"
            >
              <Search size={22} strokeWidth={3} />
            </button>
        </div>

        <NavItem tab="messages" label="Message" icon={MessageSquareText} />
        <NavItem tab="me" label="Me" icon={User} />

      </div>
    </div>
  );
};