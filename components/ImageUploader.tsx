
import React, { useState, useCallback, useRef } from 'react';
import Icon from './Icon';
import { useViewport } from '../hooks/useViewport';
import { posthogService } from '../services/posthogService';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  sourceImageUrl: string | null;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, sourceImageUrl }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { isMobile, orientation } = useViewport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced file validation for mobile
  const validateFile = useCallback((file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (PNG, JPG, GIF, or WebP)';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  }, []);

  const processFile = useCallback(async (file: File, uploadMethod: 'drag' | 'click') => {
    setIsProcessing(true);
    
    // Track upload started
    posthogService.trackImageUpload('started', {
      fileSize: file.size,
      fileType: file.type,
      uploadMethod,
    });
    
    try {
      const error = validateFile(file);
      if (error) {
        // Track upload failed due to validation
        posthogService.trackImageUpload('failed', {
          fileSize: file.size,
          fileType: file.type,
          uploadMethod,
          error: error,
        });
        alert(error);
        return;
      }

      // Add a small delay for mobile processing feedback
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      onImageUpload(file);
      
      // Track successful upload
      posthogService.trackImageUpload('completed', {
        fileSize: file.size,
        fileType: file.type,
        uploadMethod,
      });
    } catch (err) {
      // Track upload failed due to error
      posthogService.trackImageUpload('failed', {
        fileSize: file.size,
        fileType: file.type,
        uploadMethod,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      alert('Error processing file. Please try again.');
      console.error('File processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [isMobile, onImageUpload, validateFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0], 'click');
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0], 'drag');
    }
  }, [processFile]);

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  // Removed custom touch handlers to prevent double file picker issue
  // Native HTML label behavior works perfectly on mobile devices

  // Dynamic height based on viewport and orientation
  const getHeight = () => {
    if (isMobile) {
      return orientation === 'portrait' ? 'h-48' : 'h-32';
    }
    return 'h-64';
  };

  const getContainerClass = () => {
    const baseClasses = "w-full mx-auto";
    if (isMobile) {
      return `${baseClasses} max-w-full px-2`;
    }
    return `${baseClasses} max-w-lg`;
  };

  return (
    <div className={getContainerClass()}>
      <label
        onDrop={handleDrop}
        onDragEnter={handleDragEvents}
        onDragOver={handleDragEvents}
        onDragLeave={handleDragEvents}
        className={`
          group relative flex justify-center items-center w-full ${getHeight()}
          ${isMobile ? 'px-4 py-6' : 'px-6 py-10'}
          border-2 border-dashed rounded-lg cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragging ? 'border-purple-500 bg-gray-800 scale-[1.02]' : 'border-gray-600 hover:border-gray-500'}
          ${sourceImageUrl ? 'border-solid border-purple-500' : ''}
          ${isProcessing ? 'opacity-75 cursor-wait' : ''}
          ${isMobile ? 'active:scale-[0.98] active:bg-gray-800' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
        
        {isProcessing ? (
          <div className="text-center">
            <Icon 
              path="M12 4.5C7.5 4.5 4.73 7.5 4.5 12h-2c.28-5.5 4.53-9.5 9.5-9.5s9.22 4 9.5 9.5h-2c-.23-4.5-3-7.5-7.5-7.5zM12 19.5c-4.5 0-7.27-3-7.5-7.5h2c.23 4.5 3 7.5 7.5 7.5s7.27-3 7.5-7.5h2c-.28 5.5-4.53 9.5-9.5 9.5z" 
              className="mx-auto h-8 w-8 text-purple-400 animate-spin" 
            />
            <p className="mt-3 text-sm text-gray-400">Processing image...</p>
          </div>
        ) : sourceImageUrl ? (
          <>
            <img 
              src={sourceImageUrl} 
              alt="Preview" 
              className="object-contain h-full w-full rounded-md"
              loading="lazy"
            />
            <div className={`
              absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md
              transition-opacity duration-300
              ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}>
              <span className={`text-white font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                {isMobile ? 'Tap to Change' : 'Change Image'}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center">
            <Icon 
              path="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" 
              className={`mx-auto text-gray-400 ${isMobile ? 'h-8 w-8' : 'h-12 w-12'}`} 
            />
            <p className={`mt-3 text-gray-400 ${isMobile ? 'text-sm' : 'text-base'}`}>
              <span className="font-semibold text-purple-400">
                {isMobile ? 'Tap to select' : 'Click to upload'}
              </span>
              {!isMobile && ' or drag and drop'}
            </p>
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}>
              PNG, JPG, GIF, WebP up to 10MB
            </p>
            {isMobile && (
              <p className="text-xs text-gray-500 mt-1">
                📷 Camera or 🖼️ Gallery
              </p>
            )}
          </div>
        )}
      </label>
    </div>
  );
};

export default ImageUploader;
