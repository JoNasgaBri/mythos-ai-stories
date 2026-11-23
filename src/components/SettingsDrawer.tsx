import { Cpu, Globe, KeyRound, Sliders, Type, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DIFFICULTIES, READER_FONT_OPTIONS } from '../data/presets';
import type { ApiHealthStatus } from '../services/storyApi';
import type { AppSettings, DifficultyId, LanguageId, ResponseLength } from '../types/game';

interface SettingsDrawerProps {
  open: boolean;
  initialTab?: 'ai' | 'game' | 'reading';
  settings: AppSettings;
  apiHealth: ApiHealthStatus;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onChangeCampaignDifficulty?: (difficulty: DifficultyId) => void;
}

export function SettingsDrawer({
  open,
  initialTab = 'game',
  settings,
  apiHealth,
  onClose,
  onUpdateSettings,
  onChangeCampaignDifficulty,
}: SettingsDrawerProps) {
  const [tab, setTab] = useState<'ai' | 'game' | 'reading'>(initialTab);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);

  if (!open) return null;

  const hasLocalKey = Boolean(settings.geminiApiKey.trim());
  const connectionLabel = settings.forceDemoMode
    ? 'Modo Demo Forçado (Offline)'
    : hasLocalKey
      ? 'Chave Gemini Local Conectada'
      : apiHealth.hasServerKey
        ? 'Chave do Servidor (.env) Ativa'
        : 'Modo Demo Imersivo (Sem Chave)';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-elevated)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold tracking-wide text-[var(--text-primary)]">
              Ajustes do Motor & Leitura
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Controle IA, dificuldade em tempo real e tipografia.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border-subtle)] p-1.5 text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="grid grid-cols-3 gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/40 p-2">
          <button
            type="button"
            onClick={() => setTab('game')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
              tab === 'game'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-strong)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Jogo
          </button>
          <button
            type="button"
            onClick={() => setTab('reading')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
              tab === 'reading'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-strong)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            Leitura
          </button>
          <button
            type="button"
            onClick={() => setTab('ai')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
              tab === 'ai'
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-strong)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            Gemini IA
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {tab === 'game' ? (
            <>
              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <Globe className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Idioma da Crônica
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'pt-BR', label: 'Português' },
                      { id: 'en', label: 'English' },
                      { id: 'fr', label: 'Français' },
                    ] as Array<{ id: LanguageId; label: string }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onUpdateSettings({ language: item.id })}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        settings.language === item.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Dificuldade & Rigor do Destino
                </label>
                <div className="space-y-2">
                  {DIFFICULTIES.map((diff) => {
                    const active = settings.difficulty === diff.id;
                    return (
                      <button
                        key={diff.id}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({ difficulty: diff.id });
                          onChangeCampaignDifficulty?.(diff.id);
                        }}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">
                            {diff.label[settings.language]}
                          </span>
                          <span className="font-mono-tech rounded-md bg-[var(--bg-canvas)]/60 px-2 py-0.5 text-[11px] text-[var(--accent)]">
                            {diff.subtitle[settings.language]}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          {diff.philosophy[settings.language]}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Extensão da Narração
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'short', label: 'Direta' },
                      { id: 'normal', label: 'Equilibrada' },
                      { id: 'literary', label: 'Literária' },
                    ] as Array<{ id: ResponseLength; label: string }>
                  ).map((len) => (
                    <button
                      key={len.id}
                      type="button"
                      onClick={() => onUpdateSettings({ responseLength: len.id })}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        settings.responseLength === len.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {len.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Pulso de Mundo Vivo
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      O mundo avança sozinho se você hesitar por tempo demais.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.livingWorldEnabled}
                    onChange={(e) =>
                      onUpdateSettings({ livingWorldEnabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </div>
                {settings.livingWorldEnabled ? (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Cadência</span>
                      <span className="font-mono-tech text-[var(--accent)]">
                        {settings.livingWorldSeconds}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={120}
                      step={15}
                      value={settings.livingWorldSeconds}
                      onChange={(e) =>
                        onUpdateSettings({ livingWorldSeconds: Number(e.target.value) })
                      }
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {tab === 'reading' ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Superfície de Leitura
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ colorMode: 'dark' })}
                    className={`rounded-xl border p-3 text-left transition ${
                      settings.colorMode === 'dark'
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="text-sm font-semibold">Escuro Atmosférico</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Imersão noturna com brilho sutil
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ colorMode: 'light' })}
                    className={`rounded-xl border p-3 text-left transition ${
                      settings.colorMode === 'light'
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="text-sm font-semibold">Papel Editorial</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Leitura limpa estilo livro impresso
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Tipografia da História
                </label>
                <div className="space-y-2">
                  {READER_FONT_OPTIONS.map((font) => (
                    <button
                      key={font.value}
                      type="button"
                      onClick={() => onUpdateSettings({ readerFont: font.value })}
                      style={{ fontFamily: font.value }}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                        settings.readerFont === font.value
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <span>Tamanho do Texto</span>
                  <span className="font-mono-tech text-[var(--accent)]">
                    {settings.readerFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={22}
                  step={1}
                  value={settings.readerFontSize}
                  onChange={(e) =>
                    onUpdateSettings({ readerFontSize: Number(e.target.value) })
                  }
                  className="w-full accent-[var(--accent)]"
                />
              </div>

              <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Animação de Dado d20
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Exibe o d20 girando na tela durante testes de risco.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.diceAnimations}
                    onChange={(e) =>
                      onUpdateSettings({ diceAnimations: e.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      Auto-ilustrar Novos Locais & Capítulos
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Gera arte automática quando você entra em um local inédito (usa Nano Banana 2.1 se Gemini ativo).
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoIllustrateScenes}
                    onChange={(e) =>
                      onUpdateSettings({ autoIllustrateScenes: e.target.checked })
                    }
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </div>

                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        Som Ambiente Procedural
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        Trilha sonora sutil sintetizada no navegador de acordo com o tema do mundo.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.ambientSoundEnabled}
                      onChange={(e) =>
                        onUpdateSettings({ ambientSoundEnabled: e.target.checked })
                      }
                      className="h-4 w-4 accent-[var(--accent)]"
                    />
                  </div>
                  {settings.ambientSoundEnabled ? (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
                        <span>Volume do Ambiente</span>
                        <span className="font-mono-tech text-[var(--accent)]">
                          {Math.round(settings.ambientVolume * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={Math.round(settings.ambientVolume * 100)}
                        onChange={(e) =>
                          onUpdateSettings({
                            ambientVolume: Number(e.target.value) / 100,
                          })
                        }
                        className="w-full accent-[var(--accent)]"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {tab === 'ai' ? (
            <>
              <div className="rounded-xl border border-[var(--border-strong)] bg-[var(--accent-soft)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Status do Motor
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {connectionLabel}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Sem chave configurada, o MYTHOS roda o <strong>Modo Demo Imersivo</strong> localmente para testar mundos, dados, inventário e temas. Conecte sua chave Gemini para geração infinita real.
                </p>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <KeyRound className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Chave Gemini API (Opcional no navegador)
                </label>
                <div className="flex gap-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={settings.geminiApiKey}
                    onChange={(e) =>
                      onUpdateSettings({ geminiApiKey: e.target.value })
                    }
                    placeholder="AIza..."
                    className="font-mono-tech w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 text-xs text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  >
                    {showKey ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                  Fica salva apenas no seu `localStorage` e é encaminhada pelo bridge local `/api/story/*`. Em produção, prefira `GEMINI_API_KEY` no `.env`.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Modelo Narrativo Principal
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ geminiModel: 'gemini-3.8-flash' })}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      settings.geminiModel === 'gemini-3.8-flash'
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Gemini 3.8 Flash</span>
                      <span className="rounded bg-[var(--bg-canvas)]/70 px-2 py-0.5 text-[10px] text-[var(--accent)]">
                        Recomendado
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Rápido, fluido e equilibrado para turnos dinâmicos com JSON estruturado.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ geminiModel: 'gemini-4-argon' })}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      settings.geminiModel === 'gemini-4-argon'
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Gemini 4 Argon</span>
                      <span className="rounded bg-[var(--bg-canvas)]/70 px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                        Diretor Épico
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Raciocínio profundo para tramas intrincadas de mistério, política e psicologia.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div>
                  <div className="text-sm font-medium">Forçar Modo Demo</div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Útil para testar sem consumir tokens da sua chave.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.forceDemoMode}
                  onChange={(e) =>
                    onUpdateSettings({ forceDemoMode: e.target.checked })
                  }
                  className="h-4 w-4 accent-[var(--accent)]"
                />
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
