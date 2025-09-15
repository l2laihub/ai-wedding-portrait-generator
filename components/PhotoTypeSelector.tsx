import React from 'react';
import { useViewport } from '../hooks/useViewport';

interface PhotoTypeSelectorProps {
  photoType: 'single' | 'couple' | 'family';
  onPhotoTypeChange: (type: 'single' | 'couple' | 'family') => void;
  familyMemberCount: number;
  onFamilyMemberCountChange: (count: number) => void;
}

const PhotoTypeSelector: React.FC<PhotoTypeSelectorProps> = ({ 
  photoType, 
  onPhotoTypeChange, 
  familyMemberCount, 
  onFamilyMemberCountChange 
}) => {
  const { isMobile } = useViewport();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex justify-center gap-3 flex-wrap">
        <button
          onClick={() => onPhotoTypeChange('single')}
          className={`
            px-5 py-3 rounded-lg font-medium transition-all duration-200
            ${photoType === 'single' 
              ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg transform scale-105' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'}
            ${isMobile ? 'text-sm px-4 py-2' : ''}
          `}
        >
          <span className="mr-2">👤</span>
          Single Portrait
        </button>
        <button
          onClick={() => onPhotoTypeChange('couple')}
          className={`
            px-5 py-3 rounded-lg font-medium transition-all duration-200
            ${photoType === 'couple' 
              ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg transform scale-105' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'}
            ${isMobile ? 'text-sm px-4 py-2' : ''}
          `}
        >
          <span className="mr-2">💑</span>
          Couple Photo
        </button>
        <button
          onClick={() => onPhotoTypeChange('family')}
          className={`
            px-5 py-3 rounded-lg font-medium transition-all duration-200
            ${photoType === 'family' 
              ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg transform scale-105' 
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'}
            ${isMobile ? 'text-sm px-4 py-2' : ''}
          `}
        >
          <span className="mr-2">👨‍👩‍👧‍👦</span>
          Family Photo
        </button>
      </div>
      
      {photoType === 'family' && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-300">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            How many family members are in your photo?
          </label>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => onFamilyMemberCountChange(Math.max(2, familyMemberCount - 1))}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
              aria-label="Decrease count"
            >
              <span className="text-lg">−</span>
            </button>
            <span className="text-2xl font-semibold w-16 text-center text-gray-900 dark:text-white">
              {familyMemberCount}
            </span>
            <button
              onClick={() => onFamilyMemberCountChange(Math.min(8, familyMemberCount + 1))}
              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
              aria-label="Increase count"
            >
              <span className="text-lg">+</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            This helps AI preserve the exact number of people
          </p>
        </div>
      )}
      
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {photoType === 'single' 
          ? 'Ideal for individual bridal portraits or solo wedding photos'
          : photoType === 'couple' 
          ? 'Perfect for couples who want romantic wedding portraits' 
          : `Great for ${familyMemberCount} people who want to see everyone in wedding attire`}
      </p>
    </div>
  );
};

export default PhotoTypeSelector;