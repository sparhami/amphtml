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

import {CSS} from '../../../build/amp-inline-gallery-pagination-0.1.css';
import {Layout} from '../../../src/layout';
import {computedStyle, setImportantStyles} from '../../../src/style.js';
import {createCustomEvent, getDetail} from '../../../src/event-helper';
import {dict} from '../../../src/utils/object';
import {htmlFor} from '../../../src/static-template';

/**
 * Returns a number falling off from one to zero, based on a distance
 * progress percentage and a power to decay at.
 * @param {number} percentage
 * @param {number} power
 */
function exponentialFalloff(percentage, power) {
  return Math.max(0, 1 - (1 / Math.pow(percentage, power)));
}

export class AmpInlineGalleryPagination extends AMP.BaseElement {
  /**
   * @return {!ShadowRoot}
   * @private
   */
  createShadowRoot_() {
    const sr = this.element.attachShadow({mode: 'open'});
    sr.innerHTML = `
      <style>${CSS}</style>
      <div class="pagination-dots" aria-hidden="true"></div>
      <div class="pagination-numbers">
        <span class="pagination-index"></span>
        /
        <span class="pagination-total"></span>
      </div>
    `;
    return sr;
  }

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    this.total_ = 0;

    this.useDots_ = null;

    this.paginationDots_ = null;
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.FIXED_HEIGHT;
  }

  /** @override */
  buildCallback() {
    const sr = this.createShadowRoot_();
    this.paginationDots_ = sr.querySelector('.pagination-dots');
    this.paginationNumbersEl_ = sr.querySelector('.pagination-numbers');
    this.paginationIndexEl_ = sr.querySelector('.pagination-index');
    this.paginationTotalEl_ = sr.querySelector('.pagination-total');

    this.element.addEventListener('offsetchange-update', event => {
      this.handleIndexChangeUpdate_(event);
    });
  }

  layoutCallback() {
    this.updateTotal_(this.total_, true);
  }

  createPaginationDot_(index) {
    const html = htmlFor(this.element);
    const content = html`
      <div class="pagination-dot-container">
        <div class="pagination-dot">
          <div class="pagination-dot-progress"></div>
        </div>
      </div>
    `;

    content.onclick = () => {
      const event = createCustomEvent(this.win, 'goToSlide', dict({
        'index': index,
      }), {
        bubbles: true,
      });
      this.element.dispatchEvent(event);
    };

    return content;
  }

  updateTotal_(total, force = false) {
    if (total == this.total_ && !force) {
      return;
    }

    const style = computedStyle(this.win, this.element);
    const maxWidthPercentage = Number.parseFloat(
        style.getPropertyValue('--amp-igp-max-dots-width-percentage'));
    const dotWidth = Number.parseFloat(
        style.getPropertyValue('--amp-igp-dot-width'));
    const dotMinSpacing = Number.parseFloat(
        style.getPropertyValue('--amp-igp-dot-min-spacing'));
    const dotWidthTotal = total * dotWidth;
    const dotSpacingTotal = (total + 1) * dotMinSpacing;
    const {width} = this.getLayoutBox();
    const useDots = width * maxWidthPercentage > dotWidthTotal + dotSpacingTotal;
    const dotCount = useDots ? total : 0;

    if (total == this.total_ && useDots == this.useDots_) {
      return;
    }

    this.total_ = total;
    this.useDots_ = useDots;

    this.mutateElement(() => {
      this.paginationDots_.hidden = !useDots;
      this.paginationNumbersEl_.hidden = useDots;
      this.paginationTotalEl_.textContent = total;
      this.createDots_(dotCount);
    });
  }

  createDots_(dotCount) {
    this.paginationDots_.innerHTML = '';
    for (let i = 0; i < dotCount; i++) {
      this.paginationDots_.appendChild(this.createPaginationDot_(i));
    }
  }

  updateDots_(index, offset) {
    const position = index - offset;
    const allDots = Array.from(this.paginationDots_.children);

    allDots.forEach((dot, i) => {
      const distance = i - position;
      const percentage = Math.max(1 - Math.abs(distance), 0);
      const percentageFalloff = exponentialFalloff(percentage, -0.5);

      setImportantStyles(dot, {
        '--percentage-falloff': percentageFalloff,
      });
    });
  }

  updateIndex_(index) {
    this.paginationIndexEl_.textContent = index + 1;
  }

  handleIndexChangeUpdate_(event) {
    const detail = getDetail(event);
    const total = detail['total'];
    const index = detail['index'];
    const offset = detail['offset'];

    this.updateTotal_(total);

    this.mutateElement(() => {
      if (this.useDots_) {
        this.updateDots_(index, offset);
      } else {
        this.updateIndex_(index);
      }
    });
  }
}
