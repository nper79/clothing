import { syncToCloud } from './preferenceServiceCloud';
import { loadUserProfileCloud } from './preferenceServiceCloud';

interface SyncStatus {
  isOnline: boolean;
  lastSync: string | null;
  pendingChanges: number;
}

class SyncService {
  private static instance: SyncService;
  private isOnline: boolean = navigator.onLine;
  private syncQueue: Array<() => Promise<void>> = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: SyncStatus) => void)[] = [];

  private constructor() {
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private setupEventListeners(): void {
    // Listen to online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });

    // Listen to page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        this.performSync();
      }
    });
  }

  private startPeriodicSync(): void {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.performSync();
      }
    }, 30000);
  }

  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSync: localStorage.getItem('last_sync_timestamp'),
      pendingChanges: this.syncQueue.length
    };
  }

  public addListener(listener: (status: SyncStatus) => void): void {
    this.listeners.push(listener);
    listener(this.getStatus()); // Immediately notify with current status
  }

  public removeListener(listener: (status: SyncStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    const status = this.getStatus();
    this.listeners.forEach(listener => listener(status));
  }

  // Add sync operation to queue
  public queueSync(operation: () => Promise<void>): void {
    this.syncQueue.push(operation);

    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  // Process all pending sync operations
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) return;

    const operations = [...this.syncQueue];
    this.syncQueue = [];

    try {
      await Promise.all(operations.map(op => op()));
      this.updateLastSync();
      this.notifyListeners();
    } catch (error) {
      console.error('Sync operations failed:', error);
      // Re-add failed operations to the queue
      this.syncQueue.unshift(...operations);
    }
  }

  // Perform immediate sync
  public async performSync(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Sync user profile to cloud
      await syncToCloud();

      // Refresh from cloud to get latest changes
      await loadUserProfileCloud();

      this.updateLastSync();
      this.notifyListeners();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  private updateLastSync(): void {
    localStorage.setItem('last_sync_timestamp', new Date().toISOString());
  }

  // Force full sync (e.g., after being offline for a while)
  public async forceFullSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    // Clear any existing sync queue and process
    this.syncQueue = [];
    await this.processSyncQueue();
    await this.performSync();
  }

  // Get sync statistics
  public getSyncStats(): {
    totalSyncs: number;
    lastSyncTime: string | null;
    averageOfflineTime: number;
  } {
    const totalSyncs = parseInt(localStorage.getItem('total_sync_count') || '0');
    const lastSyncTime = localStorage.getItem('last_sync_timestamp');
    const lastOfflineTime = localStorage.getItem('last_offline_timestamp');

    let averageOfflineTime = 0;
    if (lastOfflineTime && lastSyncTime) {
      const offlineDuration = new Date(lastSyncTime).getTime() - new Date(lastOfflineTime).getTime();
      averageOfflineTime = Math.max(0, offlineDuration / 1000 / 60); // in minutes
    }

    return {
      totalSyncs,
      lastSyncTime,
      averageOfflineTime
    };
  }

  // Cleanup
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.listeners = [];
    this.syncQueue = [];
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();

