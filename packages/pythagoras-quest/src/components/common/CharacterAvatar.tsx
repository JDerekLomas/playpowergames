import React from 'react';

interface CharacterAvatarProps {
  src: string;
  alt: string;
}

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({ src, alt }) => (
  <img src={src} alt={alt} className="character-avatar" />
);
