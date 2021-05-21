require.config({"config": {
        "jsbuild":{"mage/utils/template.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n\n/* eslint-disable no-shadow */\n\ndefine([\n    'jquery',\n    'underscore',\n    'mage/utils/objects',\n    'mage/utils/strings'\n], function ($, _, utils, stringUtils) {\n    'use strict';\n\n    var tmplSettings = _.templateSettings,\n        interpolate = /\\$\\{([\\s\\S]+?)\\}/g,\n        opener = '${',\n        template,\n        hasStringTmpls;\n\n    /**\n     * Identifies whether ES6 templates are supported.\n     */\n    hasStringTmpls = (function () {\n        var testString = 'var foo = \"bar\"; return `${ foo }` === foo';\n\n        try {\n            return Function(testString)();\n        } catch (e) {\n            return false;\n        }\n    })();\n\n    /**\n     * Objects can specify how to use templating for their properties - getting that configuration.\n     *\n     * To disable rendering for all properties of your object add __disableTmpl: true.\n     * To disable for specific property add __disableTmpl: {propertyName: true}.\n     * To limit recursion for a specific property add __disableTmpl: {propertyName: numberOfCycles}.\n     *\n     * @param {String} tmpl\n     * @param {Object | undefined} target\n     * @returns {Boolean|Object}\n     */\n    function isTmplIgnored(tmpl, target) {\n        var parsedTmpl;\n\n        try {\n            parsedTmpl = JSON.parse(tmpl);\n\n            if (typeof parsedTmpl === 'object') {\n                return tmpl.includes('__disableTmpl');\n            }\n        } catch (e) {\n        }\n\n        if (typeof target !== 'undefined') {\n            if (typeof target === 'object' && target.hasOwnProperty('__disableTmpl')) {\n                return target.__disableTmpl;\n            }\n        }\n\n        return false;\n\n    }\n\n    if (hasStringTmpls) {\n\n        /*eslint-disable no-unused-vars, no-eval*/\n        /**\n         * Evaluates template string using ES6 templates.\n         *\n         * @param {String} tmpl - Template string.\n         * @param {Object} $ - Data object used in a template.\n         * @returns {String} Compiled template.\n         */\n        template = function (tmpl, $) {\n            return eval('`' + tmpl + '`');\n        };\n\n        /*eslint-enable no-unused-vars, no-eval*/\n    } else {\n\n        /**\n         * Fallback function used when ES6 templates are not supported.\n         * Uses underscore templates renderer.\n         *\n         * @param {String} tmpl - Template string.\n         * @param {Object} data - Data object used in a template.\n         * @returns {String} Compiled template.\n         */\n        template = function (tmpl, data) {\n            var cached = tmplSettings.interpolate;\n\n            tmplSettings.interpolate = interpolate;\n\n            tmpl = _.template(tmpl, {\n                variable: '$'\n            })(data);\n\n            tmplSettings.interpolate = cached;\n\n            return tmpl;\n        };\n    }\n\n    /**\n     * Checks if provided value contains template syntax.\n     *\n     * @param {*} value - Value to be checked.\n     * @returns {Boolean}\n     */\n    function isTemplate(value) {\n        return typeof value === 'string' &&\n            value.indexOf(opener) !== -1 &&\n            // the below pattern almost always indicates an accident which should not cause template evaluation\n            // refuse to evaluate\n            value.indexOf('${{') === -1;\n    }\n\n    /**\n     * Iteratively processes provided string\n     * until no templates syntax will be found.\n     *\n     * @param {String} tmpl - Template string.\n     * @param {Object} data - Data object used in a template.\n     * @param {Boolean} [castString=false] - Flag that indicates whether template\n     *      should be casted after evaluation to a value of another type or\n     *      that it should be leaved as a string.\n     * @param {Number|undefined} maxCycles - Maximum number of rendering cycles, can be 0.\n     * @returns {*} Compiled template.\n     */\n    function render(tmpl, data, castString, maxCycles) {\n        var last = tmpl,\n            cycles = 0;\n\n        while (~tmpl.indexOf(opener) && (typeof maxCycles === 'undefined' || cycles < maxCycles)) {\n            if (!isTmplIgnored(tmpl)) {\n                tmpl = template(tmpl, data);\n            }\n\n            if (tmpl === last) {\n                break;\n            }\n\n            last = tmpl;\n            cycles++;\n        }\n\n        return castString ?\n            stringUtils.castString(tmpl) :\n            tmpl;\n    }\n\n    return {\n\n        /**\n         * Applies provided data to the template.\n         *\n         * @param {Object|String} tmpl\n         * @param {Object} [data] - Data object to match with template.\n         * @param {Boolean} [castString=false] - Flag that indicates whether template\n         *      should be casted after evaluation to a value of another type or\n         *      that it should be leaved as a string.\n         * @returns {*}\n         *\n         * @example Template defined as a string.\n         *      var source = { foo: 'Random Stuff', bar: 'Some' };\n         *\n         *      utils.template('${ $.bar } ${ $.foo }', source);\n         *      => 'Some Random Stuff';\n         *\n         * @example Template defined as an object.\n         *      var tmpl = {\n         *              key: {'${ $.$data.bar }': '${ $.$data.foo }'},\n         *              foo: 'bar',\n         *              x1: 2, x2: 5,\n         *              delta: '${ $.x2 - $.x1 }',\n         *              baz: 'Upper ${ $.foo.toUpperCase() }'\n         *      };\n         *\n         *      utils.template(tmpl, source);\n         *      => {\n         *          key: {'Some': 'Random Stuff'},\n         *          foo: 'bar',\n         *          x1: 2, x2: 5,\n         *          delta: 3,\n         *          baz: 'Upper BAR'\n         *      };\n         */\n        template: function (tmpl, data, castString, dontClone) {\n            if (typeof tmpl === 'string') {\n                return render(tmpl, data, castString);\n            }\n\n            if (!dontClone) {\n                tmpl = utils.copy(tmpl);\n            }\n\n            tmpl.$data = data || {};\n\n            /**\n             * Template iterator function.\n             */\n            _.each(tmpl, function iterate(value, key, list) {\n                var disabled,\n                    maxCycles;\n\n                if (key === '$data') {\n                    return;\n                }\n\n                if (isTemplate(key)) {\n                    delete list[key];\n\n                    key = render(key, tmpl);\n                    list[key] = value;\n                }\n\n                if (isTemplate(value)) {\n                    //Getting template disabling settings, can be true for all disabled and separate settings\n                    //for each property.\n                    disabled = isTmplIgnored(value, list);\n\n                    if (typeof disabled === 'object' && disabled.hasOwnProperty(key) && disabled[key] !== false) {\n                        //Checking if specific settings for a property provided.\n                        maxCycles = disabled[key];\n                    }\n\n                    if (disabled === true || maxCycles === true) {\n                        //Rendering for all properties is disabled.\n                        maxCycles = 0;\n                    }\n\n                    list[key] = render(value, tmpl, castString, maxCycles);\n                } else if ($.isPlainObject(value) || Array.isArray(value)) {\n                    _.each(value, iterate);\n                }\n            });\n\n            delete tmpl.$data;\n\n            return tmpl;\n        }\n    };\n});\n","mage/utils/misc.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n\ndefine([\n    'underscore',\n    'jquery',\n    'mage/utils/objects'\n], function (_, $, utils) {\n    'use strict';\n\n    var defaultAttributes,\n        ajaxSettings,\n        map;\n\n    defaultAttributes = {\n        method: 'post',\n        enctype: 'multipart/form-data'\n    };\n\n    ajaxSettings = {\n        default: {\n            method: 'POST',\n            cache: false,\n            processData: false,\n            contentType: false\n        },\n        simple: {\n            method: 'POST',\n            dataType: 'json'\n        }\n    };\n\n    map = {\n        'D': 'DDD',\n        'dd': 'DD',\n        'd': 'D',\n        'EEEE': 'dddd',\n        'EEE': 'ddd',\n        'e': 'd',\n        'yyyy': 'YYYY',\n        'yy': 'YY',\n        'y': 'YYYY',\n        'a': 'A'\n    };\n\n    return {\n\n        /**\n         * Generates a unique identifier.\n         *\n         * @param {Number} [size=7] - Length of a resulting identifier.\n         * @returns {String}\n         */\n        uniqueid: function (size) {\n            var code = Math.random() * 25 + 65 | 0,\n                idstr = String.fromCharCode(code);\n\n            size = size || 7;\n\n            while (idstr.length < size) {\n                code = Math.floor(Math.random() * 42 + 48);\n\n                if (code < 58 || code > 64) {\n                    idstr += String.fromCharCode(code);\n                }\n            }\n\n            return idstr;\n        },\n\n        /**\n         * Limits function call.\n         *\n         * @param {Object} owner\n         * @param {String} target\n         * @param {Number} limit\n         */\n        limit: function (owner, target, limit) {\n            var fn = owner[target];\n\n            owner[target] = _.debounce(fn.bind(owner), limit);\n        },\n\n        /**\n         * Converts mage date format to a moment.js format.\n         *\n         * @param {String} mageFormat\n         * @returns {String}\n         */\n        normalizeDate: function (mageFormat) {\n            var result = mageFormat;\n\n            _.each(map, function (moment, mage) {\n                result = result.replace(mage, moment);\n            });\n\n            return result;\n        },\n\n        /**\n         * Puts provided value in range of min and max parameters.\n         *\n         * @param {Number} value - Value to be located.\n         * @param {Number} min - Min value.\n         * @param {Number} max - Max value.\n         * @returns {Number}\n         */\n        inRange: function (value, min, max) {\n            return Math.min(Math.max(min, value), max);\n        },\n\n        /**\n         * Serializes and sends data via POST request.\n         *\n         * @param {Object} options - Options object that consists of\n         *      a 'url' and 'data' properties.\n         * @param {Object} attrs - Attributes that will be added to virtual form.\n         */\n        submit: function (options, attrs) {\n            var form        = document.createElement('form'),\n                data        = utils.serialize(options.data),\n                attributes  = _.extend({}, defaultAttributes, attrs || {});\n\n            if (!attributes.action) {\n                attributes.action = options.url;\n            }\n\n            data['form_key'] = window.FORM_KEY;\n\n            _.each(attributes, function (value, name) {\n                form.setAttribute(name, value);\n            });\n\n            data = _.map(\n                data,\n                function (value, name) {\n                    return '<input type=\"hidden\" ' +\n                        'name=\"' + _.escape(name) + '\" ' +\n                        'value=\"' + _.escape(value) + '\"' +\n                        ' />';\n                }\n            ).join('');\n\n            form.insertAdjacentHTML('afterbegin', data);\n            document.body.appendChild(form);\n\n            form.submit();\n        },\n\n        /**\n         * Serializes and sends data via AJAX POST request.\n         *\n         * @param {Object} options - Options object that consists of\n         *      a 'url' and 'data' properties.\n         * @param {Object} config\n         */\n        ajaxSubmit: function (options, config) {\n            var t = new Date().getTime(),\n                settings;\n\n            options.data['form_key'] = window.FORM_KEY;\n            options.data = this.prepareFormData(options.data, config.ajaxSaveType);\n            settings = _.extend({}, ajaxSettings[config.ajaxSaveType], options || {});\n\n            if (!config.ignoreProcessEvents) {\n                $('body').trigger('processStart');\n            }\n\n            return $.ajax(settings)\n                .done(function (data) {\n                    if (config.response) {\n                        data.t = t;\n                        config.response.data(data);\n                        config.response.status(undefined);\n                        config.response.status(!data.error);\n                    }\n                })\n                .fail(function () {\n                    config.response.status(undefined);\n                    config.response.status(false);\n                    config.response.data({\n                        error: true,\n                        messages: 'Something went wrong.',\n                        t: t\n                    });\n                })\n                .always(function () {\n                    if (!config.ignoreProcessEvents) {\n                        $('body').trigger('processStop');\n                    }\n                });\n        },\n\n        /**\n         * Creates FormData object and append this data.\n         *\n         * @param {Object} data\n         * @param {String} type\n         * @returns {FormData}\n         */\n        prepareFormData: function (data, type) {\n            var formData;\n\n            if (type === 'default') {\n                formData = new FormData();\n                _.each(utils.serialize(data), function (val, name) {\n                    formData.append(name, val);\n                });\n            } else if (type === 'simple') {\n                formData = utils.serialize(data);\n            }\n\n            return formData;\n        },\n\n        /**\n         * Filters data object. Finds properties with suffix\n         * and sets their values to properties with the same name without suffix.\n         *\n         * @param {Object} data - The data object that should be filtered\n         * @param {String} suffix - The string by which data object should be filtered\n         * @param {String} separator - The string that is separator between property and suffix\n         *\n         * @returns {Object} Filtered data object\n         */\n        filterFormData: function (data, suffix, separator) {\n            data = data || {};\n            suffix = suffix || 'prepared-for-send';\n            separator = separator || '-';\n\n            _.each(data, function (value, key) {\n                if (_.isObject(value) && !Array.isArray(value)) {\n                    this.filterFormData(value, suffix, separator);\n                } else if (_.isString(key) && ~key.indexOf(suffix)) {\n                    data[key.split(separator)[0]] = value;\n                    delete data[key];\n                }\n            }, this);\n\n            return data;\n        },\n\n        /**\n         * Replaces special characters with their corresponding HTML entities.\n         *\n         * @param {String} string - Text to escape.\n         * @returns {String} Escaped text.\n         */\n        escape: function (string) {\n            return string ? $('<p/>').text(string).html().replace(/\"/g, '&quot;') : string;\n        },\n\n        /**\n         * Replaces symbol codes with their unescaped counterparts.\n         *\n         * @param {String} data\n         *\n         * @returns {String}\n         */\n        unescape: function (data) {\n            var unescaped = _.unescape(data),\n                mapCharacters = {\n                    '&#039;': '\\''\n                };\n\n            _.each(mapCharacters, function (value, key) {\n                unescaped = unescaped.replace(key, value);\n            });\n\n            return unescaped;\n        },\n\n        /**\n         * Converts PHP IntlFormatter format to moment format.\n         *\n         * @param {String} format - PHP format\n         * @returns {String} - moment compatible formatting\n         */\n        convertToMomentFormat: function (format) {\n            var newFormat;\n\n            newFormat = format.replace(/yyyy|yy|y/, 'YYYY'); // replace the year\n            newFormat = newFormat.replace(/dd|d/g, 'DD'); // replace the date\n\n            return newFormat;\n        },\n\n        /**\n         * Get Url Parameters.\n         *\n         * @param {String} url - Url string\n         * @returns {Object}\n         */\n        getUrlParameters: function (url) {\n            var params = {},\n                queries = url.split('?'),\n                temp,\n                i,\n                l;\n\n            if (!queries[1]) {\n                return params;\n            }\n\n            queries = queries[1].split('&');\n\n            for (i = 0, l = queries.length; i < l; i++) {\n                temp = queries[i].split('=');\n\n                if (temp[1]) {\n                    params[temp[0]] = decodeURIComponent(temp[1].replace(/\\+/g, '%20'));\n                } else {\n                    params[temp[0]] = '';\n                }\n            }\n\n            return params;\n        }\n    };\n});\n","mage/utils/arrays.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n\ndefine([\n    'underscore',\n    './strings'\n], function (_, utils) {\n    'use strict';\n\n    /**\n     * Defines index of an item in a specified container.\n     *\n     * @param {*} item - Item whose index should be defined.\n     * @param {Array} container - Container upon which to perform search.\n     * @returns {Number}\n     */\n    function getIndex(item, container) {\n        var index = container.indexOf(item);\n\n        if (~index) {\n            return index;\n        }\n\n        return _.findIndex(container, function (value) {\n            return value && value.name === item;\n        });\n    }\n\n    return {\n        /**\n         * Facade method to remove/add value from/to array\n         * without creating a new instance.\n         *\n         * @param {Array} arr - Array to be modified.\n         * @param {*} value - Value to add/remove.\n         * @param {Boolean} add - Flag that specfies operation.\n         * @returns {Utils} Chainable.\n         */\n        toggle: function (arr, value, add) {\n            return add ?\n                this.add(arr, value) :\n                this.remove(arr, value);\n        },\n\n        /**\n         * Removes the incoming value from array in case\n         * without creating a new instance of it.\n         *\n         * @param {Array} arr - Array to be modified.\n         * @param {*} value - Value to be removed.\n         * @returns {Utils} Chainable.\n         */\n        remove: function (arr, value) {\n            var index = arr.indexOf(value);\n\n            if (~index) {\n                arr.splice(index, 1);\n            }\n\n            return this;\n        },\n\n        /**\n         * Adds the incoming value to array if\n         * it's not alredy present in there.\n         *\n         * @param {Array} arr - Array to be modifed.\n         * @param {...*} arguments - Values to be added.\n         * @returns {Utils} Chainable.\n         */\n        add: function (arr) {\n            var values = _.toArray(arguments).slice(1);\n\n            values.forEach(function (value) {\n                if (!~arr.indexOf(value)) {\n                    arr.push(value);\n                }\n            });\n\n            return this;\n        },\n\n        /**\n         * Inserts specified item into container at a specified position.\n         *\n         * @param {*} item - Item to be inserted into container.\n         * @param {Array} container - Container of items.\n         * @param {*} [position=-1] - Position at which item should be inserted.\n         *      Position can represent:\n         *          - specific index in container\n         *          - item which might already be present in container\n         *          - structure with one of these properties: after, before\n         * @returns {Boolean|*}\n         *      - true if element has changed its' position\n         *      - false if nothing has changed\n         *      - inserted value if it wasn't present in container\n         */\n        insert: function (item, container, position) {\n            var currentIndex = getIndex(item, container),\n                newIndex,\n                target;\n\n            if (typeof position === 'undefined') {\n                position = -1;\n            } else if (typeof position === 'string') {\n                position = isNaN(+position) ? position : +position;\n            }\n\n            newIndex = position;\n\n            if (~currentIndex) {\n                target = container.splice(currentIndex, 1)[0];\n\n                if (typeof item === 'string') {\n                    item = target;\n                }\n            }\n\n            if (typeof position !== 'number') {\n                target = position.after || position.before || position;\n\n                newIndex = getIndex(target, container);\n\n                if (~newIndex && (position.after || newIndex >= currentIndex)) {\n                    newIndex++;\n                }\n            }\n\n            if (newIndex < 0) {\n                newIndex += container.length + 1;\n            }\n\n            container[newIndex] ?\n                container.splice(newIndex, 0, item) :\n                container[newIndex] = item;\n\n            return !~currentIndex ? item : currentIndex !== newIndex;\n        },\n\n        /**\n         * @param {Array} elems\n         * @param {Number} offset\n         * @return {Number|*}\n         */\n        formatOffset: function (elems, offset) {\n            if (utils.isEmpty(offset)) {\n                offset = -1;\n            }\n\n            offset = +offset;\n\n            if (offset < 0) {\n                offset += elems.length + 1;\n            }\n\n            return offset;\n        }\n    };\n});\n","mage/app/config.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n\n/**\n * @deprecated since version 2.2.0\n */\n/* eslint-disable strict */\ndefine([], function () {\n    return {\n        /**\n         * Get base url.\n         */\n        getBaseUrl: function () {\n            return this.values.baseUrl;\n        },\n\n        /**\n         * Get form key.\n         */\n        getFormKey: function () {\n            return this.values.formKey;\n        }\n    };\n});\n","mage/requirejs/resolver.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\ndefine([\n    'underscore',\n    'domReady!'\n], function (_) {\n    'use strict';\n\n    var context = require.s.contexts._,\n        execCb = context.execCb,\n        registry = context.registry,\n        callbacks = [],\n        retries = 10,\n        updateDelay = 1,\n        ready,\n        update;\n\n    /**\n     * Checks if provided callback already exists in the callbacks list.\n     *\n     * @param {Object} callback - Callback object to be checked.\n     * @returns {Boolean}\n     */\n    function isSubscribed(callback) {\n        return !!_.findWhere(callbacks, callback);\n    }\n\n    /**\n     * Checks if provided module is rejected during load.\n     *\n     * @param {Object} module - Module to be checked.\n     * @return {Boolean}\n     */\n    function isRejected(module) {\n        return registry[module.id] && (registry[module.id].inited || registry[module.id].error);\n    }\n\n    /**\n     * Checks if provided module had path fallback triggered.\n     *\n     * @param {Object} module - Module to be checked.\n     * @return {Boolean}\n     */\n    function isPathFallback(module) {\n        return registry[module.id] && registry[module.id].events.error;\n    }\n\n    /**\n     * Checks if provided module has unresolved dependencies.\n     *\n     * @param {Object} module - Module to be checked.\n     * @returns {Boolean}\n     */\n    function isPending(module) {\n        if (!module.depCount) {\n            return false;\n        }\n\n        return module.depCount >\n            _.filter(module.depMaps, isRejected).length + _.filter(module.depMaps, isPathFallback).length;\n    }\n\n    /**\n     * Checks if requirejs's registry object contains pending modules.\n     *\n     * @returns {Boolean}\n     */\n    function hasPending() {\n        return _.some(registry, isPending);\n    }\n\n    /**\n     * Checks if 'resolver' module is in ready\n     * state and that there are no pending modules.\n     *\n     * @returns {Boolean}\n     */\n    function isReady() {\n        return ready && !hasPending();\n    }\n\n    /**\n     * Invokes provided callback handler.\n     *\n     * @param {Object} callback\n     */\n    function invoke(callback) {\n        callback.handler.call(callback.ctx);\n    }\n\n    /**\n     * Sets 'resolver' module to a ready state\n     * and invokes pending callbacks.\n     */\n    function resolve() {\n        ready = true;\n\n        callbacks.splice(0).forEach(invoke);\n    }\n\n    /**\n     * Drops 'ready' flag and runs the update process.\n     */\n    function tick() {\n        ready = false;\n\n        update(retries);\n    }\n\n    /**\n     * Adds callback which will be invoked\n     * when all of the pending modules are initiated.\n     *\n     * @param {Function} handler - 'Ready' event handler function.\n     * @param {Object} [ctx] - Optional context with which handler\n     *      will be invoked.\n     */\n    function subscribe(handler, ctx) {\n        var callback = {\n            handler: handler,\n            ctx: ctx\n        };\n\n        if (!isSubscribed(callback)) {\n            callbacks.push(callback);\n\n            if (isReady()) {\n                _.defer(tick);\n            }\n        }\n    }\n\n    /**\n     * Checks for all modules to be initiated\n     * and invokes pending callbacks if it's so.\n     *\n     * @param {Number} [retry] - Number of retries\n     *      that will be used to repeat the 'update' function\n     *      invokation in case if there are no pending requests.\n     */\n    update = _.debounce(function (retry) {\n        if (!hasPending()) {\n            retry ? update(--retry) : resolve();\n        }\n    }, updateDelay);\n\n    /**\n     * Overrides requirejs's original 'execCb' method\n     * in order to track pending modules.\n     *\n     * @returns {*} Result of original method call.\n     */\n    context.execCb = function () {\n        var exported = execCb.apply(context, arguments);\n\n        tick();\n\n        return exported;\n    };\n\n    return subscribe;\n});\n","mage/requirejs/baseUrlResolver.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n\n/**\n * Sample configuration:\n *\n require.config({\n        \"config\": {\n            \"baseUrlInterceptor\": {\n                \"Magento_Ui/js/lib/knockout/bindings/collapsible.js\": \"../../../../frontend/Magento/luma/en_US/\"\n            }\n        }\n    });\n */\n\n/* global jsSuffixRegExp */\n/* eslint-disable max-depth */\ndefine('baseUrlInterceptor', [\n    'module'\n], function (module) {\n    'use strict';\n\n    /**\n     * RequireJS Context object\n     */\n    var ctx = require.s.contexts._,\n\n        /**\n         * Original function\n         *\n         * @type {Function}\n         */\n        origNameToUrl = ctx.nameToUrl,\n\n        /**\n         * Original function\n         *\n         * @type {Function}\n         */\n        newContextConstr = require.s.newContext;\n\n    /**\n     * Remove dots from URL\n     *\n     * @param {Array} ary\n     */\n    function trimDots(ary) {\n        var i, part, length = ary.length;\n\n        for (i = 0; i < length; i++) {\n            part = ary[i];\n\n            if (part === '.') {\n                ary.splice(i, 1);\n                i -= 1;\n            } else if (part === '..') {\n                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {\n                    //End of the line. Keep at least one non-dot\n                    //path segment at the front so it can be mapped\n                    //correctly to disk. Otherwise, there is likely\n                    //no path mapping for a path starting with '..'.\n                    //This can still fail, but catches the most reasonable\n                    //uses of ..\n                    break;\n                } else if (i > 0) {\n                    ary.splice(i - 1, 2);\n                    i -= 2;\n                }\n            }\n        }\n    }\n\n    /**\n     * Normalize URL string (remove '/../')\n     *\n     * @param {String} name\n     * @param {String} baseName\n     * @param {Object} applyMap\n     * @param {Object} localContext\n     * @returns {*}\n     */\n    function normalize(name, baseName, applyMap, localContext) {\n        var lastIndex,\n            baseParts = baseName && baseName.split('/'),\n            normalizedBaseParts = baseParts;\n\n        //Adjust any relative paths.\n        if (name && name.charAt(0) === '.') {\n            //If have a base name, try to normalize against it,\n            //otherwise, assume it is a top-level require that will\n            //be relative to baseUrl in the end.\n            if (baseName) {\n                //Convert baseName to array, and lop off the last part,\n                //so that . matches that 'directory' and not name of the baseName's\n                //module. For instance, baseName of 'one/two/three', maps to\n                //'one/two/three.js', but we want the directory, 'one/two' for\n                //this normalization.\n                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);\n                name = name.split('/');\n                lastIndex = name.length - 1;\n\n                // If wanting node ID compatibility, strip .js from end\n                // of IDs. Have to do this here, and not in nameToUrl\n                // because node allows either .js or non .js to map\n                // to same file.\n                if (localContext.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {\n                    name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');\n                }\n\n                name = normalizedBaseParts.concat(name);\n                trimDots(name);\n                name = name.join('/');\n            } else if (name.indexOf('./') === 0) {\n                // No baseName, so this is ID is resolved relative\n                // to baseUrl, pull off the leading dot.\n                name = name.substring(2);\n            }\n        }\n\n        return name;\n    }\n\n    /**\n     * Get full url.\n     *\n     * @param {Object} context\n     * @param {String} url\n     * @return {String}\n     */\n    function getUrl(context, url) {\n        var baseUrl = context.config.baseUrl,\n            newConfig = context.config,\n            modulePath = url.replace(baseUrl, ''),\n            newBaseUrl,\n            rewrite = module.config()[modulePath];\n\n        if (!rewrite) {\n            return url;\n        }\n\n        newBaseUrl = normalize(rewrite, baseUrl, undefined, newConfig);\n\n        return newBaseUrl + modulePath;\n    }\n\n    /**\n     * Replace original function.\n     *\n     * @returns {*}\n     */\n    ctx.nameToUrl = function () {\n        return getUrl(ctx, origNameToUrl.apply(ctx, arguments));\n    };\n\n    /**\n     * Replace original function.\n     *\n     * @return {*}\n     */\n    require.s.newContext = function () {\n        var newCtx = newContextConstr.apply(require.s, arguments),\n            newOrigNameToUrl = newCtx.nameToUrl;\n\n        /**\n         * New implementation of native function.\n         *\n         * @returns {String}\n         */\n        newCtx.nameToUrl = function () {\n            return getUrl(newCtx, newOrigNameToUrl.apply(newCtx, arguments));\n        };\n\n        return newCtx;\n    };\n});\n\nrequire(['baseUrlInterceptor'], function () {\n    'use strict';\n\n});\n","mage/requirejs/text.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n/* inspired by http://github.com/requirejs/text */\n/*global XMLHttpRequest, XDomainRequest */\n\ndefine(['module'], function (module) {\n    'use strict';\n\n    var xmlRegExp = /^\\s*<\\?xml(\\s)+version=[\\'\\\"](\\d)*.(\\d)*[\\'\\\"](\\s)*\\?>/im,\n        bodyRegExp = /<body[^>]*>\\s*([\\s\\S]+)\\s*<\\/body>/im,\n        stripReg = /!strip$/i,\n        defaultConfig = module.config && module.config() || {};\n\n    /**\n     * Strips <?xml ...?> declarations so that external SVG and XML documents can be\n     * added to a document without worry.\n     * Also, if the string is an HTML document, only the part inside the body tag is returned.\n     *\n     * @param {String} external\n     * @returns {String}\n     */\n    function stripContent(external) {\n        var matches;\n\n        if (!external) {\n            return '';\n        }\n\n        matches = external.match(bodyRegExp);\n        external = matches ?\n            matches[1] :\n            external.replace(xmlRegExp, '');\n\n        return external;\n    }\n\n    /**\n     * Checks that url match current location\n     *\n     * @param {String} url\n     * @returns {Boolean}\n     */\n    function sameDomain(url) {\n        var uProtocol, uHostName, uPort,\n            xdRegExp = /^([\\w:]+)?\\/\\/([^\\/\\\\]+)/i,\n            location = window.location,\n            match = xdRegExp.exec(url);\n\n        if (!match) {\n            return true;\n        }\n        uProtocol = match[1];\n        uHostName = match[2];\n\n        uHostName = uHostName.split(':');\n        uPort = uHostName[1] || '';\n        uHostName = uHostName[0];\n\n        return (!uProtocol || uProtocol === location.protocol) &&\n            (!uHostName || uHostName.toLowerCase() === location.hostname.toLowerCase()) &&\n            (!uPort && !uHostName || uPort === location.port);\n    }\n\n    /**\n     * @returns {XMLHttpRequest|XDomainRequest|null}\n     */\n    function createRequest(url) {\n        var xhr = new XMLHttpRequest();\n\n        if (!sameDomain(url) && typeof XDomainRequest !== 'undefined') {\n            xhr = new XDomainRequest();\n        }\n\n        return xhr;\n    }\n\n    /**\n     * XHR requester. Returns value to callback.\n     *\n     * @param {String} url\n     * @param {Function} callback\n     * @param {Function} fail\n     * @param {Object} headers\n     */\n    function getContent(url, callback, fail, headers) {\n        var xhr = createRequest(url),\n            header;\n\n        xhr.open('GET', url);\n\n        /*eslint-disable max-depth */\n        if ('setRequestHeader' in xhr && headers) {\n            for (header in headers) {\n                if (headers.hasOwnProperty(header)) {\n                    xhr.setRequestHeader(header.toLowerCase(), headers[header]);\n                }\n            }\n        }\n\n        /**\n         * @inheritdoc\n         */\n        xhr.onreadystatechange = function () {\n            var status, err;\n\n            //Do not explicitly handle errors, those should be\n            //visible via console output in the browser.\n            if (xhr.readyState === 4) {\n                status = xhr.status || 0;\n\n                if (status > 399 && status < 600) {\n                    //An http 4xx or 5xx error. Signal an error.\n                    err = new Error(url + ' HTTP status: ' + status);\n                    err.xhr = xhr;\n\n                    if (fail) {\n                        fail(err);\n                    }\n                } else {\n                    callback(xhr.responseText);\n\n                    if (defaultConfig.onXhrComplete) {\n                        defaultConfig.onXhrComplete(xhr, url);\n                    }\n                }\n            }\n        };\n\n        /*eslint-enable max-depth */\n\n        if (defaultConfig.onXhr) {\n            defaultConfig.onXhr(xhr, url);\n        }\n\n        xhr.send();\n    }\n\n    /**\n     * Main method used by RequireJs.\n     *\n     * @param {String} name - has format: some.module.filext!strip\n     * @param {Function} req\n     * @param {Function|undefined} onLoad\n     */\n    function loadContent(name, req, onLoad) {\n\n        var toStrip = stripReg.test(name),\n            url = req.toUrl(name.replace(stripReg, '')),\n            headers = defaultConfig.headers;\n\n        getContent(url, function (content) {\n                content = toStrip ? stripContent(content) : content;\n                onLoad(content);\n            }, onLoad.error, headers);\n    }\n\n    return {\n        load: loadContent,\n        get: getContent\n    };\n});\n","mage/view/composite.js":"/**\n * Copyright \u00a9 Magento, Inc. All rights reserved.\n * See COPYING.txt for license details.\n */\n\n/**\n * @deprecated since version 2.2.0\n */\n/* eslint-disable strict */\ndefine(['jquery'], function ($) {\n    return function () {\n        var renderedChildren = {},\n            children = {};\n\n        return {\n            /**\n             * @param {*} child\n             * @param {String} key\n             */\n            addChild: function (child, key) {\n                children[key] = child;\n            },\n\n            /**\n             * @param {*} root\n             */\n            render: function (root) {\n                $.each(children, function (key, child) {\n                    var childRoot = $('<div>');\n\n                    renderedChildren[key] = child.render(childRoot);\n                    root.append(childRoot);\n                });\n            }\n        };\n    };\n});\n"}
}});
