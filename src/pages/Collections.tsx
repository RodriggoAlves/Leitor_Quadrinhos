import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/StorageService';
import type { Collection } from '../types';
import { Plus, Trash2, Edit3, FolderOpen, ChevronRight } from 'lucide-react';

export const Collections: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCollections = async () => {
    try {
      const cols = await storage.getCollections();
      setCollections(cols);
    } catch (err) {
      console.error('Failed to load collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleCreate = async () => {
    const name = window.prompt('Nome da nova coleção:');
    if (!name || !name.trim()) return;
    try {
      await storage.createCollection(name);
      await loadCollections();
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const handleRename = async (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    const newName = window.prompt('Renomear coleção:', col.name);
    if (!newName || !newName.trim() || newName.trim() === col.name) return;
    try {
      const updated: Collection = { ...col, name: newName.trim() };
      await storage.updateCollection(updated);
      await loadCollections();
    } catch (err) {
      console.error('Failed to rename collection:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, col: Collection) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Excluir a coleção "${col.name}"?`);
    if (!confirmed) return;
    try {
      await storage.deleteCollection(col.id);
      await loadCollections();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleCardClick = (col: Collection) => {
    navigate(`/collection/${col.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pt-20 pb-24">
      <h2 className="text-lg font-bold mb-4 px-4">Minhas Coleções</h2>

      {collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 mt-20 px-4">
          <FolderOpen className="text-gray-500" size={64} strokeWidth={1.5} />
          <p className="text-gray-400 text-base">Nenhuma coleção</p>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white min-h-[44px]"
            style={{ backgroundColor: '#e50914' }}
          >
            <Plus size={20} />
            Nova coleção
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 px-4">
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => handleCardClick(col)}
                className="bg-[#1a1a1a] hover:bg-[#222] rounded-xl p-4 flex items-center gap-3 text-left w-full transition-colors min-h-[44px]"
              >
                <FolderOpen className="text-gray-400 shrink-0" size={24} />

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{col.name}</p>
                  <p className="text-gray-400 text-sm">
                    {col.comicIds.length} {col.comicIds.length === 1 ? 'item' : 'itens'}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleRename(e, col)}
                    className="p-2 rounded-lg hover:bg-[#333] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Renomear ${col.name}`}
                  >
                    <Edit3 className="text-gray-400" size={20} />
                  </button>

                  <button
                    onClick={(e) => handleDelete(e, col)}
                    className="p-2 rounded-lg hover:bg-[#333] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={`Excluir ${col.name}`}
                  >
                    <Trash2 className="text-gray-400" size={20} />
                  </button>

                  <ChevronRight className="text-gray-500 shrink-0" size={20} />
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 mt-6">
            <button
              onClick={handleCreate}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white min-h-[44px]"
              style={{ backgroundColor: '#e50914' }}
            >
              <Plus size={20} />
              Nova coleção
            </button>
          </div>
        </>
      )}
    </div>
  );
};
