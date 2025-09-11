import React from 'react';
import { GeneratedContent } from '../types';
import Icon from './Icon';

interface ImageDisplayProps {
  contents: GeneratedContent[];
}

const handleDownload = (imageUrl: string, style: string) => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `wedding-portrait-${style.toLowerCase().replace(/ /g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const GeneratedImageCard: React.FC<{ content: GeneratedContent }> = ({ content }) => {
  const { imageUrl, text, style = 'portrait' } = content;

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col">
      <h3 className="text-xl font-bold text-center text-white mb-3">{style}</h3>
      <div className="flex-grow flex items-center justify-center relative group aspect-w-1 aspect-h-1 min-h-[300px]">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={`Generated wedding portrait in ${style} style`}
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg">
              <button
                onClick={() => handleDownload(imageUrl, style)}
                className="flex items-center gap-2 bg-white text-gray-900 font-bold py-2 px-4 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Icon path="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" className="w-5 h-5" />
                Download
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-red-400">
            <Icon path="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" className="w-12 h-12 mx-auto" />
            <p className="font-semibold mt-2">Generation Failed</p>
          </div>
        )}
      </div>
      {text && (
        <p className="mt-4 text-center text-gray-400 text-sm italic">
          {`"${text}"`}
        </p>
      )}
    </div>
  );
};


const ImageDisplay: React.FC<ImageDisplayProps> = ({ contents }) => {
  if (!contents || contents.length === 0) {
    return null;
  }

  return (
    <div className="mt-10 w-full max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-center text-white mb-6">Your Wedding Portraits</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.map((content, index) => (
          <GeneratedImageCard key={content.style || index} content={content} />
        ))}
      </div>
    </div>
  );
};

export default ImageDisplay;