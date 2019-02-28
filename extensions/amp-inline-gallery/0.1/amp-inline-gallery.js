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

import {AmpInlineGallerySlide} from './amp-inline-gallery-slide.js';
import {CSS} from '../../../build/amp-inline-gallery-0.1.css';
import {Carousel} from '../../amp-base-carousel/0.1/carousel.js';
import {
  ResponsiveAttributes,
} from '../../amp-base-carousel/0.1/responsive-attributes';
import {dev} from '../../../src/log';
import {getDetail} from '../../../src/event-helper';
import {htmlFor} from '../../../src/static-template';
import {isExperimentOn} from '../../../src/experiments';
import {isLayoutSizeDefined} from '../../../src/layout';
import {toArray} from '../../../src/types';

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

    /** @private {?Carousel} */
    this.carousel_ = null;

    /** @private {!Array<!Element>} */
    this.slides_ = [];

    /** @private @const */
    this.responsiveAttributes_ = new ResponsiveAttributes({
      'loop': newValue => {
        this.carousel_.setLoop(newValue == 'true');
      },
    });
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  buildCallback() {
    const {element, win} = this;
    const children = toArray(element.children);
    let sizer;

    // Figure out which slot the children go into.
    children.forEach(c => {
      const slot = c.getAttribute('slot');
      if (isSizer(c)) {
        sizer = c;
      } else if (!slot) {
        this.slides_.push(c);
      }
    });
    // Create the carousel's inner DOM.
    element.appendChild(this.renderContainerDom_());

    const scrollContainer = dev().assertElement(
        this.element.querySelector('.i-amphtml-carousel-scroll'));

    this.carousel_ = new Carousel({
      win,
      element,
      scrollContainer,
      initialIndex: 0,
      runMutate: cb => this.mutateElement(cb),
    });

    // Do some manual "slot" distribution
    if(sizer) {
      const carouselContent = this.element.querySelector(
        '.i-amphtml-carousel-container');
      carouselContent.appendChild(sizer);
    }
    this.slides_.forEach(slide => {
      slide.classList.add('i-amphtml-carousel-slotted');
      scrollContainer.appendChild(slide);
    });

    // Handle the initial set of attributes
    toArray(this.element.attributes).forEach(attr => {
      this.attributeMutated_(attr.name, attr.value);
    });
    this.carousel_.updateVisibleCount(1.2);
    this.carousel_.updateAlignment('center');
    this.carousel_.updateLoop(true);

    this.element.addEventListener('indexchange', event => {
      this.onIndexChanged_(event);
    });

    this.carousel_.updateSlides(this.slides_);
    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  layoutCallback() {
    this.carousel_.updateUi();
    return Promise.resolve();
  }
  /**
   * @private
   * @param {!Event} event
   */
  onIndexChanged_(event) {
    const detail = getDetail(event);
    const index = detail['index'];
    // TODO(sparhami) update the pagination indicator
  }

  /**
   * @return {!Element}
   * @private
   */
  renderContainerDom_() {
    const html = htmlFor(this.element);
    return html`
      <div>
        <div class="i-amphtml-carousel-container">
          <div class="i-amphtml-carousel-content">
            <div class="i-amphtml-carousel-scroll"></div>
          </div>
        </div>
        <div class="i-amphtml-carousel-arrow-next-slot"></div>
        <div class="i-amphtml-carousel-arrow-prev-slot"></div>
      </div>
    `;
  }

  /** @override */
  mutatedAttributesCallback(mutations) {

  }

  /**
   * @param {string} name The name of the attribute.
   * @param {string} newValue The new value of the attribute.
   * @private
   */
  attributeMutated_(name, newValue) {
    this.responsiveAttributes_.updateAttribute(name, newValue);
  }
}

AMP.extension('amp-inline-gallery', '0.1', AMP => {
  if (!isExperimentOn(AMP.win, 'amp-inline-gallery')) {
    return;
  }

  AMP.registerElement('amp-inline-gallery', AmpInlineGallery, CSS);
  AMP.registerElement('amp-inline-gallery-slide', AmpInlineGallerySlide);
});
