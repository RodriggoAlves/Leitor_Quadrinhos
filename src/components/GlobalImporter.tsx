import React, { useState, useEffect } from 'react';
import { storage } from '../services/StorageService';
import { ComicParser } from '../services/ComicParser';
import type { Comic } from '../types';
import { useNavigate } from 'react-router-dom';

export const GlobalImporter: React.FC = () => {
  const navigate = useNavigate();
  const [isImporting, setIsImporting] = useState(false);
  const [importTotal, setImportTotal] = useState(0);
  const [importCurrent, setImportCurrent] = useState(0);
  const [importProgress, setImportProgress] = useState('');
  
  const [pendingFolderImport, setPendingFolderImport] = useState<{ files: File[], defaultName: string } | null>(null);
  const [collectionNameInput, setCollectionNameInput] = useState('');

  useEffect(() => {
    const onImportFiles = (e: any) => {
      const files = e.detail?.files;
      if (!files || files.length === 0) return;
      
      const validFiles = Array.from(files as File[]).filter(f => /\.(cbz|cbr|zip|rar)$/i.test(f.name));
      if (validFiles.length > 0) {
        runImport(validFiles, null);
      } else {
        alert('Nenhum arquivo válido (.cbz, .cbr, .zip, .rar)');
      }
    };

    const onImportFolder = (e: any) => {
      const files = e.detail?.files;
      if (!files || files.length === 0) return;
      
      const validFiles = Array.from(files as File[]).filter(f => /\.(cbz|cbr|zip|rar)$/i.test(f.name));
      if (validFiles.length > 0) {
        const firstPath = validFiles[0].webkitRelativePath || '';
        const defaultName = firstPath.split('/')[0] || 'Nova Pasta';
        setCollectionNameInput(defaultName);
        setPendingFolderImport({ files: validFiles, defaultName });
      } else {
        alert('Nenhum quadrinho válido encontrado na pasta.');
      }
    };

    window.addEventListener('import-files', onImportFiles);
    window.addEventListener('import-folder', onImportFolder);

    return () => {
      window.removeEventListener('import-files', onImportFiles);
      window.removeEventListener('import-folder', onImportFolder);
    };
  }, []);

  const runImport = async (validFiles: File[], collectionNameToCreate: string | null) => {
    setIsImporting(true);
    setImportTotal(validFiles.length);
    setImportCurrent(0);

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
    window.dispatchEvent(new CustomEvent('library-cleared')); // Trigger reload in Home/Collections

    if (newCollection) {
      navigate(`/collection/${newCollection.id}`);
    }
  };

  return (
    <>
      {/* ── IMPORT FOLDER MODAL ── */}
      {pendingFolderImport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-2 text-white">Criar Coleção?</h3>
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

      {/* ── FLOATING PROGRESS BAR ── */}
      {isImporting && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-black/95 backdrop-blur-md border-b border-[#e50914]/30 shadow-2xl p-4 slide-in-from-top-full animate-in duration-300">
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="font-bold text-white text-sm">Importando Quadrinhos...</h3>
                <p className="text-xs text-gray-400 truncate max-w-[250px] md:max-w-md mt-0.5">
                  {importProgress}
                </p>
              </div>
              <p className="text-[#e50914] font-black text-sm">
                {importCurrent} / {importTotal}
              </p>
            </div>
            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e50914] to-red-400 transition-all duration-300 rounded-full"
                style={{ width: `${(importCurrent / importTotal) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
