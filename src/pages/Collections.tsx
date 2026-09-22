import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/StorageService';
import type { Collection, Universe } from '../types';
import { Plus, Trash2, Edit3, FolderOpen, ChevronRight, Globe, ChevronDown, FolderInput } from 'lucide-react';
import { ConfirmDialog, PromptDialog } from '../components/Dialogs';

export const Collections: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [createPrompt, setCreatePrompt] = useState<{ targetUniId?: string } | null>(null);
  const [createUniversePrompt, setCreateUniversePrompt] = useState(false);
  
  const [renamePrompt, setRenamePrompt] = useState<{ col: Collection | null }>({ col: null });
  const [renameUniversePrompt, setRenameUniversePrompt] = useState<{ uni: Universe | null }>({ uni: null });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ col: Collection | null }>({ col: null });
  const [deleteUniverseConfirm, setDeleteUniverseConfirm] = useState<{ uni: Universe | null }>({ uni: null });

  const [moveToUniversePrompt, setMoveToUniversePrompt] = useState<{ col: Collection | null }>({ col: null });

  const [expandedUniverses, setExpandedUniverses] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      const cols = await storage.getCollections();
      setCollections(cols);
      const unis = await storage.getUniverses();
      setUniverses(unis);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (name: string) => {
    const targetUniId = createPrompt?.targetUniId;
    setCreatePrompt(null);
    if (!name || !name.trim()) return;
    try {
      const newCol = await storage.createCollection(name.trim());
      if (targetUniId) {
        newCol.universeId = targetUniId;
        await storage.updateCollection(newCol);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to create collection:', err);
    }
  };

  const handleCreateUniverse = async (name: string) => {
    setCreateUniversePrompt(false);
    if (!name || !name.trim()) return;
    try {
      await storage.createUniverse(name.trim());
      await loadData();
    } catch (err) {
      console.error('Failed to create universe:', err);
    }
  };

  const handleRename = async (newName: string) => {
    const col = renamePrompt.col;
    setRenamePrompt({ col: null });
    if (!col || !newName || !newName.trim() || newName.trim() === col.name) return;
    try {
      const updated: Collection = { ...col, name: newName.trim() };
      await storage.updateCollection(updated);
      await loadData();
    } catch (err) {
      console.error('Failed to rename collection:', err);
    }
  };

  const handleRenameUniverse = async (newName: string) => {
    const uni = renameUniversePrompt.uni;
    setRenameUniversePrompt({ uni: null });
    if (!uni || !newName || !newName.trim() || newName.trim() === uni.name) return;
    try {
      const updated: Universe = { ...uni, name: newName.trim() };
      await storage.updateUniverse(updated);
      await loadData();
    } catch (err) {
      console.error('Failed to rename universe:', err);
    }
  };

  const handleDelete = async () => {
    const col = deleteConfirm.col;
    setDeleteConfirm({ col: null });
    if (!col) return;
    try {
      await storage.deleteCollection(col.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete collection:', err);
    }
  };

  const handleDeleteUniverse = async () => {
    const uni = deleteUniverseConfirm.uni;
    setDeleteUniverseConfirm({ uni: null });
    if (!uni) return;
    try {
      await storage.deleteUniverse(uni.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete universe:', err);
    }
  };

  const toggleUniverse = (id: string) => {
    setExpandedUniverses(prev => ({ ...prev, [id]: !prev[id] }));
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
      <div className="flex items-center justify-between px-4 mb-4">
        <h2 className="text-lg font-bold">Minhas Coleções</h2>
        <button
          onClick={() => setCreateUniversePrompt(true)}
          className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 transition"
        >
          <Globe size={14} /> Novo Universo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[50vh]">
          <div className="w-8 h-8 border-4 border-[#e50914] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : collections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 mt-20 px-4">
          <FolderOpen className="text-gray-500" size={64} strokeWidth={1.5} />
          <p className="text-gray-400 text-base">Nenhuma coleção</p>
          <button
            onClick={() => setCreatePrompt({})}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-white min-h-[44px]"
            style={{ backgroundColor: '#e50914' }}
          >
            <Plus size={20} />
            Nova coleção
          </button>
        </div>
      ) : (
        <>

        <div className="flex flex-col gap-6 px-4">
          
          {/* Universes */}
          {universes.map(uni => {
            const isExpanded = expandedUniverses[uni.id];
            const uniCollections = collections.filter(c => c.universeId === uni.id);

            return (
              <div key={uni.id} className="flex flex-col gap-2">
                {/* Universe Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer group bg-[#111] p-3 rounded-xl border border-white/5"
                  onClick={() => toggleUniverse(uni.id)}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="text-blue-500" size={20} />
                    <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{uni.name}</h3>
                    <span className="text-xs text-gray-500 ml-2">{uniCollections.length} coleções</span>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                  </div>

                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setCreatePrompt({ targetUniId: uni.id }); setExpandedUniverses(prev => ({ ...prev, [uni.id]: true })); }}
                      className="p-1.5 rounded-full hover:bg-green-500/20 text-gray-400 hover:text-green-400 transition-colors"
                      title="Nova Coleção neste Universo"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setRenameUniversePrompt({ uni }); }}
                      className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Renomear Universo"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteUniverseConfirm({ uni }); }}
                      className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                      title="Excluir Universo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Universe Collections */}
                {isExpanded && (
                  <div className="pl-4 flex flex-col gap-2 border-l border-white/10 ml-2 mt-1">
                    {uniCollections.length === 0 && (
                      <p className="text-xs text-gray-500 py-2">Vazio. Mova coleções para cá.</p>
                    )}
                    {uniCollections.map(col => (
                      <button
                        key={col.id}
                        onClick={() => handleCardClick(col)}
                        className="bg-[#1a1a1a] hover:bg-[#222] rounded-xl p-3 flex items-center gap-3 text-left w-full transition-colors group"
                      >
                        <FolderOpen className="text-gray-400 shrink-0" size={20} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{col.name}</p>
                          <p className="text-xs text-gray-400">{col.comicIds.length} itens</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setMoveToUniversePrompt({ col }); }}
                            className="p-1.5 rounded-full hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                            title="Mover"
                          >
                            <FolderInput size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenamePrompt({ col }); }}
                            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            title="Renomear"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ col }); }}
                            className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Orphan Collections */}
          {collections.filter(c => !c.universeId).length > 0 && universes.length > 0 && (
            <h3 className="text-sm font-semibold text-gray-500 mt-2 ml-1">Outras Coleções</h3>
          )}
          
          <div className="flex flex-col gap-3">
            {collections.filter(c => !c.universeId).map((col) => (
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
                    {universes.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setMoveToUniversePrompt({ col }); }}
                        className="p-2 rounded-full hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Mover para Universo"
                      >
                        <FolderInput size={18} />
                      </button>
                    )}
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
        </div>
        </>
      )}

      {/* Fixed Create Button */}
      <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-40">
        <button
          onClick={() => setCreatePrompt({})}
          className="w-14 h-14 bg-[#e50914] text-white rounded-full flex items-center justify-center shadow-lg shadow-red-900/30 hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Dialogs */}
      <PromptDialog
        isOpen={createPrompt !== null}
        title={createPrompt?.targetUniId ? "Nova Coleção no Universo" : "Nova Coleção"}
        placeholder="Nome da coleção"
        onConfirm={handleCreate}
        onCancel={() => setCreatePrompt(null)}
      />

      <PromptDialog
        isOpen={createUniversePrompt}
        title="Novo Universo"
        placeholder="Nome do Universo"
        onConfirm={handleCreateUniverse}
        onCancel={() => setCreateUniversePrompt(false)}
      />

      <PromptDialog
        isOpen={renamePrompt.col !== null}
        title="Renomear Coleção"
        defaultValue={renamePrompt.col?.name}
        onConfirm={handleRename}
        onCancel={() => setRenamePrompt({ col: null })}
      />

      <PromptDialog
        isOpen={renameUniversePrompt.uni !== null}
        title="Renomear Universo"
        defaultValue={renameUniversePrompt.uni?.name}
        onConfirm={handleRenameUniverse}
        onCancel={() => setRenameUniversePrompt({ uni: null })}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.col !== null}
        title="Excluir Coleção"
        message={`Tem certeza que deseja excluir a coleção "${deleteConfirm.col?.name}"? ATENÇÃO: Isso também APAGARÁ permanentemente da biblioteca todos os quadrinhos que estiverem dentro dela.`}
        isDanger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ col: null })}
      />

      <ConfirmDialog
        isOpen={deleteUniverseConfirm.uni !== null}
        title="Excluir Universo"
        message={`Tem certeza que deseja excluir o universo "${deleteUniverseConfirm.uni?.name}"? As coleções dentro dele NÃO serão apagadas, apenas ficarão sem universo.`}
        isDanger={true}
        onConfirm={handleDeleteUniverse}
        onCancel={() => setDeleteUniverseConfirm({ uni: null })}
      />

      {/* Move to Universe Custom Dialog */}
      {moveToUniversePrompt.col && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-white/10 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">Mover Coleção</h3>
              <p className="text-gray-400 text-sm mb-6">
                Selecione o universo para a coleção "{moveToUniversePrompt.col.name}":
              </p>

              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto mb-6">
                <button
                  onClick={async () => {
                    if (moveToUniversePrompt.col) {
                      const updated = { ...moveToUniversePrompt.col, universeId: undefined };
                      await storage.updateCollection(updated);
                      await loadData();
                    }
                    setMoveToUniversePrompt({ col: null });
                  }}
                  className={`p-3 rounded-xl text-left transition-colors border ${!moveToUniversePrompt.col.universeId ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-black/40 hover:bg-white/5'}`}
                >
                  Nenhum (Remover do universo)
                </button>
                {universes.map(uni => (
                  <button
                    key={uni.id}
                    onClick={async () => {
                      if (moveToUniversePrompt.col) {
                        const updated = { ...moveToUniversePrompt.col, universeId: uni.id };
                        await storage.updateCollection(updated);
                        await loadData();
                      }
                      setMoveToUniversePrompt({ col: null });
                    }}
                    className={`p-3 rounded-xl text-left transition-colors flex items-center gap-2 border ${moveToUniversePrompt.col?.universeId === uni.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-[#222] hover:bg-[#333]'}`}
                  >
                    <Globe size={16} className="text-blue-500" />
                    {uni.name}
                  </button>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setMoveToUniversePrompt({ col: null })}
                  className="px-5 py-2.5 rounded-xl font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
