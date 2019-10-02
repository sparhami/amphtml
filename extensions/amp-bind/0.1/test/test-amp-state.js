/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
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

import '../amp-bind';
import * as xhrUtils from '../../../../src/utils/xhr-utils';
import {ActionTrust} from '../../../../src/action-constants';
import {Services} from '../../../../src/services';
import {UrlReplacementPolicy} from '../../../../src/batched-json';

describes.realWin(
  'AmpState',
  {
    amp: {
      runtimeOn: false,
      extensions: ['amp-bind:0.1'],
    },
  },
  env => {
    let win;
    let sandbox;
    let ampdoc;

    let element;
    let ampState;
    let bind;

    // Viewer-related vars.
    let whenFirstVisiblePromise;
    let whenFirstVisiblePromiseResolve;
    let whenFirstVisiblePromiseReject;

    function getAmpState() {
      const el = win.document.createElement('amp-state');
      el.setAttribute('id', 'myAmpState');
      win.document.body.appendChild(el);
      return el;
    }

    beforeEach(() => {
      ({win, sandbox, ampdoc} = env);

      whenFirstVisiblePromise = new Promise((resolve, reject) => {
        whenFirstVisiblePromiseResolve = resolve;
        whenFirstVisiblePromiseReject = reject;
      });
      sandbox.stub(ampdoc, 'whenFirstVisible').returns(whenFirstVisiblePromise);
      sandbox.stub(ampdoc, 'hasBeenVisible').returns(false);

      element = getAmpState();
      ampState = element.implementation_;

      sandbox
        .stub(xhrUtils, 'getViewerAuthTokenIfAvailable')
        .returns(Promise.resolve());

      // TODO(choumx): Remove stubbing of private function fetch_() once
      // batchFetchJsonFor() is easily stub-able.
      sandbox
        .stub(ampState, 'fetch_')
        .returns(Promise.resolve({remote: 'data'}));

      bind = {setState: sandbox.stub()};
      sandbox.stub(Services, 'bindForDocOrNull').resolves(bind);
    });

    it('should not fetch until doc is visible', async () => {
      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      whenFirstVisiblePromiseReject();
      await whenFirstVisiblePromise.catch(() => {});

      expect(ampState.fetch_).to.not.have.been.called;
      expect(bind.setState).to.not.have.been.called;
    });

    it('should fetch if `src` attribute exists', async () => {
      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      whenFirstVisiblePromiseResolve();
      await whenFirstVisiblePromise;

      // await one macro-task to let viewer/fetch promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ampState.fetch_).to.have.been.calledOnce;
      expect(ampState.fetch_).to.have.been.calledWithExactly(
        /* ampdoc */ sinon.match.any,
        UrlReplacementPolicy.ALL,
        /* refresh */ sinon.match.falsy,
        /* token */ sinon.match.falsy
      );

      expect(bind.setState).calledWithMatch(
        {myAmpState: {remote: 'data'}},
        true,
        false
      );
    });

    it('should trigger "fetch-error" if fetch fails', async () => {
      ampState.fetch_.returns(Promise.reject());

      const actions = {trigger: sandbox.spy()};
      sandbox.stub(Services, 'actionServiceForDoc').returns(actions);

      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      expect(actions.trigger).to.not.have.been.called;

      whenFirstVisiblePromiseResolve();
      await whenFirstVisiblePromise;

      // await one macro-task to let viewer/fetch promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(actions.trigger).to.have.been.calledWithExactly(
        element,
        'fetch-error',
        /* event */ null,
        ActionTrust.LOW
      );
    });

    it('should register "refresh" action', async () => {
      sandbox.spy(ampState, 'registerAction');

      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      expect(ampState.registerAction).calledWithExactly(
        'refresh',
        sinon.match.any,
        ActionTrust.HIGH
      );
    });

    it('should fetch on "refresh"', async () => {
      sandbox.spy(ampState, 'registerAction');

      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      const action = {method: 'refresh', satisfiesTrust: () => true};
      await ampState.executeAction(action);

      // Fetch via "refresh" should also wait for doc visible.
      expect(ampState.fetch_).to.not.have.been.called;
      expect(bind.setState).to.not.have.been.called;

      whenFirstVisiblePromiseResolve();
      await whenFirstVisiblePromise;

      // await one macro-task to let viewer/fetch promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      // One call from build(), one call from "refresh" action.
      expect(ampState.fetch_).to.have.been.calledTwice;
    });

    it('should parse its child script', async () => {
      element.innerHTML =
        '<script type="application/json">{"local": "data"}</script>';
      await element.build();

      expect(bind.setState).calledWithMatch(
        {myAmpState: {local: 'data'}},
        true,
        false
      );

      // await one macro-task to let viewer/fetch promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ampState.fetch_).to.not.have.been.called;
    });

    it('should parse child and fetch `src` if both provided', async () => {
      element.innerHTML =
        '<script type="application/json">{"local": "data"}</script>';
      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      await element.build();

      // No fetch should happen until doc is visible.
      expect(ampState.fetch_).to.not.have.been.called;
      expect(bind.setState).calledWithMatch(
        {myAmpState: {local: 'data'}},
        true,
        false
      );

      whenFirstVisiblePromiseResolve();
      await whenFirstVisiblePromise;

      // await a single macro-task to let promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(bind.setState).calledWithMatch(
        {myAmpState: {remote: 'data'}},
        true,
        false
      );
    });

    it('should not fetch if `src` is mutated and doc is not visible', () => {
      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      // No fetch should happen until doc is visible.
      expect(ampState.fetch_).to.not.have.been.called;

      allowConsoleError(() => {
        element.mutatedAttributesCallback({src: 'https://foo.com/bar?baz=1'});
      });

      // Doc still not visible.
      expect(ampState.fetch_).to.not.have.been.called;
    });

    it('should fetch json if `src` is mutated', async () => {
      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.build();

      // No fetch should happen until doc is visible.
      expect(ampState.fetch_).to.not.have.been.called;

      ampdoc.hasBeenVisible.returns(true);

      element.mutatedAttributesCallback({src: 'https://foo.com/bar?baz=1'});

      whenFirstVisiblePromiseResolve();
      await whenFirstVisiblePromise;

      // await a single macro-task to let promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ampState.fetch_).to.have.been.called;
      expect(bind.setState).calledWithMatch(
        {myAmpState: {remote: 'data'}},
        false,
        true
      );
    });

    it('should use token with [crossorigin="amp-viewer-auth-token-via-post"]`', async () => {
      xhrUtils.getViewerAuthTokenIfAvailable.returns(
        Promise.resolve('idToken')
      );

      element.setAttribute('src', 'https://foo.com/bar?baz=1');
      element.setAttribute('crossorigin', 'amp-viewer-auth-token-via-post');
      element.build();

      whenFirstVisiblePromiseResolve();
      await whenFirstVisiblePromise;

      // await a single macro-task to let promise chains resolve.
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ampState.fetch_).to.have.been.calledOnce;
      expect(ampState.fetch_).to.have.been.calledWithExactly(
        /* ampdoc */ sinon.match.any,
        UrlReplacementPolicy.ALL,
        /* refresh */ sinon.match.falsy,
        'idToken'
      );

      expect(bind.setState).calledWithMatch(
        {myAmpState: {remote: 'data'}},
        true,
        false
      );
    });
  }
);
