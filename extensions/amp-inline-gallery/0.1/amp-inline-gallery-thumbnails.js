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

import {Alignment, scrollContainerToElement, Axis} from '../../amp-base-carousel/0.1/dimensions';
import {CSS} from '../../../build/amp-inline-gallery-thumbnails-0.1.css';
import {Carousel} from '../../amp-base-carousel/0.1/carousel';
import {createCustomEvent, getDetail} from '../../../src/event-helper';
import {dev} from '../../../src/log';
import {dict} from '../../../src/utils/object';
import {htmlFor} from '../../../src/static-template';

/**
 * @param {!Element} el The Element to check.
 * @return {boolean} Whether or not the Element is a sizer Element.
 */
function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

export class AmpInlineGalleryThumbnails extends AMP.BaseElement {
  /**
   * @return {!ShadowRoot}
   * @private
   */
  createShadowRoot_() {
    const sr = this.element.attachShadow({mode: 'open'});
    sr.innerHTML = `
      <style>${CSS}</style>
      <slot name="sizer"></slot>
      <div class="i-amphtml-carousel-content" aria-hidden="true">
        <div class="i-amphtml-carousel-scroll">
        </div>
      </div>
    `;
    return sr;
  }

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    this.slides_ = null;

    this.thumbnails_ = null;

    this.thumbnailsContainer_ = null;

    this.carousel_ = null;
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  isLayoutSupported(layout) {
    return true;
  }

  /** @override */
  buildCallback() {
    Array.from(this.element.children).forEach(c => {
      if (isSizer(c)) {
        c.setAttribute('slot', 'sizer');
      }
    });

    const sr = this.createShadowRoot_();
    this.thumbnailsContainer_ = dev().assertElement(
        sr.querySelector('.i-amphtml-carousel-scroll'));

    this.carousel_ = new Carousel({
      win: this.win,
      element: this.element,
      scrollContainer: this.thumbnailsContainer_,
      initialIndex: 0,
      runMutate: cb => this.mutateElement(cb),
    });
    this.carousel_.updateAlignment(Alignment.CENTER);
    this.carousel_.updateLoop(true);
    this.carousel_.updateMixedLength(true);
    this.carousel_.updateSnap(false);

    this.thumbWidth = this.element.getAttribute('thumbnail-aspect-ratio-width') || 1;
    this.thumbHeight = this.element.getAttribute('thumbnail-aspect-ratio-height') || 1;

    this.element.addEventListener('offsetchange-update', (event) => {
      this.handleOffsetChangeUpdate_(event);
    });
    this.element.addEventListener('offsetchange', event => {
      event.stopPropagation();
    });
    this.element.addEventListener('indexchange', event => {
      event.stopPropagation();
    });
  }

  createThumbnailForElement_(element, index) {
    const sizerSrc = `data:image/svg+xml;utf8,<svg height="${this.thumbHeight}px" width="${this.thumbWidth}px" xmlns="http://www.w3.org/2000/svg"></svg>`;
    const html = htmlFor(this.element);
    const content = html `
      <div class="thumbnail-container">
        <div class="thumbnail">
          <img class="resizer"></img>
        </div>
      </div>
    `;

    content.querySelector('.resizer').src = sizerSrc;
    content.querySelector('.thumbnail').appendChild(element);
    content.onclick = () => {
      const event = createCustomEvent(this.win, 'goToSlide', dict({
        'index': index
      }), {
        bubbles: true,
      });
      this.element.dispatchEvent(event);
      this.carousel_.goToSlide(index);
    };
    return content;
  }

  createDefaultThumbnail_() {
    const html = htmlFor(this.element);
    return html `
      <div class="default-thumbnail-content"></div>
    `
  }

  getThumbnailContent_(slide) {
    const ampImg = slide.tagName == 'AMP-IMG' ? slide :
        slide.querySelector(':scope > amp-img');
    
    if (!ampImg) {
      return this.createDefaultThumbnail_();
    }
    
    const img = new Image();
    img.className = 'thumbnail-img';
    img.src = ampImg.getAttribute('src');
    img.srcset = ampImg.getAttribute('srcset') || '';
    img.sizes = ampImg.getAttribute('sizes') || '';

    return img;
  }

  createThumbnail_(slide, index) {
    return this.createThumbnailForElement_(
        this.getThumbnailContent_(slide), index);
  }

  updateSlides_(slides) {
    if (slides == this.slides_) {
      return;
    }

    this.slides_ = slides;
    this.thumbnails_ = this.slides_.map((s, i) => this.createThumbnail_(s, i));
    this.mutateElement(() => {
      this.thumbnailsContainer_.innerHTML = '';
      this.thumbnails_.forEach(t => this.thumbnailsContainer_.appendChild(t));
      this.carousel_.updateSlides(this.thumbnails_);
    });
  }

  updateOffset_(index, offset) {
    const thumbnail = this.thumbnails_[index];

    scrollContainerToElement(
      Axis.X,
      Alignment.CENTER,
      this.thumbnailsContainer_,
      thumbnail,
      offset
    );
  }

  handleOffsetChangeUpdate_(event) {
    const detail = getDetail(event);
    const index = detail['index'];
    const slides = detail['slides'];
    const offset = detail['offset'];

    this.updateSlides_(slides);
    this.updateOffset_(index, offset);
  }
}