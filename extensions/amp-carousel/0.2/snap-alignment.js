export class SnapAlignment {
  constructor({
    scrollContainer,
    runMutate,
    debounceToMicrotask,
  }) {
    this.scrollContainer_ = scrollContainer;
    this.runMutate_ = runMutate;

    this.snapAlign_ = 'start';
    this.snap_ = true;
    this.snapBy_ = 1;
    this.visibleCount_ = 0;
    this.slides_ = [];

    this.debouncedUpdateAll_ = debounceToMicrotask(() => this.updateAll_());

    this.updateAll();
  }

  updateAll_() {
    this.runMutate_(() => {
      this.scrollContainer_.setAttribute('snap', this.snap_);
      this.scrollContainer_.setAttribute('snap-align', this.snapAlign_);
      this.scrollContainer_.style.setProperty('--snap-align', this.snapAlign_);
      this.scrollContainer_.style.setProperty('--snap-coordinate', `${this.snapAlign_ == 'start' ? '0%' : '50%'}`);
  
      this.updateDynamicStyle();
    });
  }

  updateAll() {
    this.debouncedUpdateAll_();
  }

  updateDynamicStyle() {
    // Update the snap-align for each child slide. Since the slides can exist
    // in a parent mixed with non-slides and do not share a common tag, we
    // cannot rely on nth-of-type or nth-child.
    this.slides_.forEach((slide, index) => {
      const snapAlign = this.getScrollSnapAlign(index);
      slide.style.setProperty('scroll-snap-align', snapAlign);
    })
  }

  getScrollSnapAlign(index) {
    // Make sure when using fractional visibile counts, the last item always
    // snaps on the ending edge.
    if (this.snapAlign_ == 'start' && this.slides_.length - 1 == index) {
      return 'end';
    }

    if (this.snapAlign_ == 'start' && this.slides_.length - index < this.visibleCount_) {
      return 'none';
    }

    if (index % this.snapBy_ == 0) {
      return this.snapAlign_;
    }

    return 'none';
  }

  updateSlides(slides) {
    this.slides_ = slides;
    this.updateAll();
  }

  /**
   * TODO(sparhami) when snap = start, want to set the last `visibleCount` to
   * snap to end instead.
   */
  updateVisibleCount(visibleCount) {
    this.visibleCount_ = Math.max(1, visibleCount);
    this.updateAll();
  }

  updateSnap(snap) {
    this.snap_ = snap;
    this.updateAll();
  }
  
  /**
   * TODO(sparhami): Document that center works differently for Firefox when
   * the visible count is odd as it prefers snapping on the center of the
   * items at the edges rather than snapping on the center of the items near
   * the middle.
   */
  updateAlignment(snapAlign) {
    this.snapAlign_ = snapAlign == 'start' ? 'start' : 'center';
    this.updateAll();
  }

  updateSnapBy(snapBy) {
    this.snapBy_ = Math.max(1, snapBy);
    this.updateAll();
  }
}
