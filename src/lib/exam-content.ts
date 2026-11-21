const questionPrefixPattern = /^[^|]+\s*\|\s*Question\s+\d+\s*:\s*/i;
const scenarioSuffixPattern = /\s*\[[^\]]*(?:scenario|case)\s+\d+\]\s*$/i;

export function cleanQuestionText(text: string) {
  return text.replace(questionPrefixPattern, "").trim();
}

export function cleanOptionText(text: string) {
  return text.replace(scenarioSuffixPattern, "").trim();
}
