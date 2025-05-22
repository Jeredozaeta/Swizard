import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="mb-6 text-center">
      <div className="flex items-center justify-center gap-3 mb-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-400 bg-clip-text text-transparent">
          Swizard
        </h1>
      </div>
      <p className="text-violet-200 opacity-90">The real sound wizard</p>
    </header>
  );
};

export default Header;