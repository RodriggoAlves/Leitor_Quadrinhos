import React, { useState, useEffect } from 'react';
import type { Comic } from '../types';
import { storage } from '../services/StorageService';
import { ComicCard } from '../components/ComicCard';
import { Plus, Search, Download, FolderPlus, ChevronRight, ChevronDown, Library, Trash2, Maximize, Minimize, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'az' | 'za'>('az');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedRoots, setExpandedRoots] = useState<Record<string, boolean>>({});
  const [collections, setCollections] = useState<import('../types').Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Welcome profile
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  const navigate = useNavigate();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => { loadComics(); }, []);

  // Listen to library-cleared event to reload
  useEffect(() => {
    const onClear = () => loadComics();
    window.addEventListener('library-cleared', onClear);
    return () => window.removeEventListener('library-cleared', onClear);
  }, []);

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
      const p = await storage.getUserProfile();
      if (!p) {
        setShowWelcome(true);
      }
      
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
            <input type="file" accept=".cbz,.zip,.cbr,.rar" multiple className="hidden" onChange={(e) => {
              if (e.target.files) window.dispatchEvent(new CustomEvent('import-files', { detail: { files: Array.from(e.target.files) } }));
              e.target.value = '';
            }} />
          </label>

          <label className="cursor-pointer bg-[#e50914] hover:bg-red-700 transition px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
            <FolderPlus size={13} /> Pasta
            {/* @ts-ignore */}
            <input type="file" webkitdirectory="" directory="" multiple className="hidden" onChange={(e) => {
              if (e.target.files) window.dispatchEvent(new CustomEvent('import-folder', { detail: { files: Array.from(e.target.files) } }));
              e.target.value = '';
            }} />
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
        ) : comics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center gap-4 animate-in fade-in duration-500">
            <Library size={48} className="text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-400">Biblioteca vazia</h2>
            <p className="text-gray-600 text-sm">Importe arquivos .cbz ou .cbr para começar</p>
            <label className="cursor-pointer bg-[#e50914] hover:bg-red-700 transition px-6 py-2.5 rounded-full text-sm font-bold mt-2">
              + Importar HQs
              <input type="file" accept=".cbz,.zip,.cbr,.rar" multiple className="hidden" onChange={(e) => {
                if (e.target.files) window.dispatchEvent(new CustomEvent('import-files', { detail: { files: Array.from(e.target.files) } }));
                e.target.value = '';
              }} />
            </label>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sortedRoots.map(root => {
              const isExpanded = expandedRoots[root];
              const rootData = tree[root];
              const hasSubs = Object.keys(rootData.subs).some(s => s !== '__root__');
              
              // Only match a collection if it ACTUALLY contains these comics
              const matchedCollection = collections.find(c => 
                c.name.toLowerCase() === root.toLowerCase() && 
                rootData.totalComics.some(comic => c.comicIds.includes(comic.id))
              );

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

      {/* ── WELCOME MODAL ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-sm p-6 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <h2 className="text-2xl font-black mb-2 text-white">Bem-vindo(a)!</h2>
            <p className="text-sm text-gray-400 mb-6">Como gostaria de ser chamado?</p>
            <input
              type="text"
              value={welcomeName}
              onChange={e => setWelcomeName(e.target.value)}
              placeholder="Seu nome ou apelido..."
              className="w-full bg-black border border-white/20 rounded-xl px-4 py-3 text-white text-center font-bold outline-none focus:border-[#e50914] transition-colors mb-6"
            />
            <button
              disabled={!welcomeName.trim()}
              onClick={async () => {
                await storage.saveUserProfile({ name: welcomeName.trim() });
                setShowWelcome(false);
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full bg-[#e50914] text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
            >
              Começar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

