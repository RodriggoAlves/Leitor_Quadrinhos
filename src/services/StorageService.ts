import localforage from 'localforage';
import type { Comic, Collection, ReadingStats, Achievement } from '../types';

localforage.config({
  name: 'ComicReaderApp',
  storeName: 'comics_library'
});

const PROGRESS_STORE = localforage.createInstance({
  name: 'ComicReaderApp',
  storeName: 'reading_progress'
});

const FILE_STORE = localforage.createInstance({
  name: 'ComicReaderApp',
  storeName: 'comic_files'
});

const COLLECTION_STORE = localforage.createInstance({
  name: 'ComicReaderApp',
  storeName: 'collections'
});

const UNIVERSE_STORE = localforage.createInstance({
  name: 'ComicReaderApp',
  storeName: 'universes'
});

const STATS_STORE = localforage.createInstance({
  name: 'ComicReaderApp',
  storeName: 'reading_stats'
});

const STATS_KEY = '__global_stats__';
const ACHIEVEMENTS_KEY = '__achievements__';

class StorageService {
  // ── Comics ──────────────────────────────────────────
  async saveComic(comic: Comic): Promise<void> {
    await localforage.setItem(comic.id, comic);
  }

  async getComic(id: string): Promise<Comic | null> {
    return await localforage.getItem<Comic>(id);
  }

  async getAllComics(): Promise<Comic[]> {
    const comics: Comic[] = [];
    await localforage.iterate((value: Comic) => {
      comics.push(value);
    });
    return comics.sort((a, b) => b.lastRead - a.lastRead);
  }

  async deleteComic(id: string): Promise<void> {
    await localforage.removeItem(id);
    await PROGRESS_STORE.removeItem(id);
    await FILE_STORE.removeItem(id);
    // Remove from all collections
    const collections = await this.getCollections();
    for (const col of collections) {
      if (col.comicIds.includes(id)) {
        col.comicIds = col.comicIds.filter(cid => cid !== id);
        col.updatedAt = Date.now();
        await COLLECTION_STORE.setItem(col.id, col);
      }
    }
  }

  async saveProgress(id: string, currentPage: number, totalPages: number): Promise<void> {
    const progress = (currentPage / totalPages) * 100;
    const comic = await this.getComic(id);
    if (comic) {
      comic.currentPage = currentPage;
      comic.progress = progress;
      comic.lastRead = Date.now();
      await this.saveComic(comic);
    }
  }

  async saveComicFile(id: string, file: File | Blob): Promise<void> {
    await FILE_STORE.setItem(id, file);
  }

  async getComicFile(id: string): Promise<File | Blob | null> {
    return await FILE_STORE.getItem<File | Blob>(id);
  }

  // ── Universes ───────────────────────────────────────
  async getUniverses(): Promise<import('../types').Universe[]> {
    const universes: import('../types').Universe[] = [];
    await UNIVERSE_STORE.iterate((value: import('../types').Universe) => {
      universes.push(value);
    });
    return universes.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getUniverse(id: string): Promise<import('../types').Universe | null> {
    return await UNIVERSE_STORE.getItem(id);
  }

  async createUniverse(name: string): Promise<import('../types').Universe> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome inválido');
    
    const uni: import('../types').Universe = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: Date.now()
    };
    await UNIVERSE_STORE.setItem(uni.id, uni);
    return uni;
  }

  async updateUniverse(uni: import('../types').Universe): Promise<void> {
    await UNIVERSE_STORE.setItem(uni.id, uni);
  }

  async deleteUniverse(id: string): Promise<void> {
    // Optional: when deleting universe, should we delete its collections?
    // Let's just unset the universeId from collections to be safe.
    const collections = await this.getCollections();
    for (const col of collections) {
      if (col.universeId === id) {
        col.universeId = undefined;
        await this.updateCollection(col);
      }
    }
    await UNIVERSE_STORE.removeItem(id);
  }

  // ── Collections ─────────────────────────────────────
  async getCollections(): Promise<Collection[]> {
    const cols: Collection[] = [];
    await COLLECTION_STORE.iterate((value: Collection) => {
      cols.push(value);
    });
    return cols.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCollection(id: string): Promise<Collection | null> {
    return await COLLECTION_STORE.getItem<Collection>(id);
  }

  async createCollection(name: string): Promise<Collection> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Nome da coleção não pode ser vazio');
    const col: Collection = {
      id: crypto.randomUUID(),
      name: trimmed,
      comicIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await COLLECTION_STORE.setItem(col.id, col);
    return col;
  }

  async updateCollection(col: Collection): Promise<void> {
    col.updatedAt = Date.now();
    await COLLECTION_STORE.setItem(col.id, col);
  }

  async deleteCollection(id: string): Promise<void> {
    const col = await this.getCollection(id);
    if (col && col.comicIds && col.comicIds.length > 0) {
      for (const comicId of col.comicIds) {
        await this.deleteComic(comicId);
      }
    }
    await COLLECTION_STORE.removeItem(id);
  }

  async addComicToCollection(collectionId: string, comicId: string): Promise<void> {
    const col = await this.getCollection(collectionId);
    if (!col) return;
    if (col.comicIds.includes(comicId)) return; // no duplicates
    col.comicIds.push(comicId);
    col.updatedAt = Date.now();
    await COLLECTION_STORE.setItem(col.id, col);
  }

  async removeComicFromCollection(collectionId: string, comicId: string): Promise<void> {
    const col = await this.getCollection(collectionId);
    if (!col) return;
    col.comicIds = col.comicIds.filter(id => id !== comicId);
    col.updatedAt = Date.now();
    await COLLECTION_STORE.setItem(col.id, col);
  }

  async reorderCollection(collectionId: string, comicIds: string[]): Promise<void> {
    const col = await this.getCollection(collectionId);
    if (!col) return;
    col.comicIds = comicIds;
    col.updatedAt = Date.now();
    await COLLECTION_STORE.setItem(col.id, col);
  }

  // ── Reading Stats ───────────────────────────────────
  async getStats(): Promise<ReadingStats> {
    const stats = await STATS_STORE.getItem<ReadingStats>(STATS_KEY);
    return stats || { totalReadComics: 0, totalPagesRead: 0, completedComicIds: [], updatedAt: Date.now() };
  }

  async saveStats(stats: ReadingStats): Promise<void> {
    stats.updatedAt = Date.now();
    await STATS_STORE.setItem(STATS_KEY, stats);
  }

  /**
   * Mark a comic as completed (100% read). Idempotent — same comic won't be counted twice.
   * Returns true if this was a NEW completion (useful for triggering achievement checks).
   */
  async markComicCompleted(comicId: string): Promise<boolean> {
    const stats = await this.getStats();
    if (stats.completedComicIds.includes(comicId)) return false;
    stats.completedComicIds.push(comicId);
    stats.totalReadComics = stats.completedComicIds.length;
    await this.saveStats(stats);
    return true;
  }

  /**
   * Record pages read. Tracks by maxPageReached per comic to avoid over-counting.
   * Call with the current highest page the user has reached.
   */
  async recordPagesRead(comicId: string, maxPageReached: number): Promise<void> {
    const key = `__max_page_${comicId}`;
    const prev = (await STATS_STORE.getItem<number>(key)) || 0;
    if (maxPageReached <= prev) return; // no new pages
    const newPages = maxPageReached - prev;
    await STATS_STORE.setItem(key, maxPageReached);
    const stats = await this.getStats();
    stats.totalPagesRead += newPages;
    await this.saveStats(stats);
  }

  // ── Achievements ────────────────────────────────────
  async getAchievements(): Promise<Achievement[]> {
    return (await STATS_STORE.getItem<Achievement[]>(ACHIEVEMENTS_KEY)) || [];
  }

  async saveAchievements(achievements: Achievement[]): Promise<void> {
    await STATS_STORE.setItem(ACHIEVEMENTS_KEY, achievements);
  }
}

export const storage = new StorageService();
