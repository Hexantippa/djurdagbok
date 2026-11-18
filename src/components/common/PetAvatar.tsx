import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Pet } from '../../types/models';
import {
  StylizedCatIllustration,
  StylizedPawIllustration,
} from '../icons/PetIllustrations';

export function PetAvatar({
  pet,
  size = 'md',
  className = '',
}: {
  pet: Pet;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { mediaMap } = useApp();
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const sizeClass =
    size === 'xs'
      ? 'w-6 h-6'
      : size === 'sm'
      ? 'w-10 h-10'
      : size === 'lg'
      ? 'w-20 h-20'
      : 'w-14 h-14';

  useEffect(() => {
    if (pet.avatarType !== 'custom' || !pet.avatarMediaId) {
      setImgUrl(null);
      return;
    }
    const asset = mediaMap.get(pet.avatarMediaId);
    if (!asset) {
      setImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(size === 'lg' ? asset.blob : asset.thumbnailBlob);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaMap, pet.avatarMediaId, pet.avatarType, size]);

  if (pet.avatarType === 'custom' && imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={pet.name}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover border border-[var(--border-strong)] shrink-0 ${className}`}
      />
    );
  }

  if (pet.avatarType === 'cat') {
    return <StylizedCatIllustration className={`${sizeClass} shrink-0 ${className}`} />;
  }

  return <StylizedPawIllustration className={`${sizeClass} shrink-0 ${className}`} />;
}
