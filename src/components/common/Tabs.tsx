// src/components/common/Tabs.tsx

import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ElementType;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="border-b border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-t-2xl">
      <nav className="-mb-px flex space-x-2 sm:space-x-6 px-6" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex items-center py-4 px-4 rounded-t-xl font-semibold text-sm transition-all duration-200 transform hover:scale-105
                ${isActive
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-indigo-400 border-b-2 border-blue-600 dark:border-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon && <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />}
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
