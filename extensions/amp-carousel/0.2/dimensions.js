import {mod} from "./mod";

export const Axis = {
  X: 0,
  Y: 1,
};

export const Alignment = {
  START: 0,
  CENTER: 1,
}

/**
 * @typedef {{
 *   start: number,
 *   end: number,
 *   length: number,
 * }}
 */
let Demnsion;


/**
 * @param {!Axis} axis The Axis to get the offset for.
 * @param {!Element} el The Element to get the offset for.
 * @return {number} The offset for the Element.
 */
export function getOffsetStart(axis, el) {
  return axis == Axis.X ? el.offsetLeft : el.offsetTop;
}

/**
 * 
 * @param {!Axis} axis The Axis to get the Dimension for.
 * @param {*} el The Element to get the Dimension For.
 * @return {!Dimension} The dimension for the Element along the given Axis.
 */
export function getDimension(axis, el) {
  const {
    top,
    bottom,
    height,
    left,
    right,
    width,
  } = el.getBoundingClientRect();

  return {
    start: axis == Axis.X ? left : top,
    end: axis == Axis.X ? right : bottom,
    length: axis == Axis.X ? width: height,
  };
}

/**
 * @param {!Axis} axis The axis along which to set the length.
 * @param {!Element} el The Element to set the length for.
 * @param {number} length The length value, in pixels, to set.
 */
export function updateLengthStyle(axis, el, length) {
  if (axis == Axis.X) {
    el.style.width = `${length}px`;
  } else {
    el.style.height = `${length}px`;
  }
}

/**
 * Sets a transform translate style for a given delta along a given axis.
 * @param {!Axis} axis The axis along which to translate.
 * @param {!Element} el The Element to translate.
 * @param {number} delta How much to move the Element.
 */
export function setTransformTranslateStyle(axis, el, delta) {
  const deltaX = axis == Axis.X ? delta : 0;
  const deltaY = axis == Axis.X ? 0 : delta;
  el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
}

/**
 * Sets the scroll position for an element along a given axis.
 * @param {!Axis} axis The axis to set the scroll position for.
 * @param {!Element} el The Element to set the scroll position for.
 * @param {number} position The scroll position.
 */
export function setScrollPosition(axis, el, position) {
  if (axis == Axis.X) {
    el.scrollLeft = position;
  } else {
    el.scrollTop = position;
  }
}

/**
 * @param {!Axis} axis The axis to get the center point for.
 * @param {!Element} el The Element to get the center point for.
 * @return {number} The center point.
 */
export function getCenter(axis, el) {
  const {start, end} = getDimension(axis, el);
  return start + end / 2;
}

/**
 * @param {!Axis} axis The axis to get the start point for.
 * @param {!Element} el The Element to get the start point for.
 * @return {number} The start point.
 */
export function getStart(axis, el) {
  const {start} = getDimension(axis, el);
  return start;
}

/**
 * @param {!Axis} axis The axis to check for overlap.
 * @param {!Element} el The Element to check for overlap.
 * @param {number} position A position to check.
 * @return {boolean} If the element contains the position.
 */
export function contains(axis, el, position) {
  const {start, end} = getDimension(axis, el);
  return start <= position && position <= end;
}

/**
 * Finds the index of a child that overlaps a point within the parent,
 * determined by an axis and alignment. A startIndex is used to look at the
 * children that are more likely to overlap first.
 * @param {!Axis} axis The axis to look along.
 * @param {!Alignment} alignment The alignment to look for within the parent
 *    container.
 * @param {!Element} container  The parent container to look in.
 * @param {!Array<Element>} children The children to look among.
 * @param {number} startIndex The index to start looking at.
 * @return {number} The overlapping index, if one exists.
 */
export function findOverlappingIndex(axis, alignment, container, children, startIndex) {
  const pos = alignment == Alignment.START ?
      getStart(axis, container) + 1 :
      getCenter(axis, container);

  if (contains(axis, children[startIndex], pos)) {
    return startIndex;
  }

  for (let i = 1; i < children.length / 2; i++) {
    const nextIndex = mod(startIndex + i, children.length);
    const prevIndex = mod(startIndex - i, children.length);

    if (contains(axis, children[nextIndex], pos)) {
      return nextIndex;
    }

    if (contains(axis, children[prevIndex], pos)) {
      return prevIndex;
    }
  }
}
