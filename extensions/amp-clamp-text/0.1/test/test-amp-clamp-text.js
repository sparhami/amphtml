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

import '../amp-clamp-text';
import {setStyles} from '../../../../src/style';

const loremText = `
  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur ullamcorper turpis vel commodo scelerisque. Phasellus
  luctus nunc ut elit cursus, et imperdiet diam vehicula. Duis et nisi sed urna blandit bibendum et sit amet erat.
  Suspendisse potenti. Curabitur consequat volutpat arcu nec elementum. Etiam a turpis ac libero varius condimentum.
  Maecenas sollicitudin felis aliquam tortor vulputate, ac posuere velit semper.
`;

describes.realWin('amp-clamp-text', {
  amp: {
    extensions: ['amp-clamp-text'],
  },
}, env => {

  let doc;
  let win;

  function afterRenderPromise() {
    return new Promise(resolve => {
      win.requestAnimationFrame(() => {
        win.setTimeout(() => {
          resolve();
        });
      });
    });
  }

  beforeEach(() => {
    win = env.win;
    doc = win.document;
  });

  async function createElement(content, {width, height}) {
    const element = win.document.createElement('amp-clamp-text');
    element.setAttribute('layout', 'fixed');
    element.setAttribute('width', width);
    element.setAttribute('height', height);
    setStyles(element, {
      fontSize: '10px',
      lineHeight: '1.3',
    });
    element.innerHTML = content;
    doc.body.appendChild(element);
    await element.build();
    await element.layoutCallback();

    return element;
  }

  function getChildNodes(element) {
    return 'attachShadow' in element ?
        element.childNodes :
        element.querySelector('.i-amphtml-clamp-text-content').childNodes;
  }

  it('should clamp text for a single Text Node', async () => {
    const element = await createElement(loremText, {
      width: 150,
      height: 26,
    });

    expect(element.scrollHeight).to.equal(26);
    expect(element.textContent).to.match(/… $/);
  });

  it('should not clamp text for short text', async () => {
    const element = await createElement('\n  Hello world\n  ', {
      width: 150,
      height: 26,
    });

    expect(element.scrollHeight).to.equal(26);
    // Leading/trailing whitespace should be preserved.
    expect(element.textContent).to.equal('\n  Hello world\n  ');
  });

  it('should clear out text nodes after the overflow', async() => {
    const element = await createElement(`
      ${loremText}
      <span></span>
      world
    `, {
      width: 150,
      height: 26,
    });
    const childNodes = getChildNodes(element);
    const endTextNode = childNodes[2];

    expect(childNodes).to.have.length(3);
    expect(endTextNode.textContent.trim()).to.be.empty;
    expect(element.scrollHeight).to.equal(26);
  });

  it('should hide content after the overlow', async() => {
    const element = await createElement(`
      ${loremText}
      <button style="padding: 6px">Hello</button>
      world
    `, {
      width: 150,
      height: 26,
    });
    const childNodes = getChildNodes(element);
    const button = childNodes[1];

    expect(childNodes).to.have.length(3);
    expect(button.offsetHeight).to.equal(0);
    expect(element.scrollHeight).to.equal(26);
  });

  it('should not ellipsize empty text nodes', async() => {
    const element = await createElement(`
      ${loremText}
      <span></span>
      <span></span>
    `, {
      width: 150,
      height: 26,
    });
    const childNodes = getChildNodes(element);
    const emptyTextNode = childNodes[2];

    expect(childNodes).to.have.length(5);
    expect(emptyTextNode.textContent.trim()).to.be.empty;
    expect(element.scrollHeight).to.equal(26);
  });

  it('should restore text nodes on re-layout', async() => {
    const element = await createElement('Hello world', {
      width: 10,
      height: 13,
    });

    expect(element.scrollHeight).to.equal(13);
    expect(element.textContent).to.match(/… $/);

    setStyles(element, {
      width: '80px',
      height: '13px',
    });
    await element.layoutCallback();

    expect(element.textContent).to.equal('Hello world');
    expect(element.scrollHeight).to.equal(13);
  });

  it('should restore content on re-layout', async() => {
    const element = await createElement(`
      Hello world this is some text that wraps and pushes off the button
      <button>Hello</button>
    `, {
      width: 40,
      height: 26,
    });
    const childNodes = getChildNodes(element);
    const button = childNodes[1];

    expect(childNodes).to.have.length(3);
    expect(button.offsetHeight).to.equal(0);
    expect(button.offsetWidth).to.equal(0);

    setStyles(element, {
      width: '100px',
      height: '52px',
    });
    await element.layoutCallback();

    expect(button.offsetHeight).to.be.gt(0);
    expect(button.offsetWidth).to.be.gt(0);
  });

  it('should clamp again on re-layout', async() => {
    const element = await createElement('Hello world', {
      width: 10,
      height: 13,
    });

    expect(element.scrollHeight).to.equal(13);
    expect(element.textContent).to.match(/… $/);

    setStyles(element, {
      width: '24px',
      height: '13px',
    });
    await element.layoutCallback();

    expect(element.scrollHeight).to.equal(13);
    expect(element.textContent).to.match(/… $/);
  });

  it('should clamp again on text changes', async() => {
    const element = await createElement('Hello world', {
      width: 10,
      height: 13,
    });
    const childNodes = getChildNodes(element);

    childNodes[0].data = 'Good night and good luck';
    await element.implementation_.mutateElement(() => {});

    expect(element.scrollHeight).to.equal(13);
    expect(element.textContent).to.match(/^Good/);
    expect(element.textContent).to.match(/… $/);
  });

  describe('overflow element', () => {
    it('should be shown when overflowing', async() => {
      const element = await createElement(`
        ${loremText}
        <button class="amp-clamp-overflow" style="padding: 6px">See more</button>
        world
      `, {
        width: 150,
        height: 26,
      });
      const childNodes = getChildNodes(element);
      const button = childNodes[1];
      const endTextNode = childNodes[2];
  
      expect(childNodes).to.have.length(3);
      expect(endTextNode.textContent.trim()).to.be.empty;
      expect(button.offsetHeight).to.gt(0);
      expect(button.offsetWidth).to.gt(0);
      expect(button.textContent).to.equal('See more');
      expect(element.scrollHeight).to.equal(26);
    });
  
    it('should be hidden when not overflowing', async() => {
      const element = await createElement(`
        Hello world
        <button class="amp-clamp-overflow" style="padding: 6px">See more</button>
      `, {
        width: 150,
        height: 26,
      });
      const childNodes = getChildNodes(element);
      const button = childNodes[1];
  
      expect(childNodes).to.have.length(3);
      expect(button.offsetHeight).to.equal(0);
      expect(button.offsetWidth).to.equal(0);
      expect(element.scrollHeight).to.equal(26);
    });

    it('should be hidden when not overflowing after re-layout', async() => {
      const element = await createElement(`
        ${loremText}
        <button class="amp-clamp-overflow" style="padding: 6px">See more</button>
        world
      `, {
        width: 150,
        height: 26,
      });

      const childNodes = getChildNodes(element);
      const button = childNodes[1];

      setStyles(element, {
        width: '400px',
        height: '600px',
      });
      await element.layoutCallback();

      expect(button.offsetHeight).to.equal(0);
      expect(button.offsetWidth).to.equal(0);
      expect(element.scrollHeight).to.equal(600);
    });
  });
});