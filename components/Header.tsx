import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center p-6 bg-gray-900 border-b border-gray-700">
      <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        AI Wedding Portrait Generator
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        Upload a photo of a couple and see them on their magical wedding day.
      </p>
    </header>
  );
};

export default Header;