import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  AiNarrationPreferences,
  Campaign,
  CraftRequest,
  DiceRollResult,
  ForgeWorldRequest,
  LanguageId,
  ResponseLength,
  WorldEventCategory,
  WorldThemeId,
} from '../src/types/game.js';
import {
  generateCampaignEpilogue,
  generateCraftUpgrade,
  generateForgedWorld,
  generateJournalSummary,
  generateLivingWorldPulse,
  generateMapGeocode,
  generateSceneSpeech,
  generateStoryStart,
  generateStoryTurn,
  generateVisualAsset,
  generateWorldEvent,
  generateWorldRumors,
  type VisualAssetParams,
} from './geminiEngine.js';

interface MiddlewareEnv {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
}

type NextFn = (err?: unknown) => void;

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const preParsed = (req as IncomingMessage & { body?: unknown }).body;
  if (preParsed !== undefined && preParsed !== null) {
    try {
      if (typeof preParsed === 'string') {
        return Promise.resolve((preParsed ? JSON.parse(preParsed) : {}) as T);
      }
      if (Buffer.isBuffer(preParsed)) {
        const text = preParsed.toString('utf8');
        return Promise.resolve((text ? JSON.parse(text) : {}) as T);
      }
      return Promise.resolve(preParsed as T);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve((text ? JSON.parse(text) : {}) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function resolveApiKey(req: IncomingMessage, env: MiddlewareEnv): string {
  const headerKey = req.headers['x-gemini-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim().length > 0) {
    return headerKey.trim();
  }
  return env.GEMINI_API_KEY?.trim() ?? '';
}

function resolveModel(
  requested: string | undefined,
  env: MiddlewareEnv,
): 'gemini-3.8-flash' | 'gemini-4-argon' {
  if (requested === 'gemini-4-argon') return 'gemini-4-argon';
  if (env.GEMINI_MODEL === 'gemini-4-argon' && !requested) return 'gemini-4-argon';
  return 'gemini-3.8-flash';
}

export function createAiMiddleware(env: MiddlewareEnv) {
  return async function aiMiddleware(
    req: IncomingMessage,
    res: ServerResponse,
    next: NextFn,
  ): Promise<void> {
    const url = req.url?.split('?')[0] ?? '';
    if (!url.startsWith('/api/')) {
      next();
      return;
    }

    if (url === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        hasServerKey: Boolean(env.GEMINI_API_KEY?.trim()),
        defaultModel: resolveModel(undefined, env),
      });
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' });
      return;
    }

    const apiKey = resolveApiKey(req, env);
    if (!apiKey) {
      sendJson(res, 401, {
        code: 'NO_API_KEY',
        error: 'No Gemini API key configured on server or request header.',
      });
      return;
    }

    try {
      if (url === '/api/story/start') {
        const body = await readJsonBody<{
          campaign: Campaign;
          responseLength?: ResponseLength;
          narrationPrefs?: Partial<AiNarrationPreferences>;
          model?: string;
        }>(req);
        const result = await generateStoryStart(
          apiKey,
          resolveModel(body.model, env),
          body.campaign,
          body.responseLength ?? body.narrationPrefs?.responseLength ?? 'literary',
          body.narrationPrefs,
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/turn') {
        const body = await readJsonBody<{
          campaign: Campaign;
          action: string;
          diceRoll?: DiceRollResult;
          responseLength?: ResponseLength;
          narrationPrefs?: Partial<AiNarrationPreferences>;
          model?: string;
          crisisMode?: 'survival_test' | 'breaking_point';
        }>(req);
        const result = await generateStoryTurn(
          apiKey,
          resolveModel(body.model, env),
          body.campaign,
          body.action,
          body.diceRoll,
          body.responseLength ?? body.narrationPrefs?.responseLength ?? 'literary',
          body.crisisMode,
          body.narrationPrefs,
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/pulse') {
        const body = await readJsonBody<{ campaign: Campaign }>(req);
        const result = await generateLivingWorldPulse(apiKey, body.campaign);
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/summarize') {
        const body = await readJsonBody<{
          campaign: Campaign;
          mode?: 'chapter' | 'arc_compression';
        }>(req);
        const result = await generateJournalSummary(
          apiKey,
          body.campaign,
          body.mode ?? 'chapter',
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/epilogue') {
        const body = await readJsonBody<{
          campaign: Campaign;
          outcome: 'fallen' | 'victory';
          model?: string;
        }>(req);
        const result = await generateCampaignEpilogue(
          apiKey,
          resolveModel(body.model, env),
          body.campaign,
          body.outcome ?? 'victory',
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/illustrate') {
        const body = await readJsonBody<VisualAssetParams>(req);
        const result = await generateVisualAsset(apiKey, body);
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/speak') {
        const body = await readJsonBody<{
          text: string;
          language?: LanguageId;
          theme?: WorldThemeId;
        }>(req);
        const result = await generateSceneSpeech(
          apiKey,
          body.text ?? '',
          body.language ?? 'pt-BR',
          body.theme ?? 'fantasy',
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/forge') {
        const body = await readJsonBody<{
          request: ForgeWorldRequest;
          model?: string;
        }>(req);
        const result = await generateForgedWorld(
          apiKey,
          resolveModel(body.model, env),
          body.request,
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/rumors') {
        const body = await readJsonBody<{ campaign: Campaign }>(req);
        const result = await generateWorldRumors(apiKey, body.campaign);
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/craft') {
        const body = await readJsonBody<{
          campaign: Campaign;
          request: CraftRequest;
        }>(req);
        const result = await generateCraftUpgrade(
          apiKey,
          body.campaign,
          body.request,
        );
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/event') {
        const body = await readJsonBody<{
          campaign: Campaign;
          lastActionText?: string;
          suggestedCategory?: WorldEventCategory;
          triggerReason?: string;
        }>(req);
        const result = await generateWorldEvent(apiKey, body.campaign, {
          lastActionText: body.lastActionText,
          suggestedCategory: body.suggestedCategory,
          triggerReason: body.triggerReason,
        });
        sendJson(res, 200, result);
        return;
      }

      if (url === '/api/story/map-geo') {
        const body = await readJsonBody<{ campaign: Campaign }>(req);
        const result = await generateMapGeocode(apiKey, body.campaign);
        sendJson(res, 200, result);
        return;
      }

      sendJson(res, 404, { error: 'Unknown API endpoint' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected Gemini API error';
      sendJson(res, 500, { error: message });
    }
  };
}
