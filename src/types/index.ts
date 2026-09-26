export interface Comic {
  id: string;
  title: string;
  fileName: string;
  series?: string;
  format: 'cbz' | 'cbr' | 'pdf';
  totalPages: number;
  fileSize: number;
  coverImage?: string; // base64 or blob url
  progress: number; // percentage
  currentPage: number;
  lastRead: number; // timestamp
  fileHandle?: any; 
  fileData?: Blob | ArrayBuffer | File; 
}

export interface ReadingProgress {
  comicId: string;
  currentPage: number;
  progress: number;
  lastRead: number;
}

export interface Universe {
  id: string;
  name: string;
  createdAt: number;
}

export interface Collection {
  id: string;
  name: string;
  universeId?: string;
  comicIds: string[];   // ordered array — also defines display order
  createdAt: number;
  updatedAt: number;
}

export interface ReadingStats {
  totalReadComics: number;
  totalPagesRead: number;
  completedComicIds: string[];  // prevents double-counting
  updatedAt: number;
}

export interface Achievement {
  id: string;
  unlockedAt?: number;          // undefined = locked
}

export interface UserProfile {
  name: string;
  favoritePublisher?: string; // id of publisher
  favoriteHero?: string; // id or name of hero
}
