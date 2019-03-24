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

import {BinarySearchPreference, binarySearch} from './binary-search';
import {computedStyle} from '../../../src/style';
import {devAssert} from '../../../src/log';
import {trimEnd} from '../../../src/string';

/**
 * @enum {string}
 */
export const OverflowStyle = {
  INLINE: 'inline',
  RIGHT: 'right',
};

/**
 * @typedef {{
 *  width: number,
 *  height: number,
 * }}
 */
let DimensionsDef;

/**
 * A zero-size dimension.
 */
const zeroSize = {
  width: 0,
  height: 0,
};

const NON_BREAKING_SPACE = '\u00a0';
const SHY_HYPHEN = '\u00ad';
const HYPHEN_MINUS = '\u002d';
const HYPHEN = '\u2010';

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
function createEllipsisEl(doc, hasFollowingNode) {
  const span = doc.createElement('span');
  const text = '…' + (hasFollowingNode ? NON_BREAKING_SPACE : '');
  span.className = 'i-amphtml-clamp-ellipsis';
  span.appendChild(doc.createTextNode(text));
  return span;
}

let start = 0;
let end = 0;

/**
 * Clamps the text within a given Element. This is *approximate* and could
 * result in too much or too little being ellipsized. This is approximate as
 * it avoids forcing layout when determining where to put the ellipsis, as
 * it is quite expensive. Known limitations:
 *
 * - The ellipsis size is estimated by appending it to the container. If the
 *   ellipsis occurs with an Element that a different font rendering (i.e.
 *   font-size, font-weight, etc.), we may end up truncating too much or too
 *   little.
 *     * We could add another phase after we estimate where to truncate, which
 *       would add a couple of additional layout passes if this is worth it.
 * - The the element has a padding . This could proably be
 *   handled with a few changes.
 * - OverflowStyle.RIGHT only really supports floating to the right with 100%
 *   height.
 * - There is no OverflowStyle.LEFT, but support could be added.
 * - The overflow element is not allowed to wrap lines.
 * - One extra line of text could be truncated if an ellipsis would cause a
 *   word to wrap.
 *
 * This function does not update the truncation when the text content, overflow
 * element changes, on resizer or any other situation. The caller is
 * responsible for calling the function again in such situations.
 *
 * To make mostly non-destructive changes for DOM diffing libraries, this
 * clears text from Text nodes rather than removing them. It does not clone
 * contents in any way so that event listeners and any expando properties are
 * maintained.
 *
 * Unlike CSS text clamping, this actually removes text from the DOM. Text
 * nodes are cleared and not removed so that almost all DOM diffing libraries
 * continue to work. One implication of actually removing text is that it is
 * unavailable to screen readers. This is unfortunate as users would need to
 * use some sort of developer provided functionality to expand the truncated
 * text, then have the content re-read.
 *
 * This function adds the ellipsis and space to the last Text node, to avoid
 * confusing libraries that may be managing the DOM. The space should probably
 * be manually added before the overflow element instead, so that it is not a
 * part of an `<a>` tag. TODO(sparhami) consider just adding a Text node for
 * the ellipsis before the overflow Element.
 *
 * This code needs to in a single pass to avoid a partial state being shown. It
 * groups reads/writes into phases so that it does not cause forced layouts
 * with other calls to clamp. TODO(sparhami) Does this make sense to move into
 * runtime?
 * This should be called from a place where it is safe to perform mutations.
 * @param {{
 *   element: !Element,
 *   overflowElement: ?Element,
 *   overflowStyle: (!OverflowStyle|undefined),
 *   estimate: boolean,
 * }} config
 */
export function clamp({
  element,
  overflowElement = null,
  overflowStyle = OverflowStyle.INLINE,
  estimate = true,
} = {}) {
  start = start || performance.now();
  let ellipsisEl;
  let overflowing;

  // Mutate, first phase: remove any effects of truncation so that we can see
  // if there is any overflow.
  if (element.hasAttribute(CONTAINER_OVERFLOW_ATTRIBUTE)) {
    element.removeAttribute(CONTAINER_OVERFLOW_ATTRIBUTE);
    clearTruncation(element);
  }

  return Promise.resolve().then(() => {
    // Measure, first phase: Check for overflow.
    overflowing = getOverflow(element) > 0;
  }).then(() => {
    if (!overflowing) {
      return;
    }

    // Mutate, second phase: Layout the elements for truncation so we can
    // measure their size.
    element.setAttribute(CONTAINER_OVERFLOW_ATTRIBUTE, '');

    if (estimate) {
      ellipsisEl = createEllipsisEl(
          devAssert(element.ownerDocument), !!overflowElement);
      element.appendChild(ellipsisEl);
    }
  }).then(() => {
    if (!overflowing) {
      return;
    }

    // Measure, second phase; Check the size of the truncation elements, this
    // will also run a third phase mutate with any changes necessary for
    // truncation.
    runTruncation(
        element,
        overflowElement,
        overflowStyle,
        ellipsisEl,
        estimate
    );
  }).then(() => {
    if (!overflowing) {
      return;
    }

    if (ellipsisEl) {
      element.removeChild(ellipsisEl);
    }

    end = performance.now();
  }).then(() => {
    console.log(end - start);
  });
}

/**
 * @param {!Element} element
 * @return {number} The overflow in pixels, if any.
 */
function getOverflow(element) {
  return element.scrollHeight - element.offsetHeight;
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
    node.removeAttribute(ELEMENT_OVERFLOW_ATTRIBUTE);
  }

  for (let child = node.firstChild; child; child = child.nextSibling) {
    clearTruncation(child);
  }
}

/**
 * Runs text truncation for an Element, finding the last node that needs
 * truncation and truncating it.
 * @param {!Element} element The Element to do truncation for,
 * @param {?Element} overflowElement An optional Element to show when
 *    overflowing.
 * @param {!OverflowStyle} overflowStyle How overflowElement is displayed.
 * @param {?Element} ellipsisEl An Element containing an ellipsis used for
 *    measuring the size whe estimating.
 * @param {boolean} estimate Whether to estimate or accurately ellipize.
 */
function runTruncation(
  element,
  overflowElement,
  overflowStyle,
  ellipsisEl,
  estimate,
) {
  const expectedBox = element.getBoundingClientRect();
  const ellipsisBox = ellipsisEl ?
      ellipsisEl.getBoundingClientRect() : zeroSize;
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
      Promise.resolve().then(() => {
        node.setAttribute(ELEMENT_OVERFLOW_ATTRIBUTE, '');
      });
      continue;
    }

    // Truncate the text node. If it got ellipsized, the we are done.
    if (node.nodeType == Node.TEXT_NODE) {
      done = ellipsizeTextNode(
          node, expectedBox, ellipsisBox, reservedBox, element, estimate);
      continue;
    }

    // By pushing the children to the queue, we traverse in reverse order of
    // children, since we want to truncate later nodes first.
    for (let child = node.firstChild; child; child = child.nextSibling) {
      queue.push(child);
    }
  }
}

const range = document.createRange();

/**
 * Gets rect at the for given offsets within a Text Node.
 * @param {!Text} node A Text Node.
 * @param {number} startOffset The offset of the start of the range of
 *    characters.
 * @param {number} endOffset The offset of the end of the range of characters.
 */
function getRect(node, startOffset, endOffset) {
  let rect;

  // For Safari: leading whitespace on at the start of a line will return a
  // zero-size rect. In that case, go backwards to find a character that has
  // a rect. Since we remove whitespace before adding the ellipsis, these
  // are equivalent in terms of choosing a point to ellipsize. Other browsers
  // handle this correctly.
  do {
    range.setStart(node, startOffset);
    range.setEnd(node, endOffset);
    rect = range.getBoundingClientRect();
    startOffset -= 1;
  } while (!rect.height && startOffset >= 0);

  // Since we strip leading/trailing whitespace, there should always be a
  // character with some size prior to leading whitespace on a line.
  devAssert(rect.height > 0);

  return rect;
}

/**
 * @param {string} char
 * @return {boolean} True if the character is whitespace, false otherwise.
 */
function isWhitespace(char) {
  return !char.trim();
}

/**
 * @param {string} char A character to check.
 * @return {boolean} True if the character is a breaking whitespace, false
 *    otherwise.
 */
function isBreakingWhitespace(char) {
  return char != NON_BREAKING_SPACE && isWhitespace(char);
}

/**
 * Checks if a characrer would cause a line breaking.
 * @param {string} char A character to check.
 * @param {boolean} breakOnShyHyphen Whether or not to break on a shy hyphen.
 * @return {boolean} True if the character is a breaking character, false
 *    otherwise.
 */
function isBreakingChar(char, breakOnShyHyphen) {
  return char == HYPHEN_MINUS ||
      char == HYPHEN ||
      (char == SHY_HYPHEN && breakOnShyHyphen) ||
      isBreakingWhitespace(char);
}

/**
 * Ellipsizes a text node or clears the contents if none of the text fits.
 * @param {!Text} node
 * @param {!ClientRect} expectedBox
 * @param {!DimensionsDef} ellipsisBox
 * @param {!DimensionsDef} reservedBox
 * @param {!Element} element
 * @param {boolean} estimate
 * @return {boolean} True if the text node was ellipsized, false if all the
 *    it was empty or all the text was removed.
 */
function ellipsizeTextNode(
    node, expectedBox, ellipsisBox, reservedBox, element, estimate) {
  /**
   * @param {number} startOffset The start character offset to look at.
   * @param {number} endOffset The end character offset to look at.
   */
  function getWrappedWidth(startOffset, endOffset) {
    const win = node.ownerDocument.defaultView;
    const style = computedStyle(win, node.parentElement);
    const breakOnShyHyphen = style.hyphens != 'none';

    // Go backwards until we find a point where the word would break.
    while (!isBreakingChar(text[startOffset], breakOnShyHyphen)) {
      startOffset--;
    }

    return getRect(node, startOffset, endOffset).width;
  }

  /**
   * Gets the underflow for a given offset within the node. This never returns
   * zero when the text bottoms exactly match, as there could be another later
   * character that also fits. Instead, it returns a small positive value so
   * that we keep searching right. This is the same as using a binary search
   * that returns the rightmost match.
   * @param {number} offset
   * @return {number} The amount of underflow, in pixels.
   */
  function underflowAtPositionEstimate(offset) {
    const rect = getRect(node, offset, offset + 1);
    const textWraps = expectedBox.right - ellipsisBox.width <= rect.right;
    // Note: if we are in an Element with a different font-size, this will not
    // be correct.
    const lineHeight = ellipsisBox.height;

    // If we wrapped, then we need to adjust the top by one additional line.
    const lineTop = textWraps ? rect.top + lineHeight : rect.top;
    const rectWidth = textWraps ?
      getWrappedWidth(offset, offset + 1) : rect.width;

    // Figure out the total width that we need to fit both ellipsis and the
    // reserved box, then check if that wraps.
    const reservedWidth = reservedBox.width + ellipsisBox.width;
    const reservedBoxWraps = textWraps ?
      reservedWidth + rectWidth > expectedBox.width :
      expectedBox.right - reservedWidth <= rect.right;

    // Now figure out how much height we need for the reserved box. If it
    // wraps, we need to add an additional line worth of height to our
    // request. When the rect fits on the same line, it can be either taller or
    // shorter than the current line.
    const textLineHeightDifference = (lineHeight - rect.height);
    const reqHeight = reservedBox.height - textLineHeightDifference;
    const reqBottom = reservedBoxWraps ?
      lineTop + lineHeight + reqHeight :
      lineTop + Math.max(rect.height, reqHeight);
    const underflow = expectedBox.bottom - reqBottom;

    // Never return zero, return a positive value so we keep looking to the
    // right.
    return underflow == 0 ? Number.MIN_VALUE : underflow;
  }

  /**
   * An accurate version of getting the underflow, by mutating the text and
   * checking for underflow.
   * @param {number} offset
   * @return {number} The amount of underflow, in pixels.
   */
  function underflowAtPositionAccurate(offset) {
    node.textContent = text.slice(0, offset + 1) + '… ';
    const underflow = 0 - getOverflow(element);

    // Never return zero, return a positive value so we keep looking to the
    // right.
    return underflow == 0 ? Number.MIN_VALUE : underflow;
  }

  const text = node.data;
  // For Safari: We need to avoid looking at the starting/trailing whitespace
  // characters that are collapsed, since they will return zero sized rects.
  // We start looking at the start offset rather than the zeroth index.
  // Note that this is different than trimming the start, since trim removes
  // non-breaking spaces.
  const startOffset = estimate ? Array.prototype.findIndex.call(text, (char) => {
    return !isBreakingWhitespace(char);
  }) : 0;

  // We do not want to replace empty text nodes (e.g. at the start of an
  // an element if the developer put a newline before the text) with an
  // ellipsis, so just bail out early.
  if (startOffset < 0) {
    return false;
  }

  // Use the underflow to find the boundary index of where truncation should
  // occur. As long as we have underflow, we will keep looking at a higher
  // index. We use BinarySearchPreference.HIGH to find  the first index
  // overflows. Otherwise, we might end on a non-overflowing character.
  // We could potentially use `caretRangeFromPoint`/`caretPositionFromPoint`,
  // if available, to skip the binary search. We may still need to fallback, for
  // example if something is overlaying the text. The binary search is
  // extremely fast so there is likely very little value to adding an
  // additional code path.
  const underflowFunction = estimate ?
      underflowAtPositionEstimate :
      underflowAtPositionAccurate;
  const searchIndex = binarySearch(0, text.length - startOffset - 1, index => {
    // Convert to the index within the Node's text.
    let textIndex = index + startOffset;

    // Treat whitespace as being the same as the the previous non-whitespace
    // character in terms of truncation. This is necessary as we will strip
    // trailing whitespace, so we do not to include its width when considering
    // if we overflow.
    while (isWhitespace(text[textIndex]) && textIndex > 0) {
      textIndex--;
    }

    return underflowFunction(textIndex);
  }, BinarySearchPreference.HIGH);
  const firstOverflowingIndex = -(searchIndex + 1) + startOffset;

  // Remove trailing whitespace since we do not want to have something like
  // "Hello world   …". We need to keep leading whitespace since we may be
  // adjacent to an inline element, which makes it significant.
  const fittingText = trimEnd(text.slice(0, firstOverflowingIndex));
  // If no text fits, then do not add an ellipsis.
  // Add a space to the ellipsis to give it space between whatever
  // (if anything) follows. Note we reserved enough space for this when
  // creating the ellipsis element.
  const newText = fittingText ? fittingText + '… ' : '';

  Promise.resolve().then(() => {
    node[ORGINAL_DATA_PROPERTY] = text;
    node.data = newText;
  });
  // We are done if we actually truncated.
  return !!fittingText;
}
