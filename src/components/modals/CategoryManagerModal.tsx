import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category, Pet } from '../../types/models';
import { PetAvatar } from '../common/PetAvatar';
import { CategoryIcon } from '../icons/PetIllustrations';

export function CategoryPickerModal({
  isOpen,
  pet,
  onSelectCategory,
  onClose,
}: {
  isOpen: boolean;
  pet: Pet | null;
  onSelectCategory: (category: Category) => void;
  onClose: () => void;
}) {
  const { categories } = useApp();

  // Sortera kategorier efter senast använda (senast överst)
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aTime = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const bTime = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.order - b.order;
    });
  }, [categories]);

  if (!isOpen || !pet) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Välj kategori för ${pet.name}`}
      className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PetAvatar pet={pet} size="md" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                Lägg till händelse
              </h2>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {pet.name} · Sorterade efter senast använda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center shrink-0"
            aria-label="Stäng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2">
          {sortedCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left min-h-[52px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-input)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${cat.color}36`,
                  borderColor: `${cat.color}66`,
                  color: cat.color,
                }}
              >
                <CategoryIcon icon={cat.icon} size={18} />
              </span>
              <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

