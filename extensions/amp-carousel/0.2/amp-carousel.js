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

import {} from '../../../src/experiments';
import {ActionSource} from '../../amp-base-carousel/0.1/action-source';
import {ActionTrust} from '../../../src/action-constants';
import {CSS} from '../../../build/amp-carousel-0.2.css';
import {Carousel} from '../../amp-base-carousel/0.1/carousel.js';
import {Services} from '../../../src/services';
import {closestAncestorElementBySelector} from '../../../src/dom';
import {computedStyle} from '../../../src/style';
import {createCustomEvent, getDetail} from '../../../src/event-helper';
import {dev} from '../../../src/log';
import {dict} from '../../../src/utils/object';
import {htmlFor} from '../../../src/static-template';
import {isLayoutSizeDefined} from '../../../src/layout';

/**
 * @enum {string}
 */
const CarouselType = {
  CAROUSEL: 'carousel',
  SLIDES: 'slides',
};

class AmpCarousel extends AMP.BaseElement {
  /**
   * @private
   */
  setupActions_() {
    this.registerAction(
      'goToSlide',
      ({args, trust}) => {
        this.carousel_.goToSlide(args['index'] || 0, {
          actionSource: this.getActionSource_(trust),
        });
      },
      ActionTrust.LOW
    );
    this.registerAction(
      'toggleAutoplay',
      ({args = {}}) => {
        this.toggleAutoplay_(args['toggleOn']);
      },
      ActionTrust.LOW
    );
  }

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Carousel} */
    this.carousel_ = null;

    /** @private {?Element} */
    this.scrollContainer_ = null;

    /** @private {!Array<!Element>} */
    this.slides_ = [];

    /** @private {string} */
    this.type_ = 'carousel';

    /** @private {boolean} */
    this.autoplay_ = false;

    /** @private {?Element} */
    this.nextButton_ = null;

    /** @private {?Element} */
    this.prevButton_ = null;

    /**
     * Whether or not the user has interacted with the carousel using touch in
     * the past at any point.
     * @private {boolean}
     */
    this.hadTouch_ = false;

    /** @private {?../../../src/service/action-impl.ActionService} */
    this.action_ = null;
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  buildCallback() {
    this.action_ = Services.actionServiceForDoc(this.element);

    const {element, win} = this;
    const slides = this.getRealChildren();

    element.appendChild(this.renderContainerDom_());
    this.scrollContainer_ = this.element.querySelector(
      '.i-amphtml-carousel-scroll'
    );
    this.prevButton_ = this.element.querySelector('.amp-carousel-button-prev');
    this.nextButton_ = this.element.querySelector('.amp-carousel-button-next');

    this.carousel_ = new Carousel({
      win,
      element,
      scrollContainer: dev().assertElement(this.scrollContainer_),
      initialIndex: Number(this.element.getAttribute('slide')),
      runMutate: cb => this.mutateElement(cb),
    });
    this.configureCarousel_();

    // Do some manual "slot" distribution
    this.slides_ = slides.map(slide => {
      const wrapper = document.createElement('div');
      wrapper.className =
        'i-amphtml-carousel-slotted i-amphtml-carousel-slide-item';
      wrapper.appendChild(slide);
      slide.classList.add('i-amphtml-carousel-slide');
      this.scrollContainer_.appendChild(wrapper);
      return wrapper;
    });

    // Setup actions and listeners
    this.setupActions_();
    this.element.addEventListener('indexchange', event => {
      this.onIndexChanged_(event);
    });
    this.prevButton_.addEventListener('click', () => this.prev());
    this.nextButton_.addEventListener('click', () => this.next());

    this.carousel_.updateSlides(this.slides_);
    this.updateUi_();
    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  layoutCallback() {
    // TODO(sparhami) #19259 Tracks a more generic way to do this. Remove once
    // we have something better.
    const isScaled = closestAncestorElementBySelector(
      this.element,
      '[i-amphtml-scale-animation]'
    );
    if (isScaled) {
      return Promise.resolve();
    }

    this.carousel_.updateUi();
    return Promise.resolve();
  }

  /** @override */
  pauseCallback() {
    this.carousel_.pauseAutoAdvance();
  }

  /** @override */
  resumeCallback() {
    this.carousel_.resumeAutoAdvance();
  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    if (mutations['slide']) {
      this.carousel_.goToSlide(Number(mutations['slide']));
    }
  }

  /**
   * Moves the Carousel to a given index.
   * @param {number} index
   */
  goToSlide(index) {
    this.carousel_.goToSlide(index, {smoothScroll: false});
  }

  /**
   * Goes to the next slide. This should be called from a user interaction.
   */
  interactionNext() {
    this.carousel_.next(ActionSource.GENERIC_HIGH_TRUST);
  }

  /**
   * Goes to the previous slide. This should be called from a user interaction.
   */
  interactionPrev() {
    this.carousel_.prev(ActionSource.GENERIC_HIGH_TRUST);
  }

  /**
   * Performs the next action (e.g. for a click from the next button). For a
   * carousel, this moves one carousel viewport forwards. For slides, this
   * moves to the next slide. The direction moved depends on the directionality
   * of the component.
   */
  next() {
    if (this.type_ == CarouselType.CAROUSEL) {
      this.moveScrollOneViewport_(true);
      return;
    }

    this.carousel_.next(ActionSource.GENERIC_HIGH_TRUST);
  }

  /**
   * Performs the prev action (e.g. for a click from the prev button). For a
   * carousel, this moves one carousel viewport backwards. For slides, this
   * moves to the previous slide. The direction moved depends on the
   * directionality of the component.
   */
  prev() {
    if (this.type_ == CarouselType.CAROUSEL) {
      this.moveScrollOneViewport_(false);
      return;
    }

    this.carousel_.prev(ActionSource.GENERIC_HIGH_TRUST);
  }

  /**
   * Moves the scroll position by one viewport, either forwards or backwards.
   * This reverses the actual scroll position moved based on directionality.
   * @param {boolean} forwards
   * @private
   */
  moveScrollOneViewport_(forwards) {
    const el = this.scrollContainer_;
    const {direction} = computedStyle(this.win, el);
    const forwardsMultiplier = forwards ? 1 : -1;
    const directionMulitplier = direction == 'rtl' ? -1 : 1;

    el.scrollLeft += el.offsetWidth * forwardsMultiplier * directionMulitplier;
  }

  /**
   * @return {!Element}
   * @private
   */
  renderContainerDom_() {
    const html = htmlFor(this.element);
    return html`
      <div class="i-amphtml-carousel-content">
        <div class="i-amphtml-carousel-scroll"></div>
        <div class="i-amphtml-carousel-arrows">
          <div
            tabindex="0"
            class="amp-carousel-button amp-carousel-button-prev"
            aria-label="Previous item in carousel"
          ></div>
          <div
            tabindex="0"
            class="amp-carousel-button amp-carousel-button-next"
            aria-label="Next item in carousel"
          ></div>
        </div>
      </div>
    `;
  }

  /**
   * Gets the ActionSource to use for a given ActionTrust.
   * @param {!ActionTrust} trust
   * @return {!ActionSource}
   */
  getActionSource_(trust) {
    return trust == ActionTrust.HIGH
      ? ActionSource.GENERIC_HIGH_TRUST
      : ActionSource.GENERIC_LOW_TRUST;
  }

  /**
   * @private
   */
  configureCarousel_() {
    const dir = this.element.getAttribute('dir');
    const loop = this.element.hasAttribute('loop');
    const autoplay = this.element.getAttribute('autoplay');
    const delay = this.element.getAttribute('delay');
    const type = this.element.getAttribute('type');
    const autoAdvance = !!autoplay;
    const autoAdvanceLoops = autoplay
      ? Number(autoplay)
      : Number.POSITIVE_INFINITY;
    const autoAdvanceInterval = Math.max(Number(delay) || 5000, 1000);

    this.carousel_.updateForwards(dir != 'rtl');
    this.carousel_.updateLoop(loop || autoAdvance);
    this.carousel_.updateAutoAdvanceLoops(autoAdvanceLoops);
    this.carousel_.updateAutoAdvanceInterval(autoAdvanceInterval);
    this.toggleAutoplay_(autoAdvance);
    this.updateType_(type);
  }

  /**
   * Updates the UI of the <amp-carousel> itself, but not the internal
   * implementation.
   * @private
   */
  updateUi_() {
    const index = this.carousel_.getCurrentIndex();
    const loop = this.carousel_.getLoop();
    const bothDisabled =
      this.hadTouch_ && !this.element.hasAttribute('controls');
    const prevDisabled = (!loop && index == 0) || bothDisabled;
    const nextDisabled =
      (!loop && index == this.slides_.length - 1) || bothDisabled;

    this.prevButton_.classList.toggle('amp-disabled', prevDisabled);
    this.prevButton_.setAttribute('aria-disabled', prevDisabled);
    this.nextButton_.classList.toggle('amp-disabled', nextDisabled);
    this.nextButton_.setAttribute('aria-disabled', nextDisabled);
  }

  /**
   * @param {string} type
   */
  updateType_(type) {
    this.type_ =
      type == CarouselType.SLIDES ? CarouselType.SLIDES : CarouselType.CAROUSEL;

    this.carousel_.updateHideScrollbar(this.type_ == CarouselType.SLIDES);
    this.carousel_.updateMixedLength(this.type_ == CarouselType.CAROUSEL);
    this.carousel_.updateSnap(this.type_ == CarouselType.SLIDES);
  }

  /**
   * @param {!ActionSource|undefined} actionSource
   * @return {boolean} Whether or not the action is a high trust action.
   * @private
   */
  isHighTrustActionSource_(actionSource) {
    return (
      actionSource == ActionSource.WHEEL ||
      actionSource == ActionSource.TOUCH ||
      actionSource == ActionSource.GENERIC_HIGH_TRUST
    );
  }

  /**
   * Toggles the current autoplay state, or forces it if the enable
   *  argument is given.
   * @param {boolean=} enable
   */
  toggleAutoplay_(enable) {
    this.autoplay_ = enable !== undefined ? enable : !this.autoplay_;
    this.carousel_.updateAutoAdvance(this.autoplay_);
  }

  /**
   * @private
   * @param {!Event} event
   */
  onIndexChanged_(event) {
    const detail = getDetail(event);
    const index = detail['index'];
    const actionSource = detail['actionSource'];
    const data = dict({'index': index});
    const name = 'slideChange';
    const isHighTrust = this.isHighTrustActionSource_(actionSource);
    const trust = isHighTrust ? ActionTrust.HIGH : ActionTrust.LOW;

    const action = createCustomEvent(this.win, `slidescroll.${name}`, data);
    this.action_.trigger(this.element, name, action, trust);
    this.element.dispatchCustomEvent(name, data);
    this.hadTouch_ = this.hadTouch_ || actionSource == ActionSource.TOUCH;
    this.updateUi_();
  }
}

AMP.extension('amp-carousel', '0.2', AMP => {
  AMP.registerElement('amp-carousel', AmpCarousel, CSS);
});
