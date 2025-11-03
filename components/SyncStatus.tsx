import React, { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';

interface SyncStatusProps {
  compact?: boolean;
}

const SyncStatus: React.FC<SyncStatusProps> = ({ compact = false }) => {
  const [status, setStatus] = useState(syncService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const listener = (newStatus: any) => {
      setStatus(newStatus);
    };

    syncService.addListener(listener);

    return () => {
      syncService.removeListener(listener);
    };
  }, []);

  const handleForceSync = async () => {
    if (!status.isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncService.forceFullSync();
    } catch (error) {
      console.error('Force sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <div className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-muted-light">
          {status.isOnline ? 'Online' : 'Offline'}
        </span>
        {status.pendingChanges > 0 && (
          <span className="text-yellow-600">
            ({status.pendingChanges} pending)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-light rounded-lg border border-border-light p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-text-light">Sync Status</h4>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-text-light">
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-light">Last sync:</span>
          <span className="text-text-light">{formatLastSync(status.lastSync)}</span>
        </div>

        {status.pendingChanges > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-light">Pending changes:</span>
            <span className="text-yellow-600">{status.pendingChanges}</span>
          </div>
        )}

        {status.isOnline && (
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="w-full mt-2 px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}

        {!status.isOnline && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            <p className="font-medium">Offline Mode</p>
            <p>Your data will sync when you're back online.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SyncStatus;