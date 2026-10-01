import { truthy } from '../../../utils/expodash/filter';
import { IssueRule } from '../../config/issue';

/** Only check text properties that may contain restricted words */
type AppleInfoTextProperty = 'title' | 'subtitle' | 'description' | 'keywords';
const RESTRICTED_PROPERTIES: AppleInfoTextProperty[] = [
  'title',
  'subtitle',
  'description',
  'keywords',
];
const RESTRICTED_WORDS = {
  beta: 'Apple restricts the word "beta" and synonyms implying incomplete functionality.',
};

/**
 * Apple restricts certain words from being used in name, description, or keywords.
 * Using these words likely result in a rejection.
 */
export const infoRestrictedWords: IssueRule = {
  id: 'apple.info.restrictedWords',
  severity: 1,
  validate(config) {
    if (!config.apple?.info || Object.keys(config.apple.info).length === 0) {
      return null;
    }

    return Object.keys(config.apple.info)
      .map(locale =>
        RESTRICTED_PROPERTIES.map(property => {
          const value = getStringValue(config.apple?.info?.[locale][property]);
          const issueDescription = getDescriptionForFirstMatch(value);

          if (issueDescription) {
            return {
              id: this.id,
              severity: this.severity,
              path: ['apple', 'info', locale, property],
              message: issueDescription,
            };
          }

          return null;
        }).filter(truthy)
      )
      .filter(truthy)
      .flat();
  },
};

function getDescriptionForFirstMatch(value: string): string | null {
  for (const [word, description] of Object.entries(RESTRICTED_WORDS)) {
    if (containsWord(value, word)) {
      return description;
    }
  }

  return null;
}

/**
 * Match whole words only, so words like "betal" (Danish) or "betalen" (Dutch) are not reported.
 * Uses Unicode-aware boundaries, since `\b` treats non-ASCII letters as word boundaries.
 */
function containsWord(value: string, word: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, 'iu').test(value);
}

function getStringValue(value?: null | string | string[]): string {
  if (!value) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.join(' ');
  }

  return value;
}
