import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/StorageService';
import type { UserProfile, ReadingStats } from '../types';
import { ArrowLeft, User, CheckCircle2, Edit3, BookOpen, Layers, Trophy, Trash2 } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { ConfirmDialog } from '../components/Dialogs';

const PUBLISHERS = [
  { id: 'marvel', name: 'Marvel', img: '/publishers/marvel.jpg' },
  { id: 'dc', name: 'DC Comics', img: '/publishers/dc.png' },
  { id: 'theboys', name: 'The Boys', img: '/publishers/theboys.png' },
  { id: 'xmen', name: 'X-Men', img: '/publishers/xmen.png' },
];

const HEROES: Record<string, string[]> = {
  marvel: ['Homem-Aranha', 'Homem de Ferro', 'Capitão América', 'Thor', 'Hulk', 'Viúva Negra', 'Pantera Negra', 'Demolidor', 'Wolverine', 'Deadpool'],
  dc: ['Batman', 'Superman', 'Mulher-Maravilha', 'Flash', 'Aquaman', 'Lanterna Verde', 'Asa Noturna', 'Coringa'],
  theboys: ['Capitão Pátria', 'Bruto (Butcher)', 'Luz-Estrela', 'Trem-Bala', 'Soldier Boy', 'Black Noir', 'Profundo'],
  xmen: ['Wolverine', 'Ciclope', 'Jean Grey', 'Tempestade', 'Magneto', 'Noturno', 'Vampira', 'Gambit'],
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>({ name: '' });
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      const p = await storage.getUserProfile();
      const s = await storage.getStats();
      const ach = await storage.getAchievements();
      
      setStats(s);
      setUnlockedCount(ach.filter(a => a.unlockedAt).length);
      
      if (p && p.name) {
        setProfile(p);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await storage.saveUserProfile(profile);
    setTimeout(() => {
      setSaving(false);
      setIsEditing(false); // Switch to View Mode
    }, 500);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Carregando...</div>;
  }

  const currentHeroes = profile.favoritePublisher ? HEROES[profile.favoritePublisher] || [] : [];
  const selectedPub = PUBLISHERS.find(p => p.id === profile.favoritePublisher);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* View Mode (Steam Profile Style) */}
      {!isEditing && (
        <div className="animate-in fade-in duration-500">
          {/* Banner Background */}
          <div className="relative h-64 md:h-80 w-full bg-[#111] overflow-hidden">
            {selectedPub && (
              <img 
                src={selectedPub.img} 
                alt="Banner" 
                className="w-full h-full object-cover opacity-40 blur-sm scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
            
            {/* Header Actions */}
            <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex justify-between items-center z-10">
              <button onClick={() => navigate(-1)} className="p-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md transition">
                <ArrowLeft size={24} />
              </button>
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 rounded-full backdrop-blur-md text-sm font-bold transition">
                <Edit3 size={16} /> Editar Perfil
              </button>
            </div>

            {/* Profile Avatar & Name */}
            <div className="absolute bottom-0 left-0 w-full px-6 md:px-12 flex items-end gap-6 translate-y-6">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-[#e50914] to-purple-900 p-1 shadow-2xl">
                <div className="w-full h-full bg-[#1a1a1a] rounded-xl flex items-center justify-center overflow-hidden">
                  {selectedPub ? (
                    <img src={selectedPub.img} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-gray-500" />
                  )}
                </div>
              </div>
              <div className="mb-8 flex-1 drop-shadow-lg">
                <h1 className="text-3xl md:text-5xl font-black truncate">{profile.name}</h1>
                {profile.favoriteHero && (
                  <p className="text-[#e50914] font-bold mt-1 text-lg">
                    {profile.favoriteHero}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 md:px-12 mt-16 max-w-4xl mx-auto space-y-8">
            {/* Stats Showcase */}
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-yellow-500" size={24} /> Destaques</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center text-center">
                  <BookOpen size={28} className="text-blue-500 mb-2" />
                  <span className="text-2xl font-black">{stats?.totalReadComics || 0}</span>
                  <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Quadrinhos Lidos</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center text-center">
                  <Layers size={28} className="text-green-500 mb-2" />
                  <span className="text-2xl font-black">{stats?.totalPagesRead || 0}</span>
                  <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Páginas Lidas</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                  <Trophy size={28} className="text-yellow-500 mb-2" />
                  <span className="text-2xl font-black">{unlockedCount} / {ACHIEVEMENTS.length}</span>
                  <span className="text-xs text-gray-400 uppercase tracking-widest mt-1">Conquistas</span>
                </div>
              </div>
            </div>
            
            {/* Steam Level / XP bar equivalent */}
            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-6 border border-blue-500/20 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10">
                <User size={150} />
              </div>
              <h3 className="text-lg font-bold mb-1 text-blue-400">Nível de Leitor</h3>
              <p className="text-sm text-gray-400 mb-4">Leia mais quadrinhos para subir de nível!</p>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-blue-500 flex items-center justify-center font-black text-xl text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  {Math.floor((stats?.totalPagesRead || 0) / 100) + 1}
                </div>
                <div className="flex-1">
                  <div className="h-2.5 bg-black/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" 
                      style={{ width: `${((stats?.totalPagesRead || 0) % 100)}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-2 font-bold">
                    <span>{(stats?.totalPagesRead || 0) % 100} XP</span>
                    <span>100 XP para o próximo nível</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="animate-in fade-in duration-300">
          <div className="flex items-center justify-between pt-12 md:pt-20 px-4 mb-6 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              {profile.name && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition"
                >
                  <ArrowLeft size={24} />
                </button>
              )}
              <h1 className="text-xl font-bold">Editar Perfil</h1>
            </div>
          </div>

          <div className="px-4 max-w-lg mx-auto flex flex-col gap-8">
            
            {/* Name section */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Como quer ser chamado?</label>
              <div className="flex items-center gap-3 bg-[#1a1a1a] p-3 rounded-xl border border-white/5 focus-within:border-[#e50914] transition-colors">
                <User className="text-gray-500" size={24} />
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  className="bg-transparent text-white w-full outline-none text-lg font-bold"
                  placeholder="Seu nome..."
                />
              </div>
            </div>

            {/* Publisher section */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Editora / Equipe Favorita</label>
              <div className="grid grid-cols-2 gap-3">
                {PUBLISHERS.map(pub => {
                  const isSelected = profile.favoritePublisher === pub.id;
                  return (
                    <button
                      key={pub.id}
                      onClick={() => setProfile({ ...profile, favoritePublisher: pub.id, favoriteHero: undefined })}
                      className={`relative h-24 rounded-xl overflow-hidden transition-all duration-300 border-2 ${isSelected ? 'border-[#e50914] scale-105 shadow-[0_0_15px_rgba(229,9,20,0.5)] z-10' : 'border-transparent opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}`}
                    >
                      <img src={pub.img} alt={pub.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-[#e50914] rounded-full p-1 shadow-lg">
                          <CheckCircle2 size={16} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Heroes section */}
            {profile.favoritePublisher && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Seu Herói Favorito</label>
                <div className="flex flex-wrap gap-2">
                  {currentHeroes.map(hero => {
                    const isSelected = profile.favoriteHero === hero;
                    return (
                      <button
                        key={hero}
                        onClick={() => setProfile({ ...profile, favoriteHero: hero })}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${isSelected ? 'bg-[#e50914] text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                      >
                        {hero}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!profile.name.trim()}
              className={`mt-4 w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${saving ? 'bg-green-600' : profile.name.trim() ? 'bg-[#e50914] hover:bg-red-700' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
            >
              {saving ? <CheckCircle2 size={24} /> : null}
              {saving ? 'Salvo!' : 'Salvar Perfil'}
            </button>

            {/* Reset Profile button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="mt-2 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-transparent text-gray-500 hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
            >
              <Trash2 size={16} />
              Resetar Perfil e Conquistas
            </button>
          </div>
        </div>
      )}

      {/* ── RESET PROFILE DIALOG ── */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Resetar Perfil e Conquistas"
        message="Tem certeza que deseja apagar seu perfil, heróis favoritos, nível e TODOS os troféus desbloqueados? Suas coleções e HQs não serão apagadas, mas seu progresso de leitura voltará a 0."
        confirmText="Sim, Resetar Tudo"
        isDanger={true}
        onConfirm={async () => {
          setShowResetConfirm(false);
          await storage.resetProfileAndStats();
          // Reload the app to the home page so the Welcome Modal triggers
          window.location.href = '/';
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
