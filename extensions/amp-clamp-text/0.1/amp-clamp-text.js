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
import {OverflowStyle, clamp} from './clamp.js';
import {devAssert} from '../../../src/log';

export class AmpClampText extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.content_ = null;
  }

  /** @override */
  buildCallback() {
    this.content_ = this.element.ownerDocument.createElement('div');
    this.content_.className = 'i-amphtml-clamp-text-content';

    this.getRealChildNodes().forEach(node => {
      this.content_.appendChild(node);
    });

    this.element.appendChild(this.content_);
    this.applyFillContent(this.content_, /* replacedContent */ true);
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
  isLayoutSupported() {
    return true;
  }

  /**
   * @private
   */
  clamp_() {
    const overflowStyleAttr = this.element.getAttribute('overflow-style');
    const overflowStyle = overflowStyleAttr == 'right' ?
      OverflowStyle.RIGHT : OverflowStyle.INLINE;

    return clamp({
      element: devAssert(this.content_),
      runMutation: cb => this.mutateElement(cb),
      overflowStyle,
      overflowElement: this.content_.querySelector('.amp-clamp-overflow'),
    });
  }
}

AMP.extension('amp-clamp-text', '0.1', AMP => {
  AMP.registerElement('amp-clamp-text', AmpClampText, CSS);
});
