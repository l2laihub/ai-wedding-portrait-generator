
import React from 'react';
import Icon from './Icon';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = "Conjuring pixels..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
      <Icon path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z" className="w-16 h-16 animate-spin text-purple-500" />
      <p className="mt-4 text-lg font-medium">{message}</p>
      <p className="text-sm text-gray-500">This can take a moment, please be patient.</p>
    </div>
  );
};

export default Loader;
