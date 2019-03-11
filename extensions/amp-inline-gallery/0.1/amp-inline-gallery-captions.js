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
import {getDetail} from "../../../src/event-helper";
import {setImportantStyles} from '../../../src/style.js';

/**
 * Returns a number falling off from one to zero, based on a distance
 * progress percentage and a power to decay at.
 * @param {number} percentage
 * @param {number} power
 */
function exponentialFalloff(percentage, power) {
  return Math.max(0, 1 - (1 / Math.pow(percentage, power)));
}

export class AmpInlineGalleryCaptions extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.CONTAINER;
  }

  /** @override */
  buildCallback() {
    this.shadowRoot_ = this.element.attachShadow({mode: 'open'});
    this.shadowRoot_.innerHTML = `
      <style>
        :host {
          pointer-events: none;
          padding-top: var(--amp-caption-margin-top);
          margin-top: calc(-1 * var(--amp-caption-height, 0));
        }
      </style>
    `;

    this.element.addEventListener('offsetchange-update', (event) => {
      this.handleIndexChangeUpdate_(event);
    });
  }

  /** @override */
  layoutCallback() {
    const {height} = this.getLayoutBox();

    setImportantStyles(this.element.parentNode, {
      '--amp-caption-height': `${height}px`
    });
  }

  handleIndexChangeUpdate_(event) {
    const data = getDetail(event);
    const index = data['index'];
    const offset = data['offset'];
    const slides = data['slides'];
    const position = index + offset;

    this.updateCaptionOpacities_(slides, position);
  }

  /**
   * Updates the opacities of the captions, based on their distance from the
   * current slide.
   */
  updateCaptionOpacities_(slides, position) {
    this.mutateElement(() => {
      slides.forEach((slide, i) => {
        const indexDistance = Math.abs(position - i);
        const opacity = exponentialFalloff(2 * indexDistance, -3);
        setImportantStyles(slide, {
          '--caption-opacity': opacity,
          // Need to prevent pointer events on all other slide's captions so
          // that the user can select the caption text, click on links, etc.
          'pointer-events': opacity == 0 ? 'none' : 'all',
        });
      });
    });
  }
}