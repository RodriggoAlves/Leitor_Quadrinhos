import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storage } from '../services/StorageService';
import { ComicCard } from '../components/ComicCard';
import type { Collection, Comic } from '../types';
import { ArrowLeft, GripVertical, Check, X } from 'lucide-react';

export const CollectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [comics, setComics] = useState<Comic[]>([]);
  const [editing, setEditing] = useState(false);
  const [editComics, setEditComics] = useState<Comic[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const col = await storage.getCollection(id);
      if (!col) return;
      setCollection(col);

      const allComics = await storage.getAllComics();
      const ordered: Comic[] = [];
      for (const comicId of col.comicIds) {
        const found = allComics.find((c) => c.id === comicId);
        if (found) {
          ordered.push(found);
        }
      }
      setComics(ordered);
    };
    load();
  }, [id]);

  const enterEditMode = () => {
    setEditComics([...comics]);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditComics([]);
    setEditing(false);
    setDragIndex(null);
    setOverIndex(null);
  };

  const confirmEdit = async () => {
    if (!collection) return;
    const newIds = editComics.map((c) => c.id);
    await storage.reorderCollection(collection.id, newIds);
    const updated = await storage.getCollection(collection.id);
    if (updated) {
      setCollection(updated);
    }
    setComics([...editComics]);
    setEditing(false);
    setEditComics([]);
    setDragIndex(null);
    setOverIndex(null);
  };

  // --- Native HTML drag events (mouse) ---

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  };

  const handleDragLeave = () => {
    setOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const reordered = [...editComics];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setEditComics(reordered);
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // --- Touch polyfill for drag-and-drop ---

  const touchDragIndex = useRef<number | null>(null);

  const handleTouchStart = (index: number) => {
    touchDragIndex.current = index;
    setDragIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchDragIndex.current === null) return;
    const touch = e.touches[0];
    const clientY = touch.clientY;

    let foundIndex: number | null = null;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const row = rowRefs.current[i];
      if (!row) continue;
      const rect = row.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== null) {
      setOverIndex(foundIndex);
    }
  };

  const handleTouchEnd = () => {
    if (touchDragIndex.current === null) return;
    const from = touchDragIndex.current;
    const to = overIndex;

    if (to !== null && from !== to) {
      const reordered = [...editComics];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      setEditComics(reordered);
    }

    touchDragIndex.current = null;
    setDragIndex(null);
    setOverIndex(null);
  };

  if (!collection) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-20 px-4 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Voltar"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{collection.name}</h1>
          <p className="text-sm text-gray-400">
            {comics.length} {comics.length === 1 ? 'quadrinho' : 'quadrinhos'}
          </p>
        </div>

        {!editing ? (
          <button
            onClick={enterEditMode}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-sm text-[#e50914] font-medium whitespace-nowrap"
          >
            Editar ordem
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={confirmEdit}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-green-500"
              aria-label="Confirmar"
            >
              <Check size={24} />
            </button>
            <button
              onClick={cancelEdit}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-red-500"
              aria-label="Cancelar"
            >
              <X size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {!editing ? (
        /* Grid view */
        <div className="px-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {comics.map((comic) => (
              <div
                key={comic.id}
                className="cursor-pointer"
              >
                <ComicCard comic={comic} onClick={() => navigate(`/details/${comic.id}`)} />
              </div>
            ))}
          </div>

          {comics.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-500">Nenhum quadrinho nesta coleção.</p>
            </div>
          )}
        </div>
      ) : (
        /* Edit mode: vertical list */
        <div className="px-4 space-y-2" ref={listRef}>
          {editComics.map((comic, index) => (
            <div
              key={comic.id}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className={`bg-[#1a1a1a] rounded-lg p-3 flex items-center gap-3 transition-all ${
                dragIndex === index ? 'opacity-50' : ''
              } ${overIndex === index && dragIndex !== index ? 'border-t-2 border-[#e50914]' : 'border-t-2 border-transparent'}`}
            >
              {/* Drag handle */}
              <div
                className="text-gray-600 cursor-grab min-w-[44px] min-h-[44px] flex items-center justify-center touch-none"
                onTouchStart={() => handleTouchStart(index)}
              >
                <GripVertical size={20} />
              </div>

              {/* Cover thumbnail */}
              {comic.coverImage ? (
                <img
                  src={comic.coverImage}
                  alt={comic.title}
                  className="w-[40px] h-[56px] object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-[40px] h-[56px] bg-[#2a2a2a] rounded flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs text-gray-600">?</span>
                </div>
              )}

              {/* Title */}
              <span className="text-sm truncate flex-1">{comic.title}</span>
            </div>
          ))}

          {editComics.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-500">Nenhum quadrinho nesta coleção.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
