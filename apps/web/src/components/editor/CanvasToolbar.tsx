import React from 'react';
import { useReactFlow } from '@xyflow/react';

interface CanvasToolbarProps {
  onAddText: () => void;
  onAddSticky: () => void;
  onAddImage: () => void;
  onExitCanvas: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onAddText,
  onAddSticky,
  onAddImage,
  onExitCanvas
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="canvas-toolbar">
      <button onClick={onAddText} className="canvas-toolbar-btn" title="Add Text Node">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/></svg>
      </button>
      <button onClick={onAddSticky} className="canvas-toolbar-btn" title="Add Sticky Note">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v5h5"/></svg>
      </button>
      <button onClick={onAddImage} className="canvas-toolbar-btn" title="Add Image Node">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
      </button>
      
      <div className="canvas-toolbar-divider" />
      
      <button onClick={() => zoomIn()} className="canvas-toolbar-btn" title="Zoom In">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
      </button>
      <button onClick={() => zoomOut()} className="canvas-toolbar-btn" title="Zoom Out">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
      </button>
      <button onClick={() => fitView({ duration: 800 })} className="canvas-toolbar-btn" title="Fit View">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>
      
      <div className="canvas-toolbar-divider" />
      
      <button onClick={onExitCanvas} className="canvas-toolbar-btn text-red-500 hover:text-red-600 dark:text-red-400" title="Close Canvas & Return to Editor">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
};
