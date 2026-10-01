import { MetadataConfig } from '../../../config/schema';
import { infoRestrictedWords } from '../infoRestrictedWords';

function createConfig(info: Record<string, any>): MetadataConfig {
  return { configVersion: 0, apple: { info } } as MetadataConfig;
}

describe(infoRestrictedWords.validate, () => {
  it('returns null without apple info', () => {
    expect(infoRestrictedWords.validate({ configVersion: 0 } as MetadataConfig)).toBeNull();
  });

  it.each([
    ['Awesome App Beta'],
    ['Try the beta!'],
    ['(beta) release'],
    ['BETA'],
    ['beta-version'],
  ])('reports "beta" as a word in %j', value => {
    const issues = infoRestrictedWords.validate(
      createConfig({ 'en-US': { title: 'App', description: value } })
    );

    expect(issues).toEqual([
      expect.objectContaining({
        id: 'apple.info.restrictedWords',
        path: ['apple', 'info', 'en-US', 'description'],
      }),
    ]);
  });

  it('reports "beta" in keywords', () => {
    const issues = infoRestrictedWords.validate(
      createConfig({ 'en-US': { title: 'App', keywords: ['photo', 'beta'] } })
    );

    expect(issues).toEqual([
      expect.objectContaining({ path: ['apple', 'info', 'en-US', 'keywords'] }),
    ]);
  });

  it.each([
    ['da', 'Betal i appen.'],
    ['nl-NL', 'Betalen met je telefoon'],
    ['no', 'Betale regninger'],
    ['de-DE', 'Betablocker-Rechner'],
  ])('does not report "beta" inside other words for %s', (locale, value) => {
    const issues = infoRestrictedWords.validate(
      createConfig({ [locale]: { title: value, subtitle: value, description: value } })
    );

    expect(issues).toEqual([]);
  });
});
