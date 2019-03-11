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

import {Layout} from '../../../src/layout';
import {setImportantStyles, setStyle} from '../../../src/style.js';
import { getDetail } from '../../../src/event-helper';
import { htmlFor } from '../../../src/static-template';

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
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    this.total_ = 0;

    this.shadowRoot_ = null;

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
    this.shadowRoot_ = this.element.attachShadow({mode: 'open'});
    this.shadowRoot_.innerHTML = `
      <style>
        .pagination-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
        }

        .pagination-dot {
          position: relative;
          overflow: hidden;
          margin: 4px;
          background-color: #aaa;
        }

        .pagination-dot-progress {
          position: absolute;
          top: 0;
          background-color: #333;
          transform: scale(calc(1 - var(--percentage-falloff)));
          opacity: calc(1 - var(--percentage-falloff));
        }

        .pagination-dot,
        .pagination-dot-progress {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        :host([inset]) {
          position: absolute !important;
          left: 0;
          right: 0;
          bottom: calc(var(--amp-caption-margin-top) + var(--amp-caption-height, 0));
          display: flex !important;
          justify-content: center;
          margin: 4px;
        }

        :host([inset]) .pagination-dot {
          background-color: #bbb;
          box-shadow: 0 0 3px rgba(0, 0, 0, 0.25),
                      0 1px 1px rgba(0, 0, 0, 0.4);
          mix-blend-mode: hard-light;
        }

        :host([inset]) .pagination-dot-progress {
          background-color: #fff;
        }
      </style>
      <div class="pagination-dots" aria-hidden="true"></div>
    `;
    this.paginationDots_ = this.shadowRoot_.querySelector('.pagination-dots');

    this.element.addEventListener('offsetchange-update', (event) => {
      this.handleIndexChangeUpdate_(event);
    });
  }

  createPaginationDot_() {
    const html = htmlFor(this.element);
    return html`
      <div class="pagination-dot">
        <div class="pagination-dot-progress"></div>
      </div>
    `;
  }

  updateTotal_(total) {
    if (total == this.total_) {
      return;
    }

    this.total_ = total;
    this.paginationDots_.innerHTML = '';
    for (let i = 0; i < total; i++) {
      this.paginationDots_.appendChild(this.createPaginationDot_());
    }
  }

  updateDots_(index, offset) {
    const position = index - offset;

    Array.from(this.paginationDots_.children).forEach((dot, i) => {
      const distance = i - position;
      const percentage = Math.max(1 - Math.abs(distance), 0);
      const percentageFalloff = exponentialFalloff(percentage, -0.5);

      setImportantStyles(dot, {
        '--percentage-falloff': percentageFalloff,
      });
    });
  }

  handleIndexChangeUpdate_(event) {
    const detail = getDetail(event);
    const total = detail['total'];
    const index = detail['index'];
    const offset = detail['offset'];

    this.updateTotal_(total);
    this.updateDots_(index, offset);
  }
}