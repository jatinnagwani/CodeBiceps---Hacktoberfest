import { HeuristicFinding } from '@proof/shared';

/**
 * Checks PR description length, checklist items, and template adherence.
 */
export function checkDescriptionAndTemplate(description: string): HeuristicFinding {
  const trimmed = description.trim();

  // 1. Completely missing or empty description
  if (!description || trimmed.length === 0) {
    return {
      id: 'template-check',
      name: 'Description & Context Completeness',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -30,
      evidence: 'Pull request description is completely empty. Contributors should explain the problem being solved and motivation for the changes.',
      details: { charLength: 0, reason: 'empty-description' },
    };
  }

  // 2. Suspiciously repetitive characters, sequences, or repeated words (e.g., "aaaaaaa", "asdfasdfasdf", "test test test test")
  const hasCharSpam = /(.)\1{5,}/.test(trimmed);
  const hasPatternSpam = /(.{2,8})\1{3,}/.test(trimmed);
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const wordFrequency: Record<string, number> = {};
  for (const w of words) {
    wordFrequency[w] = (wordFrequency[w] || 0) + 1;
  }
  const maxRepeatedWordRatio = words.length > 3 ? Math.max(...Object.values(wordFrequency)) / words.length : 0;
  const isRepetitive = hasCharSpam || hasPatternSpam || (words.length >= 4 && maxRepeatedWordRatio > 0.6);

  if (isRepetitive) {
    return {
      id: 'template-check',
      name: 'Description & Context Completeness',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -25,
      evidence: 'Pull request description contains suspiciously repetitive or meaningless filler text.',
      details: { charLength: trimmed.length, reason: 'repetitive-content' },
    };
  }

  // 3. Unfilled template placeholders (e.g., "<!-- Describe your changes -->", "TODO: describe")
  const placeholderRegex = /<!--\s*(?:describe|fill|insert|TODO).*?-->|\bTODO:\s*(?:add|describe|fill)\b/i;
  if (placeholderRegex.test(trimmed)) {
    return {
      id: 'template-check',
      name: 'Description & Context Completeness',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -20,
      evidence: 'Pull request description contains unedited template placeholder comments or TODO comments.',
      details: { charLength: trimmed.length, reason: 'unfilled-template' },
    };
  }

  // 4. Extremely brief or vague description (<20 chars)
  if (trimmed.length < 20) {
    return {
      id: 'template-check',
      name: 'Description & Context Completeness',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -20,
      evidence: `Pull request description is very brief (${trimmed.length} chars). Missing problem statement, context, or reproduction steps.`,
      details: { charLength: trimmed.length, reason: 'too-brief' },
    };
  }

  // 5. Count checklist items
  const checkedBoxes = (description.match(/\[[xX]\]/g) || []).length;
  const uncheckedBoxes = (description.match(/\[\s\]/g) || []).length;
  const totalBoxes = checkedBoxes + uncheckedBoxes;

  if (totalBoxes > 0 && uncheckedBoxes > checkedBoxes) {
    return {
      id: 'template-check',
      name: 'Description & Context Completeness',
      severity: 'WARNING',
      passed: false,
      scoreImpact: -15,
      evidence: `Checklist contains ${uncheckedBoxes} incomplete item(s) out of ${totalBoxes} tasks (e.g. missing tests or docs).`,
      details: { checkedBoxes, uncheckedBoxes, totalBoxes },
    };
  }

  return {
    id: 'template-check',
    name: 'Description & Context Completeness',
    severity: 'INFO',
    passed: true,
    scoreImpact: 15,
    evidence: `Comprehensive description provided (${trimmed.length} characters) with ${checkedBoxes} verified checklist item(s).`,
    details: { charLength: trimmed.length, checkedBoxes, uncheckedBoxes },
  };
}
