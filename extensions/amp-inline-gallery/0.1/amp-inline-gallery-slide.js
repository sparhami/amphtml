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
      <style>
        :host {
          /*
           * We do not want the slide to be positioned, so the captions can position
           * relative to the gallery itself.
           */
          position: static !important;
          /*
           * Do not transform the slide, but rather transform just the content.
           */
          transform: none !important;
          will-change: auto !important;
        }
        
        :host(.i-amphtml-layout-size-defined) {
          /*
          * Since the content is translated, it may be outside the area of the
          * slide itself.
          */
          overflow: visible !important;
        }
        
        .container {
          width: 100%;
          height: 100%;
          /* Override default from <figure> */
          margin: 0;
        }
        
        .content {
          display: flex;
          align-items: center;
          justify-content: center;
          /* Subtract out height for the caption */
          height: calc(100% - calc(var(--amp-caption-height, 0px)));
          transform: var(--content-transform, translateZ(1px));
          will-change: transform;
          overflow: hidden;
        }
        
        .caption {
          position: absolute;
          left: 0;
          right: 0;
          margin-top: var(--amp-caption-margin-top);
          height: var(--amp-caption-height, 0);
          overflow: hidden;
          opacity: var(--caption-opacity);
        }
        
        ::slotted {
          width: 100%;
        }
        
        ::slotted > .i-amphtml-replaced-content {
          /*
           * Apply contain object-fit to all replaced content to avoid distorted ratios.
           */
          object-fit: contain;
        }
      </style>
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
