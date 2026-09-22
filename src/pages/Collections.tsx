import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/StorageService';
import type { Collection } from '../types';
import { Plus, Trash2, Edit3, FolderOpen, ChevronRight } from 'lucide-react';
import { ConfirmDialog, PromptDialog } from '../components/Dialogs';

export const Collections: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [createPrompt, setCreatePrompt] = useState(false);
  const [renamePrompt, setRenamePrompt] = useState<{ col: Collection | null }>({ col: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ col: Collection | null }>({ col: null });

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

  const handleCreate = async (name: string) => {
    setCreatePrompt(false);
    if (!name || !name.trim()) return;
    try {
      await storage.createCollection(name.trim());
      await loadCollections();
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const handleRename = async (newName: string) => {
    const col = renamePrompt.col;
    setRenamePrompt({ col: null });
    if (!col || !newName || !newName.trim() || newName.trim() === col.name) return;
    try {
      const updated: Collection = { ...col, name: newName.trim() };
      await storage.updateCollection(updated);
      await loadCollections();
    } catch (err) {
      console.error('Failed to rename collection:', err);
    }
  };

  const handleDelete = async () => {
    const col = deleteConfirm.col;
    setDeleteConfirm({ col: null });
    if (!col) return;
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
            onClick={() => setCreatePrompt(true)}
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
              className="bg-[#1a1a1a] hover:bg-[#222] rounded-xl p-4 flex items-center gap-3 text-left w-full transition-colors min-h-[44px] group"
            >
              <FolderOpen className="text-gray-400 shrink-0" size={24} />

              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{col.name}</p>
                <p className="text-gray-400 text-sm">
                  {col.comicIds.length} {col.comicIds.length === 1 ? 'item' : 'itens'}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 md:mt-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRenamePrompt({ col }); }}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Renomear"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ col }); }}
                    className="p-2 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <ChevronRight className="text-gray-500 shrink-0" size={20} />
            </button>
          ))}
        </div>
        </>
      )}

      {/* Fixed Create Button */}
      <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40">
        <button
          onClick={() => setCreatePrompt(true)}
          className="w-14 h-14 bg-[#e50914] text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/30 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Dialogs */}
      <PromptDialog
        isOpen={createPrompt}
        title="Nova Coleção"
        placeholder="Nome da coleção"
        onConfirm={handleCreate}
        onCancel={() => setCreatePrompt(false)}
      />

      <PromptDialog
        isOpen={renamePrompt.col !== null}
        title="Renomear Coleção"
        defaultValue={renamePrompt.col?.name}
        onConfirm={handleRename}
        onCancel={() => setRenamePrompt({ col: null })}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.col !== null}
        title="Excluir Coleção"
        message={`Tem certeza que deseja excluir a coleção "${deleteConfirm.col?.name}"? Isso NÃO apagará os quadrinhos da biblioteca, apenas excluirá a coleção.`}
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ col: null })}
      />
    </div>
  );
};
