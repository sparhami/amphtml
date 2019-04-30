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
  Axis,
  getDimension,
  getReferencePoint,
} from '../../amp-base-carousel/0.1/dimensions';
import {Carousel} from '../../amp-base-carousel/0.1/carousel';
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
    // The carousel is always in 'mixed length' mode; we control the slide
    // widths via CSS.
    this.carousel_.updateMixedLength(true);

    /** @private @const */
    this.element_ = element;

    /** @private @const */
    this.runMutate_ = runMutate;

    /** @private {!Alignment} */
    this.alignment_ = Alignment.CENTER;

    /** @private {!Axis} */
    this.axis_ = Axis.X;

    /** @private {!Array<!Element>} */
    this.slides_ = [];

    this.element_.addEventListener('scroll', () => {
      this.handleScroll_();
    }, true);
  }

  /**
   * @param {!Alignment} alignment How the gallery should align slides.
   */
  updateAlignment(alignment) {
    this.alignment_ = alignment;
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
    this.slides_ = slides;
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

  /**
   * Handles a scroll, updating the opacity of captions.
   */
  handleScroll_() {
    this.updateSlideOpacities_();
  }

  /**
   * @param {!Element} slide The slide to get the content for.
   * @return {!Element} The content for the slide, or the slide itself.
   */
  getSlideContent_(slide) {
    return slide.querySelector('.i-amphtml-inline-gallery-slide-content') ||
        slide;
  }

  /**
   * Updates the opacities of the captions, based on their distance from the
   * current slide.
   */
  updateSlideOpacities_() {
    const {
      alignment_,
      axis_,
      element_,
      slides_,
    } = this;
    const galleryLength = getDimension(axis_, element_).length;
    const galleryReferencePoint = getReferencePoint(axis_, alignment_, element_);
    const contentReferencePoints = slides_
        .map(slide => this.getSlideContent_(slide))
        .map(el => getReferencePoint(axis_, alignment_, el));

    this.runMutate_(() => {
      slides_.forEach((slide, i) => {
        const slideReferencePoint = contentReferencePoints[i];
        const distancePercentage =
            Math.abs(galleryReferencePoint - slideReferencePoint) /
            (galleryLength / 2);
        const opacity = exponentialFalloff(distancePercentage, -3);

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
