import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Reader } from './pages/Reader';
import { Details } from './pages/Details';
import { Collections } from './pages/Collections';
import { CollectionDetail } from './pages/CollectionDetail';
import { Achievements } from './pages/Achievements';
import { Library, Plus, FolderPlus, Trash2, FolderOpen, Trophy } from 'lucide-react';
import { storage } from './services/StorageService';

// ── Global Bottom Nav (hidden in Reader) ──
const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname.startsWith('/read/')) return null;

  const handleImportFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cbz,.zip,.cbr,.rar';
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      window.dispatchEvent(new CustomEvent('import-files', { detail: { files } }));
      if (location.pathname !== '/') navigate('/');
    };
    input.click();
  };

  const handleImportFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      window.dispatchEvent(new CustomEvent('import-folder', { detail: { files } }));
      if (location.pathname !== '/') navigate('/');
    };
    input.click();
  };

  const handleClear = async () => {
    if (!window.confirm('Apagar TODOS os quadrinhos da biblioteca?')) return;
    const all = await storage.getAllComics();
    for (const c of all) await storage.deleteComic(c.id);
    window.dispatchEvent(new CustomEvent('library-cleared'));
    if (location.pathname !== '/') navigate('/');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2.5 bg-black/95 backdrop-blur-md border-t border-white/8 md:hidden overflow-x-auto gap-2">
      <button onClick={() => navigate('/')} className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/' || location.pathname.startsWith('/details/') ? 'text-[#e50914]' : 'text-gray-500 hover:text-white'}`}>
        <Library size={22} />
        <span className="text-[9px] font-medium">Home</span>
      </button>

      <button onClick={() => navigate('/collections')} className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname.startsWith('/collection') ? 'text-[#e50914]' : 'text-gray-500 hover:text-white'}`}>
        <FolderOpen size={22} />
        <span className="text-[9px] font-medium">Coleções</span>
      </button>

      <button onClick={handleImportFiles} className="flex flex-col items-center gap-1 min-w-[50px] text-gray-500 hover:text-white transition-colors">
        <Plus size={22} />
        <span className="text-[9px] font-medium">Arquivos</span>
      </button>

      <button onClick={handleImportFolder} className="flex flex-col items-center gap-1 min-w-[50px] text-gray-500 hover:text-white transition-colors">
        <FolderPlus size={22} />
        <span className="text-[9px] font-medium">Pasta</span>
      </button>

      <button onClick={() => navigate('/achievements')} className={`flex flex-col items-center gap-1 min-w-[50px] transition-colors ${location.pathname === '/achievements' ? 'text-[#e50914]' : 'text-gray-500 hover:text-white'}`}>
        <Trophy size={22} />
        <span className="text-[9px] font-medium">Troféus</span>
      </button>

      <button onClick={handleClear} className="flex flex-col items-center gap-1 min-w-[50px] text-gray-600 hover:text-red-500 transition-colors">
        <Trash2 size={22} />
        <span className="text-[9px] font-medium">Limpar</span>
      </button>
    </div>
  );
};

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/read/:id" element={<Reader />} />
        <Route path="/details/:id" element={<Details />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/collection/:id" element={<CollectionDetail />} />
        <Route path="/achievements" element={<Achievements />} />
      </Routes>
      <BottomNav />
    </Router>
  );
}

export default App;
