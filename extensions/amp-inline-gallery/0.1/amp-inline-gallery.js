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
import {Layout} from '../../../src/layout';
import {
  ResponsiveAttributes,
} from '../../amp-base-carousel/0.1/responsive-attributes';
import {dev} from '../../../src/log';
import {htmlFor} from '../../../src/static-template';
import {isExperimentOn} from '../../../src/experiments';
import {setImportantStyles} from '../../../src/style.js';
import {toArray} from '../../../src/types';

/**
 * @param {!Element} el The Element to check.
 * @return {boolean} Whether or not the Element is a sizer Element.
 */
function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

/**
 * Returns a number falling off from one to zero, based on a distance
 * progress percentage and a power to decay at.
 * @param {number} percentage
 * @param {number} power
 */
function exponentialFalloff(percentage, power) {
  return Math.max(0, 1 - (1 / Math.pow(percentage, power)));
}

class AmpInlineGallery extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /**
     * @private @const {!Object<string, function(string)>}
     */
    this.attributeConfig_ = {
      'loop': newValue => {
        this.carousel_.updateLoop(this.getLoop_(newValue));
      },
      'slide-peek': newValue => {
        this.carousel_.updateVisibleCount(this.getVisibleCount_(newValue));
      },
      'alignment': newValue => {
        this.carousel_.updateAlignment(this.getAlignment_(newValue));
      },
    };

    /** @private @const */
    this.responsiveAttributes_ = new ResponsiveAttributes(
        this.attributeConfig_);

    /** @private {?Carousel} */
    this.carousel_ = null;

    /** @private {!Array<!Element>} */
    this.slides_ = [];
  }

  /**
   * Gets the loop value, defaulting to `true`.
   * @param {?string} loop
   * @return {boolean}
   */
  getLoop_(loop) {
    return loop != 'false';
  }

  /**
   * Gets the visible count, defaulting to `1`.
   * @param {?string} slidePeek
   * @return {number}
   */
  getVisibleCount_(slidePeek) {
    return 1 + (Number(slidePeek) || 0);
  }

  /**
   * Gets the alignment, defaulting to `'center'`.
   * @param {?string} alignment
   * @return {string}
   */
  getAlignment_(alignment) {
    return alignment == 'start' ? 'start' : 'center';
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.RESPONSIVE;
  }

  /** @override */
  buildCallback() {
    const {element, win} = this;
    const children = toArray(element.children);

    // Figure out which slot the children go into.
    children.forEach(c => {
      const slot = c.getAttribute('slot');
      if (!isSizer(c) && !slot) {
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

    // Do manual 'slot' distribution.
    this.slides_.forEach(slide => {
      slide.classList.add('i-amphtml-carousel-slotted');
      scrollContainer.appendChild(slide);
    });

    // Handle the configuration defaults.
    for (const attrName in this.attributeConfig_) {
      this.attributeMutated_(attrName, '');
    }
    // Handle the initial set of attributes.
    toArray(this.element.attributes).forEach(attr => {
      this.attributeMutated_(attr.name, attr.value);
    });

    this.element.addEventListener('scroll', event => {
      this.handleScroll_(event);
    }, true);

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
   * TODO(sparhami) Move to a separate file.
   */
  handleScroll_() {
    let galleryRect;
    let contentRects;

    this.measureElement(() => {
      galleryRect = this.element.getBoundingClientRect();
      contentRects = this.slides_
          .map(slide => {
            const slideContent = slide.querySelector(
                '.i-amphtml-inline-gallery-slide-content');
            return slideContent || slide;
          })
          .map(el => el.getBoundingClientRect());
    });

    this.mutateElement(() => {
      const {left, width} = galleryRect;

      this.slides_.forEach((slide, i) => {
        const {left: slideLeft} = contentRects[i];
        const distancePercentage = Math.abs(left - slideLeft) / (width / 2);
        const opacity = exponentialFalloff(distancePercentage, -3);

        setImportantStyles(slide, {
          '--caption-opacity': opacity,
          'pointer-events': opacity == 0 ? 'none' : 'all',
        });
      });
    });
  }

  /**
   * @return {!Element}
   * @private
   */
  renderContainerDom_() {
    const html = htmlFor(this.element);
    return html`
      <div class="i-amphtml-carousel-content">
        <div class="i-amphtml-carousel-scroll"></div>
        <div class="i-amphtml-carousel-arrow-next-slot"></div>
        <div class="i-amphtml-carousel-arrow-prev-slot"></div>
      </div>
    `;
  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    for (const key in mutations) {
      // Stringify since the attribute logic deals with strings and amp-bind
      // may not (e.g. value could be a Number).
      this.attributeMutated_(key, String(mutations[key]));
    }
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
