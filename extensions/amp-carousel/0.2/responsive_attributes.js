import { debounceToMicrotask } from "./debounce-to-microtask";

/**
 * @typedef {{
 *   mediaQueryList: MediaQueryList,
 *   value: string,
 * }}
 */
let MediaQueriesListAndValue;

/**
 * @param {string} value 
 * @return {!Array<MediaQueriesListAndValue>} 
 */
function getMediaQueryListsAndValues(value) {
  return value.split(',').map(part => {
    const {index} = /[a-z0-9.]+$/.exec(part);
    const value = part.slice(index);
    const mediaQuery = part.slice(0, index).trim();
    const mediaQueryList = window.matchMedia(mediaQuery);

    return {
      mediaQueryList,
      value, 
    };
  });
}

/**
 * Manages a list of MediaQueries and associated values.
 */
class MediaQueryManager {
  /**
   * @param {!Array<MediaQueriesListAndValue>} mediaQueryListAndValues 
   */
  constructor(mediaQueryListAndValues) {
    /** @private {?function} */
    this.onchange_= null;

    /**
     * @private @const
     */
    this.mediaQueryListsAndValues_ = mediaQueryListAndValues;
  }

  /**
   * @return {?function} The current onchange function.
   */
  get onchange() {
    return this.onchange_;
  }

  /**
   * @param {?function} fn The function to run on change. Note: you MUST clear
   *    this (set to null) in order to stop getting changes. If you lose the
   *    reference to the MediaQueryManager, this will keep invoking the
   *    callbacks on change and will leak memory.
   */
  set onchange(fn) {
    this.onchange_ = fn;

    if (!fn) {
      this.updateOnchange_(null);
    } else {
      this.updateOnchange_(debounceToMicrotask(() => {
        fn(this.getMatchingValue());
      }));
    }
  }
  
  /**
   * @return {string} The value for the first matching MediaQuery, or an empty
   *    string if none match.
   */
  getMatchingValue() {
    for (const {mediaQueryList, value} of this.mediaQueryListsAndValues_) {
      if (mediaQueryList.matches) {
        return value;
      }
    }

    return '';
  }

  /**
   * @param {?function} onchange Updates the onchange function for each of
   *    the `MediaQueriesList`s.
   */
  updateOnchange_(onchange) {
    for (const {mediaQueryList} of this.mediaQueryListsAndValues_) {
      mediaQueryList.onchange = onchange;
    }
  }
}

/**
 * Manages attributes that can respond to media queries. Uses a provided config
 * Object invoke callback functions when the matching value changes. When an
 * attribute changes, `updateAttribute` should be called with the name of the
 * attribute along with the responsive MediaQuery/value pairs. This is a comma
 * separated list of media queries followed by values.
 * 
 * Some examples:
 * 
 * * "(min-width: 600px) true, false"
 * * "(min-width: 600px) 5, (min-width: 500px) 4, 3"
 * * "(min-width: 600px) and (min-height: 800px) 5, 3"
 * * "false"
 * * "(min-width: 600px) true"
 * 
 * The first value for the first media query in the list that matches is used.
 * If there are no matching media queries, the value is an empty string.
 */
export class ResponsiveAttributes {
  /**
   * @param {!Object<string, function(string)} config A mapping of attribute
   *    names to functions that should handle them.
   */
  constructor(config) {
    /** @private @const */
    this.config_ = config;
    
    /** @private @const {!Object<string, string>} */
    this.existingValuesMap_ = {};

    /** @private @const {!Object<string, !MediaQueryManager>} */
    this.mediaQueryManagers_ = {};
  }

  /**
   * Notifies the configured handler function if the value of the attribute
   * has changed since the previous call.
   * @param {string} name The name of the attribute.
   * @param {string} value The value of the attribute.
   * @private
   */
  notifyIfChanged_(name, value) {
    if (this.existingValuesMap_[name] === value) {
      return;
    }

    const fn = this.config_[name];
    if (fn) {
      fn(value);
    }

    this.existingValuesMap_[name] = value;
  }

  /**
   * Updates an attribute, calling the configured attribute handler with the
   * new matching value, if it has changed. Whenever the matching media query
   * changes, the matching value will be checked to see if it has changed. If
   * so, the attribute handler is called.
   * @param {string} name The name of the attribute.
   * @param {string} newValue The new value for the attribute.
   */
  updateAttribute(name, newValue) {
    const prevMqm = this.mediaQueryManagers_[name];
    // Need to explicitly clear the onchange. Otherwise the underlying
    // MediqaQueryLists will still be active with their callbacks.
    if (prevMqm) {
      prevMqm.onchange = null;
    }

    const newMqm = new MediaQueryManager(getMediaQueryListsAndValues(newValue));
    newMqm.onchange = (newValue) => {
      this.notifyIfChanged_(name, newValue);
    };
    // Make sure to run once with the current value.
    this.notifyIfChanged_(name, newMqm.getMatchingValue());
    this.mediaQueryManagers_[name] = newMqm;
  }
}