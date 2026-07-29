import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

interface Invitation {
  id: string;
  workspace: {
    id: string;
    name: string;
  };
}

interface NotificationBellProps {
  jwt: string;
  serverUrl: string;
  onInvitationAccepted: () => void;
  onWorkspaceRemoved?: (workspaceId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ jwt, serverUrl, onInvitationAccepted, onWorkspaceRemoved }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInvitations();
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);

    // Socket setup for real-time notifications
    const socket = io(serverUrl, {
      auth: { token: jwt },
      transports: ['websocket'],
    });

    socket.on('new-invitation', () => {
      fetchInvitations();
    });

    socket.on('workspace-removed', (data: { workspaceId: string }) => {
      if (onWorkspaceRemoved) {
        onWorkspaceRemoved(data.workspaceId);
      }
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      socket.disconnect();
    };
  }, [jwt, serverUrl]);

  const fetchInvitations = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/invitations`, {
        headers: { Authorization: `Bearer ${jwt}` },
        cache: 'no-store'
      });
      const data = await res.json();
      if (res.ok) {
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  };

  const handleAccept = async (workspaceId: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/invitations/${workspaceId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        setInvitations(prev => prev.filter(inv => inv.workspace.id !== workspaceId));
        onInvitationAccepted();
        if (invitations.length <= 1) setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  const handleDecline = async (workspaceId: string) => {
    try {
      const res = await fetch(`${serverUrl}/api/invitations/${workspaceId}/decline`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (res.ok) {
        setInvitations(prev => prev.filter(inv => inv.workspace.id !== workspaceId));
        if (invitations.length <= 1) setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-muted/40 rounded-full flex items-center justify-center"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {invitations.length > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-tint-red rounded-full border-2 border-card"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card border border-border shadow-lg rounded-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <h3 className="font-semibold text-sm text-foreground flex items-center justify-between">
              Notifications
              {invitations.length > 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{invitations.length} New</span>
              )}
            </h3>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {invitations.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm flex flex-col items-center">
                <svg className="w-8 h-8 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                You have no pending invitations.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {invitations.map((inv) => (
                  <li key={inv.id} className="p-4 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">
                          You've been invited to join <span className="font-semibold">{inv.workspace.name}</span>.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAccept(inv.workspace.id)}
                            className="text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-md transition-colors shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(inv.workspace.id)}
                            className="text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border px-3 py-1.5 rounded-md transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
