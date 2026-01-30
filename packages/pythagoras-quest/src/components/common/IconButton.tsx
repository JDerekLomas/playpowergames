import React from 'react';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  iconSrc: string;
  ariaLabel: string;
  size?: number;
}

export const IconButton: React.FC<IconButtonProps> = ({ iconSrc, ariaLabel, size, className, style, ...props }) => {
  const mergedStyle: React.CSSProperties = {
    ...(size != null ? { width: size, height: size } : {}),
    ...style,
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      {...props}
      className={["icon-btn", className].filter(Boolean).join(' ')}
      style={mergedStyle}
    >
      <img src={iconSrc} alt="" aria-hidden="true" className="icon-image" draggable={false} />
    </button>
  );
};

export default IconButton;


