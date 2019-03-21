import { setStyle, setStyles } from "../../../src/style";
import { toArray } from "../../../src/types";
import { isAbsolute } from "path";

/**
 * @enum {string}
 */
const OverflowStyle = {
  INLINE: 'inline',
  DEFAULT: 'default',
};

const zeroSize = {
  width: 0,
  height: 0,
};

const CONTAINER_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-overflow';
const ELEMENT_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-child-overflow';

function createEllipsisSpan() {
  const ellipsisSpan = document.createElement('span');
  ellipsisSpan.textContent = '…';
  setStyles(ellipsisSpan, {
    'position': isAbsolute,
  });

  return ellipsisSpan;
}

export function clamp({
  element,
  runMutation,
  overflowElement = null,
  overflowStyle = 'inline',
} = {}) {
  if (!element) {
    return;
  }

  if (overflowElement && element.hasAttribute(CONTAINER_OVERFLOW_ATTRIBUTE)) {
    element.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
  }

  toArray(element.querySelectorAll('*')).forEach(el => {
    el.removeAttribute(ELEMENT_OVERFLOW_ATTRIBUTE);
  });

  Promise.resolve().then(() => {
    return isOverflowing(element);
  }).then((overflowing) => {
    if (!overflowing) {
      return;
    }

    if (overflowElement) {
      element.setAttribute(CONTAINER_OVERFLOW_ATTRIBUTE, '');
    }

    const ellipsisSpan = createEllipsisSpan();
    element.appendChild(ellipsisSpan);
    runMutation(() => element.removeChild(ellipsisSpan));
    return ellipsisSpan;
  }).then((ellipsisSpan) => {
    if (!ellipsisSpan) {
      return;
    }

    calculateTruncation({
      element,
      runMutation,
      overflowElement,
      overflowStyle,
      ellipsisSpan,
    });
  });
}

function isOverflowing(element) {
  return element.scrollHeight > element.offsetHeight;
}


/**
 * Does a binary search across a range of values until a condition is met. If
 * the condition is met, the index is returned. If the condition is never met,
 * the negative index, minus one is returned adjacent to where the condition
 * would be met. The condition should callback should return monotonically
 * increasing values across the range.
 * @param {number} start The start value to look at.
 * @param {number} end The end value to look at.
 * @param {function(number): number} condition A condition function, returning
 *    positive values if the top half of the range should be searched, negative
 *    values if the bottom half should be searched, and zero if the value was
 *    found.
 * @return {number} The first value in the range that was found. If no value
 *    was found, 
 */
function binarySearch(start, end, condition) {
  let low = start;
  let high = end;

  while(high >= low) {
    const mid = low + Math.floor((high - low) / 2);
    const res = condition(mid);

    if (res == 0) {
      return mid;
    } else if (res > 0) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return -(low + 1);
}

function calculateTruncation({
  element,
  overflowElement,
  overflowStyle,
  ellipsisSpan,
  runMutation,
}) {
  const expectedBox = element.getBoundingClientRect();
  const ellipsisBox = ellipsisSpan.getBoundingClientRect();
  const reservedBox =
      overflowElement && overflowStyle == OverflowStyle.INLINE ?
      overflowElement.getBoundingClientRect() : zeroSize;
  const queue = [element];
  let done = false;

  while (!done && queue.length) {
    const node = queue.pop();

    // The overflow element is never truncated.
    if (node == overflowElement) {
      continue;
    }

    // If we have an element that is completely overflowing, we hide it. This
    // is because it may still take some size even if we clear out all of the
    // text.
    if (node.nodeType == Node.ELEMENT_NODE &&
        node.getBoundingClientRect().top > expectedBox.bottom) {
      runMutation(() => {
        node.setAttribute(ELEMENT_OVERFLOW_ATTRIBUTE, '');
      });
      continue;
    }

    // Truncate the text node. If it got ellipsized, the we are done.
    if (node.nodeType == Node.TEXT_NODE) {
      done = ellipsizeTextNode(node, expectedBox, ellipsisBox, reservedBox, runMutation);
    }

    for (let child = node.firstChild; child; child = child.nextSibling) {
      queue.push(child);      
    }
  }
}

function ellipsizeTextNode(node, expectedBox, ellipsisBox, reservedBox, runMutation) {
  const text = node.textContent;
  const range = document.createRange();
  range.selectNode(node);

  /**
   * Gets the amount of overflow for the node at an index, assuming that we
   * need to reserve space for an ellipsis and an additional reserved box.
   * @param {number} index 
   */
  function getOverflow(index) {
    range.setEnd(node, index);
    // Since our range is operating on a single node, these rects are for each
    // line of text.
    const rects = range.getClientRects();
    const lastLineRect = rects[rects.length - 1];
    const {
      top,
      width,
      height,
    } = lastLineRect;

    // The last line width should also include the ellipsis, if it were added.
    const lastLineWidth = width + ellipsisBox.width;

    // The reserved box wraps onto a new line if it cannot fit on the last line
    // of text.
    const reservedBoxWraps = lastLineWidth + reservedBox.width > expectedBox.width;
    // If the box does not wrap, it may still be taller than the text, so we need
    // also check the reserved box's height.
    const finalLineAndReservedBoxHeight = reservedBoxWraps ?
        height + reservedBox.height :
        Math.max(height, reservedBox.height)

    return  (top + finalLineAndReservedBoxHeight) - expectedBox.bottom;
  }

  // We do not want to replace empty text nodes (e.g. at the start of an
  // an element if the developer put a newline before the text) with an
  // ellipsis, so just bail out early.
  if (!text.trim()) {
    return false;
  }

  // The whole Text Node overflows, so remove all the text and move on.
  if (range.getBoundingClientRect().top >= expectedBox.bottom) {
    node.textContent = '';
    return false;
  }

  // Use a binary search to to find the character that does not overflow. If
  // the result is negative, then there was no point where the overflow was
  // exactly zero, the return value is either just before or just after the
  // overflow. If the value is zero, there may be other characters after that
  // do not overflow either.
  let end = binarySearch(0, text.length - 1, getOverflow);

  // We have a negative index, and that index, when negated is one more
  // than the stopping index. We also need to subtract an additonal one as we
  // may have stopped right after overflow and not just before.
  if (end < 0) {
    end = -end - 2;
  }

  // Now keep going until we hit a character that overflows.
  while(getOverflow(end + 1) == 0) {
    end++;
  }

  // Always chop off an extra character to make sure things will fit due to
  // letter spacing.
  // Remove trailing spaces since we do not want to have something like
  // "Hello world   …".
  const newText = text.slice(0, end - 1).trim() + '…';


  runMutation(() => {
    node.textContent = newText;
  });

  return true;
}
