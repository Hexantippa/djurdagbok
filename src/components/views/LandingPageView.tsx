import React from 'react';
import { PawPrint } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CutePetsGroupIllustration } from '../icons/PetIllustrations';

export function LandingPageView() {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-[calc(100dvh-13rem)] flex flex-col items-center justify-center py-6 px-2 text-center">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
        <div className="space-y-2 max-w-lg">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--text-primary)] [text-wrap:balance]">
            Djurdagbok
          </h1>
          <p className="text-base sm:text-lg text-[var(--text-secondary)]">
            Håll koll på dina älsklingar
          </p>
        </div>

        <div className="w-full flex items-center justify-center py-1">
          <CutePetsGroupIllustration className="w-full max-w-[400px] h-auto" />
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => navigateTo({ view: 'all-animals' })}
            className="btn-pill px-8 py-3.5 text-base font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] inline-flex items-center justify-center gap-2.5 whitespace-nowrap shadow-sm"
          >
            <PawPrint size={19} aria-hidden="true" />
            <span>Mina djur</span>
          </button>
        </div>
      </div>
    </div>
  );
}
