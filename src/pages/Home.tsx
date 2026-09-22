import React, { useState, useEffect } from 'react';
import type { Comic } from '../types';
import { storage } from '../services/StorageService';
import { ComicCard } from '../components/ComicCard';
import { Plus, Search, Download, FolderPlus, ChevronRight, ChevronDown, Library, Trash2, Maximize, Minimize, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ComicParser } from '../services/ComicParser';
import { useFullscreen } from '../hooks/useFullscreen';
import { ConfirmDialog } from '../components/Dialogs';

const SortDropdown = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  const [open, setOpen] = React.useState(false);
  
  const options = [
    { id: 'recent', label: 'Recentes' },
    { id: 'az', label: 'A - Z' },
    { id: 'za', label: 'Z - A' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-full text-xs font-semibold"
      >
        {options.find(o => o.id === value)?.label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${value === opt.id ? 'bg-[#e50914] text-white font-bold' : 'text-gray-300 hover:bg-white/10'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Home: React.FC = () => {
  const [comics, setComics] = useState<Comic[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [importTotal, setImportTotal] = useState(0);
  const [importCurrent, setImportCurrent] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'az' | 'za'>('az');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingFolderImport, setPendingFolderImport] = useState<{ files: File[], defaultName: string } | null>(null);
  const [collectionNameInput, setCollectionNameInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  const [collections, setCollections] = useState<import('../types').Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Refs so event listeners in useEffect always see the latest function versions
  const processImportRef = React.useRef<((files: FileList | File[], isFolder?: boolean) => void) | null>(null);
  const loadComicsRef = React.useRef<(() => void) | null>(null);

  useEffect(() => { loadComics(); }, []);

  // Wire up BottomNav custom events — use refs to avoid stale closures
  useEffect(() => {
    const onClear = () => loadComicsRef.current?.();
    const onImportFiles = (e: any) => e.detail?.files && processImportRef.current?.(e.detail.files, false);
    const onImportFolder = (e: any) => e.detail?.files && processImportRef.current?.(e.detail.files, true);

    window.addEventListener('library-cleared', onClear);
    window.addEventListener('import-files', onImportFiles);
    window.addEventListener('import-folder', onImportFolder);

    return () => {
      window.removeEventListener('library-cleared', onClear);
      window.removeEventListener('import-files', onImportFiles);
      window.removeEventListener('import-folder', onImportFolder);
    };
  }, []); // runs once — but uses refs which always point to latest functions


  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const loadComics = async () => {
    setIsLoading(true);
    try {
      const allComics = await storage.getAllComics();
      setComics(allComics);
      const allCols = await storage.getCollections();
      setCollections(allCols);
    } catch (err: any) {
      setErrorMsg(`Erro ao carregar: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  // Keep ref in sync with latest function (avoids stale closure in event listeners)
  loadComicsRef.current = loadComics;

  const processImport = async (files: FileList | File[], isFolder = false) => {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f =>
      /\.(cbz|cbr|zip|rar)$/i.test(f.name)
    );

    if (validFiles.length === 0) {
      setErrorMsg('Nenhum arquivo válido (.cbz, .cbr, .zip, .rar)');
      return;
    }

    if (isFolder && validFiles.length > 0) {
      const firstPath = validFiles[0].webkitRelativePath || '';
      const defaultName = firstPath.split('/')[0] || 'Nova Pasta';
      setCollectionNameInput(defaultName);
      setPendingFolderImport({ files: validFiles, defaultName });
      return; // wait for user choice
    }

    // Default import (no collection)
    runImport(validFiles, null);
  };

  const runImport = async (validFiles: File[], collectionNameToCreate: string | null) => {
    setIsImporting(true);
    setImportTotal(validFiles.length);
    setErrorMsg(null);

    let newCollection: import('../types').Collection | null = null;
    if (collectionNameToCreate) {
      try {
        newCollection = await storage.createCollection(collectionNameToCreate);
      } catch (e) {
        console.error(e);
      }
    }

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setImportCurrent(i + 1);
      setImportProgress(file.name);

      try {
        let topic = '';
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split('/');
          if (parts.length > 2) {
            topic = parts.slice(1, -1).join('/');
          } else if (parts.length === 2) {
            topic = parts[0];
          }
        }

        const id = crypto.randomUUID();
        const parser = new ComicParser(file, file.name);
        await parser.load();

        const coverUrl = await parser.getCoverUrl();
        const res = await fetch(coverUrl);
        const coverBlob = await res.blob();
        const coverBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(coverBlob);
        });

        const comic: Comic = {
          id,
          title: file.name.replace(/\.[^/.]+$/, ''),
          fileName: file.name,
          series: collectionNameToCreate || topic || 'Geral',
          format: /\.(cbr|rar)$/i.test(file.name) ? 'cbr' : 'cbz',
          totalPages: parser.getTotalPages(),
          fileSize: file.size,
          progress: 0,
          currentPage: 0,
          lastRead: Date.now(),
          coverImage: coverBase64
        };

        await storage.saveComic(comic);
        await storage.saveComicFile(id, file);

        if (newCollection) {
          await storage.addComicToCollection(newCollection.id, id);
        }
      } catch (err: any) {
        console.error(`Erro em ${file.name}:`, err);
      }
    }

    setIsImporting(false);
    setImportProgress('');
    setImportTotal(0);
    setImportCurrent(0);
    await loadComics();

    if (newCollection) {
      navigate(`/collection/${newCollection.id}`);
    }
  };
  // Keep ref in sync with latest function (avoids stale closure in event listeners)
  processImportRef.current = processImport;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
    if (e.target.files) processImport(e.target.files, isFolder);
    e.target.value = '';
  };



  const toggleRoot = (root: string) =>
    setExpandedRoots(prev => ({ ...prev, [root]: !prev[root] }));

  const filteredComics = comics
    .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === 'az') return a.title.localeCompare(b.title);
      if (sortOrder === 'za') return b.title.localeCompare(a.title);
      return (b.lastRead || 0) - (a.lastRead || 0);
    });

  const tree = filteredComics.reduce((acc, comic) => {
    const fullPath = comic.series || 'Geral';
    const parts = fullPath.split('/');
    const root = parts[0];
    const sub = parts.length > 1 ? parts.slice(1).join('/') : '__root__';
    if (!acc[root]) acc[root] = { totalComics: [], subs: {} };
    acc[root].totalComics.push(comic);
    if (!acc[root].subs[sub]) acc[root].subs[sub] = [];
    acc[root].subs[sub].push(comic);
    return acc;
  }, {} as Record<string, { totalComics: Comic[], subs: Record<string, Comic[]> }>);

  const sortedRoots = Object.keys(tree).sort((a, b) => {
    if (a === 'Geral') return 1;
    if (b === 'Geral') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white w-full max-w-[100vw] overflow-x-hidden">
      {/* ── NAVBAR ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 py-3 bg-black/70 backdrop-blur-md border-b border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Library size={22} className="text-[#e50914]" />
          <span className="text-lg font-extrabold text-[#e50914] tracking-wider hidden sm:block">COMIC FLIX</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs mx-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/8 border border-white/10 text-white rounded-full py-1.5 pl-8 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:border-[#e50914]/50 focus:bg-white/10 transition"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            title="Tela cheia"
            onClick={toggleFullscreen}
            className="cursor-pointer bg-white/8 hover:bg-white/20 transition p-2 rounded-full text-gray-400 hover:text-white"
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
          
          <SortDropdown value={sortOrder} onChange={(val) => setSortOrder(val as any)} />

          <label className="cursor-pointer bg-white/10 hover:bg-white/20 transition px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <Plus size={13} /> Arquivos
            <input type="file" accept=".cbz,.zip,.cbr,.rar" multiple className="hidden" onChange={(e) => handleImport(e, false)} disabled={isImporting} />
          </label>

          <label className="cursor-pointer bg-[#e50914] hover:bg-red-700 transition px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
            <FolderPlus size={13} /> Pasta
            {/* @ts-ignore */}
            <input type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => handleImport(e, true)} disabled={isImporting} />
          </label>

          {deferredPrompt && (
            <button onClick={handleInstallClick} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Download size={13} />
            </button>
          )}

          <button
            onClick={() => setShowClearConfirm(true)}
            className="cursor-pointer bg-white/8 hover:bg-red-900/40 border border-white/10 hover:border-red-500/40 text-gray-400 hover:text-red-400 transition px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5"
            title="Limpar biblioteca"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      </header>

      {/* ── IMPORT PROGRESS BAR ── */}
      {isImporting && (
        <div className="px-6 py-3 bg-[#1a1a1a] border-b border-white/5 mt-14">
          <div className="flex items-center justify-between mb-1.5 text-xs text-gray-400">
            <span>Importando {importCurrent}/{importTotal}: <span className="text-white font-medium truncate max-w-xs inline-block align-middle">{importProgress}</span></span>
            <span>{Math.round((importCurrent / importTotal) * 100)}%</span>
          </div>
          <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-[#e50914] transition-all duration-300 rounded-full" style={{ width: `${(importCurrent / importTotal) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {errorMsg && (
        <div className="mx-4 md:mx-8 mt-4 p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/* ── LIBRARY ── */}
      <main className="px-4 md:px-8 pb-24 md:pb-12 mt-20">
        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh]">
            <div className="w-8 h-8 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : comics.length === 0 && !isImporting ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-4 animate-in fade-in duration-500">
            <Library size={48} className="text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-400">Biblioteca vazia</h2>
            <p className="text-gray-600 text-sm">Importe arquivos .cbz ou .cbr para começar</p>
            <label className="cursor-pointer bg-[#e50914] hover:bg-red-700 transition px-6 py-2.5 rounded-full text-sm font-bold mt-2">
              + Importar HQs
              <input type="file" accept=".cbz,.zip,.cbr,.rar" multiple className="hidden" onChange={(e) => handleImport(e, false)} />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sortedRoots.map(root => {
              const isExpanded = expandedRoots[root];
              const rootData = tree[root];
              const hasSubs = Object.keys(rootData.subs).some(s => s !== '__root__');
              const matchedCollection = collections.find(c => c.name.toLowerCase() === root.toLowerCase());

              return (
                <div key={root}>
                  {/* Section header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                    <div
                      className="flex items-center gap-2 cursor-pointer group w-full"
                      onClick={() => {
                        if (matchedCollection) {
                          navigate(`/collection/${matchedCollection.id}`);
                        } else if (hasSubs) {
                          toggleRoot(root);
                        }
                      }}
                    >
                      <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2 group-hover:text-[#e50914] transition-colors">
                        <FolderOpen className="text-[#e50914]" size={24} />
                        {root}
                        {!matchedCollection && hasSubs && (
                          isExpanded
                            ? <ChevronDown size={18} className="text-gray-400" />
                            : <ChevronRight size={18} className="text-gray-400" />
                        )}
                      </h2>
                      
                      {/* Badge / Indicators */}
                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {rootData.totalComics.length} quadrinhos
                        </span>
                        {matchedCollection && (
                          <span className="text-[10px] uppercase tracking-wider bg-[#e50914]/20 text-[#e50914] px-2 py-1 rounded-full font-bold">
                            Coleção
                          </span>
                        )}
                        {matchedCollection && <ChevronRight size={18} className="text-gray-400 group-hover:text-white transition-colors" />}
                      </div>
                    </div>
                  </div>

                  {!isExpanded || !hasSubs ? (
                    /* Grid de cards — quebra em múltiplas linhas */
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3">
                      {rootData.totalComics.map(comic => (
                        <ComicCard key={comic.id} comic={comic} onClick={(c) => navigate(`/details/${c.id}`)} />
                      ))}
                    </div>
                  ) : (
                    /* Expanded: subfolders each as a grid */
                    <div className="flex flex-col gap-6 pl-3 border-l border-[#e50914]/20">
                      {Object.keys(rootData.subs).sort().map(sub => (
                        <div key={sub}>
                          {sub !== '__root__' && (
                            <h3 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#e50914]" />
                              {sub}
                            </h3>
                          )}
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-3">
                            {rootData.subs[sub].map(comic => (
                              <ComicCard key={comic.id} comic={comic} onClick={(c) => navigate(`/details/${c.id}`)} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── IMPORT FOLDER MODAL ── */}
      {pendingFolderImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-2">Criar Coleção?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Você está importando quadrinhos de uma pasta. Deseja agrupá-los automaticamente em uma Coleção?
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Nome da Coleção
              </label>
              <input
                type="text"
                value={collectionNameInput}
                onChange={(e) => setCollectionNameInput(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#e50914] transition-colors"
                placeholder="Ex: Marvel, Batman, etc..."
              />
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => {
                  const files = pendingFolderImport.files;
                  setPendingFolderImport(null);
                  runImport(files, null);
                }}
                className="px-5 py-2.5 rounded-xl font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Não
              </button>
              <button
                onClick={() => {
                  const files = pendingFolderImport.files;
                  setPendingFolderImport(null);
                  runImport(files, collectionNameInput.trim() || 'Nova Coleção');
                }}
                className="px-5 py-2.5 rounded-xl font-bold bg-[#e50914] hover:bg-red-700 text-white transition-colors"
              >
                Sim, Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLEAR LIBRARY MODAL ── */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Limpar Biblioteca"
        message="Apagar TODOS os quadrinhos da biblioteca?"
        isDanger={true}
        onConfirm={async () => {
          setShowClearConfirm(false);
          const all = await storage.getAllComics();
          for (const c of all) await storage.deleteComic(c.id);
          await loadComics();
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
};

