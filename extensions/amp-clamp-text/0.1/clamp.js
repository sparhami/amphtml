import {setStyle} from '../../../src/style';
import {devAssert} from '../../../src/log';

/**
 * @enum {string}
 */
export const OverflowStyle = {
  INLINE: 'inline',
  DEFAULT: 'default',
};

/**
 * @typedef {{
 *  width: number,
 *  height: number,
 * }}
 */
let Dimensions;

/**
 * A zero-size dimension.
 */
const zeroSize = {
  width: 0,
  height: 0,
};

const NON_BREAKING_SPACE = '\xa0';

/** The class to add to the container when it has overflow. */
const CONTAINER_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-overflow';

/** The class to add to a descendant element that is overflowing. */
const ELEMENT_OVERFLOW_ATTRIBUTE = 'i-amphtml-clamp-child-overflow';

/** Used to save the original Text Node's data. */
const ORGINAL_DATA_PROPERTY = '__AMP_CLAMP_TEXT_DATA';

/** 
 * Creates a span with an ellipsis, used to measure how much space we will need
 * for an ellipsis. Assumes that the font size used for the ellipsis here is
 * the same as the ellipsis we add.
 * 
 * - Uses `display: inline-block`, which allows us to measure the full line
 *   height and not just the text height. This is needed by the truncation
 *   code when dealing with overflow elements that are `inline-block`.
 * - Uses a non-breaking space when we have a following Node. A regular space
 *   will not allow us to measure the size correctly. When there is no
 *   following Node, we do not use a non-breaking space, since that will cause
 *   us to reserve too much space.
 * 
 * @param {!Document} doc
 * @param {boolean} hasFollowingNode
 */
function createEllipsisSpan(doc, hasFollowingNode) {
  const span = doc.createElement('span');
  const text = '…' + (hasFollowingNode ? NON_BREAKING_SPACE : '');
  setStyle(span, 'display', 'inline-block');
  span.appendChild(doc.createTextNode(text));
  return span;
}

/**
 * Clamps the text within a given Element.
 * 
 * This code needs to in a single pass to avoid a partial state being shown.
 * This should be called from a place where it is safe to perform mutations.
 * @param {{
 *   element: !Element,
 *   runMutation: function(function()),
 *   overflowElement: ?Element,
 *   overflowStyle: !OverflowStyle,
 * }}
 */
export function clamp({
  element,
  runMutation,
  overflowElement = null,
  overflowStyle = OverflowStyle,
} = {}) {
  // Mutate, first phase: remove any effects of truncation so that we can see
  // if there is any overflow.
  if (element.hasAttribute(CONTAINER_OVERFLOW_ATTRIBUTE)) {
    element.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
    clearTruncation(element);
  }

  return Promise.resolve().then(() => {
    // Measure, first phase: Check for overflow.
    return isOverflowing(element);
  }).then((overflowing) => {
    if (!overflowing) {
      return;
    }

    // Mutate, second phase: Layout the elements for truncation so we can
    // measure their size.
    element.setAttribute(CONTAINER_OVERFLOW_ATTRIBUTE, '');

    const ellipsisSpan = createEllipsisSpan(element.ownerDocument, !!overflowElement);
    return  element.appendChild(ellipsisSpan);
  }).then((ellipsisSpan) => {
    if (!ellipsisSpan) {
      return;
    }

    // Measure, second phase; Check the size of the truncation elements, this
    // will also run a third phase mutate with any changes necessary for
    // truncation.
    runTruncation(
      element,
      overflowElement,
      overflowStyle,
      ellipsisSpan,
      runMutation,
    );
    runMutation(() => element.removeChild(ellipsisSpan));
  });
}

/**
 * @param {!Element} element 
 * @return {boolean} True if the Element has vertical overflow, false
 *    otherwise.
 */
function isOverflowing(element) {
  return element.scrollHeight > element.offsetHeight;
}

/**
 * Clears the effects of truncation for a given subtree, unhiding Elements that
 * were hidden and restoring text content for Text Nodes.
 * @param {!Node} node The node to restore.
 */
function clearTruncation(node) {
  if (node[ORGINAL_DATA_PROPERTY]) {
    node.data = node[ORGINAL_DATA_PROPERTY];
  }

  if (node.nodeType == Node.ELEMENT_NODE) {
    node.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
  }

  for (let child = node.firstChild; child; child = child.nextSibling) {
    clearTruncation(child);
  }
}


/**
 * 
 * @param {!Element} element 
 * @param {?Element} overflowElement 
 * @param {!OverflowStyle} overflowStyle 
 * @param {!Element} ellipsisSpan 
 * @param {!function()} runMutation 
 */
function runTruncation(
  element,
  overflowElement,
  overflowStyle,
  ellipsisSpan,
  runMutation
) {
  const expectedBox = element.getBoundingClientRect();
  const ellipsisBox = ellipsisSpan.getBoundingClientRect();
  const reservedBox =
      overflowElement && overflowStyle == OverflowStyle.INLINE ?
      overflowElement.getBoundingClientRect() : zeroSize;
  const queue = [element];
  let done = false;

  // Go through all the child Nodes until we find the node to truncate.
  while (!done && queue.length) {
    const node = queue.pop();

    // The overflow element is never truncated.
    if (node == overflowElement) {
      continue;
    }

    // If we have an element that is completely overflowing, we hide it. This
    // is because it may still take some size even if we clear out all of the
    // text. This could cause it to poke out from the bottom of the element if
    // the height is not a multtiple of the line height.
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
      continue;
    }

    // By pushing the children to the queue, we traverse in reverse order of
    // children, since we want to truncate later nodes first.
    for (let child = node.firstChild; child; child = child.nextSibling) {
      queue.push(child);      
    }
  }
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

/**
 * Gets rect at the a given offset within the text.
 * @param {*} index 
 */
function getRect(node, offset) {
  const range = document.createRange();
  let rect;

  // For Safari: leading whitespace on at the start of a line will return a
  // zero-size rect. In that case, go backwards to find a character that has
  // a rect. Since we remove whitespace before adding the ellipsis, these
  // are equivalent in terms of choosing a point to ellipsize.
  do {
    range.setStart(node, offset);
    range.setEnd(node, offset + 1);
    rect = range.getBoundingClientRect();
    offset -= 1;
  } while(!rect.height && offset >= 0);

  // Since we strip leading/trailing whitespace, there should always be a
  // character with some size prior to leading whitespace on a line.
  devAssert(rect.height > 0);

  return rect;
}

/**
 * Trims a string on the right, using the native implementation if available.
 * @param {string} str  A string to trim.
 * @return {string} The string, with trailing whitespace removed.
 */
function trimRight(str) {
  if (str.trimRight) {
    return str.trimRight();
  }

  return ('_' + str).trim().slice(1);
}

/**
 * @param {!Text} node 
 * @param {!ClientRect} expectedBox 
 * @param {!Dimensions} ellipsisBox 
 * @param {!Dimensions} reservedBox 
 * @param {function(function())} runMutation 
 */
function ellipsizeTextNode(node, expectedBox, ellipsisBox, reservedBox, runMutation) {
  function underflowWithReservedBox(rect) {
    // The target right coordinate such that the reserved box and ellipsis box
    // both fit.
    const targetRight = expectedBox.right - reservedBox.width - ellipsisBox.width;
    const wraps = targetRight <= rect.right;
    const textLineHeightDifference = (ellipsisBox.height - rect.height);
    const requestedHeight = reservedBox.height - textLineHeightDifference;
    const requestedBottom = wraps ?
      rect.top + textLineHeightDifference + rect.height + requestedHeight :
      rect.top + Math.max(rect.height, requestedHeight);

    return requestedBottom - expectedBox.bottom;
  }

  /**
   * Gets the underflow for a given offset within the node. This never returns
   * zero when the text bottoms exactly match, as there could be another later
   * character that also fits. Instead, it returns a small positive value so
   * that we keep searching right. This is the same as using a binary search
   * that returns the rightmost match.
   * @param {number} offset
   */
  function underflowAtPosition(offset) {
    const rect = getRect(node, offset);
    const underflow = underflowWithReservedBox(rect);

    return underflow == 0 ? Number.MIN_VALUE : underflow;
  }

  const text = node.data;
  const trimmedText = text.trim();

  // We do not want to replace empty text nodes (e.g. at the start of an
  // an element if the developer put a newline before the text) with an
  // ellipsis, so just bail out early.
  if (!trimmedText) {
    return false;
  }

  // For Safari: We need to avoid looking at the starting/trailing whitespace
  // characters that are collapsed, since they will return zero sized rects.
  // We start looking at the start offset rather than the zeroth index.
  const startOffset = text.indexOf(trimmedText);

  // Find the boundary index of where truncation should occur. The binary
  // search will always return a negative value since the overflow
  // function never returns zero.
  // We could potentially use `caretRangeFromPoint`/`caretPositionFromPoint`,
  // if available, to skip the binary search. We may still need to fallback, for
  // example if something is overlaying the text. The binary search is
  // extremely fast so there is likely very little value to adding an
  // additional code path.
  const searchIndex = binarySearch(0, trimmedText.length - 1, (index) => {
    return underflowAtPosition(index + startOffset)
  });
  const lastFittingIndex = -(searchIndex + 1) + startOffset;

  // Remove trailing whitespace since we do not want to have something like
  // "Hello world   …". We need to keep leading whitespace since we may be
  // adjacent to an inline element.
  // Add a space to the ellipsis to give it space between whatever follows.
  const fittingText = trimRight(text.slice(0, lastFittingIndex));
  // If no text fits, then do not add an ellipsis.
  const newText = fittingText ? fittingText + '… ' : '';

  runMutation(() => {
    node[ORGINAL_DATA_PROPERTY] = text;
    node.data = newText;
  });
  return true;
}
