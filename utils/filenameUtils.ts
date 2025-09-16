export interface FilenameParts {
  photoType: 'single' | 'couple' | 'family';
  familyMemberCount?: number;
  style: string;
  date?: Date;
}

/**
 * Generate consistent filename for wedding portraits
 * Format: 
 * - single-theme-name-YYYY-MM-DD.png
 * - couple-theme-name-YYYY-MM-DD.png  
 * - family-3-theme-name-YYYY-MM-DD.png
 * - family-4-theme-name-YYYY-MM-DD.png
 */
export const generatePortraitFilename = (parts: FilenameParts): string => {
  const { photoType, familyMemberCount, style, date = new Date() } = parts;
  
  // Format date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${year}-${month}-${day}`;
  
  // Clean up style name: lowercase, replace spaces with hyphens, remove special chars
  const cleanStyle = style.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Build filename based on photo type
  let filename = '';
  
  switch (photoType) {
    case 'single':
      filename = `single-${cleanStyle}-${dateString}.png`;
      break;
    case 'couple':
      filename = `couple-${cleanStyle}-${dateString}.png`;
      break;
    case 'family':
      const memberCount = familyMemberCount || 3;
      filename = `family-${memberCount}-${cleanStyle}-${dateString}.png`;
      break;
    default:
      // Fallback to couple if unknown type
      filename = `couple-${cleanStyle}-${dateString}.png`;
  }
  
  return filename;
};

/**
 * Legacy filename generator for backward compatibility
 * @deprecated Use generatePortraitFilename instead
 */
export const generateLegacyFilename = (style: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  const cleanStyle = style.toLowerCase().replace(/ /g, '-');
  
  return `wedding-portrait-${cleanStyle}_${timestamp}.png`;
};