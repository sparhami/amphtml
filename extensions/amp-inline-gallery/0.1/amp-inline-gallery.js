/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {AmpInlineGalleryCaptionsSizer} from './amp-inline-gallery-captions-sizer';
import {AmpInlineGallerySlide} from './amp-inline-gallery-slide';
import {AmpInlineGallerySlides} from './amp-inline-gallery-slides';
import {CSS} from '../../../build/amp-inline-gallery-0.1.css';
import {Layout} from '../../../src/layout';
import {isExperimentOn} from '../../../src/experiments';

/**
 * @param {!Element} el The Element to check.
 * @return {boolean} Whether or not the Element is a sizer Element.
 */
function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

class AmpInlineGallery extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.CONTAINER;
  }
}

AMP.extension('amp-inline-gallery', '0.1', AMP => {
  if (!isExperimentOn(AMP.win, 'amp-inline-gallery')) {
    return;
  }

  AMP.registerElement('amp-inline-gallery', AmpInlineGallery, CSS);
  AMP.registerElement('amp-inline-gallery-slides', AmpInlineGallerySlides);
  AMP.registerElement('amp-inline-gallery-slide', AmpInlineGallerySlide);
  AMP.registerElement('amp-inline-gallery-captions-sizer', AmpInlineGalleryCaptionsSizer);
});
