import React from 'react';

interface PresentationBannerProps {
  isPresenter: boolean;
  presenterName: string;
  viewerCount?: number;
  onStop: () => void;
}

export const PresentationBanner: React.FC<PresentationBannerProps> = ({
  isPresenter,
  presenterName,
  viewerCount = 0,
  onStop,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border-b border-indigo-500/20 backdrop-blur-md relative z-40 transition-all duration-300">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </div>
        <span className="text-sm font-medium text-indigo-100 truncate">
          {isPresenter ? (
            <>
              <span className="font-semibold text-white">LIVE</span> — Presenting to {viewerCount} {viewerCount === 1 ? 'person' : 'people'}
            </>
          ) : (
            <>
              <span className="font-semibold text-white">LIVE</span> — <span className="font-bold text-white">{presenterName}</span> is presenting
            </>
          )}
        </span>
      </div>
      <button
        onClick={onStop}
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/40 hover:text-white transition-colors border border-indigo-500/30 shadow-sm ml-4"
        aria-label={isPresenter ? 'Stop Presenting' : 'Stop Following'}
      >
        {isPresenter ? 'Stop Presenting' : 'Stop Following'}
      </button>
    </div>
  );
};
