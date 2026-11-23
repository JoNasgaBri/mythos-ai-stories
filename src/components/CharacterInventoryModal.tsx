import {
  Activity,
  Award,
  Backpack,
  Camera,
  Check,
  Coins,
  Crown,
  Flame,
  Gem,
  Key,
  Shield,
  Sparkles,
  Sword,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ALL_EQUIP_SLOTS,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  EQUIP_SLOT_LABEL,
  formatModifier,
  getAttributeModifier,
  getEffectiveAttributes,
  getEquippedGearBonuses,
  RARITY_META,
} from '../engine/rpgSystem';
import type {
  AttributeId,
  Campaign,
  EquipSlot,
  InventoryItem,
  ItemCategory,
  LanguageId,
} from '../types/game';

interface CharacterInventoryModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  isGeneratingPortrait: boolean;
  onClose: () => void;
  onToggleEquipItem: (itemId: string) => void;
  onConsumeItemNow: (itemId: string) => void;
  onUseItemInScene: (item: InventoryItem) => void;
  onSpendAttributePoint: (attr: AttributeId) => void;
  onGeneratePortrait: () => void;
}

type PackFilter = 'all' | 'gear' | 'consumable' | 'clue' | 'relic';

const CATEGORY_ICON: Record<ItemCategory, typeof Sword> = {
  weapon: Sword,
  tool: Wrench,
  relic: Gem,
  consumable: Flame,
  clue: Key,
  misc: Backpack,
};

const SLOT_ICON: Record<EquipSlot, typeof Sword> = {
  head: Crown,
  weapon: Sword,
  offhand: Shield,
  armor: Shield,
  accessory: Gem,
  utility: Wrench,
};

export function CharacterInventoryModal({
  open,
  campaign,
  language,
  isGeneratingPortrait,
  onClose,
  onToggleEquipItem,
  onConsumeItemNow,
  onUseItemInScene,
  onSpendAttributePoint,
  onGeneratePortrait,
}: CharacterInventoryModalProps) {
  const [mobileSection, setMobileSection] = useState<'doll' | 'pack' | 'stats'>(
    'doll',
  );
  const [filter, setFilter] = useState<PackFilter>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const { player } = campaign;
  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';
  const effectiveAttrs = getEffectiveAttributes(player);
  const gearBonuses = getEquippedGearBonuses(player.inventory);

  const equippedBySlot = (slot: EquipSlot): InventoryItem | undefined =>
    player.inventory.find((i) => i.equipped && i.equipSlot === slot);

  const filteredItems = player.inventory.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'gear') return Boolean(item.equipSlot);
    if (filter === 'consumable') return item.category === 'consumable';
    if (filter === 'clue') return item.category === 'clue';
    if (filter === 'relic') return item.category === 'relic';
    return true;
  });

  const selectedItem =
    player.inventory.find((i) => i.id === selectedItemId) ??
    filteredItems[0] ??
    null;

  const equippedCount = player.inventory.filter((i) => i.equipped).length;
  const xpPct = Math.max(
    0,
    Math.min(100, (player.xp / Math.max(1, player.xpToNextLevel)) * 100),
  );

  const renderSlotTile = (slot: EquipSlot) => {
    const item = equippedBySlot(slot);
    const SlotIcon = SLOT_ICON[slot];
    const rarity = item ? RARITY_META[item.rarity ?? 'common'] : null;
    const isSelected = Boolean(item && selectedItem?.id === item.id);

    return (
      <button
        key={slot}
        type="button"
        onClick={() => {
          if (item) {
            setSelectedItemId(item.id);
          }
        }}
        title={
          item
            ? `${EQUIP_SLOT_LABEL[slot]}: ${item.name}`
            : `${EQUIP_SLOT_LABEL[slot]} (Vazio)`
        }
        style={{
          borderColor: isSelected
            ? 'var(--accent)'
            : item && rarity && item.rarity !== 'common'
              ? rarity.color
              : undefined,
        }}
        className={`group flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition ${
          item
            ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-sm hover:brightness-110'
            : 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 opacity-75'
        }`}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
          style={
            item && rarity
              ? { color: rarity.color, backgroundColor: rarity.bg }
              : undefined
          }
        >
          <SlotIcon className="h-4 w-4" />
        </div>
        <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {EQUIP_SLOT_LABEL[slot]}
        </span>
        <span className="mt-0.5 line-clamp-1 w-full text-[11px] font-medium text-[var(--text-primary)]">
          {item ? item.name : 'Vazio'}
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-label="Personagem e Inventário Visual"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Top Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-semibold tracking-wide text-[var(--text-primary)]">
                  {player.name}
                </h2>
                <span className="font-mono-tech rounded-md border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                  Nível {player.level}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {player.occupation} · {player.age} anos · {equippedCount}/{ALL_EQUIP_SLOTS.length} slots equipados
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-3 py-1.5 text-xs font-semibold text-[#fbbf24]">
              <Coins className="h-3.5 w-3.5" />
              <span className="font-mono-tech">
                {(player.currency?.amount ?? 0).toLocaleString('pt-BR')}{' '}
                {player.currency?.label ?? 'Ouro'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Section Tabs */}
        <div className="grid grid-cols-3 gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-1.5 lg:hidden">
          {(
            [
              { id: 'doll', label: 'Equipamento' },
              { id: 'pack', label: `Mochila (${player.inventory.length})` },
              { id: 'stats', label: 'Atributos' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMobileSection(t.id)}
              className={`rounded-xl py-2 text-xs font-semibold transition ${
                mobileSection === t.id
                  ? 'border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-12">
          {/* LEFT COLUMN: Paper Doll + 6 BG3 Equipment Slots + Attributes */}
          <div
            className={`space-y-4 lg:col-span-5 ${
              mobileSection === 'pack' ? 'hidden lg:block' : ''
            }`}
          >
            {/* Paper Doll + 6 Surrounding Slots */}
            <div
              className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-3.5 ${
                mobileSection === 'stats' ? 'hidden lg:block' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Visual & Equipamento
                </span>
                <button
                  type="button"
                  disabled={isGeneratingPortrait || isEnded}
                  onClick={onGeneratePortrait}
                  title="Gera retrato atualizado considerando seus itens equipados"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:opacity-45"
                >
                  <Camera
                    className={`h-3 w-3 ${isGeneratingPortrait ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isGeneratingPortrait
                      ? 'Gerando...'
                      : 'Retrato com Equipamento'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-3 items-stretch gap-2">
                {/* Left Slots */}
                <div className="flex flex-col justify-between gap-2">
                  {renderSlotTile('head')}
                  {renderSlotTile('weapon')}
                  {renderSlotTile('offhand')}
                </div>

                {/* Center Character Portrait / Paper Doll */}
                <div className="relative flex min-h-[240px] flex-col items-center justify-between overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--bg-elevated)] via-[var(--bg-surface)] to-[var(--bg-canvas)] p-2 shadow-inner">
                  {player.portraitUrl ? (
                    <img
                      src={player.portraitUrl}
                      alt={player.name}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
                        <User className="h-10 w-10" />
                      </div>
                      <span className="mt-2 px-1 text-[10px] text-[var(--text-muted)]">
                        Gere um retrato para ver {player.name} equipado
                      </span>
                    </div>
                  )}

                  {/* Vigor overlay strip */}
                  <div className="absolute right-2 bottom-2 left-2 rounded-xl border border-[var(--border-subtle)] bg-black/70 px-2.5 py-1.5 backdrop-blur-sm">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-white">
                      <span className="inline-flex items-center gap-1">
                        <Activity className="h-2.5 w-2.5 text-[var(--success)]" />
                        Vigor
                      </span>
                      <span className="font-mono-tech font-semibold">
                        {player.vigor}/{player.maxVigor}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full bg-[var(--success)] transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(100, (player.vigor / Math.max(1, player.maxVigor)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right Slots */}
                <div className="flex flex-col justify-between gap-2">
                  {renderSlotTile('armor')}
                  {renderSlotTile('accessory')}
                  {renderSlotTile('utility')}
                </div>
              </div>
            </div>

            {/* Attributes + XP Block */}
            <div
              className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 ${
                mobileSection === 'doll' ? 'hidden lg:block' : ''
              }`}
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                  <Award className="h-3.5 w-3.5" />
                  Atributos & Experiência
                </span>
                <span className="font-mono-tech text-[10px] text-[var(--text-secondary)]">
                  {player.xp}/{player.xpToNextLevel} XP
                </span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${xpPct}%` }}
                />
              </div>

              {player.attributePoints > 0 && !isEnded ? (
                <div className="mb-2.5 flex items-center justify-between rounded-xl border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)]">
                  <span>Pontos livres para distribuir</span>
                  <span className="font-mono-tech">+{player.attributePoints}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
                {ATTRIBUTE_KEYS.map((key) => {
                  const meta = ATTRIBUTE_META[key];
                  const baseVal = player.attributes[key] ?? 10;
                  const effVal = effectiveAttrs[key];
                  const mod = getAttributeModifier(effVal);
                  const gearAdd = gearBonuses[key] ?? 0;
                  const canSpend =
                    player.attributePoints > 0 && baseVal < 20 && !isEnded;

                  return (
                    <div
                      key={key}
                      title={`${meta.full[language]}: ${meta.hint[language]}`}
                      className="flex flex-col items-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-2 text-center"
                    >
                      <span className="text-[10px] font-bold text-[var(--text-muted)]">
                        {meta.short[language]}
                      </span>
                      <span className="font-display text-base font-bold text-[var(--text-primary)]">
                        {formatModifier(mod)}
                      </span>
                      <span className="font-mono-tech text-[10px] text-[var(--text-secondary)]">
                        {effVal}
                        {gearAdd !== 0 ? (
                          <span className="ml-0.5 text-[var(--success)]">
                            ({gearAdd > 0 ? `+${gearAdd}` : gearAdd})
                          </span>
                        ) : null}
                      </span>
                      {canSpend ? (
                        <button
                          type="button"
                          onClick={() => onSpendAttributePoint(key)}
                          className="mt-1 w-full rounded-md bg-[var(--accent)] py-0.5 text-[10px] font-bold text-[#111] hover:brightness-110"
                        >
                          +1
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Visual Grid Inventory + Inspector */}
          <div
            className={`flex flex-col gap-3 lg:col-span-7 ${
              mobileSection !== 'pack' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'all', label: `Tudo (${player.inventory.length})` },
                    { id: 'gear', label: 'Equipamentos' },
                    { id: 'consumable', label: 'Consumíveis' },
                    { id: 'clue', label: 'Pistas' },
                    { id: 'relic', label: 'Relíquias' },
                  ] as Array<{ id: PackFilter; label: string }>
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition ${
                      filter === f.id
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Item Tile Grid */}
            <div className="min-h-[230px] flex-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-3">
              {filteredItems.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-xs text-[var(--text-muted)]">
                  <Backpack className="mb-2 h-8 w-8 opacity-40" />
                  Nenhum item nesta categoria.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {filteredItems.map((item) => {
                    const Icon = CATEGORY_ICON[item.category] ?? Backpack;
                    const rarity = RARITY_META[item.rarity ?? 'common'];
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItemId(item.id)}
                        style={{
                          borderColor: isSelected
                            ? 'var(--accent)'
                            : item.rarity && item.rarity !== 'common'
                              ? rarity.color
                              : undefined,
                        }}
                        className={`relative flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                          isSelected
                            ? 'bg-[var(--accent-soft)] shadow-md'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        {item.equipped ? (
                          <span
                            title="Equipado"
                            className="absolute top-2 left-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[#111]"
                          >
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        ) : null}

                        {item.quantity > 1 ? (
                          <span className="font-mono-tech absolute top-2 right-2 rounded-md bg-[var(--bg-canvas)]/85 px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-primary)]">
                            x{item.quantity}
                          </span>
                        ) : null}

                        <div
                          className="mt-1 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)]"
                          style={{
                            color: rarity.color,
                            backgroundColor: rarity.bg,
                          }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <span className="mt-2 line-clamp-2 text-xs leading-tight font-semibold text-[var(--text-primary)]">
                          {item.name}
                        </span>

                        <span
                          className="mt-1 text-[9px] font-semibold uppercase"
                          style={{ color: rarity.color }}
                        >
                          {rarity.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Item Inspector Panel */}
            {selectedItem ? (
              <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                        {selectedItem.name}
                      </h3>
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          color: RARITY_META[selectedItem.rarity ?? 'common'].color,
                          backgroundColor:
                            RARITY_META[selectedItem.rarity ?? 'common'].bg,
                        }}
                      >
                        {RARITY_META[selectedItem.rarity ?? 'common'].label}
                      </span>
                      {selectedItem.equipSlot ? (
                        <span className="rounded-md bg-[var(--bg-canvas)]/70 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                          Slot: {EQUIP_SLOT_LABEL[selectedItem.equipSlot]}
                        </span>
                      ) : null}
                    </div>
                    {selectedItem.note ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                        {selectedItem.note}
                      </p>
                    ) : null}
                    {selectedItem.bonuses ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ATTRIBUTE_KEYS.filter(
                          (k) => (selectedItem.bonuses?.[k] ?? 0) !== 0,
                        ).map((k) => {
                          const v = selectedItem.bonuses![k]!;
                          return (
                            <span
                              key={k}
                              className="font-mono-tech rounded-md border border-[var(--success)]/35 bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]"
                            >
                              {v > 0 ? `+${v}` : v}{' '}
                              {ATTRIBUTE_META[k].short[language]}
                            </span>
                          );
                        })}
                        {selectedItem.bonuses.maxVigor ? (
                          <span className="font-mono-tech rounded-md border border-[var(--success)]/35 bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                            +{selectedItem.bonuses.maxVigor} Vigor Máx
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {!isEnded ? (
                  <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                    {selectedItem.equipSlot ? (
                      <button
                        type="button"
                        onClick={() => onToggleEquipItem(selectedItem.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                          selectedItem.equipped
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-[#111]'
                            : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>
                          {selectedItem.equipped ? 'Desequipar' : 'Equipar'}
                        </span>
                      </button>
                    ) : null}

                    {selectedItem.category === 'consumable' ? (
                      <button
                        type="button"
                        onClick={() => onConsumeItemNow(selectedItem.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--success)]/50 bg-[var(--success)]/15 px-3.5 py-2 text-xs font-semibold text-[var(--success)] transition hover:brightness-110"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        <span>Usar Agora (+25 Vigor)</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        onUseItemInScene(selectedItem);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Usar na Cena</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
