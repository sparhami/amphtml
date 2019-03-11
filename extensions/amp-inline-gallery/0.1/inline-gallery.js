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

import {
  Alignment,
} from "../../amp-base-carousel/0.1/dimensions";
import {Carousel} from "../../amp-base-carousel/0.1/carousel";

export class InlineGallery {
  /**
   * @param {{
   *   win: !Window,
   *   element: !Element,
   *   scrollContainer: !Element,
   *   initialIndex: (number|undefined),
   *   runMutate: function(function()),
   * }} config
   */
  constructor({
    win,
    element,
    scrollContainer,
    initialIndex,
    runMutate,
  }) {
    /** @private @const */
    this.carousel_ = new Carousel({
      win,
      element,
      scrollContainer,
      initialIndex,
      runMutate,
    });
  }

  /**
   * @param {!Alignment} alignment How the gallery should align slides.
   */
  updateAlignment(alignment) {
    this.carousel_.updateAlignment(alignment);
  }

  /**
   * @param {boolean} loop Whether or not the gallery should loop.
   */
  updateLoop(loop) {
    this.carousel_.updateLoop(loop);
  }

  /**
   * Lets the gallery know that the slides have changed. This is needed for
   * various internal calculations.
   * @param {!Array<!Element>} slides
   */
  updateSlides(slides) {
    this.carousel_.updateSlides(slides);
  }

  /**
   * Updates the UI of the gallery. Since screen rotation can change scroll
   * position, this should be called to restore the scroll position (i.e. which
   * slide is at the start / center of the scrollable, depending on alignment).
   */
  updateUi() {
    this.carousel_.updateUi();
  }
 }