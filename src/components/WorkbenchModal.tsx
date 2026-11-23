import {
  CheckCircle2,
  Hammer,
  Package,
  Search,
  Shield,
  Sparkles,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  ATTRIBUTE_META,
  RARITY_META,
} from '../engine/rpgSystem';
import type {
  AttributeId,
  Campaign,
  CraftRequest,
  CraftResponse,
  LanguageId,
  WorldThemeId,
} from '../types/game';

interface WorkbenchModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  isCrafting: boolean;
  lastResult: CraftResponse | null;
  onClearResult: () => void;
  onClose: () => void;
  onExecuteCraft: (request: CraftRequest) => void;
}

const IDEA_PRESETS: Record<
  WorldThemeId,
  { item: string[]; vehicle: string[] }
> = {
  zombies: {
    item: [
      'Instalar supressor & mira tática',
      'Reforçar empunhadura e lâmina',
      'Adicionar placas balísticas leves',
      'Montar kit de trauma aprimorado',
    ],
    vehicle: [
      'Instalar chapas e grades nas janelas',
      'Reforçar para-choque dianteiro com correntes',
      'Adaptar tanque auxiliar de combustível',
      'Silenciar escapamento para deslocamento furtivo',
    ],
  },
  apocalyptic: {
    item: [
      'Reforçar arma com aço temperado',
      'Adaptar filtro avançado e vedação',
      'Calibrar mira de longo alcance',
    ],
    vehicle: [
      'Blindar cabine e pneus reforçados',
      'Instalar grade frontal quebra-barricadas',
      'Melhorar eficiência do motor',
    ],
  },
  cyberpunk: {
    item: [
      'Overclock de chip e mira inteligente',
      'Adicionar revestimento anti-scanner',
      'Integrar módulo empunhadura háptica',
    ],
    vehicle: [
      'Blindagem de fibra de carbono',
      'Injeção turbo e modo furtivo',
    ],
  },
  mystery: {
    item: [
      'Ajustar mecanismo de precisão',
      'Esconder compartimento secreto',
      'Reforçar estojo e lentes de análise',
    ],
    vehicle: [
      'Revisão completa e chassi reforçado',
      'Compartimento oculto no porta-malas',
    ],
  },
  fantasy: {
    item: [
      'Forjar lâmina com runas protetoras',
      'Reforçar armadura com placas nobres',
      'Imbuir acessório com energia arcana',
    ],
    vehicle: [
      'Reforçar sela/carruagem com ferragens rúnicas',
      'Adicionar proteção lateral e alforjes extras',
    ],
  },
};

export function WorkbenchModal({
  open,
  campaign,
  language,
  isCrafting,
  lastResult,
  onClearResult,
  onClose,
  onExecuteCraft,
}: WorkbenchModalProps) {
  const [targetKind, setTargetKind] = useState<'item' | 'vehicle'>('item');
  const [targetId, setTargetId] = useState<string>('');
  const [secondaryItemId, setSecondaryItemId] = useState<string>('');
  const [materialsSpent, setMaterialsSpent] = useState<number>(3);
  const [blueprintIdea, setBlueprintIdea] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const availableMaterials = campaign.stronghold?.supplies?.materials ?? 0;
  const vehicles = campaign.stronghold?.vehicles ?? [];
  const hasWorkshop = Boolean(
    campaign.stronghold?.upgrades.some((u) => u.id === 'workshop'),
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaign.player.inventory.filter((item) => {
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.note ?? '').toLowerCase().includes(q)
      );
    });
  }, [campaign.player.inventory, searchQuery]);

  if (!open) return null;

  const selectedItem =
    targetKind === 'item'
      ? campaign.player.inventory.find((i) => i.id === targetId) ??
        filteredItems[0]
      : undefined;
  const selectedVehicle =
    targetKind === 'vehicle'
      ? vehicles.find((v) => v.id === targetId) ?? vehicles[0]
      : undefined;

  const resolvedTargetId =
    targetKind === 'item' ? selectedItem?.id ?? '' : selectedVehicle?.id ?? '';

  const effectiveMaterials = Math.min(materialsSpent, availableMaterials);
  const secondaryOptions = campaign.player.inventory.filter(
    (i) => i.id !== resolvedTargetId,
  );

  const canCraft =
    Boolean(resolvedTargetId) &&
    !isCrafting &&
    (effectiveMaterials > 0 || Boolean(secondaryItemId));

  const presets =
    IDEA_PRESETS[campaign.world.primaryTheme] ?? IDEA_PRESETS.zombies;
  const activePresets =
    targetKind === 'vehicle' ? presets.vehicle : presets.item;

  const handleForge = () => {
    if (!canCraft) return;
    onClearResult();
    onExecuteCraft({
      targetKind,
      targetId: resolvedTargetId,
      secondaryItemId: secondaryItemId || undefined,
      materialsSpent: effectiveMaterials,
      blueprintIdea: blueprintIdea.trim() || undefined,
    });
  };

  return (
    <div
      onClick={onClose}
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 sm:p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[#fb923c]/15 text-[#fb923c]">
              <Hammer className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                  Bancada de Crafting & Oficina
                </h2>
                {hasWorkshop ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/45 bg-[var(--success)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                    <Wrench className="h-2.5 w-2.5" />
                    Oficina Ativa
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Combine itens, componentes e Materiais da Base para criar melhorias reais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[#fb923c]">
              <Package className="h-3.5 w-3.5" />
              Materiais: <span className="font-mono-tech">{availableMaterials}</span>
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

        {/* Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/70 px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => {
              setTargetKind('item');
              setTargetId('');
              setSecondaryItemId('');
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              targetKind === 'item'
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Itens & Equipamentos ({campaign.player.inventory.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setTargetKind('vehicle');
              setTargetId('');
              setSecondaryItemId('');
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              targetKind === 'vehicle'
                ? 'border-[#38bdf8] bg-[#38bdf8]/15 text-[#38bdf8]'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            Frota & Veículos ({vehicles.length})
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[310px_1fr]">
          {/* Left: Target Picker */}
          <div className="flex flex-col overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-3.5 lg:border-r lg:border-b-0">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              1. Escolha o Alvo
            </div>

            {targetKind === 'item' ? (
              <>
                <div className="relative mb-2.5">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar item..."
                    className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1.5 pr-3 pl-8 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                  />
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const active = item.id === resolvedTargetId;
                    const rar = RARITY_META[item.rarity ?? 'common'];
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTargetId(item.id);
                          if (secondaryItemId === item.id) setSecondaryItemId('');
                        }}
                        className={`w-full rounded-xl border p-2.5 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {item.name}
                          </span>
                          <span
                            className="shrink-0 text-[9px] font-bold uppercase"
                            style={{ color: rar.color }}
                          >
                            {rar.label}
                          </span>
                        </div>
                        {item.note ? (
                          <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                            {item.note}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto">
                {vehicles.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
                    Nenhum veículo na Garagem ainda. Use <strong>Auto-Organizar</strong> no Inventário se tiver um veículo na mochila.
                  </div>
                ) : (
                  vehicles.map((veh) => {
                    const active = veh.id === resolvedTargetId;
                    return (
                      <button
                        key={veh.id}
                        type="button"
                        onClick={() => setTargetId(veh.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-[#38bdf8] bg-[#38bdf8]/12'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {veh.name}
                          </span>
                          <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                            {veh.kind}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                          <span>Integridade: {veh.condition}%</span>
                          <span>Combustível: {veh.fuel}%</span>
                        </div>
                        {veh.note ? (
                          <p className="mt-1 line-clamp-2 text-[10px] text-[var(--text-muted)]">
                            {veh.note}
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right: Crafting Station */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {lastResult ? (
              <div className="mb-4 rounded-2xl border border-[var(--success)]/50 bg-[var(--success)]/10 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--success)]">
                    <CheckCircle2 className="h-4 w-4" />
                    Projeto Concluído (+{lastResult.xpGain} XP)
                  </div>
                  <button
                    type="button"
                    onClick={onClearResult}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Fechar aviso
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-primary)]">
                  {lastResult.narrativeLog}
                </p>
                {lastResult.upgradedItem ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold text-[var(--accent)]">
                      {lastResult.upgradedItem.name}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        color: RARITY_META[lastResult.upgradedItem.rarity].color,
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      {RARITY_META[lastResult.upgradedItem.rarity].label}
                    </span>
                    {lastResult.upgradedItem.bonuses
                      ? Object.entries(lastResult.upgradedItem.bonuses)
                          .filter(([, v]) => Boolean(v))
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="font-mono-tech rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--success)]"
                            >
                              {k === 'maxVigor'
                                ? `+${v} Vigor Máx`
                                : `+${v} ${ATTRIBUTE_META[k as AttributeId]?.short[language] ?? k.toUpperCase()}`}
                            </span>
                          ))
                      : null}
                  </div>
                ) : null}
                {lastResult.upgradedVehicle ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-semibold text-[#38bdf8]">
                      {lastResult.upgradedVehicle.name}
                    </span>
                    <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[var(--success)]">
                      +{lastResult.upgradedVehicle.conditionGain}% Integridade
                    </span>
                    {lastResult.upgradedVehicle.fuelGain > 0 ? (
                      <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] text-[#38bdf8]">
                        +{lastResult.upgradedVehicle.fuelGain}% Combustível
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-4">
              {/* Target Preview */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Alvo Selecionado
                </div>
                {targetKind === 'item' && selectedItem ? (
                  <div className="mt-1">
                    <div className="font-display text-sm font-semibold text-[var(--text-primary)]">
                      {selectedItem.name}
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {selectedItem.note || 'Equipamento padrão pronto para modificação na bancada.'}
                    </p>
                  </div>
                ) : targetKind === 'vehicle' && selectedVehicle ? (
                  <div className="mt-1">
                    <div className="font-display text-sm font-semibold text-[#38bdf8]">
                      {selectedVehicle.name} ({selectedVehicle.kind})
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      {selectedVehicle.note || 'Veículo da frota pronto para blindagem, revisão ou customização.'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Selecione um item ou veículo na coluna à esquerda.
                  </p>
                )}
              </div>

              {/* Optional Secondary Component */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  2. Combinar com Outro Item (Opcional — será consumido)
                </label>
                <select
                  value={secondaryItemId}
                  onChange={(e) => setSecondaryItemId(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value="">Nenhum item secundário (apenas Materiais da Base)</option>
                  {secondaryOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} (x{item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Materials Investment */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    3. Materiais da Base a Investir
                  </span>
                  <span className="font-mono-tech font-semibold text-[#fb923c]">
                    {effectiveMaterials} / {availableMaterials} disponíveis
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 3, 5, 8].map((qty) => {
                    const disabled = qty > availableMaterials;
                    const active = effectiveMaterials === qty;
                    return (
                      <button
                        key={qty}
                        type="button"
                        disabled={disabled}
                        onClick={() => setMaterialsSpent(qty)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-35 ${
                          active
                            ? 'border-[#fb923c] bg-[#fb923c]/18 text-[#fb923c]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {qty === 0 ? '0 (Só combinação)' : `${qty} Materiais`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Creative Idea */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  4. Qual melhoria você quer criar? (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={blueprintIdea}
                  onChange={(e) => setBlueprintIdea(e.target.value)}
                  placeholder="Ex.: Soldar chapas e correntes na caminhonete, instalar supressor na pistola, reforçar colete..."
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activePresets.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setBlueprintIdea(idea)}
                      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2.5 py-1 text-[10px] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      + {idea}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-[11px] text-[var(--text-muted)]">
                  {availableMaterials === 0 && !secondaryItemId
                    ? 'Você precisa de pelo menos 1 Material na Base ou 1 item secundário.'
                    : 'A IA valida a coerência no universo e gera bônus e descrição permanentes.'}
                </p>
                <button
                  type="button"
                  disabled={!canCraft}
                  onClick={handleForge}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-ink)] transition hover:brightness-110 disabled:opacity-40"
                >
                  <Sparkles
                    className={`h-4 w-4 ${isCrafting ? 'animate-spin' : ''}`}
                  />
                  {isCrafting
                    ? 'Trabalhando na Bancada...'
                    : targetKind === 'vehicle'
                      ? 'Modificar Veículo'
                      : 'Forjar / Aprimorar Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
