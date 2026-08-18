import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface ActiveDocumentState {
  workspaceId: string | null;
  documentId: string | null;
  documentTitle: string | null;
  documentPlainText: string | null;
  selectedText: string | null;
  updatedAt: number;
}

interface ActiveDocumentContextType {
  context: ActiveDocumentState;
  setContext: React.Dispatch<React.SetStateAction<ActiveDocumentState>>;
  updateContext: (partialContext: Partial<ActiveDocumentState>) => void;
  clearContext: () => void;
}

const ActiveDocumentContext = createContext<ActiveDocumentContextType | undefined>(undefined);

export const ActiveDocumentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<ActiveDocumentState>({
    workspaceId: null,
    documentId: null,
    documentTitle: null,
    documentPlainText: null,
    selectedText: null,
    updatedAt: Date.now(),
  });

  const updateContext = (partialContext: Partial<ActiveDocumentState>) => {
    setContext(prev => ({
      ...prev,
      ...partialContext,
      updatedAt: Date.now(),
    }));
  };

  const clearContext = () => {
    setContext({
      workspaceId: null,
      documentId: null,
      documentTitle: null,
      documentPlainText: null,
      selectedText: null,
      updatedAt: Date.now(),
    });
  };

  return (
    <ActiveDocumentContext.Provider value={{ context, setContext, updateContext, clearContext }}>
      {children}
    </ActiveDocumentContext.Provider>
  );
};

export const useActiveDocument = () => {
  const ctx = useContext(ActiveDocumentContext);
  if (!ctx) {
    throw new Error('useActiveDocument must be used within an ActiveDocumentProvider');
  }
  return ctx;
};
