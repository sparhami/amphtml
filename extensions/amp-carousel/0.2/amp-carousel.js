import {CSS} from '../../../build/amp-carousel-0.2.css';
import {Carousel} from './carousel.js';
import {isLayoutSizeDefined} from '../../../src/layout';
import {htmlFor} from '../../../src/static-template';

function isSizer(el) {
  return el.tagName == 'I-AMPHTML-SIZER';
}

class AmpCarousel extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    this.advanceCount = 1;
    this.slides = [];
    this.slidesSlot = null;
    this.carousel = null;
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeDefined(layout);
  }

  tagSizerForSlot() {
    // Make sure sizer (if present) gets put in the correct spot.
    Array.from(this.element.children)
        .filter(c => isSizer(c))
        .forEach(c => c.setAttribute('slot', 'sizer'));
  }

  createNonShadowDom() {
    return htmlFor(this.element)`
      <div class="scroll-container">
        <div class="mask start-mask"></div>
        <div class="before-spacers-ref"></div>
        <div class="after-spacers-ref"></div>
        <div class="mask end-mask"></div>
      </div>
    `;
  }

  createShadowDom() {
    return htmlFor(this.element)`
      <div>
        <style></style>
        <slot name="sizer"></slot>
        <div class="scroll-container">
          <div class="mask start-mask"></div>
          <slot class="before-spacers-ref" id="slides-slot"></slot>
          <div class="mask end-mask after-spacers-ref"></div>
        </div>
      </div>
    `;
  }

  buildCommon(element, root) {
    this.carousel = new Carousel({
      element,
      root,
      callbacks: {
        currentIndexChanged: (newIndex) => this.currentIndexChanged_(newIndex),
      },
      runMeasure: (cb) => this.measureElement(cb),
      runMutate: (cb) => this.mutateElement(cb),
    });

    // Handle the initial set of attributes
    Array.from(this.element.attributes).forEach(attr => {
      this.attributeChanged(attr.name, attr.value);
    });
  }

  buildForNonShadow() {
    const {element} = this;
    // Grab the slides up front so we can place them later.
    this.slides = Array.from(element.children).filter(c => !isSizer(c));
    // Create the "Shadow DOM"
    element.appendChild(this.createNonShadowDom());

    this.buildCommon(element, element);

    // Do some manual "slot" distribution
    const scrollContainer = element.querySelector('.scroll-container');
    const afterSpacersRef = element.querySelector('.after-spacers-ref');
    this.slides.forEach(slide => {
      slide.classList.add('slotted');
      scrollContainer.insertBefore(slide, afterSpacersRef);
    });

    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  buildForShadow() {
    // Create the Shadow DOM
    this.sr = this.element.attachShadow({mode: 'open'});
    this.sr.appendChild(this.createShadowDom());
    this.sr.querySelector('style').textContent = CSS;
    this.slidesSlot = this.sr.querySelector('#slides-slot');

    this.buildCommon(this.element, this.sr);

    this.tagSizerForSlot();
    this.slotChange(); // For Safari
    this.slidesSlot.addEventListener('slotchange', () => this.slotChange());

    // Signal for runtime to check children for layout.
    return this.mutateElement(() => {});
  }

  /** @override */
  buildCallback() {
    return this.buildForNonShadow();
  }

  /** @override */
  layoutCallback() {
    this.carousel.updateSlides(this.slides);
  }

  slotChange() {
    const slides = this.slidesSlot.assignedNodes()
        .filter(s => s.nodeType == Node.ELEMENT_NODE);
    this.slides = slides;
    this.carousel.updateSlides(this.slides);
  }

  /** @override */
  mutatedAttributesCallback(mutations) {
    for (const key in mutations) {
      this.attributeChanged(key, mutations[key]);
    }
  }

  attributeChanged(name, newValue) {
    switch (name) {
      case 'advance-count':
        this.carousel.updateAdvanceCount(Number(newValue) || 0);
        break;
      case 'auto-advance':
        this.carousel.updateAutoAdvance(newValue == 'true');
        break;
      case 'auto-advance-count':
        this.carousel.updateAutoAdvanceCount(Number(newValue) || 0);
        break;
      case 'auto-advance-interval':
        this.carousel.updateAutoAdvanceInterval(Number(newValue) || 0);
        break;
      case 'horizontal':
        this.carousel.updateHorizontal(newValue == 'true');
        break;
      case 'initial-index':
        this.carousel.updateInitialIndex(Number(newValue) || 0);
        break;
      case 'loop':
        this.carousel.updateLoop(newValue == 'true');
        break;
      case 'mixed-length':
        this.carousel.updateMixedLength(newValue == 'true');
        break;
      case 'snap':
        this.carousel.updateSnap(newValue == 'true');
        break;
      case 'snap-align':
        this.carousel.updateAlignment(newValue);
        break;
      case 'snap-by':
        this.carousel.updateSnapBy(Number(newValue) || 0);
        break;
      case 'visible-count':
        this.carousel.updateVisibleCount(Number(newValue) || 0);
        break;
    }
  }

  currentIndexChanged_() {

  }
}

AMP.extension('amp-carousel', '0.2', AMP => {
  AMP.registerElement('amp-carousel', AmpCarousel, CSS);
});
