import type { ImageSourcePropType } from 'react-native';
import type { LanguageCode } from '@/data/ui_text';

function localizedAsset(
  es: ImageSourcePropType,
  en: ImageSourcePropType,
  fr: ImageSourcePropType,
  pt: ImageSourcePropType,
): Record<LanguageCode, ImageSourcePropType> {
  return { es, en, fr, pt };
}

export const LOCALIZED_ASSETS = {
  setupTitle: localizedAsset(
    require('@/assets/localized/setup-title.es.png'), require('@/assets/localized/setup-title.en.png'),
    require('@/assets/localized/setup-title.fr.png'), require('@/assets/localized/setup-title.pt.png'),
  ),
  timeUp: localizedAsset(
    require('@/assets/localized/tiempo.es.png'), require('@/assets/localized/tiempo.en.png'),
    require('@/assets/localized/tiempo.fr.png'), require('@/assets/localized/tiempo.pt.png'),
  ),
  passMobile: localizedAsset(
    require('@/assets/localized/pass-mobile.es.png'), require('@/assets/localized/pass-mobile.en.png'),
    require('@/assets/localized/pass-mobile.fr.png'), require('@/assets/localized/pass-mobile.pt.png'),
  ),
  passPhone: localizedAsset(
    require('@/assets/localized/pass-phone.es.png'), require('@/assets/localized/pass-phone.en.png'),
    require('@/assets/localized/pass-phone.fr.png'), require('@/assets/localized/pass-phone.pt.png'),
  ),
  roundRules: [
    localizedAsset(require('@/assets/localized/round1-rules.es.png'), require('@/assets/localized/round1-rules.en.png'), require('@/assets/localized/round1-rules.fr.png'), require('@/assets/localized/round1-rules.pt.png')),
    localizedAsset(require('@/assets/localized/round2-rules.es.png'), require('@/assets/localized/round2-rules.en.png'), require('@/assets/localized/round2-rules.fr.png'), require('@/assets/localized/round2-rules.pt.png')),
    localizedAsset(require('@/assets/localized/round3-rules.es.png'), require('@/assets/localized/round3-rules.en.png'), require('@/assets/localized/round3-rules.fr.png'), require('@/assets/localized/round3-rules.pt.png')),
  ],
  roundCards: [
    localizedAsset(require('@/assets/localized/card-describelo.es.png'), require('@/assets/localized/card-describelo.en.png'), require('@/assets/localized/card-describelo.fr.png'), require('@/assets/localized/card-describelo.pt.png')),
    localizedAsset(require('@/assets/localized/card-una-palabra.es.png'), require('@/assets/localized/card-una-palabra.en.png'), require('@/assets/localized/card-una-palabra.fr.png'), require('@/assets/localized/card-una-palabra.pt.png')),
    localizedAsset(require('@/assets/localized/card-hazlo.es.png'), require('@/assets/localized/card-hazlo.en.png'), require('@/assets/localized/card-hazlo.fr.png'), require('@/assets/localized/card-hazlo.pt.png')),
  ],
  roundBreakCompleted: [
    localizedAsset(
      require('@/assets/localized/round1-completed.es.png'), require('@/assets/localized/round1-completed.en.png'),
      require('@/assets/localized/round1-completed.fr.png'), require('@/assets/localized/round1-completed.pt.png'),
    ),
    localizedAsset(
      require('@/assets/localized/round2-completed.es.png'), require('@/assets/localized/round2-completed.en.png'),
      require('@/assets/localized/round2-completed.fr.png'), require('@/assets/localized/round2-completed.pt.png'),
    ),
  ],
  roundBreakCards: [
    localizedAsset(
      require('@/assets/localized/round2-card.es.png'), require('@/assets/localized/round2-card.en.png'),
      require('@/assets/localized/round2-card.fr.png'), require('@/assets/localized/round2-card.pt.png'),
    ),
    localizedAsset(
      require('@/assets/localized/round3-card.es.png'), require('@/assets/localized/round3-card.en.png'),
      require('@/assets/localized/round3-card.fr.png'), require('@/assets/localized/round3-card.pt.png'),
    ),
  ],
  deckRepeats: localizedAsset(
    require('@/assets/localized/deck-repeats.es.png'), require('@/assets/localized/deck-repeats.en.png'),
    require('@/assets/localized/deck-repeats.fr.png'), require('@/assets/localized/deck-repeats.pt.png'),
  ),
} as const;
