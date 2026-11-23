import {
  Box,
  Car,
  CheckCircle2,
  Coins,
  Hammer,
  Home,
  Layers,
  Shield,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  defaultBaseSuppliesForTheme,
  getSupplyMetaForTheme,
  STRONGHOLD_UPGRADE_CATALOG,
  SUPPLY_KEYS,
} from '../engine/rpgSystem';
import type { Campaign, LanguageId } from '../types/game';

interface BaseBlueprintModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  onClose: () => void;
  onBuildUpgrade: (upgradeId: string) => void;
  onOpenInventory: () => void;
}

type BlueprintRoomId =
  | 'barricade'
  | 'depot'
  | 'medbay'
  | 'training'
  | 'workshop'
  | 'garage';

interface RoomDef {
  id: BlueprintRoomId;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
  accent: string;
  upgradeId?: string;
}

const ROOMS: RoomDef[] = [
  {
    id: 'barricade',
    x: 55,
    y: 52,
    w: 210,
    h: 138,
    title: 'Perímetro & Defesas',
    subtitle: 'Trancas, barricada e vigília',
    accent: '#4ade80',
    upgradeId: 'barricade',
  },
  {
    id: 'depot',
    x: 295,
    y: 52,
    w: 210,
    h: 138,
    title: 'Depósito & Suprimentos',
    subtitle: 'Estoque da base & recursos',
    accent: '#fbbf24',
  },
  {
    id: 'medbay',
    x: 535,
    y: 52,
    w: 210,
    h: 138,
    title: 'Enfermaria',
    subtitle: 'Recuperação & kits médicos',
    accent: '#f472b6',
    upgradeId: 'medbay',
  },
  {
    id: 'training',
    x: 55,
    y: 238,
    w: 210,
    h: 138,
    title: 'Estação de Treino',
    subtitle: '+25% progresso em skills',
    accent: '#38bdf8',
    upgradeId: 'training',
  },
  {
    id: 'workshop',
    x: 295,
    y: 238,
    w: 210,
    h: 138,
    title: 'Oficina & Arsenal',
    subtitle: 'Crafting & manutenção',
    accent: '#c084fc',
    upgradeId: 'workshop',
  },
  {
    id: 'garage',
    x: 535,
    y: 238,
    w: 210,
    h: 138,
    title: 'Garagem / Frota',
    subtitle: 'Veículos & combustível',
    accent: '#fb923c',
  },
];

export function BaseBlueprintModal({
  open,
  campaign,
  language,
  onClose,
  onBuildUpgrade,
  onOpenInventory,
}: BaseBlueprintModalProps) {
  const [selectedRoomId, setSelectedRoomId] =
    useState<BlueprintRoomId>('depot');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const { stronghold, player } = campaign;
  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';
  const builtIds = new Set((stronghold?.upgrades ?? []).map((u) => u.id));
  const baseItems = player.inventory.filter((i) => i.storage === 'base');
  const vehicles = stronghold?.vehicles ?? [];
  const supplies =
    stronghold?.supplies ??
    defaultBaseSuppliesForTheme(campaign.world.primaryTheme);
  const supplyMeta = getSupplyMetaForTheme(campaign.world.primaryTheme);
  const totalSupplyUnits = SUPPLY_KEYS.reduce(
    (sum, k) => sum + (supplies[k] ?? 0),
    0,
  );

  const isRoomActive = (room: RoomDef): boolean => {
    if (room.id === 'depot') return true;
    if (room.id === 'garage') return vehicles.length > 0;
    return Boolean(room.upgradeId && builtIds.has(room.upgradeId));
  };

  const selectedRoom =
    ROOMS.find((r) => r.id === selectedRoomId) ?? ROOMS[1];
  const selectedBlueprint = selectedRoom.upgradeId
    ? STRONGHOLD_UPGRADE_CATALOG.find((u) => u.id === selectedRoom.upgradeId)
    : undefined;
  const selectedActive = isRoomActive(selectedRoom);
  const canAffordSelected = selectedBlueprint
    ? (player.currency?.amount ?? 0) >= selectedBlueprint.cost
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-label="Planta Visual do Refúgio"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/55 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-base font-semibold tracking-wide text-[var(--text-primary)]">
                Planta do Refúgio · {stronghold?.name || 'Base'}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                {stronghold?.location || campaign.currentLocation} · Defesa{' '}
                <strong className="text-[var(--success)]">
                  {stronghold?.defense ?? 20}
                </strong>{' '}
                · {builtIds.size}/{STRONGHOLD_UPGRADE_CATALOG.length} módulos ativos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-tech inline-flex items-center gap-1 rounded-xl border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-2.5 py-1 text-xs font-semibold text-[#fbbf24]">
              <Coins className="h-3.5 w-3.5" />
              {(player.currency?.amount ?? 0).toLocaleString('pt-BR')}{' '}
              {player.currency?.label ?? 'Ouro'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive SVG Architectural Blueprint */}
        <div className="relative flex-1 overflow-hidden bg-[var(--bg-canvas)]">
          <svg
            viewBox="0 0 800 428"
            className="h-[320px] w-full sm:h-[390px]"
            role="img"
            aria-label="Planta interativa dos setores do refúgio"
          >
            <defs>
              <pattern
                id="baseBlueprintGrid"
                width="28"
                height="28"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 28 0 L 0 0 0 28"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="0.6"
                  strokeOpacity="0.45"
                />
              </pattern>
            </defs>

            <rect width="800" height="428" fill="url(#baseBlueprintGrid)" />

            {/* Outer Stronghold Perimeter Frame */}
            <rect
              x="28"
              y="26"
              width="744"
              height="376"
              rx="22"
              fill="none"
              stroke={builtIds.has('barricade') ? '#4ade80' : 'var(--border-strong)'}
              strokeWidth={builtIds.has('barricade') ? '2.5' : '1.5'}
              strokeDasharray={builtIds.has('barricade') ? 'none' : '8 6'}
              strokeOpacity="0.65"
            />

            {/* Connecting Central Hallway */}
            <line
              x1="160"
              y1="214"
              x2="640"
              y2="214"
              stroke="var(--border-strong)"
              strokeWidth="2"
              strokeDasharray="6 4"
              strokeOpacity="0.65"
            />
            {[160, 400, 640].map((cx) => (
              <line
                key={cx}
                x1={cx}
                y1="190"
                x2={cx}
                y2="238"
                stroke="var(--border-strong)"
                strokeWidth="2"
                strokeOpacity="0.6"
              />
            ))}

            {/* 6 Interactive Rooms */}
            {ROOMS.map((room) => {
              const active = isRoomActive(room);
              const selected = selectedRoom.id === room.id;
              const statusText =
                room.id === 'depot'
                  ? `${baseItems.length} itens · ${totalSupplyUnits} supr.`
                  : room.id === 'garage'
                    ? vehicles.length > 0
                      ? `${vehicles.length} veículo(s)`
                      : 'Vazia'
                    : active
                      ? 'ATIVO ✓'
                      : 'NÃO INSTALADO';

              return (
                <g
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className="cursor-pointer"
                >
                  <rect
                    x={room.x}
                    y={room.y}
                    width={room.w}
                    height={room.h}
                    rx="16"
                    fill="var(--bg-surface)"
                    fillOpacity={active ? '0.96' : '0.68'}
                    stroke={
                      selected
                        ? 'var(--accent)'
                        : active
                          ? room.accent
                          : 'var(--border-subtle)'
                    }
                    strokeWidth={selected ? '3' : active ? '2' : '1.2'}
                    strokeDasharray={active ? 'none' : '5 4'}
                  />

                  {/* Subtle top accent bar */}
                  <rect
                    x={room.x + 14}
                    y={room.y + 12}
                    width={room.w - 28}
                    height="4"
                    rx="2"
                    fill={active ? room.accent : 'var(--border-subtle)'}
                    fillOpacity={active ? '0.9' : '0.4'}
                  />

                  <text
                    x={room.x + 18}
                    y={room.y + 42}
                    fill="var(--text-primary)"
                    fontSize="13"
                    fontWeight="700"
                  >
                    {room.title}
                  </text>

                  <text
                    x={room.x + 18}
                    y={room.y + 62}
                    fill="var(--text-muted)"
                    fontSize="10.5"
                  >
                    {room.subtitle}
                  </text>

                  {/* Status Pill inside room */}
                  <rect
                    x={room.x + 16}
                    y={room.y + 92}
                    width={room.w - 32}
                    height="28"
                    rx="8"
                    fill={active ? room.accent : 'var(--bg-elevated)'}
                    fillOpacity={active ? '0.16' : '0.85'}
                  />
                  <text
                    x={room.x + room.w / 2}
                    y={room.y + 110}
                    textAnchor="middle"
                    fill={active ? room.accent : 'var(--text-muted)'}
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    {statusText}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom Selected Sector Detail Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {selectedRoom.id === 'garage' ? (
                <Car className="h-4 w-4" style={{ color: selectedRoom.accent }} />
              ) : selectedRoom.id === 'depot' ? (
                <Box className="h-4 w-4" style={{ color: selectedRoom.accent }} />
              ) : (
                <Home className="h-4 w-4" style={{ color: selectedRoom.accent }} />
              )}
              <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                {selectedRoom.title}
              </span>
              {selectedActive ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                  <CheckCircle2 className="h-3 w-3" />
                  Operacional
                </span>
              ) : (
                <span className="rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                  Disponível para instalar
                </span>
              )}
            </div>

            {selectedRoom.id === 'depot' ? (
              <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                {SUPPLY_KEYS.map((k) => (
                  <span
                    key={k}
                    className="font-mono-tech rounded-md bg-[var(--bg-surface)] px-2 py-0.5"
                  >
                    {supplyMeta[k].label}:{' '}
                    <strong style={{ color: supplyMeta[k].color }}>
                      {supplies[k] ?? 0}
                    </strong>
                  </span>
                ))}
              </div>
            ) : selectedRoom.id === 'garage' ? (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {vehicles.length > 0
                  ? vehicles
                      .map((v) => `${v.name} (Tanque ${v.fuel}% · Estado ${v.condition}%)`)
                      .join(' · ')
                  : 'Nenhum veículo estacionado. Use Auto-Organizar no Inventário para mover carros/montarias para cá.'}
              </p>
            ) : selectedBlueprint ? (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {selectedBlueprint.description[language]}{' '}
                <strong className="text-[var(--success)]">
                  ({selectedBlueprint.bonusLabel[language]})
                </strong>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {selectedRoom.id === 'depot' || selectedRoom.id === 'garage' ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInventory();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[#111] shadow transition hover:brightness-110"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Gerenciar Estoque & Frota</span>
              </button>
            ) : selectedBlueprint && !selectedActive && !isEnded ? (
              <button
                type="button"
                disabled={!canAffordSelected}
                onClick={() => onBuildUpgrade(selectedBlueprint.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[#111] shadow transition hover:brightness-110 disabled:opacity-45"
              >
                <Hammer className="h-3.5 w-3.5" />
                <span>
                  Construir ({selectedBlueprint.cost}{' '}
                  {player.currency?.label ?? 'Ouro'})
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
