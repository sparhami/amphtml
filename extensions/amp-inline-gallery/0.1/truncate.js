export function truncate(element, overflowElement) {
  if (!element) {
    return;
  }

  if (overflowElement) {
    overflowElement.style.display = 'none';
  }

  if (!isOverflowing(element)) {
    return;
  }

  if (overflowElement) {
    overflowElement.style.display = '';
  }
  calculateTruncation(element);
}

function isOverflowing(element) {
  return element.scrollHeight > element.offsetHeight;
}

function binarySearch(start, end, condition) {
  let low = start;
  let high = end;

  while(low < high) {
    const mid = Math.floor((low + high) / 2);
    const res = condition(mid);

    if (res == 0) {
      break;
    } else if (res > 0) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

function calculateTruncation(element) {
  const {bottom} = element.getBoundingClientRect();

  for (let node = element.firstChild; node; node = node.nextSibling) {
    if (node.nodeType != Node.TEXT_NODE) {
      continue;
    }

    calculateNodeTruncation(node, bottom);
  }
}

function calculateNodeTruncation(node, expectedBottom) {
  const range = document.createRange();
  range.selectNode(node);

  function getOverflow(index) {
    range.setEnd(node, index + 1);
    return range.getBoundingClientRect().bottom - expectedBottom;
  }

  const {top, bottom} = range.getBoundingClientRect();
  // Text fits completely, nothing to do.
  if (bottom < expectedBottom) {
    return;
  }
 
  // The whole text node is after the cut-off area, clear the whole thing.
  if (top > expectedBottom) {
    node.textContent = '';
    return;
  }

  // Note: this should use a binary search. Can use the size of a rect to approximate how
  // much is overflowing and where to start looking.
  const text = node.textContent;
  let end = binarySearch(0, text.length - 1, getOverflow) + 2;
  // Need to now delete characters from the end and replace with ellipsis and check if it overflows.
  do {
    do {
      end--;
    } while(text[end] == ' ');
    node.textContent = text.slice(0, end + 1) + '…';
  } while(getOverflow(end + 1) > 0);
}
