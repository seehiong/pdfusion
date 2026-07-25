// src/components/common/Card.tsx

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl dark:shadow-slate-950/50 border border-white/20 dark:border-slate-800/80 overflow-hidden hover:shadow-2xl dark:hover:shadow-indigo-500/5 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
