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

import {CSS} from '../../../build/amp-inline-gallery-slide-0.1.css';
import {Layout} from '../../../src/layout';

export class AmpInlineGallerySlide extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
  }

  /** @override */
  isLayoutSupported() {
    return Layout.FLEX_ITEM;
  }

  /** @override */
  buildCallback() {
    this.shadowRoot_ = this.element.attachShadow({mode: 'open'});
    this.shadowRoot_.innerHTML = `
      <style>${CSS}</style>
      <figure class="container">
        <div class="content">
          <slot></slot>
        </div>
        <figcaption class="caption">
          <slot name="caption"></slot>
        </figcaption>
      </figure>
    `;

    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }
}
