import {CSS} from '../../../build/amp-carousel-0.2.css';
import {Carousel} from './carousel.js';
import {isLayoutSizeDefined} from '../../../src/layout';
import {htmlFor} from '../../../src/static-template';
import {debounceToMicrotask} from "./debounce-to-microtask";
import {debounce} from '../../../src/utils/rate-limit';
import {listenOnce} from '../../../src/event-helper';
import {ResponsiveAttributes} from './responsive_attributes';

function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}



class AmpCarousel extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    this.advanceCount_ = 1;
    this.carousel = null;
    this.slides_ = [];
    this.slidesSlot_ = null;

    this.responsiveAttributes_ = new ResponsiveAttributes({
      'advance-count': (newValue) => {
        this.carousel.updateAdvanceCount(Number(newValue) || 0);
      },
      'auto-advance': (newValue) => {
        this.carousel.updateAutoAdvance(newValue == 'true');
      },
      'auto-advance-count': (newValue) => {
        this.carousel.updateAutoAdvanceCount(Number(newValue) || 0);
      },
      'auto-advance-interval': (newValue) => {
        this.carousel.updateAutoAdvanceInterval(Number(newValue) || 0);
      },
      'horizontal': (newValue) => {
        this.carousel.updateHorizontal(newValue == 'true');
      },
      'initial-index': (newValue) => {
        this.carousel.updateInitialIndex(Number(newValue) || 0);
      },
      'loop': (newValue) => {
        this.carousel.updateLoop(newValue == 'true');
      },
      'mixed-length': (newValue) => {
        this.carousel.updateMixedLength(newValue == 'true');
      },
      'side-slide-count': (newValue) => {
        this.carousel.updateSideSlideCount(Number(newValue) || 0);
      },
      'snap': (newValue) => {
        this.carousel.updateSnap(newValue == 'true');
      },
      'snap-align': (newValue) => {
        this.carousel.updateAlignment(newValue);
      },
      'snap-by': (newValue) => {
        this.carousel.updateSnapBy(Number(newValue) || 0);
      },
      'visible-count': (newValue) => {
        this.carousel.updateVisibleCount(Number(newValue) || 0);
      },
    });
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  /** @override */
  buildCallback() {
    return this.buildForNonShadow_();
  }

  /** @override */
  isRelayoutNeeded() {
    return true;
  }

  /** @override */
  layoutCallback() {
    this.carousel.updateUi();
  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    for (const key in mutations) {
      this.attributeChanged_(key, mutations[key]);
    }
  }

  tagSizerForSlot_() {
    // Make sure sizer (if present) gets put in the correct spot.
    Array.from(this.element.children)
        .filter(c => isSizer(c))
        .forEach(c => c.setAttribute('slot', 'sizer'));
  }

  createNonShadowDom_() {
    return htmlFor(this.element)`
      <div class="scroll-container">
      </div>
    `;
  }

  createShadowDom_() {
    return htmlFor(this.element)`
      <div>
        <style></style>
        <slot name="sizer"></slot>
        <div class="scroll-container">
          <slot id="slides-slot"></slot>
        </div>
      </div>
    `;
  }

  buildCommon_(element, root) {
    this.carousel = new Carousel({
      element,
      scrollContainer: root.querySelector('.scroll-container'),
      callbacks: {
        currentIndexChanged: (newIndex) => this.currentIndexChanged_(newIndex),
      },
      runMutate: (cb) => this.mutateElement(cb),
      debounce: (cb, delay) => debounce(this.win, cb, delay),
      debounceToMicrotask,
      listenOnce,
    });

    // Handle the initial set of attributes
    Array.from(this.element.attributes).forEach(attr => {
      this.attributeChanged_(attr.name, attr.value);
    });
  }

  buildForNonShadow_() {
    const {element} = this;
    // Grab the slides up front so we can place them later.
    this.slides_ = Array.from(element.children).filter(c => !isSizer(c));
    // Create the "Shadow DOM"
    element.appendChild(this.createNonShadowDom_());

    this.buildCommon_(element, element);

    // Do some manual "slot" distribution
    const scrollContainer = element.querySelector('.scroll-container');
    const afterSpacersRef = element.querySelector('.after-spacers-ref');
    this.slides_.forEach(slide => {
      slide.classList.add('slotted');
      scrollContainer.insertBefore(slide, afterSpacersRef);
    });

    // Signal for runtime to check children for layout.
    this.carousel.updateSlides(this.slides_);
    return this.mutateElement(() => {});
  }

  buildForShadow_() {
    // Create the Shadow DOM
    this.sr = this.element.attachShadow({mode: 'open'});
    this.sr.appendChild(this.createShadowDom_());
    this.sr.querySelector('style').textContent = CSS;
    this.slidesSlot_ = this.sr.querySelector('#slides-slot');

    this.buildCommon_(this.element, this.sr);

    this.tagSizerForSlot_();
    this.slotChanged_(); // For Safari
    this.slidesSlot_.addEventListener('slotchange', () => this.slotChanged_());

    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  slotChanged_() {
    const slides = this.slidesSlot_.assignedNodes()
        .filter(s => s.nodeType == Node.ELEMENT_NODE);
    this.slides_ = slides;
    this.carousel.updateSlides(this.slides_);
  }

  attributeChanged_(name, newValue) {
    this.responsiveAttributes_.updateAttribute(name, newValue);
  }

  currentIndexChanged_() {

  }
}

AMP.extension('amp-carousel', '0.2', AMP => {
  AMP.registerElement('amp-carousel', AmpCarousel, CSS);
});
