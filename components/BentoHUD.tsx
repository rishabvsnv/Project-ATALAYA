'use client';

import React, { useState } from 'react';
import { 
  Heart, 
  Utensils, 
  Zap, 
  Droplets,
  Sun, 
  Flame,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Terminal, 
  Package, 
  Activity,
  Play,
  Pause,
  StepForward,
  Gauge,
  MapPin,
  Eye,
  Gift,
  Sprout,
  Navigation,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { useGameStore, SimulationSpeed, InterventionTool } from '@/lib/store';
import { audioManager } from '@/lib/audioManager';
import { BookOpen } from 'lucide-react';

export function BentoHUD() {
  const vitals = useGameStore((s) => s.vitals);
  const day = useGameStore((s) => s.day);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const weather = useGameStore((s) => s.weather);
  const inventory = useGameStore((s) => s.inventory);
  const plates = useGameStore((s) => s.plates);
  const latestThought = useGameStore((s) => s.latestThought);
  const logs = useGameStore((s) => s.logs);
  const isProcessing = useGameStore((s) => s.isProcessing);
  const timeProgress = useGameStore((s) => s.timeProgress);

  const isPaused = useGameStore((s) => s.isPaused);
  const togglePaused = useGameStore((s) => s.togglePaused);
  const triggerStep = useGameStore((s) => s.triggerStep);
  const simSpeed = useGameStore((s) => s.simSpeed);
  const setSimSpeed = useGameStore((s) => s.setSimSpeed);

  const activeTool = useGameStore((s) => s.activeTool);
  const setActiveTool = useGameStore((s) => s.setActiveTool);

  const [isMuted, setIsMuted] = useState(true);
  const [hudMinimized, setHudMinimized] = useState(false);

  const isNight = timeOfDay === 'Night';
  const speedOptions: SimulationSpeed[] = [1, 2, 5];

  const tools: { id: InterventionTool; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'INSPECT', label: 'Inspect', icon: <Eye className="h-3.5 w-3.5" />, color: 'hover:text-sky-400' },
    { id: 'ORDER_MOVE', label: 'Move Waypoint', icon: <Navigation className="h-3.5 w-3.5" />, color: 'hover:text-rose-400' },
    { id: 'DROP_SUPPLY', label: 'Airdrop Crate', icon: <Gift className="h-3.5 w-3.5" />, color: 'hover:text-amber-400' },
    { id: 'PLANT_NODE', label: 'Plant Node', icon: <Sprout className="h-3.5 w-3.5" />, color: 'hover:text-emerald-400' }
  ];

  const toggleAudio = () => {
    if (!audioManager) return;
    audioManager.init();
    const nextMuted = audioManager.toggleMute();
    setIsMuted(nextMuted);
  };

  const isJournalOpen = useGameStore((s) => s.isJournalOpen);
  const setJournalOpen = useGameStore((s) => s.setJournalOpen);

  const resetWorld = useGameStore((s) => s.resetWorld);
  const survivorState = useGameStore((s) => s.survivorState);

  return (
    <aside aria-label="HUD Overlay" className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-5 select-none font-sans">
      {/* Top Row: Vitals & Celestial Clock */}
      <div className="flex items-start justify-between">
        {/* Top-Left: Survivor Vitals */}
        <section aria-label="Survivor Vitals" className="pointer-events-auto w-72 rounded-xl border border-white/10 bg-black/45 p-3.5 shadow-xl backdrop-blur-md transition-all">
          <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-neutral-300 uppercase">Survivor Status</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                {plates.length} Islet{plates.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${
                survivorState === 'SWIM'
                  ? 'animate-ping bg-sky-400'
                  : isProcessing
                  ? 'animate-pulse bg-amber-400'
                  : isPaused
                  ? 'bg-neutral-500'
                  : 'bg-emerald-400'
              }`} />
              <span className="text-[10px] uppercase text-neutral-400">
                {survivorState === 'SWIM' ? 'Swimming' : isProcessing ? 'Thinking' : isPaused ? 'Paused' : 'Active'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <VitalBar label="Health" val={vitals.health} icon={<Heart className="h-3 w-3 text-rose-400" />} barColor="bg-rose-500" />
            <VitalBar label="Hunger" val={vitals.hunger} icon={<Utensils className="h-3 w-3 text-amber-400" />} barColor="bg-amber-500" />
            <VitalBar label="Energy" val={vitals.energy} icon={<Zap className="h-3 w-3 text-cyan-400" />} barColor="bg-cyan-500" />
            <VitalBar label="Hydration" val={vitals.hydration} icon={<Droplets className="h-3 w-3 text-blue-400" />} barColor="bg-blue-500" />
          </div>
        </section>

        {/* Top-Right: Rotating Celestial Epoch & Weather */}
        <section aria-label="Environment and Time" className="pointer-events-auto flex items-center gap-3 rounded-xl border border-white/10 bg-black/45 px-3.5 py-2.5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 overflow-hidden">
              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                style={{ transform: `rotate(${(timeProgress ?? 0) * 360}deg)` }}
              >
                <Sun className="absolute top-0.5 h-3 w-3 text-amber-400" />
                <div className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_4px_#93c5fd]" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-medium tracking-wide text-neutral-400 uppercase">Celestial Epoch</p>
              <p className="text-xs font-semibold text-neutral-100">Day {day} • {timeOfDay}</p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          <div className="flex items-center gap-1.5 text-neutral-300">
            {weather === 'Storm' && <CloudLightning className="h-3.5 w-3.5 text-amber-300 animate-pulse" />}
            {weather === 'Rain' && <CloudRain className="h-3.5 w-3.5 text-sky-400" />}
            {weather === 'Fog' && <CloudFog className="h-3.5 w-3.5 text-slate-300" />}
            {weather === 'Clear' && (isNight ? <Flame className="h-3.5 w-3.5 text-blue-400" /> : <CloudSun className="h-3.5 w-3.5 text-sky-400" />)}
            <span className="text-[11px] font-mono font-medium">
              {vitals.temperatureC ? `${Math.round(vitals.temperatureC)}°C` : (isNight ? '14°C' : '23°C')}
            </span>
          </div>
        </section>
      </div>

      {/* Bottom Area: Controls Bar + Collapsible Stream/Supplies */}
      <div className="relative flex flex-col gap-3">
        {/* Floating Action / Control Bar */}
        <div className="flex justify-center">
          <nav aria-label="Simulation Controls" className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 shadow-2xl backdrop-blur-xl transition-all">
            <button
              onClick={togglePaused}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                isPaused 
                  ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' 
                  : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
              }`}
              title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5 fill-current ml-0.5" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
            </button>

            <button
              onClick={triggerStep}
              disabled={isProcessing}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-300 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Step 1 Tick Forward (Pauses Loop)"
            >
              <StepForward className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

            {/* Speed Multiplier Pills */}
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-neutral-500 mr-0.5" />
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSimSpeed(speed)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold transition-all ${
                    simSpeed === speed
                      ? 'bg-sky-500 text-neutral-950 shadow-sm'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                  }`}
                >
                  {speed}×
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-white/15 mx-0.5" />

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                isMuted 
                  ? 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200' 
                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
              }`}
              title={isMuted ? 'Unmute Procedural Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>

            <button
              onClick={() => setJournalOpen(!isJournalOpen)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-amber-300 transition-all"
              title="Open Chronicles"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => {
                if (confirm("Reset island simulation back to Day 1?")) {
                  resetWorld();
                }
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all"
              title="Reset Simulation Save"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            {/* God-Mode Tools */}
            <div className="flex items-center gap-1 border-l border-white/15 pl-2 ml-0.5">
              {tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    activeTool === t.id
                      ? 'bg-white/20 text-white shadow-inner'
                      : `bg-white/5 text-neutral-400 ${t.color}`
                  }`}
                  title={t.label}
                >
                  {t.icon}
                  <span className="hidden md:inline">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Minimize / Expand Toggle */}
            <div className="border-l border-white/15 pl-1.5 ml-0.5">
              <button
                onClick={() => setHudMinimized(!hudMinimized)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200 transition-all"
                title={hudMinimized ? 'Expand HUD Cards' : 'Collapse HUD Cards'}
              >
                {hudMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Collapsible Lower Section */}
        {!hudMinimized && (
          <div className="grid grid-cols-12 gap-3 transition-all duration-300">
            {/* Bottom-Left: LLM Cognitive Monologue */}
            <section aria-label="Cognitive Loop Stream" className="pointer-events-auto col-span-7 flex flex-col justify-between rounded-xl border border-white/10 bg-black/50 p-3.5 shadow-xl backdrop-blur-md">
              <div className="mb-1.5 flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-300 uppercase">
                    Cognitive Stream (Gemini 2.5 Flash)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                  <MapPin className="h-3 w-3 text-rose-400" />
                  <span>{plates[plates.length - 1]?.name ?? 'Origin'}</span>
                </div>
              </div>

              <p className="min-h-[40px] text-xs leading-relaxed text-neutral-200 italic">
                &ldquo;{latestThought}&rdquo;
              </p>

              <div className="mt-2 flex items-center gap-1.5 text-[10px] text-neutral-400">
                <Activity className="h-3 w-3 text-neutral-500" />
                <span>Last directive: <span className="font-mono text-neutral-200">{logs[0] ?? 'Idle'}</span></span>
              </div>
            </section>

            {/* Bottom-Right: Supplies Mini-Bar */}
            <section aria-label="Supplies and Ledger" className="pointer-events-auto col-span-5 flex flex-col justify-between rounded-xl border border-white/10 bg-black/50 p-3.5 shadow-xl backdrop-blur-md">
              <div className="mb-1.5 flex items-center justify-between border-b border-white/10 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-300 uppercase">Supplies</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {Object.keys(inventory).length} Slots
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(inventory).slice(0, 4).map(([item, qty]) => (
                  <div 
                    key={item}
                    className="flex items-center justify-between rounded bg-white/5 px-2 py-1"
                  >
                    <span className="text-[11px] capitalize text-neutral-300 truncate mr-1">{item.replace('_', ' ')}</span>
                    <span className="font-mono text-[11px] font-semibold text-sky-400">×{qty}</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-1 border-t border-white/5 pt-1.5 text-[10px] text-neutral-400 font-mono truncate">
                <span className="uppercase text-neutral-500">Log:</span>
                <span className="truncate text-neutral-300">› {logs[0] ?? 'Spawned on island.'}</span>
              </div>
            </section>
          </div>
        )}
      </div>
    </aside>
  );
}

function VitalBar({
  label,
  val,
  icon,
  barColor
}: {
  label: string;
  val: number;
  icon: React.ReactNode;
  barColor: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="flex w-14 items-center gap-1 text-neutral-300">
        {icon}
        <span className="font-medium text-[10px]">{label}</span>
      </div>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-800">
        <div 
          className={`h-full transition-all duration-500 ease-out ${barColor}`} 
          style={{ width: `${Math.max(0, Math.min(100, val))}%` }} 
        />
      </div>
      <span className="w-7 text-right font-mono text-[10px] text-neutral-400">{Math.round(val)}%</span>
    </div>
  );
}