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
import {htmlFor} from '../../../src/static-template';
import {isLayoutSizeDefined} from '../../../src/layout';

export class AmpClampText extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.content_ = null;

    /** @private {boolean} */
    this.useShadow__ = false;

    /** @private {?MutationObserver} */
    this.mutationObserver_ = null;
  }

  /** @override */
  buildCallback() {
    this.useShadow_ = 'attachShadow' in this.element;

    if (this.useShadow_) {
      this.buildShadow_();
    } else {
      this.build_();
    }

    if ('MutationObserver' in window) {
      this.mutationObserver_ = new MutationObserver(() => {
        this.mutateElement(() => this.clamp_());
      });
    }
  }

  /**
   * Builds the component when not using Shadow DOM.
   */
  build_() {
    this.content_ = this.element.ownerDocument.createElement('div');
    this.content_.className = 'i-amphtml-clamp-text-content';

    this.getRealChildNodes().forEach(node => {
      this.content_.appendChild(node);
    });

    this.element.appendChild(this.content_);
  }

  /**
   * Builds the component when using Shadow DOM.
   */
  buildShadow_() {
    // TODO(sparhami) Where is the right place to put this? Runtime? What about
    // SSR?
    const sizer = this.element.querySelector('i-amphtml-sizer');
    if (sizer) { 
      sizer.setAttribute('slot', 'sizer');
    }

    // TODO(sparhami) Is there a shared place to add logic for creating
    // shadow roots with styles? Might make sense to have it create the style
    // as well as a slot for the sizer.
    const sr = this.element.attachShadow({mode: 'open'});
    const style = document.createElement('style');
    style.textContent = ShadowCSS;
    const html = htmlFor(this.element);
    const content = html`
      <div>
        <div class="i-amphtml-clamp-text-content">
          <slot></slot>
        </div>
        <slot name="sizer"></slot>
      </div>
    `;
    
    sr.appendChild(style)
    sr.appendChild(content);

    this.content_ = sr.querySelector('.i-amphtml-clamp-text-content');
  }

  /** @override */
  layoutCallback() {
    this.clamp_();
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
    // Make sure mutations from clamping do not trigger clamping.
    if (this.mutationObserver_) {
      this.mutationObserver_.disconnect();
    }

    const contents = this.useShadow_ ?
        this.content_.firstElementChild.assignedNodes() :
        [this.content_];
    const overflowElement = this.element.querySelector('.amp-clamp-overflow');

    clampText({
      element: devAssert(this.content_),
      contents,
      overflowElement,
    });

    // Listen to all changes, since they may change layout and require
    // reclamping.
    if (this.mutationObserver_) {
      this.mutationObserver_.observe(this.element, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    }
  }
}

AMP.extension('amp-clamp-text', '0.1', AMP => {
  AMP.registerElement('amp-clamp-text', AmpClampText, CSS);
});
