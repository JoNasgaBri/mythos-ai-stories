import {
  Activity,
  ArrowRightLeft,
  Award,
  Backpack,
  Box,
  Camera,
  Car,
  Check,
  Coins,
  Crown,
  Flame,
  Fuel,
  Gem,
  Hammer,
  Home,
  Key,
  Layers,
  Minus,
  Pencil,
  Plus,
  Ruler,
  Search,
  Shield,
  Sparkles,
  Sword,
  User,
  Wand2,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ALL_EQUIP_SLOTS,
  ATTRIBUTE_KEYS,
  ATTRIBUTE_META,
  defaultBaseSuppliesForTheme,
  EQUIP_SLOT_LABEL,
  formatModifier,
  getAttributeModifier,
  getEffectiveAttributes,
  getEquippedGearBonuses,
  getSupplyMetaForTheme,
  RARITY_META,
  SUPPLY_KEYS,
} from '../engine/rpgSystem';
import type {
  AttributeId,
  Campaign,
  CharacterAttributes,
  EquipSlot,
  InventoryItem,
  ItemCategory,
  ItemStorageLocation,
  LanguageId,
  PlayerState,
  SupplyType,
} from '../types/game';

interface CharacterInventoryModalProps {
  open: boolean;
  campaign: Campaign;
  language: LanguageId;
  isGeneratingPortrait: boolean;
  onClose: () => void;
  onToggleEquipItem: (itemId: string) => void;
  onMoveItemStorage: (itemId: string, storage: ItemStorageLocation) => void;
  onAutoOrganizeInventory: () => void;
  onAdjustSupply: (supply: SupplyType, delta: number) => void;
  onRefuelVehicle: (vehicleId: string) => void;
  onConsumeItemNow: (itemId: string) => void;
  onUseItemInScene: (item: InventoryItem) => void;
  onSpendAttributePoint: (attr: AttributeId) => void;
  onUpdatePlayerProfile?: (
    patch: Partial<
      Pick<
        PlayerState,
        'name' | 'age' | 'occupation' | 'height' | 'physique' | 'appearance' | 'attributes'
      >
    >,
  ) => void;
  onGeneratePortrait: () => void;
  onOpenBaseBlueprint: () => void;
  onOpenWorkbench?: () => void;
}

type PackFilter = 'all' | 'gear' | 'consumable' | 'clue' | 'relic';
type StorageTab = 'carry' | 'base' | 'supplies';

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
  onMoveItemStorage,
  onAutoOrganizeInventory,
  onAdjustSupply,
  onRefuelVehicle,
  onConsumeItemNow,
  onUseItemInScene,
  onSpendAttributePoint,
  onUpdatePlayerProfile,
  onGeneratePortrait,
  onOpenBaseBlueprint,
  onOpenWorkbench,
}: CharacterInventoryModalProps) {
  const [mobileSection, setMobileSection] = useState<'doll' | 'pack' | 'stats'>(
    'pack',
  );
  const [storageTab, setStorageTab] = useState<StorageTab>('carry');
  const [filter, setFilter] = useState<PackFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(campaign.player.name);
  const [draftAge, setDraftAge] = useState(String(campaign.player.age));
  const [draftHeight, setDraftHeight] = useState(campaign.player.height ?? '');
  const [draftPhysique, setDraftPhysique] = useState(
    campaign.player.physique ?? '',
  );
  const [draftAppearance, setDraftAppearance] = useState(
    campaign.player.appearance ?? '',
  );
  const [draftAttrs, setDraftAttrs] = useState<CharacterAttributes>({
    ...campaign.player.attributes,
  });

  const startEditingProfile = () => {
    setDraftName(campaign.player.name);
    setDraftAge(String(campaign.player.age));
    setDraftHeight(campaign.player.height ?? '');
    setDraftPhysique(campaign.player.physique ?? '');
    setDraftAppearance(campaign.player.appearance ?? '');
    setDraftAttrs({ ...campaign.player.attributes });
    setEditingProfile(true);
  };

  const saveProfileEdits = () => {
    onUpdatePlayerProfile?.({
      name: draftName.trim() || campaign.player.name,
      age: Math.max(14, Math.min(120, Math.round(Number(draftAge) || campaign.player.age))),
      height: draftHeight.trim() || undefined,
      physique: draftPhysique.trim() || undefined,
      appearance: draftAppearance.trim() || undefined,
      attributes: draftAttrs,
    });
    setEditingProfile(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const { player, stronghold } = campaign;
  const isEnded =
    campaign.status === 'ended_fallen' || campaign.status === 'ended_victory';
  const effectiveAttrs = getEffectiveAttributes(player);
  const gearBonuses = getEquippedGearBonuses(player.inventory);
  const supplyMeta = getSupplyMetaForTheme(campaign.world.primaryTheme);
  const supplies =
    stronghold?.supplies ?? defaultBaseSuppliesForTheme(campaign.world.primaryTheme);
  const vehicles = stronghold?.vehicles ?? [];

  const carryItems = player.inventory.filter(
    (i) => (i.storage ?? 'carry') === 'carry',
  );
  const baseItems = player.inventory.filter((i) => i.storage === 'base');
  const vehicleItems = player.inventory.filter((i) => i.storage === 'vehicle');

  const activeList =
    storageTab === 'base'
      ? baseItems
      : storageTab === 'carry'
        ? carryItems
        : vehicleItems;

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = activeList.filter((item) => {
    if (trimmedQuery) {
      const hay = `${item.name} ${item.note ?? ''}`.toLowerCase();
      if (!hay.includes(trimmedQuery)) return false;
    }
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

  const equippedBySlot = (slot: EquipSlot): InventoryItem | undefined =>
    player.inventory.find((i) => i.equipped && i.equipSlot === slot);

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
            setStorageTab((item.storage ?? 'carry') === 'base' ? 'base' : 'carry');
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
        className={`group flex flex-col items-center justify-center rounded-2xl border p-2 text-center transition ${
          item
            ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] shadow-sm hover:brightness-110'
            : 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 opacity-75'
        }`}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
          style={
            item && rarity
              ? { color: rarity.color, backgroundColor: rarity.bg }
              : undefined
          }
        >
          <SlotIcon className="h-4 w-4" />
        </div>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {EQUIP_SLOT_LABEL[slot]}
        </span>
        <span className="mt-0.5 line-clamp-1 w-full text-[10px] font-medium text-[var(--text-primary)]">
          {item ? item.name : 'Vazio'}
        </span>
      </button>
    );
  };

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2.5 backdrop-blur-md sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-label="Personagem e Inventário Tático"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-modal-spring flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-elevated)]"
      >
        {/* Top Banner */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Shield className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-semibold tracking-wide text-[var(--text-primary)] sm:text-base">
                  {player.name}
                </h2>
                <span className="font-mono-tech rounded-md border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                  Nv.{player.level}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {player.occupation} · {equippedCount}/{ALL_EQUIP_SLOTS.length} equipados · {carryItems.length} mochila · {baseItems.length} na base
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBaseBlueprint();
              }}
              className="hidden items-center gap-1.5 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] sm:inline-flex"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Planta da Base</span>
            </button>

            {onOpenWorkbench ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWorkbench();
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#fb923c]/45 bg-[#fb923c]/12 px-3 py-1.5 text-xs font-semibold text-[#fb923c] transition hover:bg-[#fb923c]/20"
              >
                <Hammer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bancada</span>
              </button>
            ) : null}

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

        {/* Mobile Section Switcher */}
        <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-1.5 lg:hidden">
          {(
            [
              { id: 'pack', label: `Estoque (${player.inventory.length})` },
              { id: 'doll', label: 'Equipamento' },
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

        {/* Main Split Layout — Independent Scrolling so Inspector NEVER disappears */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden p-3.5 sm:p-5 lg:grid-cols-12">
          {/* LEFT COLUMN: Paper Doll + 6 Slots + Attributes (independent scroll) */}
          <div
            className={`min-h-0 space-y-4 overflow-y-auto pr-0.5 lg:col-span-5 ${
              mobileSection === 'pack' ? 'hidden lg:block' : ''
            }`}
          >
            {/* Paper Doll */}
            <div
              className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-3.5 ${
                mobileSection === 'stats' ? 'hidden lg:block' : ''
              }`}
            >
              <div className="mb-2.5 flex items-center justify-between gap-2">
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
                    {isGeneratingPortrait ? 'Gerando...' : 'Retrato c/ Gear'}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-3 items-stretch gap-2">
                <div className="flex flex-col justify-between gap-2">
                  {renderSlotTile('head')}
                  {renderSlotTile('weapon')}
                  {renderSlotTile('offhand')}
                </div>

                {/* Center Character Portrait with clean Vigor footer */}
                <div className="relative flex min-h-[245px] flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--bg-elevated)] via-[var(--bg-surface)] to-[var(--bg-canvas)] shadow-inner">
                  <div className="relative flex-1 overflow-hidden">
                    {player.portraitUrl ? (
                      <img
                        src={player.portraitUrl}
                        alt={player.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-2 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--accent)]">
                          <User className="h-8 w-8" />
                        </div>
                        <span className="mt-2 text-[10px] text-[var(--text-muted)]">
                          Sem retrato
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Clean non-overlapping Vigor footer */}
                  <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-2.5 py-1.5">
                    <div className="mb-1 flex items-center justify-between gap-1 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                        <Activity className="h-2.5 w-2.5 text-[var(--success)]" />
                        HP
                      </span>
                      <span className="font-mono-tech font-semibold text-[var(--text-primary)]">
                        {player.vigor}/{player.maxVigor}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                      <div
                        className="h-full rounded-full bg-[var(--success)] transition-all"
                        style={{
                          width: `${Math.max(0, Math.min(100, (player.vigor / Math.max(1, player.maxVigor)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2">
                  {renderSlotTile('armor')}
                  {renderSlotTile('accessory')}
                  {renderSlotTile('utility')}
                </div>
              </div>
            </div>

            {/* Attributes + XP */}
            <div
              className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5 ${
                mobileSection === 'doll' ? 'hidden lg:block' : ''
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)]">
                  <Award className="h-3.5 w-3.5" />
                  Atributos & Biometria
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tech text-[10px] text-[var(--text-secondary)]">
                    {player.xp}/{player.xpToNextLevel} XP
                  </span>
                  {onUpdatePlayerProfile && !isEnded ? (
                    <button
                      type="button"
                      onClick={() =>
                        editingProfile ? setEditingProfile(false) : startEditingProfile()
                      }
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition ${
                        editingProfile
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                      }`}
                    >
                      <Pencil className="h-2.5 w-2.5" />
                      {editingProfile ? 'Fechar' : 'Editar'}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${xpPct}%` }}
                />
              </div>

              {/* Biometrics Summary Strip */}
              {!editingProfile ? (
                <div className="mb-3 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5">
                    <Ruler className="h-2.5 w-2.5 text-[var(--accent)]" />
                    {player.height ? `Altura: ${player.height}` : 'Altura não definida'}
                  </span>
                  <span className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-0.5">
                    {player.physique ? `Porte: ${player.physique}` : 'Porte não definido'}
                  </span>
                </div>
              ) : (
                <div className="animate-tab-fade mb-3 space-y-2.5 rounded-xl border border-[var(--accent)]/40 bg-[var(--bg-surface)] p-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] text-[var(--text-muted)]">Nome</span>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-[var(--text-muted)]">Idade</span>
                      <input
                        type="number"
                        min={14}
                        max={120}
                        value={draftAge}
                        onChange={(e) => setDraftAge(e.target.value)}
                        className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] text-[var(--text-muted)]">Altura (ex.: 1,70m)</span>
                      <input
                        type="text"
                        value={draftHeight}
                        onChange={(e) => setDraftHeight(e.target.value)}
                        placeholder="1,70m"
                        className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-[var(--text-muted)]">Porte Físico</span>
                      <input
                        type="text"
                        value={draftPhysique}
                        onChange={(e) => setDraftPhysique(e.target.value)}
                        placeholder="Comum / Não atlético"
                        className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {['Franzino', 'Comum / Não atlético', 'Médio', 'Atlético', 'Robusto'].map(
                      (preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDraftPhysique(preset)}
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] transition ${
                            draftPhysique === preset
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {preset}
                        </button>
                      ),
                    )}
                  </div>

                  <label className="block">
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Aparência / Detalhes Físicos (Opcional)
                    </span>
                    <input
                      type="text"
                      value={draftAppearance}
                      onChange={(e) => setDraftAppearance(e.target.value)}
                      placeholder="Ex.: 1,70m, corpo comum não atlético, cabelo escuro..."
                      className="mt-0.5 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-2 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                    />
                  </label>

                  <div>
                    <div className="mb-1 text-[10px] font-semibold text-[var(--text-muted)]">
                      Recalibrar Atributos Base (6–20)
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ATTRIBUTE_KEYS.map((key) => (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-1"
                        >
                          <span className="text-[10px] font-bold text-[var(--text-muted)]">
                            {ATTRIBUTE_META[key].short[language]}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setDraftAttrs((prev) => ({
                                  ...prev,
                                  [key]: Math.max(6, (prev[key] ?? 10) - 1),
                                }))
                              }
                              className="flex h-4 w-4 items-center justify-center rounded bg-[var(--bg-elevated)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              -
                            </button>
                            <span className="font-mono-tech w-5 text-center text-[11px] font-bold text-[var(--text-primary)]">
                              {draftAttrs[key]}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftAttrs((prev) => ({
                                  ...prev,
                                  [key]: Math.min(20, (prev[key] ?? 10) + 1),
                                }))
                              }
                              className="flex h-4 w-4 items-center justify-center rounded bg-[var(--bg-elevated)] text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingProfile(false)}
                      className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveProfileEdits}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-[#111] hover:brightness-110"
                    >
                      <Check className="h-3 w-3" />
                      Salvar Ficha
                    </button>
                  </div>
                </div>
              )}

              {player.attributePoints > 0 && !isEnded ? (
                <div className="mb-2.5 flex items-center justify-between rounded-xl border border-[var(--accent)]/50 bg-[var(--accent-soft)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)]">
                  <span>Pontos livres para distribuir</span>
                  <span className="font-mono-tech">+{player.attributePoints}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
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

          {/* RIGHT COLUMN: 3 Storage Tabs + PINNED Item Inspector + Dedicated Scrollable Grid */}
          <div
            className={`flex min-h-0 flex-col gap-3 overflow-hidden lg:col-span-7 ${
              mobileSection !== 'pack' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* 3 Primary Storage Tabs: Mochila | Depósito da Base | Suprimentos & Frota */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
              <div className="grid flex-1 grid-cols-3 gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/60 p-1">
                <button
                  type="button"
                  onClick={() => setStorageTab('carry')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                    storageTab === 'carry'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Backpack className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Mochila ({carryItems.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStorageTab('base')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                    storageTab === 'base'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Home className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Base ({baseItems.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStorageTab('supplies')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition ${
                    storageTab === 'supplies'
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Fuel className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Suprimentos & Frota</span>
                </button>
              </div>

              {!isEnded && storageTab !== 'supplies' ? (
                <button
                  type="button"
                  onClick={onAutoOrganizeInventory}
                  title="Move automaticamente estoques pesados, munição, combustível e veículos para a Base/Garagem"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-[11px] font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Auto-Organizar</span>
                </button>
              ) : null}
            </div>

            {storageTab === 'supplies' ? (
              /* SUPPLIES & VEHICLES PANEL */
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                {/* Strategic Supplies Gauges */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Box className="h-4 w-4 text-[var(--accent)]" />
                      <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                        Recursos Estratégicos · {stronghold?.name || 'Refúgio'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenBaseBlueprint();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                    >
                      <Layers className="h-3 w-3" />
                      Ver Planta da Base
                    </button>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {SUPPLY_KEYS.map((key) => {
                      const meta = supplyMeta[key];
                      const amount = supplies[key] ?? 0;
                      const pct = Math.max(
                        0,
                        Math.min(100, (amount / Math.max(1, meta.maxBar)) * 100),
                      );
                      return (
                        <div
                          key={key}
                          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[var(--text-primary)]">
                              {meta.label}
                            </span>
                            <span
                              className="font-mono-tech text-xs font-bold"
                              style={{ color: meta.color }}
                            >
                              {amount} {meta.unit}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: meta.color,
                              }}
                            />
                          </div>
                          {!isEnded ? (
                            <div className="mt-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={amount <= 0}
                                onClick={() => onAdjustSupply(key, -1)}
                                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1 text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:opacity-35"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onAdjustSupply(key, 1)}
                                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1 text-[var(--text-secondary)] hover:border-[var(--success)] hover:text-[var(--success)]"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onAdjustSupply(key, key === 'ammo' ? 10 : 5)
                                }
                                className="font-mono-tech rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                              >
                                +{key === 'ammo' ? 10 : 5}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Garage / Vehicles & Mounts */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-[var(--accent)]" />
                      <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                        Garagem, Veículos & Montarias ({vehicles.length})
                      </h3>
                    </div>
                    {!isEnded && vehicles.length === 0 ? (
                      <button
                        type="button"
                        onClick={onAutoOrganizeInventory}
                        className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                      >
                        Detectar veículos da mochila
                      </button>
                    ) : null}
                  </div>

                  {vehicles.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--border-subtle)] p-4 text-center text-xs text-[var(--text-muted)]">
                      Nenhum veículo registrado na garagem. Clique em <strong>Auto-Organizar</strong> se você já possui um carro/caminhonete/montaria na mochila!
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {vehicles.map((v) => (
                        <div
                          key={v.id}
                          className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-[var(--text-primary)]">
                                {v.name}
                              </div>
                              <div className="text-[10px] text-[var(--text-muted)]">
                                {v.kind}
                                {v.note ? ` · ${v.note}` : ''}
                              </div>
                            </div>
                            {!isEnded ? (
                              <button
                                type="button"
                                disabled={supplies.fuel <= 0 || v.fuel >= 100}
                                onClick={() => onRefuelVehicle(v.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-[#fb923c]/50 bg-[#fb923c]/12 px-2.5 py-1 text-[11px] font-semibold text-[#fb923c] transition hover:bg-[#fb923c]/20 disabled:opacity-40"
                              >
                                <Fuel className="h-3 w-3" />
                                Abastecer (-1 {supplyMeta.fuel.unit})
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-2.5 grid grid-cols-2 gap-3 text-[10px]">
                            <div>
                              <div className="mb-1 flex justify-between text-[var(--text-secondary)]">
                                <span>Tanque / Energia</span>
                                <span className="font-mono-tech font-semibold text-[#fb923c]">
                                  {v.fuel}%
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                                <div
                                  className="h-full rounded-full bg-[#fb923c]"
                                  style={{ width: `${v.fuel}%` }}
                                />
                              </div>
                            </div>
                            <div>
                              <div className="mb-1 flex justify-between text-[var(--text-secondary)]">
                                <span>Integridade</span>
                                <span className="font-mono-tech font-semibold text-[var(--success)]">
                                  {v.condition}%
                                </span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-canvas)]">
                                <div
                                  className="h-full rounded-full bg-[var(--success)]"
                                  style={{ width: `${v.condition}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Vehicle Trunk Items */}
                  {vehicleItems.length > 0 ? (
                    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        No Porta-Malas / Caçamba ({vehicleItems.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {vehicleItems.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => onMoveItemStorage(it.id, 'carry')}
                            title="Clique para trazer de volta à Mochila"
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] text-[var(--text-primary)] hover:border-[var(--accent)]"
                          >
                            <span>{it.name}</span>
                            {it.quantity > 1 ? (
                              <span className="font-mono-tech text-[10px] text-[var(--accent)]">
                                x{it.quantity}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              /* MOCHILA OR BASE DEPOT WITH PINNED INSPECTOR + SCROLLABLE GRID */
              <>
                {/* PINNED ITEM INSPECTOR — ALWAYS VISIBLE WITHOUT SCROLLING! */}
                {selectedItem ? (
                  <div className="shrink-0 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3.5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
                            {selectedItem.name}
                          </h3>
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              color: RARITY_META[selectedItem.rarity ?? 'common'].color,
                              backgroundColor:
                                RARITY_META[selectedItem.rarity ?? 'common'].bg,
                            }}
                          >
                            {RARITY_META[selectedItem.rarity ?? 'common'].label}
                          </span>
                          {selectedItem.quantity > 1 ? (
                            <span className="font-mono-tech rounded-md bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[10px] text-[var(--accent)]">
                              Qtd: x{selectedItem.quantity}
                            </span>
                          ) : null}
                          {selectedItem.equipSlot ? (
                            <span className="rounded-md bg-[var(--bg-canvas)]/70 px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                              {EQUIP_SLOT_LABEL[selectedItem.equipSlot]}
                            </span>
                          ) : null}
                        </div>

                        {selectedItem.note ? (
                          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {selectedItem.note}
                          </p>
                        ) : null}

                        {selectedItem.bonuses ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {ATTRIBUTE_KEYS.filter(
                              (k) => (selectedItem.bonuses?.[k] ?? 0) !== 0,
                            ).map((k) => {
                              const v = selectedItem.bonuses![k]!;
                              return (
                                <span
                                  key={k}
                                  className="font-mono-tech rounded-md border border-[var(--success)]/35 bg-[var(--success)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success)]"
                                >
                                  {v > 0 ? `+${v}` : v}{' '}
                                  {ATTRIBUTE_META[k].short[language]}
                                </span>
                              );
                            })}
                            {selectedItem.bonuses.maxVigor ? (
                              <span className="font-mono-tech rounded-md border border-[var(--success)]/35 bg-[var(--success)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                                +{selectedItem.bonuses.maxVigor} Vigor Máx
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {!isEnded ? (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                        {selectedItem.equipSlot ? (
                          <button
                            type="button"
                            onClick={() => onToggleEquipItem(selectedItem.id)}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition ${
                              selectedItem.equipped
                                ? 'border-[var(--accent)] bg-[var(--accent)] text-[#111]'
                                : 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                            }`}
                          >
                            <Shield className="h-3 w-3" />
                            <span>
                              {selectedItem.equipped ? 'Desequipar' : 'Equipar'}
                            </span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            onMoveItemStorage(
                              selectedItem.id,
                              (selectedItem.storage ?? 'carry') === 'base'
                                ? 'carry'
                                : 'base',
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>
                            {(selectedItem.storage ?? 'carry') === 'base'
                              ? 'Pegar p/ Mochila'
                              : 'Guardar na Base'}
                          </span>
                        </button>

                        {vehicles.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              onMoveItemStorage(selectedItem.id, 'vehicle')
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[#fb923c] hover:text-[#fb923c]"
                          >
                            <Car className="h-3 w-3" />
                            <span>Porta-Malas</span>
                          </button>
                        ) : null}

                        {selectedItem.category === 'consumable' ? (
                          <button
                            type="button"
                            onClick={() => onConsumeItemNow(selectedItem.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--success)]/50 bg-[var(--success)]/15 px-3 py-1.5 text-[11px] font-semibold text-[var(--success)] hover:brightness-110"
                          >
                            <Flame className="h-3 w-3" />
                            <span>+25 Vigor</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => {
                            onUseItemInScene(selectedItem);
                            onClose();
                          }}
                          className="ml-auto inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Usar na Cena</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Search + Category Filter Row */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <div className="relative min-w-[160px] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        storageTab === 'base'
                          ? 'Buscar no depósito da base...'
                          : 'Buscar na mochila...'
                      }
                      className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-1.5 pr-3 pl-8 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { id: 'all', label: 'Tudo' },
                        { id: 'gear', label: 'Equip.' },
                        { id: 'consumable', label: 'Consum.' },
                        { id: 'clue', label: 'Pistas' },
                        { id: 'relic', label: 'Relíq.' },
                      ] as Array<{ id: PackFilter; label: string }>
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                          filter === f.id
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* INDEPENDENTLY SCROLLABLE ITEM GRID */}
                <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]/45 p-3">
                  {filteredItems.length === 0 ? (
                    <div className="flex h-full min-h-[160px] flex-col items-center justify-center text-center text-xs text-[var(--text-muted)]">
                      {storageTab === 'base' ? (
                        <>
                          <Home className="mb-2 h-7 w-7 opacity-40" />
                          <span>Nenhum item guardado no depósito da base ainda.</span>
                          <span className="mt-1 text-[11px]">
                            Use <strong>Auto-Organizar</strong> ou clique em <strong>Guardar na Base</strong> em qualquer item da mochila.
                          </span>
                        </>
                      ) : (
                        <>
                          <Backpack className="mb-2 h-7 w-7 opacity-40" />
                          <span>Nenhum item encontrado com este filtro.</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
                            className={`relative flex flex-col items-center rounded-2xl border p-2.5 text-center transition ${
                              isSelected
                                ? 'bg-[var(--accent-soft)] shadow-md ring-1 ring-[var(--accent)]'
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
                              className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)]"
                              style={{
                                color: rarity.color,
                                backgroundColor: rarity.bg,
                              }}
                            >
                              <Icon className="h-4 w-4" />
                            </div>

                            <span className="mt-1.5 line-clamp-2 text-[11px] leading-tight font-semibold text-[var(--text-primary)]">
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
