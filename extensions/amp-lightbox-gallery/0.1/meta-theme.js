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

import {computedStyle} from '../../../src/style';
import {devAssert} from '../../../src/log';

/**
 * @typedef {{
 *  element: HTMLMetaElement,
 *  originalContent: ?string,
 * }}
 */
let MetaInfoDef;

/**
 * Used to store / retrieve the meta theme color info for a document.
 */
const META_THEME_COLOR_INFO = '__AMP_META_THEME_COLOR_INFO';

/**
 * Creates a `<meta name='theme-color">` element and appends it to the head.
 * @param {!Document} doc
 * @return {!HTMLMetaElement} The `<meta>` element.
 */
function createMetaThemeColor(doc) {
  const meta = doc.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '';
  doc.head.appendChild(meta);
  return /** @type {!HTMLMetaElement} */ (meta);
}

/**
 * Gets the infor for the `<meta name="theme-color">` element, creating one if
 * necessary.
 * @param {!Document} doc
 * @return {!MetaInfoDef} Information about the meta tag.
 */
function getMetaThemeColorInfo(doc) {
  if (!doc[META_THEME_COLOR_INFO]) {
    doc[META_THEME_COLOR_INFO] = {
      element:
        doc.querySelector('meta[name="theme-color"]') ||
        createMetaThemeColor(doc),
      originalContent: null,
      rgb: null,
    };
  }

  const metaInfo = doc[META_THEME_COLOR_INFO];

  if (metaInfo.originalContent == null) {
    metaInfo.originalContent = metaInfo.element.content;
  }

  return metaInfo;
}

/**
 * @param {!MetaInfoDef} metaInfo Information about the meta tag.
 */
function clearMetaThemeColorInfo(metaInfo) {
  metaInfo.originalContent = null;
}

/**
 * Sets the tint for the meta tag. This is animated between the start and end
 * colors, unless the `currentTime` config is passed, which causes the value
 * to be set immediately to the interpolated value instead.
 *
 * This uses the web animations API to parse the color values and do the
 * interpolation. An alternative would be to parse the color values
 *
 * If the web animations API is not supported, then no animation or
 * interpolation is performed, and the color is set to the end color.
 *
 * @param {!MetaInfoDef} metaInfo Information about the meta tag.
 * @param {?string} startColor The color to start on.
 * @param {?string} endColor The color to end on.
 * @param {!{
 *   currentTime: (number|undefined),
 *   timing: string,
 *   duration: number,
 *   delay: number,
 * }} config
 */
function updateTint(metaInfo, startColor, endColor, config) {
  const el = metaInfo.element;

  // If we have no animations support, just set the color directly. Also, if we
  // do not know the start color or end color (i.e. no `<meta name="theme-color"
  // was present on the page), we cannot animate. We cannot assume the default
  // color is white, because the browser could be in dark mode.
  if (!el.animate || !endColor || !startColor) {
    el.content = endColor;
    return;
  }

  try {
    const anim = el.animate(
      [
        {
          backgroundColor: startColor,
        },
        {
          backgroundColor: endColor,
        },
      ],
      {
        duration: config.duration,
        // Negative delays do not appear to work (like animationDelay), so only set
        // a delay if it is positive. The delay is set as the currentTime if it is
        // negative.
        delay: Math.max(config.delay, 0),
        fill: 'forwards',
      }
    );

    if (config.delay < 0) {
      anim.currentTime = -config.delay;
    }

    // We want to use `currentTime` to interpolate a value, so we simply pause
    // the animation at the desired time to read the value.
    if (config.currentTime) {
      anim.currentTime = config.currentTime;
      anim.pause();
    }

    // As long as the animation is running, read the computed background color
    // and set it on the meta element.
    requestAnimationFrame(function step() {
      const win = el.ownerDocument.defaultView;

      // `devAssert` and casting does not seem to make Closure Compiler happy
      // enough, still thinks it can be `null`?
      if (!win) {
        return;
      }

      el.content = computedStyle(win, el)['backgroundColor'];

      if (anim.playState == 'running' || anim.playState == 'pending') {
        requestAnimationFrame(step);
      }
    });
  } catch (e) {
    // The animation could fail, if a bad color was specified.
  }
}

/**
 * @param {!Document} doc
 * @param {number} percentage A percentage that the status bar should be
 *    darkened, between zero and one.
 */
export function darkenMetaThemeColor(doc, percentage = 1) {
  devAssert(percentage >= 0);
  devAssert(percentage <= 1);

  const metaInfo = getMetaThemeColorInfo(doc);
  updateTint(metaInfo, metaInfo.originalContent, 'black', {
    currentTime: percentage * 100,
    timing: 'linear',
    duration: 100,
    delay: 0,
  });
}

/**
 * @param {!Document} doc
 * @param {{
 *   timing: string,
 *   duration: number,
 *   delay: number,
 * }} config
 */
export function setMetaThemeColorToBlack(doc, config) {
  const metaInfo = getMetaThemeColorInfo(doc);
  const currentColor = metaInfo.element.content;
  const endColor = 'black';
  updateTint(metaInfo, currentColor, endColor, config);
}

/**
 * Restores the meta theme color.
 * @param {!Document} doc
 * @param {{
 *   timing: string,
 *   duration: number,
 *   delay: number,
 * }} config
 */
export function restoreMetaThemeColor(doc, config) {
  const metaInfo = getMetaThemeColorInfo(doc);
  const currentColor = metaInfo.element.content;
  const endColor = metaInfo.originalContent;
  updateTint(metaInfo, currentColor, endColor, config);
  clearMetaThemeColorInfo(metaInfo);
}
