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

import {getDetail} from '../../../src/event-helper';
import {htmlFor} from '../../../src/static-template';
import {isLayoutSizeDefined} from '../../../src/layout';
import {toArray} from '../../../src/types';
import {setStyle} from '../../../src/style';

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
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
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

    this.contentSlot_ = element.querySelector('.i-amphtml-inline-gallery-slide-content');
    this.captionSlot_ = element.querySelector('.i-amphtml-inline-gallery-slide-caption');
    slideContent.forEach(el => {
      el.classList.add('i-amphtml-inline-gallery-slide-slotted');
      this.contentSlot_.appendChild(el);
    });
    slideCaption.forEach(el => {
      this.captionSlot_.appendChild(el);
    });

    element.addEventListener('update-content-transform', (event) => {
      this.updateContentTransform_(event);
    });

    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  updateContentTransform_(event) {
    const detail = getDetail(event);
    const x = detail['x'];
    const y = detail['y'];
    setStyle(this.contentSlot_, 'transform', `translate(${x}px, ${y}px)`);
  }

  /**
   * @return {!Element}
   * @private
   */
  renderContainerDom_() {
    const html = htmlFor(this.element);
    return html`
      <div class="i-amphtml-inline-gallery-slide-container">
        <div class="i-amphtml-inline-gallery-slide-content"></div>
        <div class="i-amphtml-inline-gallery-slide-caption"></div>
      </div>
    `;
  }
}
