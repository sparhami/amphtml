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
import {InlineGallery} from './inline-gallery.js';
import {Layout} from '../../../src/layout';
import {
  ResponsiveAttributes,
} from '../../amp-base-carousel/0.1/responsive-attributes';
import {dev} from '../../../src/log';
import {htmlFor} from '../../../src/static-template';
import {toArray} from '../../../src/types';

/**
 * @param {!Element} el The Element to check.
 * @return {boolean} Whether or not the Element is a sizer Element.
 */
function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

export class AmpInlineGallerySlides extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /**
     * @private @const {!Object<string, function(string)>}
     */
    this.attributeConfig_ = {
      'loop': newValue => {
        this.inlineGallery_.updateLoop(this.getLoopValue_(newValue));
      },
      'alignment': newValue => {
        this.inlineGallery_.updateAlignment(this.getAlignmentValue_(newValue));
      },
    };

    /** @private @const */
    this.responsiveAttributes_ = new ResponsiveAttributes(
        this.attributeConfig_);

    /** @private {?InlineGallery} */
    this.inlineGallery_ = null;

    /** @private {!Array<!Element>} */
    this.slides_ = [];
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

    this.inlineGallery_ = new InlineGallery({
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

    // Handle the configuration defaults for all attributes since some may not
    // be specified.
    for (const attrName in this.attributeConfig_) {
      this.attributeMutated_(attrName, '');
    }
    // Handle the initial set of attributes.
    toArray(this.element.attributes).forEach(attr => {
      this.attributeMutated_(attr.name, attr.value);
    });

    this.inlineGallery_.updateSlides(this.slides_);
    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  layoutCallback() {
    this.inlineGallery_.updateUi();
    return Promise.resolve();
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