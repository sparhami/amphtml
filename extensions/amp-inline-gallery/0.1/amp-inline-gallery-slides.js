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

import {CSS} from '../../../build/amp-inline-gallery-slides-0.1.css';
import {Carousel} from '../../amp-base-carousel/0.1/carousel';
import {CSS as CarouselCSS} from '../../../build/carousel-0.1.css';
import {Layout} from '../../../src/layout';
import {
  ResponsiveAttributes,
} from '../../amp-base-carousel/0.1/responsive-attributes';
import {dev} from '../../../src/log';
import {getDetail} from '../../../src/event-helper';
import {toArray} from '../../../src/types';

/**
 * @param {!Element} el The Element to check.
 * @return {boolean} Whether or not the Element is a sizer Element.
 */
function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

export class AmpInlineGallerySlides extends AMP.BaseElement {
  /**
   * @return {!ShadowRoot}
   * @private
   */
  createShadowRoot_() {
    const sr = this.element.attachShadow({mode: 'open'});
    sr.innerHTML = `
      <style>${CarouselCSS + CSS}</style>
      <slot name="sizer"></slot>
      <div class="i-amphtml-carousel-content">
        <div class="i-amphtml-carousel-scroll">
          <slot></slot>
        </div>
      </div>
    `;
    return sr;
  }

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /**
     * @private @const {!Object<string, function(string)>}
     */
    this.attributeConfig_ = {
      'loop': newValue => {
        this.carousel_.updateLoop(this.getLoopValue_(newValue));
      },
      'alignment': newValue => {
        this.carousel_.updateAlignment(this.getAlignmentValue_(newValue));
      },
    };

    /** @private @const */
    this.responsiveAttributes_ = new ResponsiveAttributes(
        this.attributeConfig_);

    /** @private {?Carousel} */
    this.carousel_ = null;
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.RESPONSIVE;
  }

  /** @override */
  buildCallback() {
    Array.from(this.element.children).forEach(c => {
      if (isSizer(c)) {
        c.setAttribute('slot', 'sizer');
      }
    });

    const sr = this.createShadowRoot_();
    const scrollContainer = dev().assertElement(
        sr.querySelector('.i-amphtml-carousel-scroll'));
    const slideSlot = scrollContainer.firstElementChild;

    this.carousel_ = new Carousel({
      win: this.win,
      element: this.element,
      slideContentSelector: ':scope > :not([slot])',
      scrollContainer,
      initialIndex: 0,
      runMutate: cb => this.mutateElement(cb),
    });

    this.configureInitialAttributes_();
    this.configureSlides_(slideSlot);
    this.element.addEventListener('goToSlide', event => {
      const detail = getDetail(event);
      this.carousel_.goToSlide(detail['index']);
    });

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

  /** @override */
  mutatedAttributesCallback(mutations) {
    for (const key in mutations) {
      // Stringify since the attribute logic deals with strings and amp-bind
      // may not (e.g. value could be a Number).
      this.attributeMutated_(key, String(mutations[key]));
    }
  }

  /**
   * Gets the loop value, defaulting to `true`.
   * @param {?string} loop
   * @return {boolean}
   */
  getLoopValue_(loop) {
    return loop != 'false';
  }

  /**
   * Gets the alignment, defaulting to `'center'`.
   * @param {?string} alignment
   * @return {string}
   */
  getAlignmentValue_(alignment) {
    return alignment == 'start' ? 'start' : 'center';
  }

  /**
   * @private
   */
  configureInitialAttributes_() {
    // Handle the configuration defaults for all attributes since some may not
    // be specified.
    for (const attrName in this.attributeConfig_) {
      this.attributeMutated_(attrName, '');
    }
    // Handle the initial set of attributes.
    toArray(this.element.attributes).forEach(attr => {
      this.attributeMutated_(attr.name, attr.value);
    });
  }

  /**
   * @param {!Element} slidesSlot
   */
  configureSlides_(slidesSlot) {
    const updateSlides = () => {
      const slides = Array.from(slidesSlot.assignedNodes()).filter(n => {
        return n.nodeType == 1; // Elements only
      });
      this.carousel_.updateSlides(slides);
    };

    slidesSlot.addEventListener('slotchange', updateSlides);
    // Not all browsers fire slotchange immediately.
    updateSlides();
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
