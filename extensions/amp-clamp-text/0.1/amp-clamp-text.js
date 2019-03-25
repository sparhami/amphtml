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

import {CSS} from '../../../build/amp-clamp-text-0.1.css';
import {CSS as ShadowCSS} from '../../../build/amp-clamp-text-shadow-0.1.css';
import {clampText} from './clamp-text';
import {devAssert} from '../../../src/log';
import {isLayoutSizeDefined} from '../../../src/layout';

export class AmpClampText extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.content_ = null;
  }

  /** @override */
  buildCallback() {
    this.useShadow_ = 'attachShadow' in this.element;

    if (this.useShadow_) {
      this.buildShadow_();
    } else {
      this.build_();
    }
  }

  build_() {
    this.content_ = this.element.ownerDocument.createElement('div');
    this.content_.className = 'i-amphtml-clamp-text-content';

    this.getRealChildNodes().forEach(node => {
      this.content_.appendChild(node);
    });

    this.element.appendChild(this.content_);
  }

  buildShadow_() {
    const sizer = this.element.querySelector('i-amphtml-sizer');
    if (sizer) { 
      sizer.setAttribute('slot', 'sizer');
    }

    const sr = this.element.attachShadow({mode: 'open'});
    sr.innerHTML = `
      <style>${ShadowCSS}</style>
      <div class="i-amphtml-clamp-text-content">
        <slot></slot>
      </div>
      <slot name="sizer"></slot>
    `;

    this.content_ = sr.querySelector('.i-amphtml-clamp-text-content');
  }

  /** @override */
  layoutCallback() {
    return this.clamp_();
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /**
   * @private
   */
  clamp_() {
    const contents = this.useShadow_ ?
        this.content_.firstElementChild.assignedNodes() :
        [this.content_];
    const overflowElement = this.element.querySelector('.amp-clamp-overflow');

    return clampText({
      element: devAssert(this.content_),
      contents,
      overflowElement,
    });
  }
}

AMP.extension('amp-clamp-text', '0.1', AMP => {
  AMP.registerElement('amp-clamp-text', AmpClampText, CSS);
});
