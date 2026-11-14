import type { AiAnalysisResult } from '../types';

// Katman 2: GEMINI_API_KEY varsa Gemini API ile bağlamsal analiz,
// yoksa sıfır API key ile lokal Türkçe heuristik analiz & etiket önerisi.

const TAG_KEYWORDS: Record<string, string[]> = {
  'mobbing': ['mobbing', 'patron', 'müdür', 'işyeri', 'ofis', 'istifa', 'mesai'],
  'tükenmişlik': ['tükendim', 'enerjim', 'yorgun', 'bıktım', 'tükenmişlik', 'burnout'],
  'ayrılık': ['ayrıldık', 'terk', 'eski sevgili', 'bitti', 'ilişki', 'aldat'],
  'yalnızlık': ['yalnız', 'kimsem yok', 'arkadaşım', 'konuşacak kimse', 'izole'],
  'sınav-stresi': ['sınav', 'yks', 'kpss', 'vize', 'final', 'ders', 'üniversite', 'okul'],
  'uykusuzluk': ['uyuyamıyorum', 'uyku', 'gece', 'sabaha kadar', 'kabus'],
  'gelecek-kaygısı': ['gelecek', 'ne olacak', 'belirsiz', 'işsiz', 'para', 'geçim'],
  'aile-baskısı': ['annem', 'babam', 'ailem', 'baskı', 'evde', 'kardeş'],
};

const TOXIC_HEURISTIC_PATTERNS = [
  /\b(saçmalama|abartıyorsun|senin\s*suçun|hak\s*etmişsin|kafayı\s*yemiş)\b/i,
  /\b(aptal|salak|gerizekalı|ezik|zavallı)\b/i,
];

export function suggestTagsLocally(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      matched.push(tag);
    }
  }
  return matched.slice(0, 4);
}

export async function runAiContextualAnalysis(text: string): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    // Sıfır API key modu: Lokal bağlamsal heuristik
    const flags: string[] = [];
    let riskScore = 5;

    for (const pattern of TOXIC_HEURISTIC_PATTERNS) {
      if (pattern.test(text)) {
        flags.push('dismissive_or_toxic_language');
        riskScore += 45;
      }
    }

    return {
      layer: 'L1_LOCAL',
      riskScore: Math.min(100, riskScore),
      flags,
      shouldHide: riskScore >= 70,
      suggestedTags: suggestTagsLocally(text),
    };
  }

  // Opsiyonel Gemini API entegrasyonu
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Sen anonim bir dertleşme forumunun moderasyon ve etiket asistanısın.
Aşağıdaki Türkçe metni analiz et ve sadece geçerli JSON döndür:
{
  "riskScore": 0-100 arası sayı (zorbalık, gaslighting, hakaret, manipülasyon veya gizli kendine zarar),
  "flags": ["varsa kısa ingilizce etiketler"],
  "shouldHide": boolean (riskScore >= 75 ise true),
  "suggestedTags": ["en fazla 3 kısa türkçe hashtag-slug örn: mobbing, ayrılık"]
}
Metin: """${text.slice(0, 2000)}"""`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    return {
      layer: 'L2_GEMINI',
      riskScore: Number(parsed.riskScore ?? 0),
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      shouldHide: Boolean(parsed.shouldHide),
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.slice(0, 4) : suggestTagsLocally(text),
    };
  } catch {
    // API hata verirse platform durmaz, lokal analize düşer
    return {
      layer: 'L1_LOCAL',
      riskScore: 0,
      flags: ['gemini_fallback_to_local'],
      shouldHide: false,
      suggestedTags: suggestTagsLocally(text),
    };
  }
}
