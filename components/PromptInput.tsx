import React from 'react';
import Icon from './Icon';

interface PromptInputProps {
  onSubmit: () => void;
  isLoading: boolean;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
}

const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading, customPrompt, onCustomPromptChange }) => {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 flex flex-col items-center gap-4">
       <textarea
        value={customPrompt}
        onChange={(e) => onCustomPromptChange(e.target.value)}
        disabled={isLoading}
        placeholder="Add a creative touch... (e.g., 'in the style of Monet', 'add a golden retriever')"
        className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 ease-in-out"
        rows={2}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3 text-lg"
      >
        {isLoading ? (
          <>
            <Icon path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z" className="w-6 h-6 animate-spin" />
            <span>Generating Portraits...</span>
          </>
        ) : (
          <>
            <Icon path="M17.5 12.5C17.5 15.26 15.26 17.5 12.5 17.5S7.5 15.26 7.5 12.5 9.74 7.5 12.5 7.5 17.5 9.74 17.5 12.5zM12.5 9.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zM20 4v16H4V4h16m0-2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" className="w-6 h-6" />
            <span>Generate 3 Wedding Styles</span>
          </>
        )}
      </button>
    </div>
  );
};

export default PromptInput;