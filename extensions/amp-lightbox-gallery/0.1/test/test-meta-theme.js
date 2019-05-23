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

import {darkenMetaThemeColor, restoreMetaThemeColor} from '../meta-theme';

describes.realWin('amp-lightbox-gallery', {}, env => {
  let win, doc;

  function animationFramePromise() {
    return new Promise(resolve => {
      requestAnimationFrame(resolve);
    });
  }

  function getMetaThemeColorElement() {
    return doc.querySelector('meta[name="theme-color"]');
  }

  function createMetaThemeColor(color) {
    const meta = doc.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    doc.head.appendChild(meta);
  }

  beforeEach(() => {
    win = env.win;
    doc = win.document;
  });

  describe('default meta theme', function() {
    it('should be created if none exists', async() => {
      darkenMetaThemeColor(doc, 1);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(0, 0, 0)');
    });

    it('should clear the content when restoring', async () => {
      darkenMetaThemeColor(doc, 1);
      restoreMetaThemeColor(doc, {
        duration: 0,
        timing: 'linear',
        delay: 0,
      });
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(255, 255, 255)');
    });
  });

  describe('initial theme color', () => {
    it('should handle color names', async () => {
      createMetaThemeColor('red');
      darkenMetaThemeColor(doc, 0.5);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(128, 0, 0)');
    });

    it('should handle color hex', async () => {
      createMetaThemeColor('#ff0000');
      darkenMetaThemeColor(doc, 0.5);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(128, 0, 0)');
    });

    it('should handle color rgb', async () => {
      createMetaThemeColor('rgb(255, 0, 0)');
      darkenMetaThemeColor(doc, 0.5);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(128, 0, 0)');
    });

    it('should handle color hsl', async () => {
      createMetaThemeColor('hsl(0, 100%, 50%)');
      darkenMetaThemeColor(doc, 0.5);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(128, 0, 0)');
    });
  });

  describe('theme color modifications', function() {
    beforeEach(() => {
      createMetaThemeColor('rgb(10, 20, 200)');
    });

    it('should darken to black', async () => {
      darkenMetaThemeColor(doc, 1);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(0, 0, 0)');
    });

    it('should lighten to the original color', async () => {
      darkenMetaThemeColor(doc, 0);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(10, 20, 200)');
    });

    it('should lighten part way', async () => {
      darkenMetaThemeColor(doc, 0.25);
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(8, 15, 150)');
    });

    it('should restore to the original color', async () => {
      // Call multiple times, make sure we restore to the original.
      darkenMetaThemeColor(doc, 1);
      darkenMetaThemeColor(doc, 0.8);
      darkenMetaThemeColor(doc, 0.3);
      restoreMetaThemeColor(doc, {
        duration: 0,
        timing: 'linear',
        delay: 0,
      });
      await animationFramePromise();

      const el = getMetaThemeColorElement();
      expect(el.content).to.equal('rgb(10, 20, 200)');
    });
  });
});
