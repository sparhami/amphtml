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

import {htmlFor} from '../../../src/static-template';
import {Layout} from '../../../src/layout';
import {toArray} from '../../../src/types';

/**
 * @param {!Element} el The Element to check.
 * @return {boolean} Whether or not the Element is a sizer Element.
 */
function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

export class AmpInlineGallerySlide extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.contentSlot_ = null;

    /** @private {?Element} */
    this.captionSlot_ = null;
  }

  /** @override */
  isLayoutSupported() {
    return Layout.FLEX_ITEM;
  }

  /** @override */
  buildCallback() {
    const {element} = this;
    const children = toArray(element.children);
    const slideContent = [];
    const slideCaption = [];

    // Figure out which slot the children go into.
    children.forEach(c => {
      const slot = c.getAttribute('slot');
      if (slot == 'caption') {
        slideCaption.push(c);
      } else if (!isSizer(c)) {
        slideContent.push(c);
      }
    });

    // Create the carousel's inner DOM.
    element.appendChild(this.renderContainerDom_());

    this.contentSlot_ = element.querySelector(
        '.i-amphtml-inline-gallery-slide-content');
    this.captionSlot_ = element.querySelector(
        '.i-amphtml-inline-gallery-slide-caption');
    slideContent.forEach(el => {
      el.classList.add('i-amphtml-inline-gallery-slide-slotted');
      this.contentSlot_.appendChild(el);
    });
    slideCaption.forEach(el => {
      this.captionSlot_.appendChild(el);
    });

    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  /**
   * @return {!Element}
   * @private
   */
  renderContainerDom_() {
    const html = htmlFor(this.element);
    return html`
      <figure class="i-amphtml-inline-gallery-slide-container">
        <div class="i-amphtml-inline-gallery-slide-content"></div>
        <figcaption class="i-amphtml-inline-gallery-slide-caption"></figcaption>
      </figure>
    `;
  }
}
