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
} as const;
