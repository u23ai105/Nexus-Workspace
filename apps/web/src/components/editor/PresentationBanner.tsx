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
    <div className="presentation-banner flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border-b border-indigo-500/20 backdrop-blur-md relative z-40 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
        <span className="text-sm font-medium text-indigo-100">
          {isPresenter ? (
            <>
              <span className="font-semibold text-white">LIVE</span> — You are presenting to {viewerCount} {viewerCount === 1 ? 'person' : 'people'}
            </>
          ) : (
            <>
              <span className="font-semibold text-white">LIVE</span> — Following <span className="font-bold text-white">{presenterName}</span>'s view
            </>
          )}
        </span>
      </div>
      <button
        onClick={onStop}
        className="text-xs px-3 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-white transition-colors border border-indigo-500/30 shadow-sm"
      >
        {isPresenter ? 'Stop Presenting' : 'Stop Following'}
      </button>
    </div>
  );
};
