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

/**
 * @fileoverview Embeds a Megaphone podcast
 *
 * Example:
 * <code>
 * <amp-megaphone
 *   height=166
 *   data-episode="DEM6617440160"
 *   data-light="true"
 *   layout="fixed-height">
 * </amp-megaphone>
 */

import {addParamsToUrl} from '../../../src/url';
import {dict} from '../../../src/utils/object';
import {getData, listen} from '../../../src/event-helper';
import {isLayoutSizeFixed} from '../../../src/layout';
import {isObject} from '../../../src/types';
import {removeElement} from '../../../src/dom';
import {startsWith} from '../../../src/string';
import {tryParseJson} from '../../../src/json';
import {userAssert} from '../../../src/log';

class AmpMegaphone extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {?Element} */
    this.iframe_ = null;

    /** @private {?Function} */
    this.unlistenMessage_ = null;

    /** @private {boolean} */
    this.isPlaylist_ = false;

    /** @private {string} */
    this.baseUrl_ = '';
  }

  /**
   * @param {boolean=} opt_onLayout
   * @override
   */
  preconnectCallback(opt_onLayout) {
    // Pre-connects to the iframe source itself
    this.preconnect.url(this.baseUrl_, opt_onLayout);
    // Pre-connects to the megaphone static documents server (serves CSS and JS)
    this.preconnect.url('https://assets.megaphone.fm', opt_onLayout);
    // Pre-connects to the image assets server (for UI elements and playlist cover art)
    this.preconnect.url('https://megaphone.imgix.net', opt_onLayout);
  }

  /** @override */
  isLayoutSupported(layout) {
    return isLayoutSizeFixed(layout);
  }

  /** @override */
  buildCallback() {
    this.updateBaseUrl_();
  }

  /** @override */
  mutatedAttributesCallback() {
    this.updateBaseUrl_();
    if (this.iframe_) {
      this.iframe_.src = this.getIframeSrc_();
    }
  }

  /**@override*/
  layoutCallback() {
    const iframe = this.element.ownerDocument.createElement('iframe');

    iframe.setAttribute('frameborder', 'no');
    iframe.setAttribute('scrolling', 'no');

    iframe.src = this.getIframeSrc_();

    this.unlistenMessage_ = listen(
      this.win,
      'message',
      this.handleMegaphoneMessages_.bind(this)
    );

    this.applyFillContent(iframe);
    this.element.appendChild(iframe);

    this.iframe_ = iframe;

    return this.loadPromise(iframe);
  }

  /** @override */
  unlayoutCallback() {
    if (this.iframe_) {
      removeElement(this.iframe_);
      this.iframe_ = null;
    }
    if (this.unlistenMessage_) {
      this.unlistenMessage_();
    }
    return true; // Call layoutCallback again.
  }

  /**
   * @return {string}
   * @private
   */
  getIframeSrc_() {
    this.updateBaseUrl_();

    const mediaid = userAssert(
      this.element.getAttribute('data-playlist') ||
        this.element.getAttribute('data-episode'),
      'data-playlist or data-episode is required for <amp-megaphone> %s',
      this.element
    );

    const hasLightTheme = this.element.hasAttribute('data-light');
    const hasSharing = this.element.hasAttribute('data-sharing');
    const episodes = this.element.getAttribute('data-episodes');
    const start = this.element.getAttribute('data-start');
    const hasTile = this.element.hasAttribute('data-tile');

    const queryParams = dict({
      'p': this.isPlaylist_ ? mediaid : undefined,
      'light': hasLightTheme || undefined,
      'sharing': hasSharing || undefined,
      'episodes': (this.isPlaylist_ && episodes) || undefined,
      'start': (!this.isPlaylist_ && start) || undefined,
      'tile': (!this.isPlaylist_ && hasTile) || undefined,
    });

    return addParamsToUrl(
      this.baseUrl_ + '/' + (this.isPlaylist_ ? '' : mediaid + '/'),
      queryParams
    );
  }

  /**
   * @private
   */
  updateBaseUrl_() {
    this.isPlaylist_ = this.element.hasAttribute('data-playlist');
    this.baseUrl_ = `https://${
      this.isPlaylist_ ? 'playlist' : 'player'
    }.megaphone.fm`;
  }

  /**
   * @param {!Event} event
   * @private
   * */
  handleMegaphoneMessages_(event) {
    if (
      event.origin != this.baseUrl_ ||
      event.source != this.iframe_.contentWindow
    ) {
      return;
    }
    const eventData = getData(event);
    if (
      !eventData ||
      !(
        isObject(eventData) ||
        startsWith(/** @type {string} */ (eventData), '{')
      )
    ) {
      return;
    }
    const data = isObject(eventData) ? eventData : tryParseJson(eventData);
    if (data['context'] == 'iframe.resize') {
      const height = data['height'];
      this.attemptChangeHeight(height).catch(() => {});
    }
  }

  /** @override */
  pauseCallback() {
    if (this.iframe_ && this.iframe_.contentWindow) {
      this.iframe_.contentWindow./*OK*/ postMessage(
        JSON.stringify(dict({'method': 'pause'})),
        this.baseUrl_
      );
    }
  }
}

AMP.extension('amp-megaphone', '0.1', AMP => {
  AMP.registerElement('amp-megaphone', AmpMegaphone);
});
