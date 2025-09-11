
import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  path: string;
}

const Icon: React.FC<IconProps> = ({ path, className = 'w-6 h-6', ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...props}
    >
      <path d={path} />
    </svg>
  );
};

export default Icon;
