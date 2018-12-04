import {
  Alignment,
  Axis,
  getCenter,
  getStart,
  updateScrollPos,
} from './dimensions.js';

/**
 * Runs a callback while disabling smooth scrolling by temporarily setting
 * the `scrollBehavior` to `auto`.
 * @param {!Element} el 
 * @param {function} cb 
 */
export function runDisablingSmoothScroll(el, cb) {
  const {style} = el;
  const {scrollBehavior} = style;

  style.scrollBehavior = 'auto';
  cb();
  style.scrollBehavior = scrollBehavior;
}

/**
 * Unlike `scrollIntoView`, this function does not scroll the container itself
 * into view. 
 * @param {!Element} el The Element to scroll to.
 * @param {!Element} container The scrolling container.
 * @param {!Axis} axis The axis to scroll along.
 * @param {!Alignment} alignment How to align the element within the container.
 */
export function scrollContainerToElement(el, container, axis, alignment) {
  const startAligned = alignment == Alignment.START;
  const snapOffset = startAligned ? getStart(axis, el) : getCenter(axis, el);
  const pos = getStart(axis, container) - snapOffset;

  updateScrollPos(axis, container, -pos);
}
