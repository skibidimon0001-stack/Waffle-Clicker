
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, 
  Store, 
  Palette, 
  Zap, 
  ChevronRight, 
  Timer, 
  Sparkles, 
  ShieldAlert,
  Ghost,
  Volume2,
  VolumeX
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Upgrade, Skin, Quest, Boss } from './types';
import { INITIAL_UPGRADES, INITIAL_QUESTS, generateSkins } from './constants';

// --- Sound Manager Utility ---
class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicInterval: number | null = null;
  private musicGains: GainNode[] = [];

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(val: boolean) {
    this.muted = val;
    if (val) {
      this.stopMusic();
    } else if (this.ctx) {
      this.startMusic();
    }
  }

  startMusic() {
    if (this.muted || this.musicInterval) return;
    this.init();
    if (!this.ctx) return;

    let step = 0;
    const melody = [261.63, 293.66, 329.63, 349.23, 392.00, 329.63, 293.66, 261.63]; // C4 major sequence
    
    this.musicInterval = window.setInterval(() => {
      if (this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(melody[step % melody.length], now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.1);
      gain.gain.linearRampToValueAtTime(0, now + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.5);
      
      this.musicGains.push(gain);
      if (this.musicGains.length > 10) this.musicGains.shift();
      
      step++;
    }, 500);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    this.musicGains.forEach(g => g.gain.setTargetAtTime(0, 0, 0.1));
  }

  play(type: 'click' | 'buy' | 'quest' | 'bossStart' | 'bossWin' | 'bossLose') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'buy':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'quest':
        [523.25, 659.25, 783.99].forEach((f, i) => {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.connect(g);
          g.connect(this.ctx!.destination);
          o.frequency.setValueAtTime(f, now + i * 0.1);
          g.gain.setValueAtTime(0.1, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.3);
        });
        break;
      case 'bossStart':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(55, now + 1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now);
        osc.stop(now + 1);
        break;
      case 'bossWin':
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
          const o = this.ctx!.createOscillator();
          const g = this.ctx!.createGain();
          o.connect(g);
          g.connect(this.ctx!.destination);
          o.frequency.setValueAtTime(f, now + i * 0.05);
          g.gain.setValueAtTime(0.1, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.5);
          o.start(now + i * 0.05);
          o.stop(now + i * 0.05 + 0.5);
        });
        break;
      case 'bossLose':
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  }
}

const sounds = new SoundManager();

const App: React.FC = () => {
  // --- State ---
  const [coins, setCoins] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [upgrades, setUpgrades] = useState<Upgrade[]>(INITIAL_UPGRADES);
  const [skins, setSkins] = useState<Skin[]>(generateSkins());
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [rebirths, setRebirths] = useState(0);
  const [activeTab, setActiveTab] = useState<'shop' | 'skins' | 'quests'>('shop');
  const [isMuted, setIsMuted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [boss, setBoss] = useState<Boss>({
    name: 'Pancake King',
    target: 500,
    timeLeft: 30,
    maxTime: 30,
    active: false,
    reward: 25,
    level: 1
  });
  const [bossEarned, setBossEarned] = useState(0);
  const [diamondTimer, setDiamondTimer] = useState(60);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [bossInsult, setBossInsult] = useState<string>("You're not ready for this syrup!");

  // --- Refs ---
  const lastUpdateTime = useRef(Date.now());
  const nextBossCounter = useRef(300); // 5 minutes

  // --- Calculations ---
  const currentWps = upgrades.reduce((acc, u) => acc + (u.wps * u.count), 0);
  const skinMultiplier = 1 + skins.filter(s => s.owned).length * 0.05;
  const rebirthMultiplier = 1 + rebirths * 0.5;
  const totalMultiplier = skinMultiplier * rebirthMultiplier;
  const actualWps = currentWps * totalMultiplier;

  // --- AI Integration (Gemini) ---
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

  const fetchBossInsult = async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are the ${boss.name}, an evil breakfast boss in a clicker game. Give me a short, funny, 10-word insult for the player who is trying to click enough waffles to defeat you.`,
        config: { temperature: 0.9 }
      });
      if (response.text) setBossInsult(response.text.trim());
    } catch (e) {
      console.error("AI failed to insult:", e);
    }
  };

  // --- Handlers ---
  const startMusicOnFirstInteraction = () => {
    if (!hasStarted) {
      setHasStarted(true);
      sounds.startMusic();
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualClick = (e: React.MouseEvent) => {
    startMusicOnFirstInteraction();
    sounds.play('click');
    const gain = 1 * totalMultiplier;
    setCoins(prev => prev + gain);
    if (boss.active) setBossEarned(prev => prev + gain);
    
    // Quests
    setQuests(prev => prev.map(q => 
      q.type === 'clicks' && !q.completed ? { ...q, progress: q.progress + 1 } : q
    ));

    // Floating text
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, x: e.clientX, y: e.clientY, text: `+${gain.toFixed(1)}` }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(f => f.id !== id));
    }, 1000);
  };

  const buyUpgrade = (index: number) => {
    startMusicOnFirstInteraction();
    const upgrade = upgrades[index];
    const cost = Math.floor(upgrade.baseCost * Math.pow(1.15, upgrade.count));
    if (coins >= cost) {
      sounds.play('buy');
      setCoins(prev => prev - cost);
      const newUpgrades = [...upgrades];
      newUpgrades[index].count++;
      setUpgrades(newUpgrades);
      showToast(`Purchased ${upgrade.name}!`);
    }
  };

  const buySkin = (index: number) => {
    startMusicOnFirstInteraction();
    const skin = skins[index];
    if (diamonds >= skin.cost && !skin.owned) {
      sounds.play('buy');
      setDiamonds(prev => prev - skin.cost);
      const newSkins = [...skins];
      newSkins[index].owned = true;
      setSkins(newSkins);
      showToast(`Equipped ${skin.name}! Multiplier Up!`);
    }
  };

  const startBossBattle = useCallback(() => {
    sounds.play('bossStart');
    const target = Math.floor(500 * boss.level * Math.pow(1.2, boss.level - 1) * totalMultiplier);
    setBoss(prev => ({ ...prev, active: true, timeLeft: 30, target }));
    setBossEarned(0);
    fetchBossInsult();
    showToast(`BOSS ALERT: ${boss.name} appeared!`);
  }, [boss.level, boss.name, totalMultiplier]);

  const handleRebirth = () => {
    startMusicOnFirstInteraction();
    const rebirthCost = 1000000 * Math.pow(10, rebirths);
    if (coins >= rebirthCost) {
      sounds.play('quest');
      setCoins(0);
      setDiamonds(prev => prev + 100);
      setRebirths(prev => prev + 1);
      setUpgrades(INITIAL_UPGRADES);
      showToast("REBORN! Power increased dramatically!");
    } else {
      showToast(`Need ${rebirthCost.toLocaleString()} waffles to rebirth!`);
    }
  };

  // --- Effects ---
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastUpdateTime.current) / 1000;
      lastUpdateTime.current = now;

      // WPS
      const gain = actualWps * delta;
      setCoins(prev => prev + gain);
      if (boss.active) setBossEarned(prev => prev + gain);

      // Quests check
      setQuests(prev => prev.map(q => {
        if (q.completed) return q;
        let newProgress = q.progress;
        if (q.type === 'coins') newProgress = coins;
        if (q.type === 'wps') newProgress = actualWps;
        
        if (newProgress >= q.goal) {
          sounds.play('quest');
          setDiamonds(d => d + q.reward);
          showToast(`Quest Complete: ${q.text} (+${q.reward} 💎)`);
          return { ...q, progress: q.goal, completed: true };
        }
        return { ...q, progress: newProgress };
      }));

      // Diamond Timer
      setDiamondTimer(prev => {
        if (prev <= 0) {
          setDiamonds(d => d + 1);
          return 60;
        }
        return prev - delta;
      });

      // Boss Timer
      if (boss.active) {
        setBoss(prev => {
          if (prev.timeLeft <= 0) {
            sounds.play('bossLose');
            showToast("DEFEAT! The boss escaped with your syrup.");
            return { ...prev, active: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - delta };
        });
      } else {
        nextBossCounter.current -= delta;
        if (nextBossCounter.current <= 0) {
          nextBossCounter.current = 300;
          startBossBattle();
        }
      }
    }, 100);

    return () => clearInterval(tick);
  }, [actualWps, coins, boss.active, boss.level, totalMultiplier, startBossBattle]);

  // Win condition check for Boss
  useEffect(() => {
    if (boss.active && bossEarned >= boss.target) {
      sounds.play('bossWin');
      setBoss(prev => ({ ...prev, active: false, level: prev.level + 1 }));
      setDiamonds(prev => prev + boss.reward);
      showToast(`VICTORY! You ate the ${boss.name}! (+${boss.reward} 💎)`);
    }
  }, [bossEarned, boss.active, boss.target, boss.name, boss.reward]);

  return (
    <div className="flex h-screen bg-orange-50 text-slate-800 select-none">
      {/* --- World View --- */}
      <div className="flex-[2] relative flex flex-col items-center justify-center border-r border-orange-100 overflow-hidden">
        
        {/* Top Floating Stats */}
        <div className="absolute top-6 left-0 right-0 flex justify-center gap-4 z-20 px-4">
          <div className="bg-white px-6 py-2 rounded-full shadow-lg border-b-4 border-orange-200 flex items-center gap-2">
            <span className="text-2xl"> waffle </span>
            <span className="font-game text-xl text-orange-600">{Math.floor(coins).toLocaleString()}</span>
          </div>
          <div className="bg-white px-6 py-2 rounded-full shadow-lg border-b-4 border-cyan-200 flex items-center gap-2">
            <span className="text-2xl"> gem </span>
            <span className="font-game text-xl text-cyan-600">{diamonds}</span>
          </div>
          <div className="bg-white px-6 py-2 rounded-full shadow-lg border-b-4 border-slate-200 flex items-center gap-2">
            <Timer className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-500">{Math.ceil(diamondTimer)}s</span>
          </div>
          <button 
            onClick={toggleMute}
            className="bg-white p-2 rounded-full shadow-lg border-b-4 border-slate-200 hover:bg-slate-50 transition-all text-slate-600"
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        {/* Boss UI Overlay */}
        {boss.active && (
          <div className="absolute top-24 w-[85%] bg-white rounded-3xl p-6 shadow-2xl border-4 border-red-500 z-30 animate-in slide-in-from-top duration-500">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-game text-2xl text-red-600 flex items-center gap-2">
                <ShieldAlert className="w-8 h-8" /> {boss.name.toUpperCase()} (LVL {boss.level})
              </h2>
              <span className="font-game text-2xl text-slate-500">{Math.ceil(boss.timeLeft)}s</span>
            </div>
            <p className="text-slate-500 italic mb-4">"{bossInsult}"</p>
            <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden border-2 border-slate-200">
              <div 
                className="h-full bg-red-500 transition-all duration-300 ease-out flex items-center justify-center text-xs font-bold text-white"
                style={{ width: `${Math.min(100, (bossEarned / boss.target) * 100)}%` }}
              >
                {Math.floor(bossEarned).toLocaleString()} / {Math.floor(boss.target).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* The Main Waffle */}
        <div className="relative group flex items-center justify-center">
          <div className="absolute inset-0 bg-orange-400/20 blur-3xl rounded-full scale-125 group-hover:bg-orange-400/30 transition-all duration-500"></div>
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3233/3233858.png" 
            alt="Main Waffle"
            className="w-80 h-80 cursor-pointer transition-all active:scale-90 animate-bounce-slow drop-shadow-2xl z-10"
            onClick={handleManualClick}
          />
        </div>

        {/* Floating Texts */}
        {floatingTexts.map(f => (
          <div 
            key={f.id}
            className="fixed font-game text-2xl text-orange-500 pointer-events-none z-[100] animate-bounce"
            style={{ left: f.x - 20, top: f.y - 40, animation: 'fadeOutUp 1s forwards' }}
          >
            {f.text}
          </div>
        ))}

        {/* Bottom Multiplier Display */}
        <div className="absolute bottom-10 flex flex-col items-center gap-4">
          <div className="bg-orange-100 px-6 py-2 rounded-xl text-orange-800 font-bold border border-orange-200">
            WPS: <span className="font-game">{actualWps.toFixed(1)}</span> (x{totalMultiplier.toFixed(2)})
          </div>
          
          <button 
            onClick={handleRebirth}
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-game py-3 px-8 rounded-2xl shadow-[0_6px_0_0_#991b1b] active:shadow-none active:translate-y-1 transition-all group overflow-hidden relative"
          >
            <span className="relative z-10 flex flex-col leading-none">
              <span>REBIRTH</span>
              <span className="text-[10px] opacity-80 mt-1">Reset for +50% Multiplier & 100 💎</span>
            </span>
            <Ghost className="absolute -right-4 -bottom-4 w-12 h-12 text-white/10 group-hover:scale-125 transition-transform" />
          </button>
        </div>
      </div>

      {/* --- Sidebar UI --- */}
      <div className="flex-[1.2] bg-white border-l border-slate-200 flex flex-col">
        {/* Navigation */}
        <div className="flex p-4 gap-2 bg-slate-50 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 font-bold transition-all ${activeTab === 'shop' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
          >
            <Store className="w-6 h-6" />
            <span className="text-[10px]">SHOP</span>
          </button>
          <button 
            onClick={() => setActiveTab('skins')}
            className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 font-bold transition-all ${activeTab === 'skins' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-200' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
          >
            <Palette className="w-6 h-6" />
            <span className="text-[10px]">SKINS</span>
          </button>
          <button 
            onClick={() => setActiveTab('quests')}
            className={`flex-1 py-3 px-2 rounded-xl flex flex-col items-center gap-1 font-bold transition-all ${activeTab === 'quests' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
          >
            <Trophy className="w-6 h-6" />
            <span className="text-[10px]">QUESTS</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {activeTab === 'shop' && (
            <div className="space-y-4">
              <h3 className="font-game text-xl text-slate-700 mb-2">Upgrade Kitchen</h3>
              {upgrades.map((u, i) => {
                const cost = Math.floor(u.baseCost * Math.pow(1.15, u.count));
                const canAfford = coins >= cost;
                return (
                  <div key={u.id} className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-orange-300 hover:bg-orange-50 transition-all cursor-default">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{u.name}</span>
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 rounded-full font-bold">x{u.count}</span>
                      </div>
                      <p className="text-xs text-slate-400">{u.description}</p>
                      <p className="text-sm font-bold text-orange-500">+{u.wps} WPS</p>
                    </div>
                    <button 
                      onClick={() => buyUpgrade(i)}
                      disabled={!canAfford}
                      className={`ml-4 px-4 py-2 rounded-xl font-game transition-all ${canAfford ? 'bg-orange-500 text-white shadow-md active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
                    >
                      {cost > 1000 ? (cost/1000).toFixed(1) + 'K' : cost} 🧇
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'skins' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-game text-xl text-slate-700">Skin Gallery</h3>
                <span className="text-xs text-cyan-500 font-bold">+0.05x Multiplier Each</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {skins.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => buySkin(i)}
                    disabled={s.owned}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${s.owned ? 'bg-cyan-50 border-cyan-300' : 'bg-white border-slate-100 hover:border-cyan-200 active:scale-95'}`}
                  >
                    <span className="text-3xl grayscale-[0.5] group-hover:grayscale-0">{s.emoji}</span>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{s.name}</p>
                      {s.owned ? (
                        <span className="text-[10px] text-cyan-600 font-black uppercase">OWNED</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-cyan-500 font-bold">
                          <span className="text-xs">{s.cost}</span>
                          <span className="text-[10px]">💎</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quests' && (
            <div className="space-y-4">
              <h3 className="font-game text-xl text-slate-700 mb-2">Daily Tasks</h3>
              {quests.map((q) => (
                <div key={q.id} className={`p-4 rounded-2xl border-2 transition-all ${q.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${q.completed ? 'text-green-700' : 'text-slate-700'}`}>{q.text}</span>
                    <div className="flex items-center gap-1 text-yellow-600 font-bold">
                      <span className="text-sm">+{q.reward}</span>
                      <span className="text-xs">💎</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${q.completed ? 'bg-green-500' : 'bg-yellow-400'}`}
                      style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] font-bold text-slate-400">
                      {q.completed ? 'COMPLETED' : `${Math.floor(q.progress).toLocaleString()} / ${q.goal.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] bg-slate-800 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="font-bold">{toast}</span>
        </div>
      )}

      {/* Tailwind and Animations CSS */}
      <style>{`
        @keyframes fadeOutUp {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-50px); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default App;
