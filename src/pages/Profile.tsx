import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/StorageService';
import type { UserProfile } from '../types';
import { ArrowLeft, User, CheckCircle2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const p = await storage.getUserProfile();
      if (p) setProfile(p);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await storage.saveUserProfile(profile);
    setTimeout(() => {
      setSaving(false);
      navigate('/');
    }, 500);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Carregando...</div>;
  }

  const currentHeroes = profile.favoritePublisher ? HEROES[profile.favoritePublisher] || [] : [];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-12 md:pt-20 px-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Meu Perfil</h1>
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
                  className={`relative h-24 rounded-xl overflow-hidden transition-all duration-300 border-2 ${isSelected ? 'border-[#e50914] scale-105 shadow-[0_0_15px_rgba(229,9,20,0.5)]' : 'border-transparent opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}`}
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

      </div>
    </div>
  );
};
