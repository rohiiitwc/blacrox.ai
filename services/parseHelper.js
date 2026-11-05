function extractAndParseJson(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;

  const str = String(raw).trim();

  // 1. Direct parse attempt
  try {
    return JSON.parse(str);
  } catch (e1) {}

  // 2. Remove markdown code fence ```json ... ```
  try {
    const cleaned = str
      .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
      .replace(/\s*```[\s\S]*$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e2) {}

  // 3. Extract largest {...} block
  try {
    const first = str.indexOf('{');
    const last = str.lastIndexOf('}');
    if (first !== -1 && last > first) {
      return JSON.parse(str.substring(first, last + 1));
    }
  } catch (e3) {}

  return {};
}

module.exports = { extractAndParseJson };

