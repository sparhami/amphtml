/**
 * @typedef {{
 *   mediaQueryList: MediaQueryList,
 *   value: string,
 * }}
 */
let MediaQueriesListAndValueDef;

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

    /** @private @const {!Object<string, !MediaQueriesListAndValueDef>} */
    this.mediaQueryListsAndValues_ = {};
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
    const prevMqlv = this.mediaQueryListsAndValues_[name];
    // Need to explicitly clear the onchange. Otherwise the underlying
    // MediqaQueryLists will still be active with their callbacks.
    if (prevMqlv) {
      this.setOnchange_(prevMqlv, null);
    }

    const mqlv = this.getMediaQueryListsAndValues_(newValue);
    const notifyIfChanged = () => {
      this.notifyIfChanged_(name, this.getMatchingValue_(mqlv));
    };
    // Listen for future changes.
    this.setOnchange_(mqlv, notifyIfChanged);
    // Make sure to run once with the current value.
    notifyIfChanged();
    this.mediaQueryListsAndValues_[name] = mqlv;
  }

  /**
   * @param {string} value
   * @return {!Array<MediaQueriesListAndValueDef>}
   * @private
   */
  getMediaQueryListsAndValues_(value) {
    return value.split(',').map(part => {
      // Find the value portion by looking at the end.
      const {index} = /[a-z0-9.]+$/.exec(part);
      const value = part.slice(index);
      // The media query is everything before the value.
      const mediaQuery = part.slice(0, index).trim();
      const mediaQueryList = window.matchMedia(mediaQuery);

      return {
        mediaQueryList,
        value,
      };
    });
  }

  /**
   * @param {!Array<MediaQueriesListAndValueDef>} mediaQueryListsAndValues
   * @return {string} The value for the first matching MediaQuery, or an empty
   *    string if none match.
   * @private
   */
  getMatchingValue_(mediaQueryListsAndValues) {
    for (let i = 0; i < mediaQueryListsAndValues.length; i++) {
      const {mediaQueryList, value} = mediaQueryListsAndValues[i];
      if (mediaQueryList.matches) {
        return value;
      }
    }

    return '';
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
   * Sets the onchange for each of the associated MediaQueryLists.
   * @param {!Array<!MediaQueriesListAndValueDef>} mediaQueryListsAndValues
   * @param {function()} fn
   * @private
   */
  setOnchange_(mediaQueryListsAndValues, fn) {
    mediaQueryListsAndValues.forEach(({mediaQueryList}) => {
      mediaQueryList.onchange = fn;
    });
  }
}
