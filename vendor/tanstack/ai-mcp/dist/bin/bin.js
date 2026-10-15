#!/usr/bin/env node
import {
  __commonJS,
  __esm,
  __export,
  __require,
  __toCommonJS,
  __toESM,
  init_esm_shims
} from "./chunk-K3ER4CT6.js";

// ../../node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/lodash.js
var require_lodash = __commonJS({
  "../../node_modules/.pnpm/lodash@4.17.21/node_modules/lodash/lodash.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    (function() {
      var undefined2;
      var VERSION = "4.17.21";
      var LARGE_ARRAY_SIZE = 200;
      var CORE_ERROR_TEXT = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", FUNC_ERROR_TEXT = "Expected a function", INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`";
      var HASH_UNDEFINED = "__lodash_hash_undefined__";
      var MAX_MEMOIZE_SIZE = 500;
      var PLACEHOLDER = "__lodash_placeholder__";
      var CLONE_DEEP_FLAG = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG = 4;
      var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
      var WRAP_BIND_FLAG = 1, WRAP_BIND_KEY_FLAG = 2, WRAP_CURRY_BOUND_FLAG = 4, WRAP_CURRY_FLAG = 8, WRAP_CURRY_RIGHT_FLAG = 16, WRAP_PARTIAL_FLAG = 32, WRAP_PARTIAL_RIGHT_FLAG = 64, WRAP_ARY_FLAG = 128, WRAP_REARG_FLAG = 256, WRAP_FLIP_FLAG = 512;
      var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
      var HOT_COUNT = 800, HOT_SPAN = 16;
      var LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2, LAZY_WHILE_FLAG = 3;
      var INFINITY = 1 / 0, MAX_SAFE_INTEGER = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
      var MAX_ARRAY_LENGTH = 4294967295, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
      var wrapFlags = [
        ["ary", WRAP_ARY_FLAG],
        ["bind", WRAP_BIND_FLAG],
        ["bindKey", WRAP_BIND_KEY_FLAG],
        ["curry", WRAP_CURRY_FLAG],
        ["curryRight", WRAP_CURRY_RIGHT_FLAG],
        ["flip", WRAP_FLIP_FLAG],
        ["partial", WRAP_PARTIAL_FLAG],
        ["partialRight", WRAP_PARTIAL_RIGHT_FLAG],
        ["rearg", WRAP_REARG_FLAG]
      ];
      var argsTag = "[object Arguments]", arrayTag = "[object Array]", asyncTag = "[object AsyncFunction]", boolTag = "[object Boolean]", dateTag = "[object Date]", domExcTag = "[object DOMException]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", nullTag = "[object Null]", objectTag = "[object Object]", promiseTag = "[object Promise]", proxyTag = "[object Proxy]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", undefinedTag = "[object Undefined]", weakMapTag = "[object WeakMap]", weakSetTag = "[object WeakSet]";
      var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
      var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
      var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g, reUnescapedHtml = /[&<>"']/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
      var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
      var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
      var reTrimStart = /^\s+/;
      var reWhitespace = /\s/;
      var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/, reSplitDetails = /,? & /;
      var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
      var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
      var reEscapeChar = /\\(\\)?/g;
      var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
      var reFlags = /\w*$/;
      var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
      var reIsBinary = /^0b[01]+$/i;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsOctal = /^0o[0-7]+$/i;
      var reIsUint = /^(?:0|[1-9]\d*)$/;
      var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
      var reNoMatch = /($^)/;
      var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
      var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
      var rsApos = "['\u2019]", rsAstral = "[" + rsAstralRange + "]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
      var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
      var reApos = RegExp(rsApos, "g");
      var reComboMark = RegExp(rsCombo, "g");
      var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
      var reUnicodeWord = RegExp([
        rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
        rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
        rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
        rsUpper + "+" + rsOptContrUpper,
        rsOrdUpper,
        rsOrdLower,
        rsDigits,
        rsEmoji
      ].join("|"), "g");
      var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
      var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
      var contextProps = [
        "Array",
        "Buffer",
        "DataView",
        "Date",
        "Error",
        "Float32Array",
        "Float64Array",
        "Function",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Map",
        "Math",
        "Object",
        "Promise",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "TypeError",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "WeakMap",
        "_",
        "clearTimeout",
        "isFinite",
        "parseInt",
        "setTimeout"
      ];
      var templateCounter = -1;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
      typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
      var cloneableTags = {};
      cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
      cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
      var deburredLetters = {
        // Latin-1 Supplement block.
        "\xC0": "A",
        "\xC1": "A",
        "\xC2": "A",
        "\xC3": "A",
        "\xC4": "A",
        "\xC5": "A",
        "\xE0": "a",
        "\xE1": "a",
        "\xE2": "a",
        "\xE3": "a",
        "\xE4": "a",
        "\xE5": "a",
        "\xC7": "C",
        "\xE7": "c",
        "\xD0": "D",
        "\xF0": "d",
        "\xC8": "E",
        "\xC9": "E",
        "\xCA": "E",
        "\xCB": "E",
        "\xE8": "e",
        "\xE9": "e",
        "\xEA": "e",
        "\xEB": "e",
        "\xCC": "I",
        "\xCD": "I",
        "\xCE": "I",
        "\xCF": "I",
        "\xEC": "i",
        "\xED": "i",
        "\xEE": "i",
        "\xEF": "i",
        "\xD1": "N",
        "\xF1": "n",
        "\xD2": "O",
        "\xD3": "O",
        "\xD4": "O",
        "\xD5": "O",
        "\xD6": "O",
        "\xD8": "O",
        "\xF2": "o",
        "\xF3": "o",
        "\xF4": "o",
        "\xF5": "o",
        "\xF6": "o",
        "\xF8": "o",
        "\xD9": "U",
        "\xDA": "U",
        "\xDB": "U",
        "\xDC": "U",
        "\xF9": "u",
        "\xFA": "u",
        "\xFB": "u",
        "\xFC": "u",
        "\xDD": "Y",
        "\xFD": "y",
        "\xFF": "y",
        "\xC6": "Ae",
        "\xE6": "ae",
        "\xDE": "Th",
        "\xFE": "th",
        "\xDF": "ss",
        // Latin Extended-A block.
        "\u0100": "A",
        "\u0102": "A",
        "\u0104": "A",
        "\u0101": "a",
        "\u0103": "a",
        "\u0105": "a",
        "\u0106": "C",
        "\u0108": "C",
        "\u010A": "C",
        "\u010C": "C",
        "\u0107": "c",
        "\u0109": "c",
        "\u010B": "c",
        "\u010D": "c",
        "\u010E": "D",
        "\u0110": "D",
        "\u010F": "d",
        "\u0111": "d",
        "\u0112": "E",
        "\u0114": "E",
        "\u0116": "E",
        "\u0118": "E",
        "\u011A": "E",
        "\u0113": "e",
        "\u0115": "e",
        "\u0117": "e",
        "\u0119": "e",
        "\u011B": "e",
        "\u011C": "G",
        "\u011E": "G",
        "\u0120": "G",
        "\u0122": "G",
        "\u011D": "g",
        "\u011F": "g",
        "\u0121": "g",
        "\u0123": "g",
        "\u0124": "H",
        "\u0126": "H",
        "\u0125": "h",
        "\u0127": "h",
        "\u0128": "I",
        "\u012A": "I",
        "\u012C": "I",
        "\u012E": "I",
        "\u0130": "I",
        "\u0129": "i",
        "\u012B": "i",
        "\u012D": "i",
        "\u012F": "i",
        "\u0131": "i",
        "\u0134": "J",
        "\u0135": "j",
        "\u0136": "K",
        "\u0137": "k",
        "\u0138": "k",
        "\u0139": "L",
        "\u013B": "L",
        "\u013D": "L",
        "\u013F": "L",
        "\u0141": "L",
        "\u013A": "l",
        "\u013C": "l",
        "\u013E": "l",
        "\u0140": "l",
        "\u0142": "l",
        "\u0143": "N",
        "\u0145": "N",
        "\u0147": "N",
        "\u014A": "N",
        "\u0144": "n",
        "\u0146": "n",
        "\u0148": "n",
        "\u014B": "n",
        "\u014C": "O",
        "\u014E": "O",
        "\u0150": "O",
        "\u014D": "o",
        "\u014F": "o",
        "\u0151": "o",
        "\u0154": "R",
        "\u0156": "R",
        "\u0158": "R",
        "\u0155": "r",
        "\u0157": "r",
        "\u0159": "r",
        "\u015A": "S",
        "\u015C": "S",
        "\u015E": "S",
        "\u0160": "S",
        "\u015B": "s",
        "\u015D": "s",
        "\u015F": "s",
        "\u0161": "s",
        "\u0162": "T",
        "\u0164": "T",
        "\u0166": "T",
        "\u0163": "t",
        "\u0165": "t",
        "\u0167": "t",
        "\u0168": "U",
        "\u016A": "U",
        "\u016C": "U",
        "\u016E": "U",
        "\u0170": "U",
        "\u0172": "U",
        "\u0169": "u",
        "\u016B": "u",
        "\u016D": "u",
        "\u016F": "u",
        "\u0171": "u",
        "\u0173": "u",
        "\u0174": "W",
        "\u0175": "w",
        "\u0176": "Y",
        "\u0177": "y",
        "\u0178": "Y",
        "\u0179": "Z",
        "\u017B": "Z",
        "\u017D": "Z",
        "\u017A": "z",
        "\u017C": "z",
        "\u017E": "z",
        "\u0132": "IJ",
        "\u0133": "ij",
        "\u0152": "Oe",
        "\u0153": "oe",
        "\u0149": "'n",
        "\u017F": "s"
      };
      var htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      var htmlUnescapes = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'"
      };
      var stringEscapes = {
        "\\": "\\",
        "'": "'",
        "\n": "n",
        "\r": "r",
        "\u2028": "u2028",
        "\u2029": "u2029"
      };
      var freeParseFloat = parseFloat, freeParseInt = parseInt;
      var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
      var freeSelf = typeof self == "object" && self && self.Object === Object && self;
      var root = freeGlobal || freeSelf || Function("return this")();
      var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
      var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
      var moduleExports = freeModule && freeModule.exports === freeExports;
      var freeProcess = moduleExports && freeGlobal.process;
      var nodeUtil = (function() {
        try {
          var types = freeModule && freeModule.require && freeModule.require("util").types;
          if (types) {
            return types;
          }
          return freeProcess && freeProcess.binding && freeProcess.binding("util");
        } catch (e) {
        }
      })();
      var nodeIsArrayBuffer = nodeUtil && nodeUtil.isArrayBuffer, nodeIsDate = nodeUtil && nodeUtil.isDate, nodeIsMap = nodeUtil && nodeUtil.isMap, nodeIsRegExp = nodeUtil && nodeUtil.isRegExp, nodeIsSet = nodeUtil && nodeUtil.isSet, nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
      function apply(func, thisArg, args) {
        switch (args.length) {
          case 0:
            return func.call(thisArg);
          case 1:
            return func.call(thisArg, args[0]);
          case 2:
            return func.call(thisArg, args[0], args[1]);
          case 3:
            return func.call(thisArg, args[0], args[1], args[2]);
        }
        return func.apply(thisArg, args);
      }
      function arrayAggregator(array, setter, iteratee, accumulator) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          var value = array[index];
          setter(accumulator, value, iteratee(value), array);
        }
        return accumulator;
      }
      function arrayEach(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (iteratee(array[index], index, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEachRight(array, iteratee) {
        var length = array == null ? 0 : array.length;
        while (length--) {
          if (iteratee(array[length], length, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEvery(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (!predicate(array[index], index, array)) {
            return false;
          }
        }
        return true;
      }
      function arrayFilter(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
        while (++index < length) {
          var value = array[index];
          if (predicate(value, index, array)) {
            result[resIndex++] = value;
          }
        }
        return result;
      }
      function arrayIncludes(array, value) {
        var length = array == null ? 0 : array.length;
        return !!length && baseIndexOf(array, value, 0) > -1;
      }
      function arrayIncludesWith(array, value, comparator) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (comparator(value, array[index])) {
            return true;
          }
        }
        return false;
      }
      function arrayMap(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length, result = Array(length);
        while (++index < length) {
          result[index] = iteratee(array[index], index, array);
        }
        return result;
      }
      function arrayPush(array, values) {
        var index = -1, length = values.length, offset = array.length;
        while (++index < length) {
          array[offset + index] = values[index];
        }
        return array;
      }
      function arrayReduce(array, iteratee, accumulator, initAccum) {
        var index = -1, length = array == null ? 0 : array.length;
        if (initAccum && length) {
          accumulator = array[++index];
        }
        while (++index < length) {
          accumulator = iteratee(accumulator, array[index], index, array);
        }
        return accumulator;
      }
      function arrayReduceRight(array, iteratee, accumulator, initAccum) {
        var length = array == null ? 0 : array.length;
        if (initAccum && length) {
          accumulator = array[--length];
        }
        while (length--) {
          accumulator = iteratee(accumulator, array[length], length, array);
        }
        return accumulator;
      }
      function arraySome(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (predicate(array[index], index, array)) {
            return true;
          }
        }
        return false;
      }
      var asciiSize = baseProperty("length");
      function asciiToArray(string) {
        return string.split("");
      }
      function asciiWords(string) {
        return string.match(reAsciiWord) || [];
      }
      function baseFindKey(collection, predicate, eachFunc) {
        var result;
        eachFunc(collection, function(value, key, collection2) {
          if (predicate(value, key, collection2)) {
            result = key;
            return false;
          }
        });
        return result;
      }
      function baseFindIndex(array, predicate, fromIndex, fromRight) {
        var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
        while (fromRight ? index-- : ++index < length) {
          if (predicate(array[index], index, array)) {
            return index;
          }
        }
        return -1;
      }
      function baseIndexOf(array, value, fromIndex) {
        return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
      }
      function baseIndexOfWith(array, value, fromIndex, comparator) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
          if (comparator(array[index], value)) {
            return index;
          }
        }
        return -1;
      }
      function baseIsNaN(value) {
        return value !== value;
      }
      function baseMean(array, iteratee) {
        var length = array == null ? 0 : array.length;
        return length ? baseSum(array, iteratee) / length : NAN;
      }
      function baseProperty(key) {
        return function(object) {
          return object == null ? undefined2 : object[key];
        };
      }
      function basePropertyOf(object) {
        return function(key) {
          return object == null ? undefined2 : object[key];
        };
      }
      function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
        eachFunc(collection, function(value, index, collection2) {
          accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection2);
        });
        return accumulator;
      }
      function baseSortBy(array, comparer) {
        var length = array.length;
        array.sort(comparer);
        while (length--) {
          array[length] = array[length].value;
        }
        return array;
      }
      function baseSum(array, iteratee) {
        var result, index = -1, length = array.length;
        while (++index < length) {
          var current = iteratee(array[index]);
          if (current !== undefined2) {
            result = result === undefined2 ? current : result + current;
          }
        }
        return result;
      }
      function baseTimes(n, iteratee) {
        var index = -1, result = Array(n);
        while (++index < n) {
          result[index] = iteratee(index);
        }
        return result;
      }
      function baseToPairs(object, props) {
        return arrayMap(props, function(key) {
          return [key, object[key]];
        });
      }
      function baseTrim(string) {
        return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
      }
      function baseUnary(func) {
        return function(value) {
          return func(value);
        };
      }
      function baseValues(object, props) {
        return arrayMap(props, function(key) {
          return object[key];
        });
      }
      function cacheHas(cache, key) {
        return cache.has(key);
      }
      function charsStartIndex(strSymbols, chrSymbols) {
        var index = -1, length = strSymbols.length;
        while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
        }
        return index;
      }
      function charsEndIndex(strSymbols, chrSymbols) {
        var index = strSymbols.length;
        while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
        }
        return index;
      }
      function countHolders(array, placeholder) {
        var length = array.length, result = 0;
        while (length--) {
          if (array[length] === placeholder) {
            ++result;
          }
        }
        return result;
      }
      var deburrLetter = basePropertyOf(deburredLetters);
      var escapeHtmlChar = basePropertyOf(htmlEscapes);
      function escapeStringChar(chr) {
        return "\\" + stringEscapes[chr];
      }
      function getValue(object, key) {
        return object == null ? undefined2 : object[key];
      }
      function hasUnicode(string) {
        return reHasUnicode.test(string);
      }
      function hasUnicodeWord(string) {
        return reHasUnicodeWord.test(string);
      }
      function iteratorToArray(iterator) {
        var data, result = [];
        while (!(data = iterator.next()).done) {
          result.push(data.value);
        }
        return result;
      }
      function mapToArray(map) {
        var index = -1, result = Array(map.size);
        map.forEach(function(value, key) {
          result[++index] = [key, value];
        });
        return result;
      }
      function overArg(func, transform) {
        return function(arg) {
          return func(transform(arg));
        };
      }
      function replaceHolders(array, placeholder) {
        var index = -1, length = array.length, resIndex = 0, result = [];
        while (++index < length) {
          var value = array[index];
          if (value === placeholder || value === PLACEHOLDER) {
            array[index] = PLACEHOLDER;
            result[resIndex++] = index;
          }
        }
        return result;
      }
      function setToArray(set) {
        var index = -1, result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = value;
        });
        return result;
      }
      function setToPairs(set) {
        var index = -1, result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = [value, value];
        });
        return result;
      }
      function strictIndexOf(array, value, fromIndex) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
          if (array[index] === value) {
            return index;
          }
        }
        return -1;
      }
      function strictLastIndexOf(array, value, fromIndex) {
        var index = fromIndex + 1;
        while (index--) {
          if (array[index] === value) {
            return index;
          }
        }
        return index;
      }
      function stringSize(string) {
        return hasUnicode(string) ? unicodeSize(string) : asciiSize(string);
      }
      function stringToArray(string) {
        return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
      }
      function trimmedEndIndex(string) {
        var index = string.length;
        while (index-- && reWhitespace.test(string.charAt(index))) {
        }
        return index;
      }
      var unescapeHtmlChar = basePropertyOf(htmlUnescapes);
      function unicodeSize(string) {
        var result = reUnicode.lastIndex = 0;
        while (reUnicode.test(string)) {
          ++result;
        }
        return result;
      }
      function unicodeToArray(string) {
        return string.match(reUnicode) || [];
      }
      function unicodeWords(string) {
        return string.match(reUnicodeWord) || [];
      }
      var runInContext = (function runInContext2(context) {
        context = context == null ? root : _.defaults(root.Object(), context, _.pick(root, contextProps));
        var Array2 = context.Array, Date2 = context.Date, Error2 = context.Error, Function2 = context.Function, Math2 = context.Math, Object2 = context.Object, RegExp2 = context.RegExp, String2 = context.String, TypeError2 = context.TypeError;
        var arrayProto = Array2.prototype, funcProto = Function2.prototype, objectProto = Object2.prototype;
        var coreJsData = context["__core-js_shared__"];
        var funcToString = funcProto.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var maskSrcKey = (function() {
          var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
          return uid ? "Symbol(src)_1." + uid : "";
        })();
        var nativeObjectToString = objectProto.toString;
        var objectCtorString = funcToString.call(Object2);
        var oldDash = root._;
        var reIsNative = RegExp2(
          "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
        );
        var Buffer2 = moduleExports ? context.Buffer : undefined2, Symbol2 = context.Symbol, Uint8Array2 = context.Uint8Array, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : undefined2, getPrototype = overArg(Object2.getPrototypeOf, Object2), objectCreate = Object2.create, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice, spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : undefined2, symIterator = Symbol2 ? Symbol2.iterator : undefined2, symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined2;
        var defineProperty = (function() {
          try {
            var func = getNative(Object2, "defineProperty");
            func({}, "", {});
            return func;
          } catch (e) {
          }
        })();
        var ctxClearTimeout = context.clearTimeout !== root.clearTimeout && context.clearTimeout, ctxNow = Date2 && Date2.now !== root.Date.now && Date2.now, ctxSetTimeout = context.setTimeout !== root.setTimeout && context.setTimeout;
        var nativeCeil = Math2.ceil, nativeFloor = Math2.floor, nativeGetSymbols = Object2.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined2, nativeIsFinite = context.isFinite, nativeJoin = arrayProto.join, nativeKeys = overArg(Object2.keys, Object2), nativeMax = Math2.max, nativeMin = Math2.min, nativeNow = Date2.now, nativeParseInt = context.parseInt, nativeRandom = Math2.random, nativeReverse = arrayProto.reverse;
        var DataView = getNative(context, "DataView"), Map2 = getNative(context, "Map"), Promise2 = getNative(context, "Promise"), Set2 = getNative(context, "Set"), WeakMap2 = getNative(context, "WeakMap"), nativeCreate = getNative(Object2, "create");
        var metaMap = WeakMap2 && new WeakMap2();
        var realNames = {};
        var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap2);
        var symbolProto = Symbol2 ? Symbol2.prototype : undefined2, symbolValueOf = symbolProto ? symbolProto.valueOf : undefined2, symbolToString = symbolProto ? symbolProto.toString : undefined2;
        function lodash(value) {
          if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
            if (value instanceof LodashWrapper) {
              return value;
            }
            if (hasOwnProperty.call(value, "__wrapped__")) {
              return wrapperClone(value);
            }
          }
          return new LodashWrapper(value);
        }
        var baseCreate = /* @__PURE__ */ (function() {
          function object() {
          }
          return function(proto) {
            if (!isObject(proto)) {
              return {};
            }
            if (objectCreate) {
              return objectCreate(proto);
            }
            object.prototype = proto;
            var result2 = new object();
            object.prototype = undefined2;
            return result2;
          };
        })();
        function baseLodash() {
        }
        function LodashWrapper(value, chainAll) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__chain__ = !!chainAll;
          this.__index__ = 0;
          this.__values__ = undefined2;
        }
        lodash.templateSettings = {
          /**
           * Used to detect `data` property values to be HTML-escaped.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "escape": reEscape,
          /**
           * Used to detect code to be evaluated.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "evaluate": reEvaluate,
          /**
           * Used to detect `data` property values to inject.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "interpolate": reInterpolate,
          /**
           * Used to reference the data object in the template text.
           *
           * @memberOf _.templateSettings
           * @type {string}
           */
          "variable": "",
          /**
           * Used to import variables into the compiled template.
           *
           * @memberOf _.templateSettings
           * @type {Object}
           */
          "imports": {
            /**
             * A reference to the `lodash` function.
             *
             * @memberOf _.templateSettings.imports
             * @type {Function}
             */
            "_": lodash
          }
        };
        lodash.prototype = baseLodash.prototype;
        lodash.prototype.constructor = lodash;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        function LazyWrapper(value) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__dir__ = 1;
          this.__filtered__ = false;
          this.__iteratees__ = [];
          this.__takeCount__ = MAX_ARRAY_LENGTH;
          this.__views__ = [];
        }
        function lazyClone() {
          var result2 = new LazyWrapper(this.__wrapped__);
          result2.__actions__ = copyArray(this.__actions__);
          result2.__dir__ = this.__dir__;
          result2.__filtered__ = this.__filtered__;
          result2.__iteratees__ = copyArray(this.__iteratees__);
          result2.__takeCount__ = this.__takeCount__;
          result2.__views__ = copyArray(this.__views__);
          return result2;
        }
        function lazyReverse() {
          if (this.__filtered__) {
            var result2 = new LazyWrapper(this);
            result2.__dir__ = -1;
            result2.__filtered__ = true;
          } else {
            result2 = this.clone();
            result2.__dir__ *= -1;
          }
          return result2;
        }
        function lazyValue() {
          var array = this.__wrapped__.value(), dir = this.__dir__, isArr = isArray(array), isRight = dir < 0, arrLength = isArr ? array.length : 0, view = getView(0, arrLength, this.__views__), start = view.start, end = view.end, length = end - start, index = isRight ? end : start - 1, iteratees = this.__iteratees__, iterLength = iteratees.length, resIndex = 0, takeCount = nativeMin(length, this.__takeCount__);
          if (!isArr || !isRight && arrLength == length && takeCount == length) {
            return baseWrapperValue(array, this.__actions__);
          }
          var result2 = [];
          outer:
            while (length-- && resIndex < takeCount) {
              index += dir;
              var iterIndex = -1, value = array[index];
              while (++iterIndex < iterLength) {
                var data = iteratees[iterIndex], iteratee2 = data.iteratee, type = data.type, computed = iteratee2(value);
                if (type == LAZY_MAP_FLAG) {
                  value = computed;
                } else if (!computed) {
                  if (type == LAZY_FILTER_FLAG) {
                    continue outer;
                  } else {
                    break outer;
                  }
                }
              }
              result2[resIndex++] = value;
            }
          return result2;
        }
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        function Hash(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function hashClear() {
          this.__data__ = nativeCreate ? nativeCreate(null) : {};
          this.size = 0;
        }
        function hashDelete(key) {
          var result2 = this.has(key) && delete this.__data__[key];
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function hashGet(key) {
          var data = this.__data__;
          if (nativeCreate) {
            var result2 = data[key];
            return result2 === HASH_UNDEFINED ? undefined2 : result2;
          }
          return hasOwnProperty.call(data, key) ? data[key] : undefined2;
        }
        function hashHas(key) {
          var data = this.__data__;
          return nativeCreate ? data[key] !== undefined2 : hasOwnProperty.call(data, key);
        }
        function hashSet(key, value) {
          var data = this.__data__;
          this.size += this.has(key) ? 0 : 1;
          data[key] = nativeCreate && value === undefined2 ? HASH_UNDEFINED : value;
          return this;
        }
        Hash.prototype.clear = hashClear;
        Hash.prototype["delete"] = hashDelete;
        Hash.prototype.get = hashGet;
        Hash.prototype.has = hashHas;
        Hash.prototype.set = hashSet;
        function ListCache(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function listCacheClear() {
          this.__data__ = [];
          this.size = 0;
        }
        function listCacheDelete(key) {
          var data = this.__data__, index = assocIndexOf(data, key);
          if (index < 0) {
            return false;
          }
          var lastIndex = data.length - 1;
          if (index == lastIndex) {
            data.pop();
          } else {
            splice.call(data, index, 1);
          }
          --this.size;
          return true;
        }
        function listCacheGet(key) {
          var data = this.__data__, index = assocIndexOf(data, key);
          return index < 0 ? undefined2 : data[index][1];
        }
        function listCacheHas(key) {
          return assocIndexOf(this.__data__, key) > -1;
        }
        function listCacheSet(key, value) {
          var data = this.__data__, index = assocIndexOf(data, key);
          if (index < 0) {
            ++this.size;
            data.push([key, value]);
          } else {
            data[index][1] = value;
          }
          return this;
        }
        ListCache.prototype.clear = listCacheClear;
        ListCache.prototype["delete"] = listCacheDelete;
        ListCache.prototype.get = listCacheGet;
        ListCache.prototype.has = listCacheHas;
        ListCache.prototype.set = listCacheSet;
        function MapCache(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function mapCacheClear() {
          this.size = 0;
          this.__data__ = {
            "hash": new Hash(),
            "map": new (Map2 || ListCache)(),
            "string": new Hash()
          };
        }
        function mapCacheDelete(key) {
          var result2 = getMapData(this, key)["delete"](key);
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function mapCacheGet(key) {
          return getMapData(this, key).get(key);
        }
        function mapCacheHas(key) {
          return getMapData(this, key).has(key);
        }
        function mapCacheSet(key, value) {
          var data = getMapData(this, key), size2 = data.size;
          data.set(key, value);
          this.size += data.size == size2 ? 0 : 1;
          return this;
        }
        MapCache.prototype.clear = mapCacheClear;
        MapCache.prototype["delete"] = mapCacheDelete;
        MapCache.prototype.get = mapCacheGet;
        MapCache.prototype.has = mapCacheHas;
        MapCache.prototype.set = mapCacheSet;
        function SetCache(values2) {
          var index = -1, length = values2 == null ? 0 : values2.length;
          this.__data__ = new MapCache();
          while (++index < length) {
            this.add(values2[index]);
          }
        }
        function setCacheAdd(value) {
          this.__data__.set(value, HASH_UNDEFINED);
          return this;
        }
        function setCacheHas(value) {
          return this.__data__.has(value);
        }
        SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
        SetCache.prototype.has = setCacheHas;
        function Stack(entries) {
          var data = this.__data__ = new ListCache(entries);
          this.size = data.size;
        }
        function stackClear() {
          this.__data__ = new ListCache();
          this.size = 0;
        }
        function stackDelete(key) {
          var data = this.__data__, result2 = data["delete"](key);
          this.size = data.size;
          return result2;
        }
        function stackGet(key) {
          return this.__data__.get(key);
        }
        function stackHas(key) {
          return this.__data__.has(key);
        }
        function stackSet(key, value) {
          var data = this.__data__;
          if (data instanceof ListCache) {
            var pairs = data.__data__;
            if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
              pairs.push([key, value]);
              this.size = ++data.size;
              return this;
            }
            data = this.__data__ = new MapCache(pairs);
          }
          data.set(key, value);
          this.size = data.size;
          return this;
        }
        Stack.prototype.clear = stackClear;
        Stack.prototype["delete"] = stackDelete;
        Stack.prototype.get = stackGet;
        Stack.prototype.has = stackHas;
        Stack.prototype.set = stackSet;
        function arrayLikeKeys(value, inherited) {
          var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result2 = skipIndexes ? baseTimes(value.length, String2) : [], length = result2.length;
          for (var key in value) {
            if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
            (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
            isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
            isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
            isIndex(key, length)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function arraySample(array) {
          var length = array.length;
          return length ? array[baseRandom(0, length - 1)] : undefined2;
        }
        function arraySampleSize(array, n) {
          return shuffleSelf(copyArray(array), baseClamp(n, 0, array.length));
        }
        function arrayShuffle(array) {
          return shuffleSelf(copyArray(array));
        }
        function assignMergeValue(object, key, value) {
          if (value !== undefined2 && !eq(object[key], value) || value === undefined2 && !(key in object)) {
            baseAssignValue(object, key, value);
          }
        }
        function assignValue(object, key, value) {
          var objValue = object[key];
          if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === undefined2 && !(key in object)) {
            baseAssignValue(object, key, value);
          }
        }
        function assocIndexOf(array, key) {
          var length = array.length;
          while (length--) {
            if (eq(array[length][0], key)) {
              return length;
            }
          }
          return -1;
        }
        function baseAggregator(collection, setter, iteratee2, accumulator) {
          baseEach(collection, function(value, key, collection2) {
            setter(accumulator, value, iteratee2(value), collection2);
          });
          return accumulator;
        }
        function baseAssign(object, source) {
          return object && copyObject(source, keys(source), object);
        }
        function baseAssignIn(object, source) {
          return object && copyObject(source, keysIn(source), object);
        }
        function baseAssignValue(object, key, value) {
          if (key == "__proto__" && defineProperty) {
            defineProperty(object, key, {
              "configurable": true,
              "enumerable": true,
              "value": value,
              "writable": true
            });
          } else {
            object[key] = value;
          }
        }
        function baseAt(object, paths) {
          var index = -1, length = paths.length, result2 = Array2(length), skip = object == null;
          while (++index < length) {
            result2[index] = skip ? undefined2 : get(object, paths[index]);
          }
          return result2;
        }
        function baseClamp(number, lower, upper) {
          if (number === number) {
            if (upper !== undefined2) {
              number = number <= upper ? number : upper;
            }
            if (lower !== undefined2) {
              number = number >= lower ? number : lower;
            }
          }
          return number;
        }
        function baseClone(value, bitmask, customizer, key, object, stack) {
          var result2, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
          if (customizer) {
            result2 = object ? customizer(value, key, object, stack) : customizer(value);
          }
          if (result2 !== undefined2) {
            return result2;
          }
          if (!isObject(value)) {
            return value;
          }
          var isArr = isArray(value);
          if (isArr) {
            result2 = initCloneArray(value);
            if (!isDeep) {
              return copyArray(value, result2);
            }
          } else {
            var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
            if (isBuffer(value)) {
              return cloneBuffer(value, isDeep);
            }
            if (tag == objectTag || tag == argsTag || isFunc && !object) {
              result2 = isFlat || isFunc ? {} : initCloneObject(value);
              if (!isDeep) {
                return isFlat ? copySymbolsIn(value, baseAssignIn(result2, value)) : copySymbols(value, baseAssign(result2, value));
              }
            } else {
              if (!cloneableTags[tag]) {
                return object ? value : {};
              }
              result2 = initCloneByTag(value, tag, isDeep);
            }
          }
          stack || (stack = new Stack());
          var stacked = stack.get(value);
          if (stacked) {
            return stacked;
          }
          stack.set(value, result2);
          if (isSet(value)) {
            value.forEach(function(subValue) {
              result2.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
            });
          } else if (isMap(value)) {
            value.forEach(function(subValue, key2) {
              result2.set(key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
            });
          }
          var keysFunc = isFull ? isFlat ? getAllKeysIn : getAllKeys : isFlat ? keysIn : keys;
          var props = isArr ? undefined2 : keysFunc(value);
          arrayEach(props || value, function(subValue, key2) {
            if (props) {
              key2 = subValue;
              subValue = value[key2];
            }
            assignValue(result2, key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
          });
          return result2;
        }
        function baseConforms(source) {
          var props = keys(source);
          return function(object) {
            return baseConformsTo(object, source, props);
          };
        }
        function baseConformsTo(object, source, props) {
          var length = props.length;
          if (object == null) {
            return !length;
          }
          object = Object2(object);
          while (length--) {
            var key = props[length], predicate = source[key], value = object[key];
            if (value === undefined2 && !(key in object) || !predicate(value)) {
              return false;
            }
          }
          return true;
        }
        function baseDelay(func, wait, args) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return setTimeout2(function() {
            func.apply(undefined2, args);
          }, wait);
        }
        function baseDifference(array, values2, iteratee2, comparator) {
          var index = -1, includes2 = arrayIncludes, isCommon = true, length = array.length, result2 = [], valuesLength = values2.length;
          if (!length) {
            return result2;
          }
          if (iteratee2) {
            values2 = arrayMap(values2, baseUnary(iteratee2));
          }
          if (comparator) {
            includes2 = arrayIncludesWith;
            isCommon = false;
          } else if (values2.length >= LARGE_ARRAY_SIZE) {
            includes2 = cacheHas;
            isCommon = false;
            values2 = new SetCache(values2);
          }
          outer:
            while (++index < length) {
              var value = array[index], computed = iteratee2 == null ? value : iteratee2(value);
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var valuesIndex = valuesLength;
                while (valuesIndex--) {
                  if (values2[valuesIndex] === computed) {
                    continue outer;
                  }
                }
                result2.push(value);
              } else if (!includes2(values2, computed, comparator)) {
                result2.push(value);
              }
            }
          return result2;
        }
        var baseEach = createBaseEach(baseForOwn);
        var baseEachRight = createBaseEach(baseForOwnRight, true);
        function baseEvery(collection, predicate) {
          var result2 = true;
          baseEach(collection, function(value, index, collection2) {
            result2 = !!predicate(value, index, collection2);
            return result2;
          });
          return result2;
        }
        function baseExtremum(array, iteratee2, comparator) {
          var index = -1, length = array.length;
          while (++index < length) {
            var value = array[index], current = iteratee2(value);
            if (current != null && (computed === undefined2 ? current === current && !isSymbol(current) : comparator(current, computed))) {
              var computed = current, result2 = value;
            }
          }
          return result2;
        }
        function baseFill(array, value, start, end) {
          var length = array.length;
          start = toInteger(start);
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end === undefined2 || end > length ? length : toInteger(end);
          if (end < 0) {
            end += length;
          }
          end = start > end ? 0 : toLength(end);
          while (start < end) {
            array[start++] = value;
          }
          return array;
        }
        function baseFilter(collection, predicate) {
          var result2 = [];
          baseEach(collection, function(value, index, collection2) {
            if (predicate(value, index, collection2)) {
              result2.push(value);
            }
          });
          return result2;
        }
        function baseFlatten(array, depth, predicate, isStrict, result2) {
          var index = -1, length = array.length;
          predicate || (predicate = isFlattenable);
          result2 || (result2 = []);
          while (++index < length) {
            var value = array[index];
            if (depth > 0 && predicate(value)) {
              if (depth > 1) {
                baseFlatten(value, depth - 1, predicate, isStrict, result2);
              } else {
                arrayPush(result2, value);
              }
            } else if (!isStrict) {
              result2[result2.length] = value;
            }
          }
          return result2;
        }
        var baseFor = createBaseFor();
        var baseForRight = createBaseFor(true);
        function baseForOwn(object, iteratee2) {
          return object && baseFor(object, iteratee2, keys);
        }
        function baseForOwnRight(object, iteratee2) {
          return object && baseForRight(object, iteratee2, keys);
        }
        function baseFunctions(object, props) {
          return arrayFilter(props, function(key) {
            return isFunction(object[key]);
          });
        }
        function baseGet(object, path) {
          path = castPath(path, object);
          var index = 0, length = path.length;
          while (object != null && index < length) {
            object = object[toKey(path[index++])];
          }
          return index && index == length ? object : undefined2;
        }
        function baseGetAllKeys(object, keysFunc, symbolsFunc) {
          var result2 = keysFunc(object);
          return isArray(object) ? result2 : arrayPush(result2, symbolsFunc(object));
        }
        function baseGetTag(value) {
          if (value == null) {
            return value === undefined2 ? undefinedTag : nullTag;
          }
          return symToStringTag && symToStringTag in Object2(value) ? getRawTag(value) : objectToString(value);
        }
        function baseGt(value, other) {
          return value > other;
        }
        function baseHas(object, key) {
          return object != null && hasOwnProperty.call(object, key);
        }
        function baseHasIn(object, key) {
          return object != null && key in Object2(object);
        }
        function baseInRange(number, start, end) {
          return number >= nativeMin(start, end) && number < nativeMax(start, end);
        }
        function baseIntersection(arrays, iteratee2, comparator) {
          var includes2 = comparator ? arrayIncludesWith : arrayIncludes, length = arrays[0].length, othLength = arrays.length, othIndex = othLength, caches = Array2(othLength), maxLength = Infinity, result2 = [];
          while (othIndex--) {
            var array = arrays[othIndex];
            if (othIndex && iteratee2) {
              array = arrayMap(array, baseUnary(iteratee2));
            }
            maxLength = nativeMin(array.length, maxLength);
            caches[othIndex] = !comparator && (iteratee2 || length >= 120 && array.length >= 120) ? new SetCache(othIndex && array) : undefined2;
          }
          array = arrays[0];
          var index = -1, seen = caches[0];
          outer:
            while (++index < length && result2.length < maxLength) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (!(seen ? cacheHas(seen, computed) : includes2(result2, computed, comparator))) {
                othIndex = othLength;
                while (--othIndex) {
                  var cache = caches[othIndex];
                  if (!(cache ? cacheHas(cache, computed) : includes2(arrays[othIndex], computed, comparator))) {
                    continue outer;
                  }
                }
                if (seen) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseInverter(object, setter, iteratee2, accumulator) {
          baseForOwn(object, function(value, key, object2) {
            setter(accumulator, iteratee2(value), key, object2);
          });
          return accumulator;
        }
        function baseInvoke(object, path, args) {
          path = castPath(path, object);
          object = parent(object, path);
          var func = object == null ? object : object[toKey(last(path))];
          return func == null ? undefined2 : apply(func, object, args);
        }
        function baseIsArguments(value) {
          return isObjectLike(value) && baseGetTag(value) == argsTag;
        }
        function baseIsArrayBuffer(value) {
          return isObjectLike(value) && baseGetTag(value) == arrayBufferTag;
        }
        function baseIsDate(value) {
          return isObjectLike(value) && baseGetTag(value) == dateTag;
        }
        function baseIsEqual(value, other, bitmask, customizer, stack) {
          if (value === other) {
            return true;
          }
          if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
            return value !== value && other !== other;
          }
          return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
        }
        function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
          var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
          objTag = objTag == argsTag ? objectTag : objTag;
          othTag = othTag == argsTag ? objectTag : othTag;
          var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
          if (isSameTag && isBuffer(object)) {
            if (!isBuffer(other)) {
              return false;
            }
            objIsArr = true;
            objIsObj = false;
          }
          if (isSameTag && !objIsObj) {
            stack || (stack = new Stack());
            return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
          }
          if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
            if (objIsWrapped || othIsWrapped) {
              var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
              stack || (stack = new Stack());
              return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stack || (stack = new Stack());
          return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
        }
        function baseIsMap(value) {
          return isObjectLike(value) && getTag(value) == mapTag;
        }
        function baseIsMatch(object, source, matchData, customizer) {
          var index = matchData.length, length = index, noCustomizer = !customizer;
          if (object == null) {
            return !length;
          }
          object = Object2(object);
          while (index--) {
            var data = matchData[index];
            if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
              return false;
            }
          }
          while (++index < length) {
            data = matchData[index];
            var key = data[0], objValue = object[key], srcValue = data[1];
            if (noCustomizer && data[2]) {
              if (objValue === undefined2 && !(key in object)) {
                return false;
              }
            } else {
              var stack = new Stack();
              if (customizer) {
                var result2 = customizer(objValue, srcValue, key, object, source, stack);
              }
              if (!(result2 === undefined2 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result2)) {
                return false;
              }
            }
          }
          return true;
        }
        function baseIsNative(value) {
          if (!isObject(value) || isMasked(value)) {
            return false;
          }
          var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
          return pattern.test(toSource(value));
        }
        function baseIsRegExp(value) {
          return isObjectLike(value) && baseGetTag(value) == regexpTag;
        }
        function baseIsSet(value) {
          return isObjectLike(value) && getTag(value) == setTag;
        }
        function baseIsTypedArray(value) {
          return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
        }
        function baseIteratee(value) {
          if (typeof value == "function") {
            return value;
          }
          if (value == null) {
            return identity;
          }
          if (typeof value == "object") {
            return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
          }
          return property(value);
        }
        function baseKeys(object) {
          if (!isPrototype(object)) {
            return nativeKeys(object);
          }
          var result2 = [];
          for (var key in Object2(object)) {
            if (hasOwnProperty.call(object, key) && key != "constructor") {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseKeysIn(object) {
          if (!isObject(object)) {
            return nativeKeysIn(object);
          }
          var isProto = isPrototype(object), result2 = [];
          for (var key in object) {
            if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseLt(value, other) {
          return value < other;
        }
        function baseMap(collection, iteratee2) {
          var index = -1, result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value, key, collection2) {
            result2[++index] = iteratee2(value, key, collection2);
          });
          return result2;
        }
        function baseMatches(source) {
          var matchData = getMatchData(source);
          if (matchData.length == 1 && matchData[0][2]) {
            return matchesStrictComparable(matchData[0][0], matchData[0][1]);
          }
          return function(object) {
            return object === source || baseIsMatch(object, source, matchData);
          };
        }
        function baseMatchesProperty(path, srcValue) {
          if (isKey(path) && isStrictComparable(srcValue)) {
            return matchesStrictComparable(toKey(path), srcValue);
          }
          return function(object) {
            var objValue = get(object, path);
            return objValue === undefined2 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
          };
        }
        function baseMerge(object, source, srcIndex, customizer, stack) {
          if (object === source) {
            return;
          }
          baseFor(source, function(srcValue, key) {
            stack || (stack = new Stack());
            if (isObject(srcValue)) {
              baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
            } else {
              var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : undefined2;
              if (newValue === undefined2) {
                newValue = srcValue;
              }
              assignMergeValue(object, key, newValue);
            }
          }, keysIn);
        }
        function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
          var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
          if (stacked) {
            assignMergeValue(object, key, stacked);
            return;
          }
          var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : undefined2;
          var isCommon = newValue === undefined2;
          if (isCommon) {
            var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
            newValue = srcValue;
            if (isArr || isBuff || isTyped) {
              if (isArray(objValue)) {
                newValue = objValue;
              } else if (isArrayLikeObject(objValue)) {
                newValue = copyArray(objValue);
              } else if (isBuff) {
                isCommon = false;
                newValue = cloneBuffer(srcValue, true);
              } else if (isTyped) {
                isCommon = false;
                newValue = cloneTypedArray(srcValue, true);
              } else {
                newValue = [];
              }
            } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
              newValue = objValue;
              if (isArguments(objValue)) {
                newValue = toPlainObject(objValue);
              } else if (!isObject(objValue) || isFunction(objValue)) {
                newValue = initCloneObject(srcValue);
              }
            } else {
              isCommon = false;
            }
          }
          if (isCommon) {
            stack.set(srcValue, newValue);
            mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
            stack["delete"](srcValue);
          }
          assignMergeValue(object, key, newValue);
        }
        function baseNth(array, n) {
          var length = array.length;
          if (!length) {
            return;
          }
          n += n < 0 ? length : 0;
          return isIndex(n, length) ? array[n] : undefined2;
        }
        function baseOrderBy(collection, iteratees, orders) {
          if (iteratees.length) {
            iteratees = arrayMap(iteratees, function(iteratee2) {
              if (isArray(iteratee2)) {
                return function(value) {
                  return baseGet(value, iteratee2.length === 1 ? iteratee2[0] : iteratee2);
                };
              }
              return iteratee2;
            });
          } else {
            iteratees = [identity];
          }
          var index = -1;
          iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
          var result2 = baseMap(collection, function(value, key, collection2) {
            var criteria = arrayMap(iteratees, function(iteratee2) {
              return iteratee2(value);
            });
            return { "criteria": criteria, "index": ++index, "value": value };
          });
          return baseSortBy(result2, function(object, other) {
            return compareMultiple(object, other, orders);
          });
        }
        function basePick(object, paths) {
          return basePickBy(object, paths, function(value, path) {
            return hasIn(object, path);
          });
        }
        function basePickBy(object, paths, predicate) {
          var index = -1, length = paths.length, result2 = {};
          while (++index < length) {
            var path = paths[index], value = baseGet(object, path);
            if (predicate(value, path)) {
              baseSet(result2, castPath(path, object), value);
            }
          }
          return result2;
        }
        function basePropertyDeep(path) {
          return function(object) {
            return baseGet(object, path);
          };
        }
        function basePullAll(array, values2, iteratee2, comparator) {
          var indexOf2 = comparator ? baseIndexOfWith : baseIndexOf, index = -1, length = values2.length, seen = array;
          if (array === values2) {
            values2 = copyArray(values2);
          }
          if (iteratee2) {
            seen = arrayMap(array, baseUnary(iteratee2));
          }
          while (++index < length) {
            var fromIndex = 0, value = values2[index], computed = iteratee2 ? iteratee2(value) : value;
            while ((fromIndex = indexOf2(seen, computed, fromIndex, comparator)) > -1) {
              if (seen !== array) {
                splice.call(seen, fromIndex, 1);
              }
              splice.call(array, fromIndex, 1);
            }
          }
          return array;
        }
        function basePullAt(array, indexes) {
          var length = array ? indexes.length : 0, lastIndex = length - 1;
          while (length--) {
            var index = indexes[length];
            if (length == lastIndex || index !== previous) {
              var previous = index;
              if (isIndex(index)) {
                splice.call(array, index, 1);
              } else {
                baseUnset(array, index);
              }
            }
          }
          return array;
        }
        function baseRandom(lower, upper) {
          return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
        }
        function baseRange(start, end, step, fromRight) {
          var index = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result2 = Array2(length);
          while (length--) {
            result2[fromRight ? length : ++index] = start;
            start += step;
          }
          return result2;
        }
        function baseRepeat(string, n) {
          var result2 = "";
          if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
            return result2;
          }
          do {
            if (n % 2) {
              result2 += string;
            }
            n = nativeFloor(n / 2);
            if (n) {
              string += string;
            }
          } while (n);
          return result2;
        }
        function baseRest(func, start) {
          return setToString(overRest(func, start, identity), func + "");
        }
        function baseSample(collection) {
          return arraySample(values(collection));
        }
        function baseSampleSize(collection, n) {
          var array = values(collection);
          return shuffleSelf(array, baseClamp(n, 0, array.length));
        }
        function baseSet(object, path, value, customizer) {
          if (!isObject(object)) {
            return object;
          }
          path = castPath(path, object);
          var index = -1, length = path.length, lastIndex = length - 1, nested = object;
          while (nested != null && ++index < length) {
            var key = toKey(path[index]), newValue = value;
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
              return object;
            }
            if (index != lastIndex) {
              var objValue = nested[key];
              newValue = customizer ? customizer(objValue, key, nested) : undefined2;
              if (newValue === undefined2) {
                newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
              }
            }
            assignValue(nested, key, newValue);
            nested = nested[key];
          }
          return object;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
          metaMap.set(func, data);
          return func;
        };
        var baseSetToString = !defineProperty ? identity : function(func, string) {
          return defineProperty(func, "toString", {
            "configurable": true,
            "enumerable": false,
            "value": constant(string),
            "writable": true
          });
        };
        function baseShuffle(collection) {
          return shuffleSelf(values(collection));
        }
        function baseSlice(array, start, end) {
          var index = -1, length = array.length;
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end > length ? length : end;
          if (end < 0) {
            end += length;
          }
          length = start > end ? 0 : end - start >>> 0;
          start >>>= 0;
          var result2 = Array2(length);
          while (++index < length) {
            result2[index] = array[index + start];
          }
          return result2;
        }
        function baseSome(collection, predicate) {
          var result2;
          baseEach(collection, function(value, index, collection2) {
            result2 = predicate(value, index, collection2);
            return !result2;
          });
          return !!result2;
        }
        function baseSortedIndex(array, value, retHighest) {
          var low = 0, high = array == null ? low : array.length;
          if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
            while (low < high) {
              var mid = low + high >>> 1, computed = array[mid];
              if (computed !== null && !isSymbol(computed) && (retHighest ? computed <= value : computed < value)) {
                low = mid + 1;
              } else {
                high = mid;
              }
            }
            return high;
          }
          return baseSortedIndexBy(array, value, identity, retHighest);
        }
        function baseSortedIndexBy(array, value, iteratee2, retHighest) {
          var low = 0, high = array == null ? 0 : array.length;
          if (high === 0) {
            return 0;
          }
          value = iteratee2(value);
          var valIsNaN = value !== value, valIsNull = value === null, valIsSymbol = isSymbol(value), valIsUndefined = value === undefined2;
          while (low < high) {
            var mid = nativeFloor((low + high) / 2), computed = iteratee2(array[mid]), othIsDefined = computed !== undefined2, othIsNull = computed === null, othIsReflexive = computed === computed, othIsSymbol = isSymbol(computed);
            if (valIsNaN) {
              var setLow = retHighest || othIsReflexive;
            } else if (valIsUndefined) {
              setLow = othIsReflexive && (retHighest || othIsDefined);
            } else if (valIsNull) {
              setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
            } else if (valIsSymbol) {
              setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
            } else if (othIsNull || othIsSymbol) {
              setLow = false;
            } else {
              setLow = retHighest ? computed <= value : computed < value;
            }
            if (setLow) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return nativeMin(high, MAX_ARRAY_INDEX);
        }
        function baseSortedUniq(array, iteratee2) {
          var index = -1, length = array.length, resIndex = 0, result2 = [];
          while (++index < length) {
            var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
            if (!index || !eq(computed, seen)) {
              var seen = computed;
              result2[resIndex++] = value === 0 ? 0 : value;
            }
          }
          return result2;
        }
        function baseToNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          return +value;
        }
        function baseToString(value) {
          if (typeof value == "string") {
            return value;
          }
          if (isArray(value)) {
            return arrayMap(value, baseToString) + "";
          }
          if (isSymbol(value)) {
            return symbolToString ? symbolToString.call(value) : "";
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function baseUniq(array, iteratee2, comparator) {
          var index = -1, includes2 = arrayIncludes, length = array.length, isCommon = true, result2 = [], seen = result2;
          if (comparator) {
            isCommon = false;
            includes2 = arrayIncludesWith;
          } else if (length >= LARGE_ARRAY_SIZE) {
            var set2 = iteratee2 ? null : createSet(array);
            if (set2) {
              return setToArray(set2);
            }
            isCommon = false;
            includes2 = cacheHas;
            seen = new SetCache();
          } else {
            seen = iteratee2 ? [] : result2;
          }
          outer:
            while (++index < length) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var seenIndex = seen.length;
                while (seenIndex--) {
                  if (seen[seenIndex] === computed) {
                    continue outer;
                  }
                }
                if (iteratee2) {
                  seen.push(computed);
                }
                result2.push(value);
              } else if (!includes2(seen, computed, comparator)) {
                if (seen !== result2) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseUnset(object, path) {
          path = castPath(path, object);
          object = parent(object, path);
          return object == null || delete object[toKey(last(path))];
        }
        function baseUpdate(object, path, updater, customizer) {
          return baseSet(object, path, updater(baseGet(object, path)), customizer);
        }
        function baseWhile(array, predicate, isDrop, fromRight) {
          var length = array.length, index = fromRight ? length : -1;
          while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {
          }
          return isDrop ? baseSlice(array, fromRight ? 0 : index, fromRight ? index + 1 : length) : baseSlice(array, fromRight ? index + 1 : 0, fromRight ? length : index);
        }
        function baseWrapperValue(value, actions) {
          var result2 = value;
          if (result2 instanceof LazyWrapper) {
            result2 = result2.value();
          }
          return arrayReduce(actions, function(result3, action) {
            return action.func.apply(action.thisArg, arrayPush([result3], action.args));
          }, result2);
        }
        function baseXor(arrays, iteratee2, comparator) {
          var length = arrays.length;
          if (length < 2) {
            return length ? baseUniq(arrays[0]) : [];
          }
          var index = -1, result2 = Array2(length);
          while (++index < length) {
            var array = arrays[index], othIndex = -1;
            while (++othIndex < length) {
              if (othIndex != index) {
                result2[index] = baseDifference(result2[index] || array, arrays[othIndex], iteratee2, comparator);
              }
            }
          }
          return baseUniq(baseFlatten(result2, 1), iteratee2, comparator);
        }
        function baseZipObject(props, values2, assignFunc) {
          var index = -1, length = props.length, valsLength = values2.length, result2 = {};
          while (++index < length) {
            var value = index < valsLength ? values2[index] : undefined2;
            assignFunc(result2, props[index], value);
          }
          return result2;
        }
        function castArrayLikeObject(value) {
          return isArrayLikeObject(value) ? value : [];
        }
        function castFunction(value) {
          return typeof value == "function" ? value : identity;
        }
        function castPath(value, object) {
          if (isArray(value)) {
            return value;
          }
          return isKey(value, object) ? [value] : stringToPath(toString(value));
        }
        var castRest = baseRest;
        function castSlice(array, start, end) {
          var length = array.length;
          end = end === undefined2 ? length : end;
          return !start && end >= length ? array : baseSlice(array, start, end);
        }
        var clearTimeout2 = ctxClearTimeout || function(id) {
          return root.clearTimeout(id);
        };
        function cloneBuffer(buffer, isDeep) {
          if (isDeep) {
            return buffer.slice();
          }
          var length = buffer.length, result2 = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
          buffer.copy(result2);
          return result2;
        }
        function cloneArrayBuffer(arrayBuffer) {
          var result2 = new arrayBuffer.constructor(arrayBuffer.byteLength);
          new Uint8Array2(result2).set(new Uint8Array2(arrayBuffer));
          return result2;
        }
        function cloneDataView(dataView, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
          return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
        }
        function cloneRegExp(regexp) {
          var result2 = new regexp.constructor(regexp.source, reFlags.exec(regexp));
          result2.lastIndex = regexp.lastIndex;
          return result2;
        }
        function cloneSymbol(symbol) {
          return symbolValueOf ? Object2(symbolValueOf.call(symbol)) : {};
        }
        function cloneTypedArray(typedArray, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
          return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
        }
        function compareAscending(value, other) {
          if (value !== other) {
            var valIsDefined = value !== undefined2, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol(value);
            var othIsDefined = other !== undefined2, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol(other);
            if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
              return 1;
            }
            if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
              return -1;
            }
          }
          return 0;
        }
        function compareMultiple(object, other, orders) {
          var index = -1, objCriteria = object.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
          while (++index < length) {
            var result2 = compareAscending(objCriteria[index], othCriteria[index]);
            if (result2) {
              if (index >= ordersLength) {
                return result2;
              }
              var order = orders[index];
              return result2 * (order == "desc" ? -1 : 1);
            }
          }
          return object.index - other.index;
        }
        function composeArgs(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(leftLength + rangeLength), isUncurried = !isCurried;
          while (++leftIndex < leftLength) {
            result2[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[holders[argsIndex]] = args[argsIndex];
            }
          }
          while (rangeLength--) {
            result2[leftIndex++] = args[argsIndex++];
          }
          return result2;
        }
        function composeArgsRight(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(rangeLength + rightLength), isUncurried = !isCurried;
          while (++argsIndex < rangeLength) {
            result2[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result2[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[offset + holders[holdersIndex]] = args[argsIndex++];
            }
          }
          return result2;
        }
        function copyArray(source, array) {
          var index = -1, length = source.length;
          array || (array = Array2(length));
          while (++index < length) {
            array[index] = source[index];
          }
          return array;
        }
        function copyObject(source, props, object, customizer) {
          var isNew = !object;
          object || (object = {});
          var index = -1, length = props.length;
          while (++index < length) {
            var key = props[index];
            var newValue = customizer ? customizer(object[key], source[key], key, object, source) : undefined2;
            if (newValue === undefined2) {
              newValue = source[key];
            }
            if (isNew) {
              baseAssignValue(object, key, newValue);
            } else {
              assignValue(object, key, newValue);
            }
          }
          return object;
        }
        function copySymbols(source, object) {
          return copyObject(source, getSymbols(source), object);
        }
        function copySymbolsIn(source, object) {
          return copyObject(source, getSymbolsIn(source), object);
        }
        function createAggregator(setter, initializer) {
          return function(collection, iteratee2) {
            var func = isArray(collection) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
            return func(collection, setter, getIteratee(iteratee2, 2), accumulator);
          };
        }
        function createAssigner(assigner) {
          return baseRest(function(object, sources) {
            var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined2, guard = length > 2 ? sources[2] : undefined2;
            customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined2;
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              customizer = length < 3 ? undefined2 : customizer;
              length = 1;
            }
            object = Object2(object);
            while (++index < length) {
              var source = sources[index];
              if (source) {
                assigner(object, source, index, customizer);
              }
            }
            return object;
          });
        }
        function createBaseEach(eachFunc, fromRight) {
          return function(collection, iteratee2) {
            if (collection == null) {
              return collection;
            }
            if (!isArrayLike(collection)) {
              return eachFunc(collection, iteratee2);
            }
            var length = collection.length, index = fromRight ? length : -1, iterable = Object2(collection);
            while (fromRight ? index-- : ++index < length) {
              if (iteratee2(iterable[index], index, iterable) === false) {
                break;
              }
            }
            return collection;
          };
        }
        function createBaseFor(fromRight) {
          return function(object, iteratee2, keysFunc) {
            var index = -1, iterable = Object2(object), props = keysFunc(object), length = props.length;
            while (length--) {
              var key = props[fromRight ? length : ++index];
              if (iteratee2(iterable[key], key, iterable) === false) {
                break;
              }
            }
            return object;
          };
        }
        function createBind(func, bitmask, thisArg) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return fn.apply(isBind ? thisArg : this, arguments);
          }
          return wrapper;
        }
        function createCaseFirst(methodName) {
          return function(string) {
            string = toString(string);
            var strSymbols = hasUnicode(string) ? stringToArray(string) : undefined2;
            var chr = strSymbols ? strSymbols[0] : string.charAt(0);
            var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string.slice(1);
            return chr[methodName]() + trailing;
          };
        }
        function createCompounder(callback) {
          return function(string) {
            return arrayReduce(words(deburr(string).replace(reApos, "")), callback, "");
          };
        }
        function createCtor(Ctor) {
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return new Ctor();
              case 1:
                return new Ctor(args[0]);
              case 2:
                return new Ctor(args[0], args[1]);
              case 3:
                return new Ctor(args[0], args[1], args[2]);
              case 4:
                return new Ctor(args[0], args[1], args[2], args[3]);
              case 5:
                return new Ctor(args[0], args[1], args[2], args[3], args[4]);
              case 6:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
              case 7:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            }
            var thisBinding = baseCreate(Ctor.prototype), result2 = Ctor.apply(thisBinding, args);
            return isObject(result2) ? result2 : thisBinding;
          };
        }
        function createCurry(func, bitmask, arity) {
          var Ctor = createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index = length, placeholder = getHolder(wrapper);
            while (index--) {
              args[index] = arguments[index];
            }
            var holders = length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder ? [] : replaceHolders(args, placeholder);
            length -= holders.length;
            if (length < arity) {
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                undefined2,
                args,
                holders,
                undefined2,
                undefined2,
                arity - length
              );
            }
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return apply(fn, this, args);
          }
          return wrapper;
        }
        function createFind(findIndexFunc) {
          return function(collection, predicate, fromIndex) {
            var iterable = Object2(collection);
            if (!isArrayLike(collection)) {
              var iteratee2 = getIteratee(predicate, 3);
              collection = keys(collection);
              predicate = function(key) {
                return iteratee2(iterable[key], key, iterable);
              };
            }
            var index = findIndexFunc(collection, predicate, fromIndex);
            return index > -1 ? iterable[iteratee2 ? collection[index] : index] : undefined2;
          };
        }
        function createFlow(fromRight) {
          return flatRest(function(funcs) {
            var length = funcs.length, index = length, prereq = LodashWrapper.prototype.thru;
            if (fromRight) {
              funcs.reverse();
            }
            while (index--) {
              var func = funcs[index];
              if (typeof func != "function") {
                throw new TypeError2(FUNC_ERROR_TEXT);
              }
              if (prereq && !wrapper && getFuncName(func) == "wrapper") {
                var wrapper = new LodashWrapper([], true);
              }
            }
            index = wrapper ? index : length;
            while (++index < length) {
              func = funcs[index];
              var funcName = getFuncName(func), data = funcName == "wrapper" ? getData(func) : undefined2;
              if (data && isLaziable(data[0]) && data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) && !data[4].length && data[9] == 1) {
                wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
              } else {
                wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
              }
            }
            return function() {
              var args = arguments, value = args[0];
              if (wrapper && args.length == 1 && isArray(value)) {
                return wrapper.plant(value).value();
              }
              var index2 = 0, result2 = length ? funcs[index2].apply(this, args) : value;
              while (++index2 < length) {
                result2 = funcs[index2].call(this, result2);
              }
              return result2;
            };
          });
        }
        function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary2, arity) {
          var isAry = bitmask & WRAP_ARY_FLAG, isBind = bitmask & WRAP_BIND_FLAG, isBindKey = bitmask & WRAP_BIND_KEY_FLAG, isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG), isFlip = bitmask & WRAP_FLIP_FLAG, Ctor = isBindKey ? undefined2 : createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index = length;
            while (index--) {
              args[index] = arguments[index];
            }
            if (isCurried) {
              var placeholder = getHolder(wrapper), holdersCount = countHolders(args, placeholder);
            }
            if (partials) {
              args = composeArgs(args, partials, holders, isCurried);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
            }
            length -= holdersCount;
            if (isCurried && length < arity) {
              var newHolders = replaceHolders(args, placeholder);
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                thisArg,
                args,
                newHolders,
                argPos,
                ary2,
                arity - length
              );
            }
            var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
            length = args.length;
            if (argPos) {
              args = reorder(args, argPos);
            } else if (isFlip && length > 1) {
              args.reverse();
            }
            if (isAry && ary2 < length) {
              args.length = ary2;
            }
            if (this && this !== root && this instanceof wrapper) {
              fn = Ctor || createCtor(fn);
            }
            return fn.apply(thisBinding, args);
          }
          return wrapper;
        }
        function createInverter(setter, toIteratee) {
          return function(object, iteratee2) {
            return baseInverter(object, setter, toIteratee(iteratee2), {});
          };
        }
        function createMathOperation(operator, defaultValue) {
          return function(value, other) {
            var result2;
            if (value === undefined2 && other === undefined2) {
              return defaultValue;
            }
            if (value !== undefined2) {
              result2 = value;
            }
            if (other !== undefined2) {
              if (result2 === undefined2) {
                return other;
              }
              if (typeof value == "string" || typeof other == "string") {
                value = baseToString(value);
                other = baseToString(other);
              } else {
                value = baseToNumber(value);
                other = baseToNumber(other);
              }
              result2 = operator(value, other);
            }
            return result2;
          };
        }
        function createOver(arrayFunc) {
          return flatRest(function(iteratees) {
            iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
            return baseRest(function(args) {
              var thisArg = this;
              return arrayFunc(iteratees, function(iteratee2) {
                return apply(iteratee2, thisArg, args);
              });
            });
          });
        }
        function createPadding(length, chars) {
          chars = chars === undefined2 ? " " : baseToString(chars);
          var charsLength = chars.length;
          if (charsLength < 2) {
            return charsLength ? baseRepeat(chars, length) : chars;
          }
          var result2 = baseRepeat(chars, nativeCeil(length / stringSize(chars)));
          return hasUnicode(chars) ? castSlice(stringToArray(result2), 0, length).join("") : result2.slice(0, length);
        }
        function createPartial(func, bitmask, thisArg, partials) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array2(leftLength + argsLength), fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            while (++leftIndex < leftLength) {
              args[leftIndex] = partials[leftIndex];
            }
            while (argsLength--) {
              args[leftIndex++] = arguments[++argsIndex];
            }
            return apply(fn, isBind ? thisArg : this, args);
          }
          return wrapper;
        }
        function createRange(fromRight) {
          return function(start, end, step) {
            if (step && typeof step != "number" && isIterateeCall(start, end, step)) {
              end = step = undefined2;
            }
            start = toFinite(start);
            if (end === undefined2) {
              end = start;
              start = 0;
            } else {
              end = toFinite(end);
            }
            step = step === undefined2 ? start < end ? 1 : -1 : toFinite(step);
            return baseRange(start, end, step, fromRight);
          };
        }
        function createRelationalOperation(operator) {
          return function(value, other) {
            if (!(typeof value == "string" && typeof other == "string")) {
              value = toNumber(value);
              other = toNumber(other);
            }
            return operator(value, other);
          };
        }
        function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary2, arity) {
          var isCurry = bitmask & WRAP_CURRY_FLAG, newHolders = isCurry ? holders : undefined2, newHoldersRight = isCurry ? undefined2 : holders, newPartials = isCurry ? partials : undefined2, newPartialsRight = isCurry ? undefined2 : partials;
          bitmask |= isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG;
          bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);
          if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
            bitmask &= ~(WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG);
          }
          var newData = [
            func,
            bitmask,
            thisArg,
            newPartials,
            newHolders,
            newPartialsRight,
            newHoldersRight,
            argPos,
            ary2,
            arity
          ];
          var result2 = wrapFunc.apply(undefined2, newData);
          if (isLaziable(func)) {
            setData(result2, newData);
          }
          result2.placeholder = placeholder;
          return setWrapToString(result2, func, bitmask);
        }
        function createRound(methodName) {
          var func = Math2[methodName];
          return function(number, precision) {
            number = toNumber(number);
            precision = precision == null ? 0 : nativeMin(toInteger(precision), 292);
            if (precision && nativeIsFinite(number)) {
              var pair = (toString(number) + "e").split("e"), value = func(pair[0] + "e" + (+pair[1] + precision));
              pair = (toString(value) + "e").split("e");
              return +(pair[0] + "e" + (+pair[1] - precision));
            }
            return func(number);
          };
        }
        var createSet = !(Set2 && 1 / setToArray(new Set2([, -0]))[1] == INFINITY) ? noop : function(values2) {
          return new Set2(values2);
        };
        function createToPairs(keysFunc) {
          return function(object) {
            var tag = getTag(object);
            if (tag == mapTag) {
              return mapToArray(object);
            }
            if (tag == setTag) {
              return setToPairs(object);
            }
            return baseToPairs(object, keysFunc(object));
          };
        }
        function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary2, arity) {
          var isBindKey = bitmask & WRAP_BIND_KEY_FLAG;
          if (!isBindKey && typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var length = partials ? partials.length : 0;
          if (!length) {
            bitmask &= ~(WRAP_PARTIAL_FLAG | WRAP_PARTIAL_RIGHT_FLAG);
            partials = holders = undefined2;
          }
          ary2 = ary2 === undefined2 ? ary2 : nativeMax(toInteger(ary2), 0);
          arity = arity === undefined2 ? arity : toInteger(arity);
          length -= holders ? holders.length : 0;
          if (bitmask & WRAP_PARTIAL_RIGHT_FLAG) {
            var partialsRight = partials, holdersRight = holders;
            partials = holders = undefined2;
          }
          var data = isBindKey ? undefined2 : getData(func);
          var newData = [
            func,
            bitmask,
            thisArg,
            partials,
            holders,
            partialsRight,
            holdersRight,
            argPos,
            ary2,
            arity
          ];
          if (data) {
            mergeData(newData, data);
          }
          func = newData[0];
          bitmask = newData[1];
          thisArg = newData[2];
          partials = newData[3];
          holders = newData[4];
          arity = newData[9] = newData[9] === undefined2 ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
          if (!arity && bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG)) {
            bitmask &= ~(WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG);
          }
          if (!bitmask || bitmask == WRAP_BIND_FLAG) {
            var result2 = createBind(func, bitmask, thisArg);
          } else if (bitmask == WRAP_CURRY_FLAG || bitmask == WRAP_CURRY_RIGHT_FLAG) {
            result2 = createCurry(func, bitmask, arity);
          } else if ((bitmask == WRAP_PARTIAL_FLAG || bitmask == (WRAP_BIND_FLAG | WRAP_PARTIAL_FLAG)) && !holders.length) {
            result2 = createPartial(func, bitmask, thisArg, partials);
          } else {
            result2 = createHybrid.apply(undefined2, newData);
          }
          var setter = data ? baseSetData : setData;
          return setWrapToString(setter(result2, newData), func, bitmask);
        }
        function customDefaultsAssignIn(objValue, srcValue, key, object) {
          if (objValue === undefined2 || eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key)) {
            return srcValue;
          }
          return objValue;
        }
        function customDefaultsMerge(objValue, srcValue, key, object, source, stack) {
          if (isObject(objValue) && isObject(srcValue)) {
            stack.set(srcValue, objValue);
            baseMerge(objValue, srcValue, undefined2, customDefaultsMerge, stack);
            stack["delete"](srcValue);
          }
          return objValue;
        }
        function customOmitClone(value) {
          return isPlainObject(value) ? undefined2 : value;
        }
        function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
          if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
            return false;
          }
          var arrStacked = stack.get(array);
          var othStacked = stack.get(other);
          if (arrStacked && othStacked) {
            return arrStacked == other && othStacked == array;
          }
          var index = -1, result2 = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : undefined2;
          stack.set(array, other);
          stack.set(other, array);
          while (++index < arrLength) {
            var arrValue = array[index], othValue = other[index];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
            }
            if (compared !== undefined2) {
              if (compared) {
                continue;
              }
              result2 = false;
              break;
            }
            if (seen) {
              if (!arraySome(other, function(othValue2, othIndex) {
                if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
                  return seen.push(othIndex);
                }
              })) {
                result2 = false;
                break;
              }
            } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              result2 = false;
              break;
            }
          }
          stack["delete"](array);
          stack["delete"](other);
          return result2;
        }
        function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
          switch (tag) {
            case dataViewTag:
              if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
                return false;
              }
              object = object.buffer;
              other = other.buffer;
            case arrayBufferTag:
              if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
                return false;
              }
              return true;
            case boolTag:
            case dateTag:
            case numberTag:
              return eq(+object, +other);
            case errorTag:
              return object.name == other.name && object.message == other.message;
            case regexpTag:
            case stringTag:
              return object == other + "";
            case mapTag:
              var convert = mapToArray;
            case setTag:
              var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
              convert || (convert = setToArray);
              if (object.size != other.size && !isPartial) {
                return false;
              }
              var stacked = stack.get(object);
              if (stacked) {
                return stacked == other;
              }
              bitmask |= COMPARE_UNORDERED_FLAG;
              stack.set(object, other);
              var result2 = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
              stack["delete"](object);
              return result2;
            case symbolTag:
              if (symbolValueOf) {
                return symbolValueOf.call(object) == symbolValueOf.call(other);
              }
          }
          return false;
        }
        function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
          if (objLength != othLength && !isPartial) {
            return false;
          }
          var index = objLength;
          while (index--) {
            var key = objProps[index];
            if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
              return false;
            }
          }
          var objStacked = stack.get(object);
          var othStacked = stack.get(other);
          if (objStacked && othStacked) {
            return objStacked == other && othStacked == object;
          }
          var result2 = true;
          stack.set(object, other);
          stack.set(other, object);
          var skipCtor = isPartial;
          while (++index < objLength) {
            key = objProps[index];
            var objValue = object[key], othValue = other[key];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
            }
            if (!(compared === undefined2 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
              result2 = false;
              break;
            }
            skipCtor || (skipCtor = key == "constructor");
          }
          if (result2 && !skipCtor) {
            var objCtor = object.constructor, othCtor = other.constructor;
            if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
              result2 = false;
            }
          }
          stack["delete"](object);
          stack["delete"](other);
          return result2;
        }
        function flatRest(func) {
          return setToString(overRest(func, undefined2, flatten), func + "");
        }
        function getAllKeys(object) {
          return baseGetAllKeys(object, keys, getSymbols);
        }
        function getAllKeysIn(object) {
          return baseGetAllKeys(object, keysIn, getSymbolsIn);
        }
        var getData = !metaMap ? noop : function(func) {
          return metaMap.get(func);
        };
        function getFuncName(func) {
          var result2 = func.name + "", array = realNames[result2], length = hasOwnProperty.call(realNames, result2) ? array.length : 0;
          while (length--) {
            var data = array[length], otherFunc = data.func;
            if (otherFunc == null || otherFunc == func) {
              return data.name;
            }
          }
          return result2;
        }
        function getHolder(func) {
          var object = hasOwnProperty.call(lodash, "placeholder") ? lodash : func;
          return object.placeholder;
        }
        function getIteratee() {
          var result2 = lodash.iteratee || iteratee;
          result2 = result2 === iteratee ? baseIteratee : result2;
          return arguments.length ? result2(arguments[0], arguments[1]) : result2;
        }
        function getMapData(map2, key) {
          var data = map2.__data__;
          return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
        }
        function getMatchData(object) {
          var result2 = keys(object), length = result2.length;
          while (length--) {
            var key = result2[length], value = object[key];
            result2[length] = [key, value, isStrictComparable(value)];
          }
          return result2;
        }
        function getNative(object, key) {
          var value = getValue(object, key);
          return baseIsNative(value) ? value : undefined2;
        }
        function getRawTag(value) {
          var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
          try {
            value[symToStringTag] = undefined2;
            var unmasked = true;
          } catch (e) {
          }
          var result2 = nativeObjectToString.call(value);
          if (unmasked) {
            if (isOwn) {
              value[symToStringTag] = tag;
            } else {
              delete value[symToStringTag];
            }
          }
          return result2;
        }
        var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
          if (object == null) {
            return [];
          }
          object = Object2(object);
          return arrayFilter(nativeGetSymbols(object), function(symbol) {
            return propertyIsEnumerable.call(object, symbol);
          });
        };
        var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
          var result2 = [];
          while (object) {
            arrayPush(result2, getSymbols(object));
            object = getPrototype(object);
          }
          return result2;
        };
        var getTag = baseGetTag;
        if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap2 && getTag(new WeakMap2()) != weakMapTag) {
          getTag = function(value) {
            var result2 = baseGetTag(value), Ctor = result2 == objectTag ? value.constructor : undefined2, ctorString = Ctor ? toSource(Ctor) : "";
            if (ctorString) {
              switch (ctorString) {
                case dataViewCtorString:
                  return dataViewTag;
                case mapCtorString:
                  return mapTag;
                case promiseCtorString:
                  return promiseTag;
                case setCtorString:
                  return setTag;
                case weakMapCtorString:
                  return weakMapTag;
              }
            }
            return result2;
          };
        }
        function getView(start, end, transforms) {
          var index = -1, length = transforms.length;
          while (++index < length) {
            var data = transforms[index], size2 = data.size;
            switch (data.type) {
              case "drop":
                start += size2;
                break;
              case "dropRight":
                end -= size2;
                break;
              case "take":
                end = nativeMin(end, start + size2);
                break;
              case "takeRight":
                start = nativeMax(start, end - size2);
                break;
            }
          }
          return { "start": start, "end": end };
        }
        function getWrapDetails(source) {
          var match = source.match(reWrapDetails);
          return match ? match[1].split(reSplitDetails) : [];
        }
        function hasPath(object, path, hasFunc) {
          path = castPath(path, object);
          var index = -1, length = path.length, result2 = false;
          while (++index < length) {
            var key = toKey(path[index]);
            if (!(result2 = object != null && hasFunc(object, key))) {
              break;
            }
            object = object[key];
          }
          if (result2 || ++index != length) {
            return result2;
          }
          length = object == null ? 0 : object.length;
          return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
        }
        function initCloneArray(array) {
          var length = array.length, result2 = new array.constructor(length);
          if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
            result2.index = array.index;
            result2.input = array.input;
          }
          return result2;
        }
        function initCloneObject(object) {
          return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
        }
        function initCloneByTag(object, tag, isDeep) {
          var Ctor = object.constructor;
          switch (tag) {
            case arrayBufferTag:
              return cloneArrayBuffer(object);
            case boolTag:
            case dateTag:
              return new Ctor(+object);
            case dataViewTag:
              return cloneDataView(object, isDeep);
            case float32Tag:
            case float64Tag:
            case int8Tag:
            case int16Tag:
            case int32Tag:
            case uint8Tag:
            case uint8ClampedTag:
            case uint16Tag:
            case uint32Tag:
              return cloneTypedArray(object, isDeep);
            case mapTag:
              return new Ctor();
            case numberTag:
            case stringTag:
              return new Ctor(object);
            case regexpTag:
              return cloneRegExp(object);
            case setTag:
              return new Ctor();
            case symbolTag:
              return cloneSymbol(object);
          }
        }
        function insertWrapDetails(source, details) {
          var length = details.length;
          if (!length) {
            return source;
          }
          var lastIndex = length - 1;
          details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
          details = details.join(length > 2 ? ", " : " ");
          return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
        }
        function isFlattenable(value) {
          return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
        }
        function isIndex(value, length) {
          var type = typeof value;
          length = length == null ? MAX_SAFE_INTEGER : length;
          return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
        }
        function isIterateeCall(value, index, object) {
          if (!isObject(object)) {
            return false;
          }
          var type = typeof index;
          if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
            return eq(object[index], value);
          }
          return false;
        }
        function isKey(value, object) {
          if (isArray(value)) {
            return false;
          }
          var type = typeof value;
          if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
            return true;
          }
          return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object2(object);
        }
        function isKeyable(value) {
          var type = typeof value;
          return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
        }
        function isLaziable(func) {
          var funcName = getFuncName(func), other = lodash[funcName];
          if (typeof other != "function" || !(funcName in LazyWrapper.prototype)) {
            return false;
          }
          if (func === other) {
            return true;
          }
          var data = getData(other);
          return !!data && func === data[0];
        }
        function isMasked(func) {
          return !!maskSrcKey && maskSrcKey in func;
        }
        var isMaskable = coreJsData ? isFunction : stubFalse;
        function isPrototype(value) {
          var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
          return value === proto;
        }
        function isStrictComparable(value) {
          return value === value && !isObject(value);
        }
        function matchesStrictComparable(key, srcValue) {
          return function(object) {
            if (object == null) {
              return false;
            }
            return object[key] === srcValue && (srcValue !== undefined2 || key in Object2(object));
          };
        }
        function memoizeCapped(func) {
          var result2 = memoize(func, function(key) {
            if (cache.size === MAX_MEMOIZE_SIZE) {
              cache.clear();
            }
            return key;
          });
          var cache = result2.cache;
          return result2;
        }
        function mergeData(data, source) {
          var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < (WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG | WRAP_ARY_FLAG);
          var isCombo = srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_CURRY_FLAG || srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_REARG_FLAG && data[7].length <= source[8] || srcBitmask == (WRAP_ARY_FLAG | WRAP_REARG_FLAG) && source[7].length <= source[8] && bitmask == WRAP_CURRY_FLAG;
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & WRAP_BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= bitmask & WRAP_BIND_FLAG ? 0 : WRAP_CURRY_BOUND_FLAG;
          }
          var value = source[3];
          if (value) {
            var partials = data[3];
            data[3] = partials ? composeArgs(partials, value, source[4]) : value;
            data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : source[4];
          }
          value = source[5];
          if (value) {
            partials = data[5];
            data[5] = partials ? composeArgsRight(partials, value, source[6]) : value;
            data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : source[6];
          }
          value = source[7];
          if (value) {
            data[7] = value;
          }
          if (srcBitmask & WRAP_ARY_FLAG) {
            data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
          }
          if (data[9] == null) {
            data[9] = source[9];
          }
          data[0] = source[0];
          data[1] = newBitmask;
          return data;
        }
        function nativeKeysIn(object) {
          var result2 = [];
          if (object != null) {
            for (var key in Object2(object)) {
              result2.push(key);
            }
          }
          return result2;
        }
        function objectToString(value) {
          return nativeObjectToString.call(value);
        }
        function overRest(func, start, transform2) {
          start = nativeMax(start === undefined2 ? func.length - 1 : start, 0);
          return function() {
            var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array2(length);
            while (++index < length) {
              array[index] = args[start + index];
            }
            index = -1;
            var otherArgs = Array2(start + 1);
            while (++index < start) {
              otherArgs[index] = args[index];
            }
            otherArgs[start] = transform2(array);
            return apply(func, this, otherArgs);
          };
        }
        function parent(object, path) {
          return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
        }
        function reorder(array, indexes) {
          var arrLength = array.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array);
          while (length--) {
            var index = indexes[length];
            array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined2;
          }
          return array;
        }
        function safeGet(object, key) {
          if (key === "constructor" && typeof object[key] === "function") {
            return;
          }
          if (key == "__proto__") {
            return;
          }
          return object[key];
        }
        var setData = shortOut(baseSetData);
        var setTimeout2 = ctxSetTimeout || function(func, wait) {
          return root.setTimeout(func, wait);
        };
        var setToString = shortOut(baseSetToString);
        function setWrapToString(wrapper, reference, bitmask) {
          var source = reference + "";
          return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
        }
        function shortOut(func) {
          var count = 0, lastCalled = 0;
          return function() {
            var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
            lastCalled = stamp;
            if (remaining > 0) {
              if (++count >= HOT_COUNT) {
                return arguments[0];
              }
            } else {
              count = 0;
            }
            return func.apply(undefined2, arguments);
          };
        }
        function shuffleSelf(array, size2) {
          var index = -1, length = array.length, lastIndex = length - 1;
          size2 = size2 === undefined2 ? length : size2;
          while (++index < size2) {
            var rand = baseRandom(index, lastIndex), value = array[rand];
            array[rand] = array[index];
            array[index] = value;
          }
          array.length = size2;
          return array;
        }
        var stringToPath = memoizeCapped(function(string) {
          var result2 = [];
          if (string.charCodeAt(0) === 46) {
            result2.push("");
          }
          string.replace(rePropName, function(match, number, quote, subString) {
            result2.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
          });
          return result2;
        });
        function toKey(value) {
          if (typeof value == "string" || isSymbol(value)) {
            return value;
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function toSource(func) {
          if (func != null) {
            try {
              return funcToString.call(func);
            } catch (e) {
            }
            try {
              return func + "";
            } catch (e) {
            }
          }
          return "";
        }
        function updateWrapDetails(details, bitmask) {
          arrayEach(wrapFlags, function(pair) {
            var value = "_." + pair[0];
            if (bitmask & pair[1] && !arrayIncludes(details, value)) {
              details.push(value);
            }
          });
          return details.sort();
        }
        function wrapperClone(wrapper) {
          if (wrapper instanceof LazyWrapper) {
            return wrapper.clone();
          }
          var result2 = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
          result2.__actions__ = copyArray(wrapper.__actions__);
          result2.__index__ = wrapper.__index__;
          result2.__values__ = wrapper.__values__;
          return result2;
        }
        function chunk(array, size2, guard) {
          if (guard ? isIterateeCall(array, size2, guard) : size2 === undefined2) {
            size2 = 1;
          } else {
            size2 = nativeMax(toInteger(size2), 0);
          }
          var length = array == null ? 0 : array.length;
          if (!length || size2 < 1) {
            return [];
          }
          var index = 0, resIndex = 0, result2 = Array2(nativeCeil(length / size2));
          while (index < length) {
            result2[resIndex++] = baseSlice(array, index, index += size2);
          }
          return result2;
        }
        function compact(array) {
          var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result2 = [];
          while (++index < length) {
            var value = array[index];
            if (value) {
              result2[resIndex++] = value;
            }
          }
          return result2;
        }
        function concat() {
          var length = arguments.length;
          if (!length) {
            return [];
          }
          var args = Array2(length - 1), array = arguments[0], index = length;
          while (index--) {
            args[index - 1] = arguments[index];
          }
          return arrayPush(isArray(array) ? copyArray(array) : [array], baseFlatten(args, 1));
        }
        var difference = baseRest(function(array, values2) {
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
        });
        var differenceBy = baseRest(function(array, values2) {
          var iteratee2 = last(values2);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2)) : [];
        });
        var differenceWith = baseRest(function(array, values2) {
          var comparator = last(values2);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined2;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), undefined2, comparator) : [];
        });
        function drop(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function dropRight(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true, true) : [];
        }
        function dropWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true) : [];
        }
        function fill(array, value, start, end) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          if (start && typeof start != "number" && isIterateeCall(array, value, start)) {
            start = 0;
            end = length;
          }
          return baseFill(array, value, start, end);
        }
        function findIndex(array, predicate, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index < 0) {
            index = nativeMax(length + index, 0);
          }
          return baseFindIndex(array, getIteratee(predicate, 3), index);
        }
        function findLastIndex(array, predicate, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = length - 1;
          if (fromIndex !== undefined2) {
            index = toInteger(fromIndex);
            index = fromIndex < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
          }
          return baseFindIndex(array, getIteratee(predicate, 3), index, true);
        }
        function flatten(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseFlatten(array, 1) : [];
        }
        function flattenDeep(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseFlatten(array, INFINITY) : [];
        }
        function flattenDepth(array, depth) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          depth = depth === undefined2 ? 1 : toInteger(depth);
          return baseFlatten(array, depth);
        }
        function fromPairs(pairs) {
          var index = -1, length = pairs == null ? 0 : pairs.length, result2 = {};
          while (++index < length) {
            var pair = pairs[index];
            result2[pair[0]] = pair[1];
          }
          return result2;
        }
        function head(array) {
          return array && array.length ? array[0] : undefined2;
        }
        function indexOf(array, value, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index < 0) {
            index = nativeMax(length + index, 0);
          }
          return baseIndexOf(array, value, index);
        }
        function initial(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseSlice(array, 0, -1) : [];
        }
        var intersection = baseRest(function(arrays) {
          var mapped = arrayMap(arrays, castArrayLikeObject);
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped) : [];
        });
        var intersectionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          if (iteratee2 === last(mapped)) {
            iteratee2 = undefined2;
          } else {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, getIteratee(iteratee2, 2)) : [];
        });
        var intersectionWith = baseRest(function(arrays) {
          var comparator = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          if (comparator) {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, undefined2, comparator) : [];
        });
        function join(array, separator) {
          return array == null ? "" : nativeJoin.call(array, separator);
        }
        function last(array) {
          var length = array == null ? 0 : array.length;
          return length ? array[length - 1] : undefined2;
        }
        function lastIndexOf(array, value, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = length;
          if (fromIndex !== undefined2) {
            index = toInteger(fromIndex);
            index = index < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
          }
          return value === value ? strictLastIndexOf(array, value, index) : baseFindIndex(array, baseIsNaN, index, true);
        }
        function nth(array, n) {
          return array && array.length ? baseNth(array, toInteger(n)) : undefined2;
        }
        var pull = baseRest(pullAll);
        function pullAll(array, values2) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2) : array;
        }
        function pullAllBy(array, values2, iteratee2) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2, getIteratee(iteratee2, 2)) : array;
        }
        function pullAllWith(array, values2, comparator) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2, undefined2, comparator) : array;
        }
        var pullAt = flatRest(function(array, indexes) {
          var length = array == null ? 0 : array.length, result2 = baseAt(array, indexes);
          basePullAt(array, arrayMap(indexes, function(index) {
            return isIndex(index, length) ? +index : index;
          }).sort(compareAscending));
          return result2;
        });
        function remove(array, predicate) {
          var result2 = [];
          if (!(array && array.length)) {
            return result2;
          }
          var index = -1, indexes = [], length = array.length;
          predicate = getIteratee(predicate, 3);
          while (++index < length) {
            var value = array[index];
            if (predicate(value, index, array)) {
              result2.push(value);
              indexes.push(index);
            }
          }
          basePullAt(array, indexes);
          return result2;
        }
        function reverse(array) {
          return array == null ? array : nativeReverse.call(array);
        }
        function slice(array, start, end) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          if (end && typeof end != "number" && isIterateeCall(array, start, end)) {
            start = 0;
            end = length;
          } else {
            start = start == null ? 0 : toInteger(start);
            end = end === undefined2 ? length : toInteger(end);
          }
          return baseSlice(array, start, end);
        }
        function sortedIndex(array, value) {
          return baseSortedIndex(array, value);
        }
        function sortedIndexBy(array, value, iteratee2) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2));
        }
        function sortedIndexOf(array, value) {
          var length = array == null ? 0 : array.length;
          if (length) {
            var index = baseSortedIndex(array, value);
            if (index < length && eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedLastIndex(array, value) {
          return baseSortedIndex(array, value, true);
        }
        function sortedLastIndexBy(array, value, iteratee2) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2), true);
        }
        function sortedLastIndexOf(array, value) {
          var length = array == null ? 0 : array.length;
          if (length) {
            var index = baseSortedIndex(array, value, true) - 1;
            if (eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedUniq(array) {
          return array && array.length ? baseSortedUniq(array) : [];
        }
        function sortedUniqBy(array, iteratee2) {
          return array && array.length ? baseSortedUniq(array, getIteratee(iteratee2, 2)) : [];
        }
        function tail(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseSlice(array, 1, length) : [];
        }
        function take(array, n, guard) {
          if (!(array && array.length)) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function takeRight(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function takeRightWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), false, true) : [];
        }
        function takeWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3)) : [];
        }
        var union = baseRest(function(arrays) {
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true));
        });
        var unionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2));
        });
        var unionWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), undefined2, comparator);
        });
        function uniq(array) {
          return array && array.length ? baseUniq(array) : [];
        }
        function uniqBy(array, iteratee2) {
          return array && array.length ? baseUniq(array, getIteratee(iteratee2, 2)) : [];
        }
        function uniqWith(array, comparator) {
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return array && array.length ? baseUniq(array, undefined2, comparator) : [];
        }
        function unzip(array) {
          if (!(array && array.length)) {
            return [];
          }
          var length = 0;
          array = arrayFilter(array, function(group) {
            if (isArrayLikeObject(group)) {
              length = nativeMax(group.length, length);
              return true;
            }
          });
          return baseTimes(length, function(index) {
            return arrayMap(array, baseProperty(index));
          });
        }
        function unzipWith(array, iteratee2) {
          if (!(array && array.length)) {
            return [];
          }
          var result2 = unzip(array);
          if (iteratee2 == null) {
            return result2;
          }
          return arrayMap(result2, function(group) {
            return apply(iteratee2, undefined2, group);
          });
        }
        var without = baseRest(function(array, values2) {
          return isArrayLikeObject(array) ? baseDifference(array, values2) : [];
        });
        var xor = baseRest(function(arrays) {
          return baseXor(arrayFilter(arrays, isArrayLikeObject));
        });
        var xorBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee2, 2));
        });
        var xorWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined2, comparator);
        });
        var zip = baseRest(unzip);
        function zipObject(props, values2) {
          return baseZipObject(props || [], values2 || [], assignValue);
        }
        function zipObjectDeep(props, values2) {
          return baseZipObject(props || [], values2 || [], baseSet);
        }
        var zipWith = baseRest(function(arrays) {
          var length = arrays.length, iteratee2 = length > 1 ? arrays[length - 1] : undefined2;
          iteratee2 = typeof iteratee2 == "function" ? (arrays.pop(), iteratee2) : undefined2;
          return unzipWith(arrays, iteratee2);
        });
        function chain(value) {
          var result2 = lodash(value);
          result2.__chain__ = true;
          return result2;
        }
        function tap(value, interceptor) {
          interceptor(value);
          return value;
        }
        function thru(value, interceptor) {
          return interceptor(value);
        }
        var wrapperAt = flatRest(function(paths) {
          var length = paths.length, start = length ? paths[0] : 0, value = this.__wrapped__, interceptor = function(object) {
            return baseAt(object, paths);
          };
          if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
            return this.thru(interceptor);
          }
          value = value.slice(start, +start + (length ? 1 : 0));
          value.__actions__.push({
            "func": thru,
            "args": [interceptor],
            "thisArg": undefined2
          });
          return new LodashWrapper(value, this.__chain__).thru(function(array) {
            if (length && !array.length) {
              array.push(undefined2);
            }
            return array;
          });
        });
        function wrapperChain() {
          return chain(this);
        }
        function wrapperCommit() {
          return new LodashWrapper(this.value(), this.__chain__);
        }
        function wrapperNext() {
          if (this.__values__ === undefined2) {
            this.__values__ = toArray(this.value());
          }
          var done = this.__index__ >= this.__values__.length, value = done ? undefined2 : this.__values__[this.__index__++];
          return { "done": done, "value": value };
        }
        function wrapperToIterator() {
          return this;
        }
        function wrapperPlant(value) {
          var result2, parent2 = this;
          while (parent2 instanceof baseLodash) {
            var clone2 = wrapperClone(parent2);
            clone2.__index__ = 0;
            clone2.__values__ = undefined2;
            if (result2) {
              previous.__wrapped__ = clone2;
            } else {
              result2 = clone2;
            }
            var previous = clone2;
            parent2 = parent2.__wrapped__;
          }
          previous.__wrapped__ = value;
          return result2;
        }
        function wrapperReverse() {
          var value = this.__wrapped__;
          if (value instanceof LazyWrapper) {
            var wrapped = value;
            if (this.__actions__.length) {
              wrapped = new LazyWrapper(this);
            }
            wrapped = wrapped.reverse();
            wrapped.__actions__.push({
              "func": thru,
              "args": [reverse],
              "thisArg": undefined2
            });
            return new LodashWrapper(wrapped, this.__chain__);
          }
          return this.thru(reverse);
        }
        function wrapperValue() {
          return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var countBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            ++result2[key];
          } else {
            baseAssignValue(result2, key, 1);
          }
        });
        function every(collection, predicate, guard) {
          var func = isArray(collection) ? arrayEvery : baseEvery;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined2;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        function filter(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, getIteratee(predicate, 3));
        }
        var find = createFind(findIndex);
        var findLast = createFind(findLastIndex);
        function flatMap(collection, iteratee2) {
          return baseFlatten(map(collection, iteratee2), 1);
        }
        function flatMapDeep(collection, iteratee2) {
          return baseFlatten(map(collection, iteratee2), INFINITY);
        }
        function flatMapDepth(collection, iteratee2, depth) {
          depth = depth === undefined2 ? 1 : toInteger(depth);
          return baseFlatten(map(collection, iteratee2), depth);
        }
        function forEach(collection, iteratee2) {
          var func = isArray(collection) ? arrayEach : baseEach;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function forEachRight(collection, iteratee2) {
          var func = isArray(collection) ? arrayEachRight : baseEachRight;
          return func(collection, getIteratee(iteratee2, 3));
        }
        var groupBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            result2[key].push(value);
          } else {
            baseAssignValue(result2, key, [value]);
          }
        });
        function includes(collection, value, fromIndex, guard) {
          collection = isArrayLike(collection) ? collection : values(collection);
          fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
          var length = collection.length;
          if (fromIndex < 0) {
            fromIndex = nativeMax(length + fromIndex, 0);
          }
          return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
        }
        var invokeMap = baseRest(function(collection, path, args) {
          var index = -1, isFunc = typeof path == "function", result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value) {
            result2[++index] = isFunc ? apply(path, value, args) : baseInvoke(value, path, args);
          });
          return result2;
        });
        var keyBy = createAggregator(function(result2, value, key) {
          baseAssignValue(result2, key, value);
        });
        function map(collection, iteratee2) {
          var func = isArray(collection) ? arrayMap : baseMap;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function orderBy(collection, iteratees, orders, guard) {
          if (collection == null) {
            return [];
          }
          if (!isArray(iteratees)) {
            iteratees = iteratees == null ? [] : [iteratees];
          }
          orders = guard ? undefined2 : orders;
          if (!isArray(orders)) {
            orders = orders == null ? [] : [orders];
          }
          return baseOrderBy(collection, iteratees, orders);
        }
        var partition = createAggregator(function(result2, value, key) {
          result2[key ? 0 : 1].push(value);
        }, function() {
          return [[], []];
        });
        function reduce(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEach);
        }
        function reduceRight(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduceRight : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEachRight);
        }
        function reject(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, negate(getIteratee(predicate, 3)));
        }
        function sample(collection) {
          var func = isArray(collection) ? arraySample : baseSample;
          return func(collection);
        }
        function sampleSize(collection, n, guard) {
          if (guard ? isIterateeCall(collection, n, guard) : n === undefined2) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          var func = isArray(collection) ? arraySampleSize : baseSampleSize;
          return func(collection, n);
        }
        function shuffle(collection) {
          var func = isArray(collection) ? arrayShuffle : baseShuffle;
          return func(collection);
        }
        function size(collection) {
          if (collection == null) {
            return 0;
          }
          if (isArrayLike(collection)) {
            return isString(collection) ? stringSize(collection) : collection.length;
          }
          var tag = getTag(collection);
          if (tag == mapTag || tag == setTag) {
            return collection.size;
          }
          return baseKeys(collection).length;
        }
        function some(collection, predicate, guard) {
          var func = isArray(collection) ? arraySome : baseSome;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined2;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        var sortBy = baseRest(function(collection, iteratees) {
          if (collection == null) {
            return [];
          }
          var length = iteratees.length;
          if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
            iteratees = [];
          } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
            iteratees = [iteratees[0]];
          }
          return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
        });
        var now = ctxNow || function() {
          return root.Date.now();
        };
        function after(n, func) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n < 1) {
              return func.apply(this, arguments);
            }
          };
        }
        function ary(func, n, guard) {
          n = guard ? undefined2 : n;
          n = func && n == null ? func.length : n;
          return createWrap(func, WRAP_ARY_FLAG, undefined2, undefined2, undefined2, undefined2, n);
        }
        function before(n, func) {
          var result2;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n > 0) {
              result2 = func.apply(this, arguments);
            }
            if (n <= 1) {
              func = undefined2;
            }
            return result2;
          };
        }
        var bind = baseRest(function(func, thisArg, partials) {
          var bitmask = WRAP_BIND_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bind));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(func, bitmask, thisArg, partials, holders);
        });
        var bindKey = baseRest(function(object, key, partials) {
          var bitmask = WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bindKey));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(key, bitmask, object, partials, holders);
        });
        function curry(func, arity, guard) {
          arity = guard ? undefined2 : arity;
          var result2 = createWrap(func, WRAP_CURRY_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
          result2.placeholder = curry.placeholder;
          return result2;
        }
        function curryRight(func, arity, guard) {
          arity = guard ? undefined2 : arity;
          var result2 = createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
          result2.placeholder = curryRight.placeholder;
          return result2;
        }
        function debounce(func, wait, options) {
          var lastArgs, lastThis, maxWait, result2, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          wait = toNumber(wait) || 0;
          if (isObject(options)) {
            leading = !!options.leading;
            maxing = "maxWait" in options;
            maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
            trailing = "trailing" in options ? !!options.trailing : trailing;
          }
          function invokeFunc(time) {
            var args = lastArgs, thisArg = lastThis;
            lastArgs = lastThis = undefined2;
            lastInvokeTime = time;
            result2 = func.apply(thisArg, args);
            return result2;
          }
          function leadingEdge(time) {
            lastInvokeTime = time;
            timerId = setTimeout2(timerExpired, wait);
            return leading ? invokeFunc(time) : result2;
          }
          function remainingWait(time) {
            var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
            return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
          }
          function shouldInvoke(time) {
            var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
            return lastCallTime === undefined2 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
          }
          function timerExpired() {
            var time = now();
            if (shouldInvoke(time)) {
              return trailingEdge(time);
            }
            timerId = setTimeout2(timerExpired, remainingWait(time));
          }
          function trailingEdge(time) {
            timerId = undefined2;
            if (trailing && lastArgs) {
              return invokeFunc(time);
            }
            lastArgs = lastThis = undefined2;
            return result2;
          }
          function cancel() {
            if (timerId !== undefined2) {
              clearTimeout2(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined2;
          }
          function flush() {
            return timerId === undefined2 ? result2 : trailingEdge(now());
          }
          function debounced() {
            var time = now(), isInvoking = shouldInvoke(time);
            lastArgs = arguments;
            lastThis = this;
            lastCallTime = time;
            if (isInvoking) {
              if (timerId === undefined2) {
                return leadingEdge(lastCallTime);
              }
              if (maxing) {
                clearTimeout2(timerId);
                timerId = setTimeout2(timerExpired, wait);
                return invokeFunc(lastCallTime);
              }
            }
            if (timerId === undefined2) {
              timerId = setTimeout2(timerExpired, wait);
            }
            return result2;
          }
          debounced.cancel = cancel;
          debounced.flush = flush;
          return debounced;
        }
        var defer = baseRest(function(func, args) {
          return baseDelay(func, 1, args);
        });
        var delay = baseRest(function(func, wait, args) {
          return baseDelay(func, toNumber(wait) || 0, args);
        });
        function flip(func) {
          return createWrap(func, WRAP_FLIP_FLAG);
        }
        function memoize(func, resolver) {
          if (typeof func != "function" || resolver != null && typeof resolver != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var memoized = function() {
            var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
            if (cache.has(key)) {
              return cache.get(key);
            }
            var result2 = func.apply(this, args);
            memoized.cache = cache.set(key, result2) || cache;
            return result2;
          };
          memoized.cache = new (memoize.Cache || MapCache)();
          return memoized;
        }
        memoize.Cache = MapCache;
        function negate(predicate) {
          if (typeof predicate != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return !predicate.call(this);
              case 1:
                return !predicate.call(this, args[0]);
              case 2:
                return !predicate.call(this, args[0], args[1]);
              case 3:
                return !predicate.call(this, args[0], args[1], args[2]);
            }
            return !predicate.apply(this, args);
          };
        }
        function once(func) {
          return before(2, func);
        }
        var overArgs = castRest(function(func, transforms) {
          transforms = transforms.length == 1 && isArray(transforms[0]) ? arrayMap(transforms[0], baseUnary(getIteratee())) : arrayMap(baseFlatten(transforms, 1), baseUnary(getIteratee()));
          var funcsLength = transforms.length;
          return baseRest(function(args) {
            var index = -1, length = nativeMin(args.length, funcsLength);
            while (++index < length) {
              args[index] = transforms[index].call(this, args[index]);
            }
            return apply(func, this, args);
          });
        });
        var partial = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partial));
          return createWrap(func, WRAP_PARTIAL_FLAG, undefined2, partials, holders);
        });
        var partialRight = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partialRight));
          return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined2, partials, holders);
        });
        var rearg = flatRest(function(func, indexes) {
          return createWrap(func, WRAP_REARG_FLAG, undefined2, undefined2, undefined2, indexes);
        });
        function rest(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start === undefined2 ? start : toInteger(start);
          return baseRest(func, start);
        }
        function spread(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start == null ? 0 : nativeMax(toInteger(start), 0);
          return baseRest(function(args) {
            var array = args[start], otherArgs = castSlice(args, 0, start);
            if (array) {
              arrayPush(otherArgs, array);
            }
            return apply(func, this, otherArgs);
          });
        }
        function throttle(func, wait, options) {
          var leading = true, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          if (isObject(options)) {
            leading = "leading" in options ? !!options.leading : leading;
            trailing = "trailing" in options ? !!options.trailing : trailing;
          }
          return debounce(func, wait, {
            "leading": leading,
            "maxWait": wait,
            "trailing": trailing
          });
        }
        function unary(func) {
          return ary(func, 1);
        }
        function wrap(value, wrapper) {
          return partial(castFunction(wrapper), value);
        }
        function castArray() {
          if (!arguments.length) {
            return [];
          }
          var value = arguments[0];
          return isArray(value) ? value : [value];
        }
        function clone(value) {
          return baseClone(value, CLONE_SYMBOLS_FLAG);
        }
        function cloneWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseClone(value, CLONE_SYMBOLS_FLAG, customizer);
        }
        function cloneDeep(value) {
          return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
        }
        function cloneDeepWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG, customizer);
        }
        function conformsTo(object, source) {
          return source == null || baseConformsTo(object, source, keys(source));
        }
        function eq(value, other) {
          return value === other || value !== value && other !== other;
        }
        var gt = createRelationalOperation(baseGt);
        var gte = createRelationalOperation(function(value, other) {
          return value >= other;
        });
        var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
          return arguments;
        })()) ? baseIsArguments : function(value) {
          return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
        };
        var isArray = Array2.isArray;
        var isArrayBuffer = nodeIsArrayBuffer ? baseUnary(nodeIsArrayBuffer) : baseIsArrayBuffer;
        function isArrayLike(value) {
          return value != null && isLength(value.length) && !isFunction(value);
        }
        function isArrayLikeObject(value) {
          return isObjectLike(value) && isArrayLike(value);
        }
        function isBoolean(value) {
          return value === true || value === false || isObjectLike(value) && baseGetTag(value) == boolTag;
        }
        var isBuffer = nativeIsBuffer || stubFalse;
        var isDate = nodeIsDate ? baseUnary(nodeIsDate) : baseIsDate;
        function isElement(value) {
          return isObjectLike(value) && value.nodeType === 1 && !isPlainObject(value);
        }
        function isEmpty(value) {
          if (value == null) {
            return true;
          }
          if (isArrayLike(value) && (isArray(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer(value) || isTypedArray(value) || isArguments(value))) {
            return !value.length;
          }
          var tag = getTag(value);
          if (tag == mapTag || tag == setTag) {
            return !value.size;
          }
          if (isPrototype(value)) {
            return !baseKeys(value).length;
          }
          for (var key in value) {
            if (hasOwnProperty.call(value, key)) {
              return false;
            }
          }
          return true;
        }
        function isEqual(value, other) {
          return baseIsEqual(value, other);
        }
        function isEqualWith(value, other, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          var result2 = customizer ? customizer(value, other) : undefined2;
          return result2 === undefined2 ? baseIsEqual(value, other, undefined2, customizer) : !!result2;
        }
        function isError(value) {
          if (!isObjectLike(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == errorTag || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject(value);
        }
        function isFinite(value) {
          return typeof value == "number" && nativeIsFinite(value);
        }
        function isFunction(value) {
          if (!isObject(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
        }
        function isInteger(value) {
          return typeof value == "number" && value == toInteger(value);
        }
        function isLength(value) {
          return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isObject(value) {
          var type = typeof value;
          return value != null && (type == "object" || type == "function");
        }
        function isObjectLike(value) {
          return value != null && typeof value == "object";
        }
        var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;
        function isMatch(object, source) {
          return object === source || baseIsMatch(object, source, getMatchData(source));
        }
        function isMatchWith(object, source, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseIsMatch(object, source, getMatchData(source), customizer);
        }
        function isNaN2(value) {
          return isNumber(value) && value != +value;
        }
        function isNative(value) {
          if (isMaskable(value)) {
            throw new Error2(CORE_ERROR_TEXT);
          }
          return baseIsNative(value);
        }
        function isNull(value) {
          return value === null;
        }
        function isNil(value) {
          return value == null;
        }
        function isNumber(value) {
          return typeof value == "number" || isObjectLike(value) && baseGetTag(value) == numberTag;
        }
        function isPlainObject(value) {
          if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
            return false;
          }
          var proto = getPrototype(value);
          if (proto === null) {
            return true;
          }
          var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
          return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
        }
        var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;
        function isSafeInteger(value) {
          return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
        }
        var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;
        function isString(value) {
          return typeof value == "string" || !isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
        }
        function isSymbol(value) {
          return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
        }
        var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
        function isUndefined(value) {
          return value === undefined2;
        }
        function isWeakMap(value) {
          return isObjectLike(value) && getTag(value) == weakMapTag;
        }
        function isWeakSet(value) {
          return isObjectLike(value) && baseGetTag(value) == weakSetTag;
        }
        var lt = createRelationalOperation(baseLt);
        var lte = createRelationalOperation(function(value, other) {
          return value <= other;
        });
        function toArray(value) {
          if (!value) {
            return [];
          }
          if (isArrayLike(value)) {
            return isString(value) ? stringToArray(value) : copyArray(value);
          }
          if (symIterator && value[symIterator]) {
            return iteratorToArray(value[symIterator]());
          }
          var tag = getTag(value), func = tag == mapTag ? mapToArray : tag == setTag ? setToArray : values;
          return func(value);
        }
        function toFinite(value) {
          if (!value) {
            return value === 0 ? value : 0;
          }
          value = toNumber(value);
          if (value === INFINITY || value === -INFINITY) {
            var sign = value < 0 ? -1 : 1;
            return sign * MAX_INTEGER;
          }
          return value === value ? value : 0;
        }
        function toInteger(value) {
          var result2 = toFinite(value), remainder = result2 % 1;
          return result2 === result2 ? remainder ? result2 - remainder : result2 : 0;
        }
        function toLength(value) {
          return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
        }
        function toNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          if (isObject(value)) {
            var other = typeof value.valueOf == "function" ? value.valueOf() : value;
            value = isObject(other) ? other + "" : other;
          }
          if (typeof value != "string") {
            return value === 0 ? value : +value;
          }
          value = baseTrim(value);
          var isBinary = reIsBinary.test(value);
          return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
        }
        function toPlainObject(value) {
          return copyObject(value, keysIn(value));
        }
        function toSafeInteger(value) {
          return value ? baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER) : value === 0 ? value : 0;
        }
        function toString(value) {
          return value == null ? "" : baseToString(value);
        }
        var assign = createAssigner(function(object, source) {
          if (isPrototype(source) || isArrayLike(source)) {
            copyObject(source, keys(source), object);
            return;
          }
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              assignValue(object, key, source[key]);
            }
          }
        });
        var assignIn = createAssigner(function(object, source) {
          copyObject(source, keysIn(source), object);
        });
        var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObject(source, keysIn(source), object, customizer);
        });
        var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObject(source, keys(source), object, customizer);
        });
        var at = flatRest(baseAt);
        function create(prototype, properties) {
          var result2 = baseCreate(prototype);
          return properties == null ? result2 : baseAssign(result2, properties);
        }
        var defaults = baseRest(function(object, sources) {
          object = Object2(object);
          var index = -1;
          var length = sources.length;
          var guard = length > 2 ? sources[2] : undefined2;
          if (guard && isIterateeCall(sources[0], sources[1], guard)) {
            length = 1;
          }
          while (++index < length) {
            var source = sources[index];
            var props = keysIn(source);
            var propsIndex = -1;
            var propsLength = props.length;
            while (++propsIndex < propsLength) {
              var key = props[propsIndex];
              var value = object[key];
              if (value === undefined2 || eq(value, objectProto[key]) && !hasOwnProperty.call(object, key)) {
                object[key] = source[key];
              }
            }
          }
          return object;
        });
        var defaultsDeep = baseRest(function(args) {
          args.push(undefined2, customDefaultsMerge);
          return apply(mergeWith, undefined2, args);
        });
        function findKey(object, predicate) {
          return baseFindKey(object, getIteratee(predicate, 3), baseForOwn);
        }
        function findLastKey(object, predicate) {
          return baseFindKey(object, getIteratee(predicate, 3), baseForOwnRight);
        }
        function forIn(object, iteratee2) {
          return object == null ? object : baseFor(object, getIteratee(iteratee2, 3), keysIn);
        }
        function forInRight(object, iteratee2) {
          return object == null ? object : baseForRight(object, getIteratee(iteratee2, 3), keysIn);
        }
        function forOwn(object, iteratee2) {
          return object && baseForOwn(object, getIteratee(iteratee2, 3));
        }
        function forOwnRight(object, iteratee2) {
          return object && baseForOwnRight(object, getIteratee(iteratee2, 3));
        }
        function functions(object) {
          return object == null ? [] : baseFunctions(object, keys(object));
        }
        function functionsIn(object) {
          return object == null ? [] : baseFunctions(object, keysIn(object));
        }
        function get(object, path, defaultValue) {
          var result2 = object == null ? undefined2 : baseGet(object, path);
          return result2 === undefined2 ? defaultValue : result2;
        }
        function has(object, path) {
          return object != null && hasPath(object, path, baseHas);
        }
        function hasIn(object, path) {
          return object != null && hasPath(object, path, baseHasIn);
        }
        var invert = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          result2[value] = key;
        }, constant(identity));
        var invertBy = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          if (hasOwnProperty.call(result2, value)) {
            result2[value].push(key);
          } else {
            result2[value] = [key];
          }
        }, getIteratee);
        var invoke = baseRest(baseInvoke);
        function keys(object) {
          return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
        }
        function keysIn(object) {
          return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
        }
        function mapKeys(object, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object, function(value, key, object2) {
            baseAssignValue(result2, iteratee2(value, key, object2), value);
          });
          return result2;
        }
        function mapValues(object, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object, function(value, key, object2) {
            baseAssignValue(result2, key, iteratee2(value, key, object2));
          });
          return result2;
        }
        var merge = createAssigner(function(object, source, srcIndex) {
          baseMerge(object, source, srcIndex);
        });
        var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
          baseMerge(object, source, srcIndex, customizer);
        });
        var omit = flatRest(function(object, paths) {
          var result2 = {};
          if (object == null) {
            return result2;
          }
          var isDeep = false;
          paths = arrayMap(paths, function(path) {
            path = castPath(path, object);
            isDeep || (isDeep = path.length > 1);
            return path;
          });
          copyObject(object, getAllKeysIn(object), result2);
          if (isDeep) {
            result2 = baseClone(result2, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
          }
          var length = paths.length;
          while (length--) {
            baseUnset(result2, paths[length]);
          }
          return result2;
        });
        function omitBy(object, predicate) {
          return pickBy(object, negate(getIteratee(predicate)));
        }
        var pick = flatRest(function(object, paths) {
          return object == null ? {} : basePick(object, paths);
        });
        function pickBy(object, predicate) {
          if (object == null) {
            return {};
          }
          var props = arrayMap(getAllKeysIn(object), function(prop) {
            return [prop];
          });
          predicate = getIteratee(predicate);
          return basePickBy(object, props, function(value, path) {
            return predicate(value, path[0]);
          });
        }
        function result(object, path, defaultValue) {
          path = castPath(path, object);
          var index = -1, length = path.length;
          if (!length) {
            length = 1;
            object = undefined2;
          }
          while (++index < length) {
            var value = object == null ? undefined2 : object[toKey(path[index])];
            if (value === undefined2) {
              index = length;
              value = defaultValue;
            }
            object = isFunction(value) ? value.call(object) : value;
          }
          return object;
        }
        function set(object, path, value) {
          return object == null ? object : baseSet(object, path, value);
        }
        function setWith(object, path, value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return object == null ? object : baseSet(object, path, value, customizer);
        }
        var toPairs = createToPairs(keys);
        var toPairsIn = createToPairs(keysIn);
        function transform(object, iteratee2, accumulator) {
          var isArr = isArray(object), isArrLike = isArr || isBuffer(object) || isTypedArray(object);
          iteratee2 = getIteratee(iteratee2, 4);
          if (accumulator == null) {
            var Ctor = object && object.constructor;
            if (isArrLike) {
              accumulator = isArr ? new Ctor() : [];
            } else if (isObject(object)) {
              accumulator = isFunction(Ctor) ? baseCreate(getPrototype(object)) : {};
            } else {
              accumulator = {};
            }
          }
          (isArrLike ? arrayEach : baseForOwn)(object, function(value, index, object2) {
            return iteratee2(accumulator, value, index, object2);
          });
          return accumulator;
        }
        function unset(object, path) {
          return object == null ? true : baseUnset(object, path);
        }
        function update(object, path, updater) {
          return object == null ? object : baseUpdate(object, path, castFunction(updater));
        }
        function updateWith(object, path, updater, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return object == null ? object : baseUpdate(object, path, castFunction(updater), customizer);
        }
        function values(object) {
          return object == null ? [] : baseValues(object, keys(object));
        }
        function valuesIn(object) {
          return object == null ? [] : baseValues(object, keysIn(object));
        }
        function clamp(number, lower, upper) {
          if (upper === undefined2) {
            upper = lower;
            lower = undefined2;
          }
          if (upper !== undefined2) {
            upper = toNumber(upper);
            upper = upper === upper ? upper : 0;
          }
          if (lower !== undefined2) {
            lower = toNumber(lower);
            lower = lower === lower ? lower : 0;
          }
          return baseClamp(toNumber(number), lower, upper);
        }
        function inRange(number, start, end) {
          start = toFinite(start);
          if (end === undefined2) {
            end = start;
            start = 0;
          } else {
            end = toFinite(end);
          }
          number = toNumber(number);
          return baseInRange(number, start, end);
        }
        function random(lower, upper, floating) {
          if (floating && typeof floating != "boolean" && isIterateeCall(lower, upper, floating)) {
            upper = floating = undefined2;
          }
          if (floating === undefined2) {
            if (typeof upper == "boolean") {
              floating = upper;
              upper = undefined2;
            } else if (typeof lower == "boolean") {
              floating = lower;
              lower = undefined2;
            }
          }
          if (lower === undefined2 && upper === undefined2) {
            lower = 0;
            upper = 1;
          } else {
            lower = toFinite(lower);
            if (upper === undefined2) {
              upper = lower;
              lower = 0;
            } else {
              upper = toFinite(upper);
            }
          }
          if (lower > upper) {
            var temp = lower;
            lower = upper;
            upper = temp;
          }
          if (floating || lower % 1 || upper % 1) {
            var rand = nativeRandom();
            return nativeMin(lower + rand * (upper - lower + freeParseFloat("1e-" + ((rand + "").length - 1))), upper);
          }
          return baseRandom(lower, upper);
        }
        var camelCase = createCompounder(function(result2, word, index) {
          word = word.toLowerCase();
          return result2 + (index ? capitalize(word) : word);
        });
        function capitalize(string) {
          return upperFirst(toString(string).toLowerCase());
        }
        function deburr(string) {
          string = toString(string);
          return string && string.replace(reLatin, deburrLetter).replace(reComboMark, "");
        }
        function endsWith(string, target, position) {
          string = toString(string);
          target = baseToString(target);
          var length = string.length;
          position = position === undefined2 ? length : baseClamp(toInteger(position), 0, length);
          var end = position;
          position -= target.length;
          return position >= 0 && string.slice(position, end) == target;
        }
        function escape(string) {
          string = toString(string);
          return string && reHasUnescapedHtml.test(string) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
        }
        function escapeRegExp(string) {
          string = toString(string);
          return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
        }
        var kebabCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? "-" : "") + word.toLowerCase();
        });
        var lowerCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + word.toLowerCase();
        });
        var lowerFirst = createCaseFirst("toLowerCase");
        function pad(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          if (!length || strLength >= length) {
            return string;
          }
          var mid = (length - strLength) / 2;
          return createPadding(nativeFloor(mid), chars) + string + createPadding(nativeCeil(mid), chars);
        }
        function padEnd(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          return length && strLength < length ? string + createPadding(length - strLength, chars) : string;
        }
        function padStart(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          return length && strLength < length ? createPadding(length - strLength, chars) + string : string;
        }
        function parseInt2(string, radix, guard) {
          if (guard || radix == null) {
            radix = 0;
          } else if (radix) {
            radix = +radix;
          }
          return nativeParseInt(toString(string).replace(reTrimStart, ""), radix || 0);
        }
        function repeat(string, n, guard) {
          if (guard ? isIterateeCall(string, n, guard) : n === undefined2) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          return baseRepeat(toString(string), n);
        }
        function replace() {
          var args = arguments, string = toString(args[0]);
          return args.length < 3 ? string : string.replace(args[1], args[2]);
        }
        var snakeCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? "_" : "") + word.toLowerCase();
        });
        function split(string, separator, limit) {
          if (limit && typeof limit != "number" && isIterateeCall(string, separator, limit)) {
            separator = limit = undefined2;
          }
          limit = limit === undefined2 ? MAX_ARRAY_LENGTH : limit >>> 0;
          if (!limit) {
            return [];
          }
          string = toString(string);
          if (string && (typeof separator == "string" || separator != null && !isRegExp(separator))) {
            separator = baseToString(separator);
            if (!separator && hasUnicode(string)) {
              return castSlice(stringToArray(string), 0, limit);
            }
          }
          return string.split(separator, limit);
        }
        var startCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + upperFirst(word);
        });
        function startsWith(string, target, position) {
          string = toString(string);
          position = position == null ? 0 : baseClamp(toInteger(position), 0, string.length);
          target = baseToString(target);
          return string.slice(position, position + target.length) == target;
        }
        function template(string, options, guard) {
          var settings = lodash.templateSettings;
          if (guard && isIterateeCall(string, options, guard)) {
            options = undefined2;
          }
          string = toString(string);
          options = assignInWith({}, options, settings, customDefaultsAssignIn);
          var imports = assignInWith({}, options.imports, settings.imports, customDefaultsAssignIn), importsKeys = keys(imports), importsValues = baseValues(imports, importsKeys);
          var isEscaping, isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
          var reDelimiters = RegExp2(
            (options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$",
            "g"
          );
          var sourceURL = "//# sourceURL=" + (hasOwnProperty.call(options, "sourceURL") ? (options.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
          string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
            interpolateValue || (interpolateValue = esTemplateValue);
            source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
            if (escapeValue) {
              isEscaping = true;
              source += "' +\n__e(" + escapeValue + ") +\n'";
            }
            if (evaluateValue) {
              isEvaluating = true;
              source += "';\n" + evaluateValue + ";\n__p += '";
            }
            if (interpolateValue) {
              source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
            }
            index = offset + match.length;
            return match;
          });
          source += "';\n";
          var variable = hasOwnProperty.call(options, "variable") && options.variable;
          if (!variable) {
            source = "with (obj) {\n" + source + "\n}\n";
          } else if (reForbiddenIdentifierChars.test(variable)) {
            throw new Error2(INVALID_TEMPL_VAR_ERROR_TEXT);
          }
          source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
          source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
          var result2 = attempt(function() {
            return Function2(importsKeys, sourceURL + "return " + source).apply(undefined2, importsValues);
          });
          result2.source = source;
          if (isError(result2)) {
            throw result2;
          }
          return result2;
        }
        function toLower(value) {
          return toString(value).toLowerCase();
        }
        function toUpper(value) {
          return toString(value).toUpperCase();
        }
        function trim(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return baseTrim(string);
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), chrSymbols = stringToArray(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
          return castSlice(strSymbols, start, end).join("");
        }
        function trimEnd(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return string.slice(0, trimmedEndIndex(string) + 1);
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), end = charsEndIndex(strSymbols, stringToArray(chars)) + 1;
          return castSlice(strSymbols, 0, end).join("");
        }
        function trimStart(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return string.replace(reTrimStart, "");
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), start = charsStartIndex(strSymbols, stringToArray(chars));
          return castSlice(strSymbols, start).join("");
        }
        function truncate(string, options) {
          var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
          if (isObject(options)) {
            var separator = "separator" in options ? options.separator : separator;
            length = "length" in options ? toInteger(options.length) : length;
            omission = "omission" in options ? baseToString(options.omission) : omission;
          }
          string = toString(string);
          var strLength = string.length;
          if (hasUnicode(string)) {
            var strSymbols = stringToArray(string);
            strLength = strSymbols.length;
          }
          if (length >= strLength) {
            return string;
          }
          var end = length - stringSize(omission);
          if (end < 1) {
            return omission;
          }
          var result2 = strSymbols ? castSlice(strSymbols, 0, end).join("") : string.slice(0, end);
          if (separator === undefined2) {
            return result2 + omission;
          }
          if (strSymbols) {
            end += result2.length - end;
          }
          if (isRegExp(separator)) {
            if (string.slice(end).search(separator)) {
              var match, substring = result2;
              if (!separator.global) {
                separator = RegExp2(separator.source, toString(reFlags.exec(separator)) + "g");
              }
              separator.lastIndex = 0;
              while (match = separator.exec(substring)) {
                var newEnd = match.index;
              }
              result2 = result2.slice(0, newEnd === undefined2 ? end : newEnd);
            }
          } else if (string.indexOf(baseToString(separator), end) != end) {
            var index = result2.lastIndexOf(separator);
            if (index > -1) {
              result2 = result2.slice(0, index);
            }
          }
          return result2 + omission;
        }
        function unescape(string) {
          string = toString(string);
          return string && reHasEscapedHtml.test(string) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
        }
        var upperCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + word.toUpperCase();
        });
        var upperFirst = createCaseFirst("toUpperCase");
        function words(string, pattern, guard) {
          string = toString(string);
          pattern = guard ? undefined2 : pattern;
          if (pattern === undefined2) {
            return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
          }
          return string.match(pattern) || [];
        }
        var attempt = baseRest(function(func, args) {
          try {
            return apply(func, undefined2, args);
          } catch (e) {
            return isError(e) ? e : new Error2(e);
          }
        });
        var bindAll = flatRest(function(object, methodNames) {
          arrayEach(methodNames, function(key) {
            key = toKey(key);
            baseAssignValue(object, key, bind(object[key], object));
          });
          return object;
        });
        function cond(pairs) {
          var length = pairs == null ? 0 : pairs.length, toIteratee = getIteratee();
          pairs = !length ? [] : arrayMap(pairs, function(pair) {
            if (typeof pair[1] != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            return [toIteratee(pair[0]), pair[1]];
          });
          return baseRest(function(args) {
            var index = -1;
            while (++index < length) {
              var pair = pairs[index];
              if (apply(pair[0], this, args)) {
                return apply(pair[1], this, args);
              }
            }
          });
        }
        function conforms(source) {
          return baseConforms(baseClone(source, CLONE_DEEP_FLAG));
        }
        function constant(value) {
          return function() {
            return value;
          };
        }
        function defaultTo(value, defaultValue) {
          return value == null || value !== value ? defaultValue : value;
        }
        var flow = createFlow();
        var flowRight = createFlow(true);
        function identity(value) {
          return value;
        }
        function iteratee(func) {
          return baseIteratee(typeof func == "function" ? func : baseClone(func, CLONE_DEEP_FLAG));
        }
        function matches(source) {
          return baseMatches(baseClone(source, CLONE_DEEP_FLAG));
        }
        function matchesProperty(path, srcValue) {
          return baseMatchesProperty(path, baseClone(srcValue, CLONE_DEEP_FLAG));
        }
        var method = baseRest(function(path, args) {
          return function(object) {
            return baseInvoke(object, path, args);
          };
        });
        var methodOf = baseRest(function(object, args) {
          return function(path) {
            return baseInvoke(object, path, args);
          };
        });
        function mixin(object, source, options) {
          var props = keys(source), methodNames = baseFunctions(source, props);
          if (options == null && !(isObject(source) && (methodNames.length || !props.length))) {
            options = source;
            source = object;
            object = this;
            methodNames = baseFunctions(source, keys(source));
          }
          var chain2 = !(isObject(options) && "chain" in options) || !!options.chain, isFunc = isFunction(object);
          arrayEach(methodNames, function(methodName) {
            var func = source[methodName];
            object[methodName] = func;
            if (isFunc) {
              object.prototype[methodName] = function() {
                var chainAll = this.__chain__;
                if (chain2 || chainAll) {
                  var result2 = object(this.__wrapped__), actions = result2.__actions__ = copyArray(this.__actions__);
                  actions.push({ "func": func, "args": arguments, "thisArg": object });
                  result2.__chain__ = chainAll;
                  return result2;
                }
                return func.apply(object, arrayPush([this.value()], arguments));
              };
            }
          });
          return object;
        }
        function noConflict() {
          if (root._ === this) {
            root._ = oldDash;
          }
          return this;
        }
        function noop() {
        }
        function nthArg(n) {
          n = toInteger(n);
          return baseRest(function(args) {
            return baseNth(args, n);
          });
        }
        var over = createOver(arrayMap);
        var overEvery = createOver(arrayEvery);
        var overSome = createOver(arraySome);
        function property(path) {
          return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
        }
        function propertyOf(object) {
          return function(path) {
            return object == null ? undefined2 : baseGet(object, path);
          };
        }
        var range = createRange();
        var rangeRight = createRange(true);
        function stubArray() {
          return [];
        }
        function stubFalse() {
          return false;
        }
        function stubObject() {
          return {};
        }
        function stubString() {
          return "";
        }
        function stubTrue() {
          return true;
        }
        function times(n, iteratee2) {
          n = toInteger(n);
          if (n < 1 || n > MAX_SAFE_INTEGER) {
            return [];
          }
          var index = MAX_ARRAY_LENGTH, length = nativeMin(n, MAX_ARRAY_LENGTH);
          iteratee2 = getIteratee(iteratee2);
          n -= MAX_ARRAY_LENGTH;
          var result2 = baseTimes(length, iteratee2);
          while (++index < n) {
            iteratee2(index);
          }
          return result2;
        }
        function toPath(value) {
          if (isArray(value)) {
            return arrayMap(value, toKey);
          }
          return isSymbol(value) ? [value] : copyArray(stringToPath(toString(value)));
        }
        function uniqueId(prefix) {
          var id = ++idCounter;
          return toString(prefix) + id;
        }
        var add = createMathOperation(function(augend, addend) {
          return augend + addend;
        }, 0);
        var ceil = createRound("ceil");
        var divide = createMathOperation(function(dividend, divisor) {
          return dividend / divisor;
        }, 1);
        var floor = createRound("floor");
        function max(array) {
          return array && array.length ? baseExtremum(array, identity, baseGt) : undefined2;
        }
        function maxBy(array, iteratee2) {
          return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseGt) : undefined2;
        }
        function mean(array) {
          return baseMean(array, identity);
        }
        function meanBy(array, iteratee2) {
          return baseMean(array, getIteratee(iteratee2, 2));
        }
        function min(array) {
          return array && array.length ? baseExtremum(array, identity, baseLt) : undefined2;
        }
        function minBy(array, iteratee2) {
          return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseLt) : undefined2;
        }
        var multiply = createMathOperation(function(multiplier, multiplicand) {
          return multiplier * multiplicand;
        }, 1);
        var round = createRound("round");
        var subtract = createMathOperation(function(minuend, subtrahend) {
          return minuend - subtrahend;
        }, 0);
        function sum(array) {
          return array && array.length ? baseSum(array, identity) : 0;
        }
        function sumBy(array, iteratee2) {
          return array && array.length ? baseSum(array, getIteratee(iteratee2, 2)) : 0;
        }
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.assignIn = assignIn;
        lodash.assignInWith = assignInWith;
        lodash.assignWith = assignWith;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.castArray = castArray;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.concat = concat;
        lodash.cond = cond;
        lodash.conforms = conforms;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defaultsDeep = defaultsDeep;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.differenceBy = differenceBy;
        lodash.differenceWith = differenceWith;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatMap = flatMap;
        lodash.flatMapDeep = flatMapDeep;
        lodash.flatMapDepth = flatMapDepth;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flattenDepth = flattenDepth;
        lodash.flip = flip;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.fromPairs = fromPairs;
        lodash.functions = functions;
        lodash.functionsIn = functionsIn;
        lodash.groupBy = groupBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.intersectionBy = intersectionBy;
        lodash.intersectionWith = intersectionWith;
        lodash.invert = invert;
        lodash.invertBy = invertBy;
        lodash.invokeMap = invokeMap;
        lodash.iteratee = iteratee;
        lodash.keyBy = keyBy;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.mergeWith = mergeWith;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.nthArg = nthArg;
        lodash.omit = omit;
        lodash.omitBy = omitBy;
        lodash.once = once;
        lodash.orderBy = orderBy;
        lodash.over = over;
        lodash.overArgs = overArgs;
        lodash.overEvery = overEvery;
        lodash.overSome = overSome;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pickBy = pickBy;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAll = pullAll;
        lodash.pullAllBy = pullAllBy;
        lodash.pullAllWith = pullAllWith;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rangeRight = rangeRight;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.reverse = reverse;
        lodash.sampleSize = sampleSize;
        lodash.set = set;
        lodash.setWith = setWith;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortedUniq = sortedUniq;
        lodash.sortedUniqBy = sortedUniqBy;
        lodash.split = split;
        lodash.spread = spread;
        lodash.tail = tail;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.toArray = toArray;
        lodash.toPairs = toPairs;
        lodash.toPairsIn = toPairsIn;
        lodash.toPath = toPath;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.unary = unary;
        lodash.union = union;
        lodash.unionBy = unionBy;
        lodash.unionWith = unionWith;
        lodash.uniq = uniq;
        lodash.uniqBy = uniqBy;
        lodash.uniqWith = uniqWith;
        lodash.unset = unset;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.update = update;
        lodash.updateWith = updateWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.without = without;
        lodash.words = words;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.xorBy = xorBy;
        lodash.xorWith = xorWith;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipObjectDeep = zipObjectDeep;
        lodash.zipWith = zipWith;
        lodash.entries = toPairs;
        lodash.entriesIn = toPairsIn;
        lodash.extend = assignIn;
        lodash.extendWith = assignInWith;
        mixin(lodash, lodash);
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.ceil = ceil;
        lodash.clamp = clamp;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.cloneDeepWith = cloneDeepWith;
        lodash.cloneWith = cloneWith;
        lodash.conformsTo = conformsTo;
        lodash.deburr = deburr;
        lodash.defaultTo = defaultTo;
        lodash.divide = divide;
        lodash.endsWith = endsWith;
        lodash.eq = eq;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.floor = floor;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.get = get;
        lodash.gt = gt;
        lodash.gte = gte;
        lodash.has = has;
        lodash.hasIn = hasIn;
        lodash.head = head;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.invoke = invoke;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isArrayBuffer = isArrayBuffer;
        lodash.isArrayLike = isArrayLike;
        lodash.isArrayLikeObject = isArrayLikeObject;
        lodash.isBoolean = isBoolean;
        lodash.isBuffer = isBuffer;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isEqualWith = isEqualWith;
        lodash.isError = isError;
        lodash.isFinite = isFinite;
        lodash.isFunction = isFunction;
        lodash.isInteger = isInteger;
        lodash.isLength = isLength;
        lodash.isMap = isMap;
        lodash.isMatch = isMatch;
        lodash.isMatchWith = isMatchWith;
        lodash.isNaN = isNaN2;
        lodash.isNative = isNative;
        lodash.isNil = isNil;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isObjectLike = isObjectLike;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isSafeInteger = isSafeInteger;
        lodash.isSet = isSet;
        lodash.isString = isString;
        lodash.isSymbol = isSymbol;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.isWeakMap = isWeakMap;
        lodash.isWeakSet = isWeakSet;
        lodash.join = join;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.lowerCase = lowerCase;
        lodash.lowerFirst = lowerFirst;
        lodash.lt = lt;
        lodash.lte = lte;
        lodash.max = max;
        lodash.maxBy = maxBy;
        lodash.mean = mean;
        lodash.meanBy = meanBy;
        lodash.min = min;
        lodash.minBy = minBy;
        lodash.stubArray = stubArray;
        lodash.stubFalse = stubFalse;
        lodash.stubObject = stubObject;
        lodash.stubString = stubString;
        lodash.stubTrue = stubTrue;
        lodash.multiply = multiply;
        lodash.nth = nth;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padEnd = padEnd;
        lodash.padStart = padStart;
        lodash.parseInt = parseInt2;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.replace = replace;
        lodash.result = result;
        lodash.round = round;
        lodash.runInContext = runInContext2;
        lodash.sample = sample;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedIndexBy = sortedIndexBy;
        lodash.sortedIndexOf = sortedIndexOf;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.sortedLastIndexBy = sortedLastIndexBy;
        lodash.sortedLastIndexOf = sortedLastIndexOf;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.subtract = subtract;
        lodash.sum = sum;
        lodash.sumBy = sumBy;
        lodash.template = template;
        lodash.times = times;
        lodash.toFinite = toFinite;
        lodash.toInteger = toInteger;
        lodash.toLength = toLength;
        lodash.toLower = toLower;
        lodash.toNumber = toNumber;
        lodash.toSafeInteger = toSafeInteger;
        lodash.toString = toString;
        lodash.toUpper = toUpper;
        lodash.trim = trim;
        lodash.trimEnd = trimEnd;
        lodash.trimStart = trimStart;
        lodash.truncate = truncate;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.upperCase = upperCase;
        lodash.upperFirst = upperFirst;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.first = head;
        mixin(lodash, (function() {
          var source = {};
          baseForOwn(lodash, function(func, methodName) {
            if (!hasOwnProperty.call(lodash.prototype, methodName)) {
              source[methodName] = func;
            }
          });
          return source;
        })(), { "chain": false });
        lodash.VERSION = VERSION;
        arrayEach(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(methodName) {
          lodash[methodName].placeholder = lodash;
        });
        arrayEach(["drop", "take"], function(methodName, index) {
          LazyWrapper.prototype[methodName] = function(n) {
            n = n === undefined2 ? 1 : nativeMax(toInteger(n), 0);
            var result2 = this.__filtered__ && !index ? new LazyWrapper(this) : this.clone();
            if (result2.__filtered__) {
              result2.__takeCount__ = nativeMin(n, result2.__takeCount__);
            } else {
              result2.__views__.push({
                "size": nativeMin(n, MAX_ARRAY_LENGTH),
                "type": methodName + (result2.__dir__ < 0 ? "Right" : "")
              });
            }
            return result2;
          };
          LazyWrapper.prototype[methodName + "Right"] = function(n) {
            return this.reverse()[methodName](n).reverse();
          };
        });
        arrayEach(["filter", "map", "takeWhile"], function(methodName, index) {
          var type = index + 1, isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;
          LazyWrapper.prototype[methodName] = function(iteratee2) {
            var result2 = this.clone();
            result2.__iteratees__.push({
              "iteratee": getIteratee(iteratee2, 3),
              "type": type
            });
            result2.__filtered__ = result2.__filtered__ || isFilter;
            return result2;
          };
        });
        arrayEach(["head", "last"], function(methodName, index) {
          var takeName = "take" + (index ? "Right" : "");
          LazyWrapper.prototype[methodName] = function() {
            return this[takeName](1).value()[0];
          };
        });
        arrayEach(["initial", "tail"], function(methodName, index) {
          var dropName = "drop" + (index ? "" : "Right");
          LazyWrapper.prototype[methodName] = function() {
            return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
          };
        });
        LazyWrapper.prototype.compact = function() {
          return this.filter(identity);
        };
        LazyWrapper.prototype.find = function(predicate) {
          return this.filter(predicate).head();
        };
        LazyWrapper.prototype.findLast = function(predicate) {
          return this.reverse().find(predicate);
        };
        LazyWrapper.prototype.invokeMap = baseRest(function(path, args) {
          if (typeof path == "function") {
            return new LazyWrapper(this);
          }
          return this.map(function(value) {
            return baseInvoke(value, path, args);
          });
        });
        LazyWrapper.prototype.reject = function(predicate) {
          return this.filter(negate(getIteratee(predicate)));
        };
        LazyWrapper.prototype.slice = function(start, end) {
          start = toInteger(start);
          var result2 = this;
          if (result2.__filtered__ && (start > 0 || end < 0)) {
            return new LazyWrapper(result2);
          }
          if (start < 0) {
            result2 = result2.takeRight(-start);
          } else if (start) {
            result2 = result2.drop(start);
          }
          if (end !== undefined2) {
            end = toInteger(end);
            result2 = end < 0 ? result2.dropRight(-end) : result2.take(end - start);
          }
          return result2;
        };
        LazyWrapper.prototype.takeRightWhile = function(predicate) {
          return this.reverse().takeWhile(predicate).reverse();
        };
        LazyWrapper.prototype.toArray = function() {
          return this.take(MAX_ARRAY_LENGTH);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName), isTaker = /^(?:head|last)$/.test(methodName), lodashFunc = lodash[isTaker ? "take" + (methodName == "last" ? "Right" : "") : methodName], retUnwrapped = isTaker || /^find/.test(methodName);
          if (!lodashFunc) {
            return;
          }
          lodash.prototype[methodName] = function() {
            var value = this.__wrapped__, args = isTaker ? [1] : arguments, isLazy = value instanceof LazyWrapper, iteratee2 = args[0], useLazy = isLazy || isArray(value);
            var interceptor = function(value2) {
              var result3 = lodashFunc.apply(lodash, arrayPush([value2], args));
              return isTaker && chainAll ? result3[0] : result3;
            };
            if (useLazy && checkIteratee && typeof iteratee2 == "function" && iteratee2.length != 1) {
              isLazy = useLazy = false;
            }
            var chainAll = this.__chain__, isHybrid = !!this.__actions__.length, isUnwrapped = retUnwrapped && !chainAll, onlyLazy = isLazy && !isHybrid;
            if (!retUnwrapped && useLazy) {
              value = onlyLazy ? value : new LazyWrapper(this);
              var result2 = func.apply(value, args);
              result2.__actions__.push({ "func": thru, "args": [interceptor], "thisArg": undefined2 });
              return new LodashWrapper(result2, chainAll);
            }
            if (isUnwrapped && onlyLazy) {
              return func.apply(this, args);
            }
            result2 = this.thru(interceptor);
            return isUnwrapped ? isTaker ? result2.value()[0] : result2.value() : result2;
          };
        });
        arrayEach(["pop", "push", "shift", "sort", "splice", "unshift"], function(methodName) {
          var func = arrayProto[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", retUnwrapped = /^(?:pop|shift)$/.test(methodName);
          lodash.prototype[methodName] = function() {
            var args = arguments;
            if (retUnwrapped && !this.__chain__) {
              var value = this.value();
              return func.apply(isArray(value) ? value : [], args);
            }
            return this[chainName](function(value2) {
              return func.apply(isArray(value2) ? value2 : [], args);
            });
          };
        });
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var lodashFunc = lodash[methodName];
          if (lodashFunc) {
            var key = lodashFunc.name + "";
            if (!hasOwnProperty.call(realNames, key)) {
              realNames[key] = [];
            }
            realNames[key].push({ "name": methodName, "func": lodashFunc });
          }
        });
        realNames[createHybrid(undefined2, WRAP_BIND_KEY_FLAG).name] = [{
          "name": "wrapper",
          "func": undefined2
        }];
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;
        lodash.prototype.at = wrapperAt;
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.next = wrapperNext;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
        lodash.prototype.first = lodash.prototype.head;
        if (symIterator) {
          lodash.prototype[symIterator] = wrapperToIterator;
        }
        return lodash;
      });
      var _ = runInContext();
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        root._ = _;
        define(function() {
          return _;
        });
      } else if (freeModule) {
        (freeModule.exports = _)._ = _;
        freeExports._ = _;
      } else {
        root._ = _;
      }
    }).call(exports);
  }
});

// ../../node_modules/.pnpm/prettier@3.7.4/node_modules/prettier/doc.js
var require_doc = __commonJS({
  "../../node_modules/.pnpm/prettier@3.7.4/node_modules/prettier/doc.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    (function(factory) {
      function interopModuleDefault() {
        var module3 = factory();
        return module3.default || module3;
      }
      if (typeof exports === "object" && typeof module2 === "object") {
        module2.exports = interopModuleDefault();
      } else if (typeof define === "function" && define.amd) {
        define(interopModuleDefault);
      } else {
        var root = typeof globalThis !== "undefined" ? globalThis : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : this || {};
        root.doc = interopModuleDefault();
      }
    })(function() {
      "use strict";
      var __defProp = Object.defineProperty;
      var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
      var __getOwnPropNames = Object.getOwnPropertyNames;
      var __hasOwnProp = Object.prototype.hasOwnProperty;
      var __export2 = (target, all) => {
        for (var name in all)
          __defProp(target, name, { get: all[name], enumerable: true });
      };
      var __copyProps = (to, from, except, desc) => {
        if (from && typeof from === "object" || typeof from === "function") {
          for (let key of __getOwnPropNames(from))
            if (!__hasOwnProp.call(to, key) && key !== except)
              __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
        }
        return to;
      };
      var __toCommonJS2 = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
      var public_exports = {};
      __export2(public_exports, {
        builders: () => builders,
        printer: () => printer,
        utils: () => utils
      });
      var OPTIONAL_OBJECT = 1;
      var createMethodShim = (methodName, getImplementation) => (flags, object, ...arguments_) => {
        if (flags | OPTIONAL_OBJECT && (object === void 0 || object === null)) {
          return;
        }
        const implementation = getImplementation.call(object) ?? object[methodName];
        return implementation.apply(object, arguments_);
      };
      function stringOrArrayAt(index) {
        return this[index < 0 ? this.length + index : index];
      }
      var at = createMethodShim("at", function() {
        if (Array.isArray(this) || typeof this === "string") {
          return stringOrArrayAt;
        }
      });
      var method_at_default = at;
      var noop = () => {
      };
      var noop_default = noop;
      var DOC_TYPE_STRING = (
        /** @type {const} */
        "string"
      );
      var DOC_TYPE_ARRAY = (
        /** @type {const} */
        "array"
      );
      var DOC_TYPE_CURSOR = (
        /** @type {const} */
        "cursor"
      );
      var DOC_TYPE_INDENT = (
        /** @type {const} */
        "indent"
      );
      var DOC_TYPE_ALIGN = (
        /** @type {const} */
        "align"
      );
      var DOC_TYPE_TRIM = (
        /** @type {const} */
        "trim"
      );
      var DOC_TYPE_GROUP = (
        /** @type {const} */
        "group"
      );
      var DOC_TYPE_FILL = (
        /** @type {const} */
        "fill"
      );
      var DOC_TYPE_IF_BREAK = (
        /** @type {const} */
        "if-break"
      );
      var DOC_TYPE_INDENT_IF_BREAK = (
        /** @type {const} */
        "indent-if-break"
      );
      var DOC_TYPE_LINE_SUFFIX = (
        /** @type {const} */
        "line-suffix"
      );
      var DOC_TYPE_LINE_SUFFIX_BOUNDARY = (
        /** @type {const} */
        "line-suffix-boundary"
      );
      var DOC_TYPE_LINE = (
        /** @type {const} */
        "line"
      );
      var DOC_TYPE_LABEL = (
        /** @type {const} */
        "label"
      );
      var DOC_TYPE_BREAK_PARENT = (
        /** @type {const} */
        "break-parent"
      );
      var VALID_OBJECT_DOC_TYPES = /* @__PURE__ */ new Set([
        DOC_TYPE_CURSOR,
        DOC_TYPE_INDENT,
        DOC_TYPE_ALIGN,
        DOC_TYPE_TRIM,
        DOC_TYPE_GROUP,
        DOC_TYPE_FILL,
        DOC_TYPE_IF_BREAK,
        DOC_TYPE_INDENT_IF_BREAK,
        DOC_TYPE_LINE_SUFFIX,
        DOC_TYPE_LINE_SUFFIX_BOUNDARY,
        DOC_TYPE_LINE,
        DOC_TYPE_LABEL,
        DOC_TYPE_BREAK_PARENT
      ]);
      function trimNewlinesEnd(string) {
        let end = string.length;
        while (end > 0 && (string[end - 1] === "\r" || string[end - 1] === "\n")) {
          end--;
        }
        return end < string.length ? string.slice(0, end) : string;
      }
      function getDocType(doc) {
        if (typeof doc === "string") {
          return DOC_TYPE_STRING;
        }
        if (Array.isArray(doc)) {
          return DOC_TYPE_ARRAY;
        }
        if (!doc) {
          return;
        }
        const { type } = doc;
        if (VALID_OBJECT_DOC_TYPES.has(type)) {
          return type;
        }
      }
      var get_doc_type_default = getDocType;
      var disjunctionListFormat = (list) => new Intl.ListFormat("en-US", { type: "disjunction" }).format(list);
      function getDocErrorMessage(doc) {
        const type = doc === null ? "null" : typeof doc;
        if (type !== "string" && type !== "object") {
          return `Unexpected doc '${type}', 
Expected it to be 'string' or 'object'.`;
        }
        if (get_doc_type_default(doc)) {
          throw new Error("doc is valid.");
        }
        const objectType = Object.prototype.toString.call(doc);
        if (objectType !== "[object Object]") {
          return `Unexpected doc '${objectType}'.`;
        }
        const EXPECTED_TYPE_VALUES = disjunctionListFormat(
          [...VALID_OBJECT_DOC_TYPES].map((type2) => `'${type2}'`)
        );
        return `Unexpected doc.type '${doc.type}'.
Expected it to be ${EXPECTED_TYPE_VALUES}.`;
      }
      var InvalidDocError = class extends Error {
        name = "InvalidDocError";
        constructor(doc) {
          super(getDocErrorMessage(doc));
          this.doc = doc;
        }
      };
      var invalid_doc_error_default = InvalidDocError;
      var traverseDocOnExitStackMarker = {};
      function traverseDoc(doc, onEnter, onExit, shouldTraverseConditionalGroups) {
        const docsStack = [doc];
        while (docsStack.length > 0) {
          const doc2 = docsStack.pop();
          if (doc2 === traverseDocOnExitStackMarker) {
            onExit(docsStack.pop());
            continue;
          }
          if (onExit) {
            docsStack.push(doc2, traverseDocOnExitStackMarker);
          }
          const docType = get_doc_type_default(doc2);
          if (!docType) {
            throw new invalid_doc_error_default(doc2);
          }
          if (onEnter?.(doc2) === false) {
            continue;
          }
          switch (docType) {
            case DOC_TYPE_ARRAY:
            case DOC_TYPE_FILL: {
              const parts = docType === DOC_TYPE_ARRAY ? doc2 : doc2.parts;
              for (let ic = parts.length, i = ic - 1; i >= 0; --i) {
                docsStack.push(parts[i]);
              }
              break;
            }
            case DOC_TYPE_IF_BREAK:
              docsStack.push(doc2.flatContents, doc2.breakContents);
              break;
            case DOC_TYPE_GROUP:
              if (shouldTraverseConditionalGroups && doc2.expandedStates) {
                for (let ic = doc2.expandedStates.length, i = ic - 1; i >= 0; --i) {
                  docsStack.push(doc2.expandedStates[i]);
                }
              } else {
                docsStack.push(doc2.contents);
              }
              break;
            case DOC_TYPE_ALIGN:
            case DOC_TYPE_INDENT:
            case DOC_TYPE_INDENT_IF_BREAK:
            case DOC_TYPE_LABEL:
            case DOC_TYPE_LINE_SUFFIX:
              docsStack.push(doc2.contents);
              break;
            case DOC_TYPE_STRING:
            case DOC_TYPE_CURSOR:
            case DOC_TYPE_TRIM:
            case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
            case DOC_TYPE_LINE:
            case DOC_TYPE_BREAK_PARENT:
              break;
            default:
              throw new invalid_doc_error_default(doc2);
          }
        }
      }
      var traverse_doc_default = traverseDoc;
      function mapDoc(doc, cb) {
        if (typeof doc === "string") {
          return cb(doc);
        }
        const mapped = /* @__PURE__ */ new Map();
        return rec(doc);
        function rec(doc2) {
          if (mapped.has(doc2)) {
            return mapped.get(doc2);
          }
          const result = process2(doc2);
          mapped.set(doc2, result);
          return result;
        }
        function process2(doc2) {
          switch (get_doc_type_default(doc2)) {
            case DOC_TYPE_ARRAY:
              return cb(doc2.map(rec));
            case DOC_TYPE_FILL:
              return cb({
                ...doc2,
                parts: doc2.parts.map(rec)
              });
            case DOC_TYPE_IF_BREAK:
              return cb({
                ...doc2,
                breakContents: rec(doc2.breakContents),
                flatContents: rec(doc2.flatContents)
              });
            case DOC_TYPE_GROUP: {
              let {
                expandedStates,
                contents
              } = doc2;
              if (expandedStates) {
                expandedStates = expandedStates.map(rec);
                contents = expandedStates[0];
              } else {
                contents = rec(contents);
              }
              return cb({
                ...doc2,
                contents,
                expandedStates
              });
            }
            case DOC_TYPE_ALIGN:
            case DOC_TYPE_INDENT:
            case DOC_TYPE_INDENT_IF_BREAK:
            case DOC_TYPE_LABEL:
            case DOC_TYPE_LINE_SUFFIX:
              return cb({
                ...doc2,
                contents: rec(doc2.contents)
              });
            case DOC_TYPE_STRING:
            case DOC_TYPE_CURSOR:
            case DOC_TYPE_TRIM:
            case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
            case DOC_TYPE_LINE:
            case DOC_TYPE_BREAK_PARENT:
              return cb(doc2);
            default:
              throw new invalid_doc_error_default(doc2);
          }
        }
      }
      function findInDoc(doc, fn, defaultValue) {
        let result = defaultValue;
        let shouldSkipFurtherProcessing = false;
        function findInDocOnEnterFn(doc2) {
          if (shouldSkipFurtherProcessing) {
            return false;
          }
          const maybeResult = fn(doc2);
          if (maybeResult !== void 0) {
            shouldSkipFurtherProcessing = true;
            result = maybeResult;
          }
        }
        traverse_doc_default(doc, findInDocOnEnterFn);
        return result;
      }
      function willBreakFn(doc) {
        if (doc.type === DOC_TYPE_GROUP && doc.break) {
          return true;
        }
        if (doc.type === DOC_TYPE_LINE && doc.hard) {
          return true;
        }
        if (doc.type === DOC_TYPE_BREAK_PARENT) {
          return true;
        }
      }
      function willBreak(doc) {
        return findInDoc(doc, willBreakFn, false);
      }
      function breakParentGroup(groupStack) {
        if (groupStack.length > 0) {
          const parentGroup = method_at_default(
            /* OPTIONAL_OBJECT: false */
            0,
            groupStack,
            -1
          );
          if (!parentGroup.expandedStates && !parentGroup.break) {
            parentGroup.break = "propagated";
          }
        }
        return null;
      }
      function propagateBreaks(doc) {
        const alreadyVisitedSet = /* @__PURE__ */ new Set();
        const groupStack = [];
        function propagateBreaksOnEnterFn(doc2) {
          if (doc2.type === DOC_TYPE_BREAK_PARENT) {
            breakParentGroup(groupStack);
          }
          if (doc2.type === DOC_TYPE_GROUP) {
            groupStack.push(doc2);
            if (alreadyVisitedSet.has(doc2)) {
              return false;
            }
            alreadyVisitedSet.add(doc2);
          }
        }
        function propagateBreaksOnExitFn(doc2) {
          if (doc2.type === DOC_TYPE_GROUP) {
            const group2 = groupStack.pop();
            if (group2.break) {
              breakParentGroup(groupStack);
            }
          }
        }
        traverse_doc_default(
          doc,
          propagateBreaksOnEnterFn,
          propagateBreaksOnExitFn,
          /* shouldTraverseConditionalGroups */
          true
        );
      }
      function removeLinesFn(doc) {
        if (doc.type === DOC_TYPE_LINE && !doc.hard) {
          return doc.soft ? "" : " ";
        }
        if (doc.type === DOC_TYPE_IF_BREAK) {
          return doc.flatContents;
        }
        return doc;
      }
      function removeLines(doc) {
        return mapDoc(doc, removeLinesFn);
      }
      function stripTrailingHardlineFromParts(parts) {
        parts = [...parts];
        while (parts.length >= 2 && method_at_default(
          /* OPTIONAL_OBJECT: false */
          0,
          parts,
          -2
        ).type === DOC_TYPE_LINE && method_at_default(
          /* OPTIONAL_OBJECT: false */
          0,
          parts,
          -1
        ).type === DOC_TYPE_BREAK_PARENT) {
          parts.length -= 2;
        }
        if (parts.length > 0) {
          const lastPart = stripTrailingHardlineFromDoc(method_at_default(
            /* OPTIONAL_OBJECT: false */
            0,
            parts,
            -1
          ));
          parts[parts.length - 1] = lastPart;
        }
        return parts;
      }
      function stripTrailingHardlineFromDoc(doc) {
        switch (get_doc_type_default(doc)) {
          case DOC_TYPE_INDENT:
          case DOC_TYPE_INDENT_IF_BREAK:
          case DOC_TYPE_GROUP:
          case DOC_TYPE_LINE_SUFFIX:
          case DOC_TYPE_LABEL: {
            const contents = stripTrailingHardlineFromDoc(doc.contents);
            return {
              ...doc,
              contents
            };
          }
          case DOC_TYPE_IF_BREAK:
            return {
              ...doc,
              breakContents: stripTrailingHardlineFromDoc(doc.breakContents),
              flatContents: stripTrailingHardlineFromDoc(doc.flatContents)
            };
          case DOC_TYPE_FILL:
            return {
              ...doc,
              parts: stripTrailingHardlineFromParts(doc.parts)
            };
          case DOC_TYPE_ARRAY:
            return stripTrailingHardlineFromParts(doc);
          case DOC_TYPE_STRING:
            return trimNewlinesEnd(doc);
          case DOC_TYPE_ALIGN:
          case DOC_TYPE_CURSOR:
          case DOC_TYPE_TRIM:
          case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
          case DOC_TYPE_LINE:
          case DOC_TYPE_BREAK_PARENT:
            break;
          default:
            throw new invalid_doc_error_default(doc);
        }
        return doc;
      }
      function stripTrailingHardline(doc) {
        return stripTrailingHardlineFromDoc(cleanDoc(doc));
      }
      function cleanDocFn(doc) {
        switch (get_doc_type_default(doc)) {
          case DOC_TYPE_FILL:
            if (doc.parts.every((part) => part === "")) {
              return "";
            }
            break;
          case DOC_TYPE_GROUP:
            if (!doc.contents && !doc.id && !doc.break && !doc.expandedStates) {
              return "";
            }
            if (doc.contents.type === DOC_TYPE_GROUP && doc.contents.id === doc.id && doc.contents.break === doc.break && doc.contents.expandedStates === doc.expandedStates) {
              return doc.contents;
            }
            break;
          case DOC_TYPE_ALIGN:
          case DOC_TYPE_INDENT:
          case DOC_TYPE_INDENT_IF_BREAK:
          case DOC_TYPE_LINE_SUFFIX:
            if (!doc.contents) {
              return "";
            }
            break;
          case DOC_TYPE_IF_BREAK:
            if (!doc.flatContents && !doc.breakContents) {
              return "";
            }
            break;
          case DOC_TYPE_ARRAY: {
            const parts = [];
            for (const part of doc) {
              if (!part) {
                continue;
              }
              const [currentPart, ...restParts] = Array.isArray(part) ? part : [part];
              if (typeof currentPart === "string" && typeof method_at_default(
                /* OPTIONAL_OBJECT: false */
                0,
                parts,
                -1
              ) === "string") {
                parts[parts.length - 1] += currentPart;
              } else {
                parts.push(currentPart);
              }
              parts.push(...restParts);
            }
            if (parts.length === 0) {
              return "";
            }
            if (parts.length === 1) {
              return parts[0];
            }
            return parts;
          }
          case DOC_TYPE_STRING:
          case DOC_TYPE_CURSOR:
          case DOC_TYPE_TRIM:
          case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
          case DOC_TYPE_LINE:
          case DOC_TYPE_LABEL:
          case DOC_TYPE_BREAK_PARENT:
            break;
          default:
            throw new invalid_doc_error_default(doc);
        }
        return doc;
      }
      function cleanDoc(doc) {
        return mapDoc(doc, (currentDoc) => cleanDocFn(currentDoc));
      }
      function replaceEndOfLine(doc, replacement = literalline) {
        return mapDoc(doc, (currentDoc) => typeof currentDoc === "string" ? join(replacement, currentDoc.split("\n")) : currentDoc);
      }
      function canBreakFn(doc) {
        if (doc.type === DOC_TYPE_LINE) {
          return true;
        }
      }
      function canBreak(doc) {
        return findInDoc(doc, canBreakFn, false);
      }
      var assertDoc = true ? noop_default : (
        /**
        @param {Doc} doc
        */
        (function(doc) {
          traverse_doc_default(doc, (doc2) => {
            if (typeof doc2 === "string" || checked.has(doc2)) {
              return false;
            }
            checked.add(doc2);
          });
        })
      );
      var assertDocArray = true ? noop_default : (
        /**
        @param {readonly Doc[]} docs
        @param {boolean} [optional = false]
        */
        (function(docs, optional = false) {
          if (optional && !docs) {
            return;
          }
          if (!Array.isArray(docs)) {
            throw new TypeError("Unexpected doc array.");
          }
          for (const doc of docs) {
            assertDoc(doc);
          }
        })
      );
      var assertDocFillParts = true ? noop_default : (
        /**
        @param {readonly Doc[]} parts
        */
        (function(parts) {
          assertDocArray(parts);
          if (parts.length > 1 && isEmptyDoc(method_at_default(
            /* OPTIONAL_OBJECT: false */
            0,
            parts,
            -1
          ))) {
            parts = parts.slice(0, -1);
          }
          for (const [i, doc] of parts.entries()) {
            if (i % 2 === 1 && !isValidSeparator(doc)) {
              const type = get_doc_type_default(doc);
              throw new Error(`Unexpected non-line-break doc at ${i}. Doc type is ${type}.`);
            }
          }
        })
      );
      var assertAlignType = true ? noop_default : function(alignType) {
        if (!(typeof alignType === "number" || typeof alignType === "string" || alignType?.type === "root")) {
          throw new TypeError(`Invalid alignType '${alignType}'.`);
        }
      };
      function indent(contents) {
        assertDoc(contents);
        return { type: DOC_TYPE_INDENT, contents };
      }
      function align(alignType, contents) {
        assertAlignType(alignType);
        assertDoc(contents);
        return { type: DOC_TYPE_ALIGN, contents, n: alignType };
      }
      function dedentToRoot(contents) {
        return align(Number.NEGATIVE_INFINITY, contents);
      }
      function markAsRoot(contents) {
        return align({ type: "root" }, contents);
      }
      function dedent(contents) {
        return align(-1, contents);
      }
      function addAlignmentToDoc(doc, size, tabWidth) {
        assertDoc(doc);
        let aligned = doc;
        if (size > 0) {
          for (let level = 0; level < Math.floor(size / tabWidth); ++level) {
            aligned = indent(aligned);
          }
          aligned = align(size % tabWidth, aligned);
          aligned = align(Number.NEGATIVE_INFINITY, aligned);
        }
        return aligned;
      }
      var breakParent = { type: DOC_TYPE_BREAK_PARENT };
      var cursor = { type: DOC_TYPE_CURSOR };
      function fill(parts) {
        assertDocFillParts(parts);
        return { type: DOC_TYPE_FILL, parts };
      }
      function group(contents, options = {}) {
        assertDoc(contents);
        assertDocArray(
          options.expandedStates,
          /* optional */
          true
        );
        return {
          type: DOC_TYPE_GROUP,
          id: options.id,
          contents,
          break: Boolean(options.shouldBreak),
          expandedStates: options.expandedStates
        };
      }
      function conditionalGroup(states, options) {
        return group(states[0], { ...options, expandedStates: states });
      }
      function ifBreak(breakContents, flatContents = "", options = {}) {
        assertDoc(breakContents);
        if (flatContents !== "") {
          assertDoc(flatContents);
        }
        return {
          type: DOC_TYPE_IF_BREAK,
          breakContents,
          flatContents,
          groupId: options.groupId
        };
      }
      function indentIfBreak(contents, options) {
        assertDoc(contents);
        return {
          type: DOC_TYPE_INDENT_IF_BREAK,
          contents,
          groupId: options.groupId,
          negate: options.negate
        };
      }
      function join(separator, docs) {
        assertDoc(separator);
        assertDocArray(docs);
        const parts = [];
        for (let i = 0; i < docs.length; i++) {
          if (i !== 0) {
            parts.push(separator);
          }
          parts.push(docs[i]);
        }
        return parts;
      }
      function label(label2, contents) {
        assertDoc(contents);
        return label2 ? { type: DOC_TYPE_LABEL, label: label2, contents } : contents;
      }
      var line = { type: DOC_TYPE_LINE };
      var softline = { type: DOC_TYPE_LINE, soft: true };
      var hardlineWithoutBreakParent = { type: DOC_TYPE_LINE, hard: true };
      var hardline = [hardlineWithoutBreakParent, breakParent];
      var literallineWithoutBreakParent = {
        type: DOC_TYPE_LINE,
        hard: true,
        literal: true
      };
      var literalline = [literallineWithoutBreakParent, breakParent];
      function lineSuffix(contents) {
        assertDoc(contents);
        return { type: DOC_TYPE_LINE_SUFFIX, contents };
      }
      var lineSuffixBoundary = { type: DOC_TYPE_LINE_SUFFIX_BOUNDARY };
      var trim = { type: DOC_TYPE_TRIM };
      var stringReplaceAll = String.prototype.replaceAll ?? function(pattern, replacement) {
        if (pattern.global) {
          return this.replace(pattern, replacement);
        }
        return this.split(pattern).join(replacement);
      };
      var replaceAll = createMethodShim("replaceAll", function() {
        if (typeof this === "string") {
          return stringReplaceAll;
        }
      });
      var method_replace_all_default = replaceAll;
      var OPTION_CR = "cr";
      var OPTION_CRLF = "crlf";
      var CHARACTER_CR = "\r";
      var CHARACTER_CRLF = "\r\n";
      var CHARACTER_LF = "\n";
      var DEFAULT_EOL = CHARACTER_LF;
      function convertEndOfLineOptionToCharacter(endOfLineOption) {
        return endOfLineOption === OPTION_CR ? CHARACTER_CR : endOfLineOption === OPTION_CRLF ? CHARACTER_CRLF : DEFAULT_EOL;
      }
      var emoji_regex_default = () => {
        return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
      };
      function isFullWidth(x) {
        return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
      }
      function isWide(x) {
        return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x >= 94192 && x <= 94198 || x >= 94208 && x <= 101589 || x >= 101631 && x <= 101662 || x >= 101760 && x <= 101874 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128728 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129674 || x >= 129678 && x <= 129734 || x === 129736 || x >= 129741 && x <= 129756 || x >= 129759 && x <= 129770 || x >= 129775 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
      }
      var narrow_emojis_evaluate_default = "\xA9\xAE\u203C\u2049\u2122\u2139\u2194\u2195\u2196\u2197\u2198\u2199\u21A9\u21AA\u2328\u23CF\u23F1\u23F2\u23F8\u23F9\u23FA\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600\u2601\u2602\u2603\u2604\u260E\u2611\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638\u2639\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694\u2695\u2696\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F1\u26F7\u26F8\u26F9\u2702\u2708\u2709\u270C\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u2764\u27A1\u2934\u2935\u2B05\u2B06\u2B07";
      var notAsciiRegex = /[^\x20-\x7F]/u;
      var narrowEmojisSet = new Set(narrow_emojis_evaluate_default);
      function getStringWidth(text) {
        if (!text) {
          return 0;
        }
        if (!notAsciiRegex.test(text)) {
          return text.length;
        }
        text = text.replace(
          emoji_regex_default(),
          (match) => narrowEmojisSet.has(match) ? " " : "  "
        );
        let width = 0;
        for (const character of text) {
          const codePoint = character.codePointAt(0);
          if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
            continue;
          }
          if (codePoint >= 768 && codePoint <= 879) {
            continue;
          }
          if (codePoint >= 65024 && codePoint <= 65039) {
            continue;
          }
          width += isFullWidth(codePoint) || isWide(codePoint) ? 2 : 1;
        }
        return width;
      }
      var get_string_width_default = getStringWidth;
      var INDENT_COMMAND_TYPE_INDENT = 0;
      var INDENT_COMMAND_TYPE_DEDENT = 1;
      var INDENT_COMMAND_TYPE_WIDTH = 2;
      var INDENT_COMMAND_TYPE_STRING = 3;
      var INDENT_COMMAND_INDENT = { type: INDENT_COMMAND_TYPE_INDENT };
      var INDENT_COMMAND_DEDENT = { type: INDENT_COMMAND_TYPE_DEDENT };
      var ROOT_INDENT = {
        value: "",
        length: 0,
        queue: [],
        get root() {
          return ROOT_INDENT;
        }
      };
      function generateIndent(indent2, command, options) {
        const queue = command.type === INDENT_COMMAND_TYPE_DEDENT ? indent2.queue.slice(0, -1) : [...indent2.queue, command];
        let value = "";
        let length = 0;
        let lastTabs = 0;
        let lastSpaces = 0;
        for (const command2 of queue) {
          switch (command2.type) {
            case INDENT_COMMAND_TYPE_INDENT:
              flush();
              if (options.useTabs) {
                addTabs(1);
              } else {
                addSpaces(options.tabWidth);
              }
              break;
            case INDENT_COMMAND_TYPE_STRING: {
              const { string } = command2;
              flush();
              value += string;
              length += string.length;
              break;
            }
            case INDENT_COMMAND_TYPE_WIDTH: {
              const { width } = command2;
              lastTabs += 1;
              lastSpaces += width;
              break;
            }
            default:
              throw new Error(`Unexpected indent comment '${command2.type}'.`);
          }
        }
        flushSpaces();
        return { ...indent2, value, length, queue };
        function addTabs(count) {
          value += "	".repeat(count);
          length += options.tabWidth * count;
        }
        function addSpaces(count) {
          value += " ".repeat(count);
          length += count;
        }
        function flush() {
          if (options.useTabs) {
            flushTabs();
          } else {
            flushSpaces();
          }
        }
        function flushTabs() {
          if (lastTabs > 0) {
            addTabs(lastTabs);
          }
          resetLast();
        }
        function flushSpaces() {
          if (lastSpaces > 0) {
            addSpaces(lastSpaces);
          }
          resetLast();
        }
        function resetLast() {
          lastTabs = 0;
          lastSpaces = 0;
        }
      }
      function makeAlign(indent2, indentOptions, options) {
        if (!indentOptions) {
          return indent2;
        }
        if (indentOptions.type === "root") {
          return { ...indent2, root: indent2 };
        }
        if (indentOptions === Number.NEGATIVE_INFINITY) {
          return indent2.root;
        }
        let command;
        if (typeof indentOptions === "number") {
          if (indentOptions < 0) {
            command = INDENT_COMMAND_DEDENT;
          } else {
            command = { type: INDENT_COMMAND_TYPE_WIDTH, width: indentOptions };
          }
        } else {
          command = { type: INDENT_COMMAND_TYPE_STRING, string: indentOptions };
        }
        return generateIndent(indent2, command, options);
      }
      function makeIndent(indent2, options) {
        return generateIndent(indent2, INDENT_COMMAND_INDENT, options);
      }
      function getTrailingIndentionLength(text) {
        let length = 0;
        for (let index = text.length - 1; index >= 0; index--) {
          const character = text[index];
          if (character === " " || character === "	") {
            length++;
          } else {
            break;
          }
        }
        return length;
      }
      function trimIndentation(text) {
        const length = getTrailingIndentionLength(text);
        const trimmed = length === 0 ? text : text.slice(0, text.length - length);
        return { text: trimmed, count: length };
      }
      var MODE_BREAK = /* @__PURE__ */ Symbol("MODE_BREAK");
      var MODE_FLAT = /* @__PURE__ */ Symbol("MODE_FLAT");
      var DOC_FILL_PRINTED_LENGTH = /* @__PURE__ */ Symbol("DOC_FILL_PRINTED_LENGTH");
      function fits(next, restCommands, remainingWidth, hasLineSuffix, groupModeMap, mustBeFlat) {
        if (remainingWidth === Number.POSITIVE_INFINITY) {
          return true;
        }
        let restCommandsIndex = restCommands.length;
        let hasPendingSpace = false;
        const commands = [next];
        let output = "";
        while (remainingWidth >= 0) {
          if (commands.length === 0) {
            if (restCommandsIndex === 0) {
              return true;
            }
            commands.push(restCommands[--restCommandsIndex]);
            continue;
          }
          const {
            mode,
            doc
          } = commands.pop();
          const docType = get_doc_type_default(doc);
          switch (docType) {
            case DOC_TYPE_STRING:
              if (doc) {
                if (hasPendingSpace) {
                  output += " ";
                  remainingWidth -= 1;
                  hasPendingSpace = false;
                }
                output += doc;
                remainingWidth -= get_string_width_default(doc);
              }
              break;
            case DOC_TYPE_ARRAY:
            case DOC_TYPE_FILL: {
              const parts = docType === DOC_TYPE_ARRAY ? doc : doc.parts;
              const end = doc[DOC_FILL_PRINTED_LENGTH] ?? 0;
              for (let index = parts.length - 1; index >= end; index--) {
                commands.push({
                  mode,
                  doc: parts[index]
                });
              }
              break;
            }
            case DOC_TYPE_INDENT:
            case DOC_TYPE_ALIGN:
            case DOC_TYPE_INDENT_IF_BREAK:
            case DOC_TYPE_LABEL:
              commands.push({
                mode,
                doc: doc.contents
              });
              break;
            case DOC_TYPE_TRIM: {
              const {
                text,
                count
              } = trimIndentation(output);
              output = text;
              remainingWidth += count;
              break;
            }
            case DOC_TYPE_GROUP: {
              if (mustBeFlat && doc.break) {
                return false;
              }
              const groupMode = doc.break ? MODE_BREAK : mode;
              const contents = doc.expandedStates && groupMode === MODE_BREAK ? method_at_default(
                /* OPTIONAL_OBJECT: false */
                0,
                doc.expandedStates,
                -1
              ) : doc.contents;
              commands.push({
                mode: groupMode,
                doc: contents
              });
              break;
            }
            case DOC_TYPE_IF_BREAK: {
              const groupMode = doc.groupId ? groupModeMap[doc.groupId] || MODE_FLAT : mode;
              const contents = groupMode === MODE_BREAK ? doc.breakContents : doc.flatContents;
              if (contents) {
                commands.push({
                  mode,
                  doc: contents
                });
              }
              break;
            }
            case DOC_TYPE_LINE:
              if (mode === MODE_BREAK || doc.hard) {
                return true;
              }
              if (!doc.soft) {
                hasPendingSpace = true;
              }
              break;
            case DOC_TYPE_LINE_SUFFIX:
              hasLineSuffix = true;
              break;
            case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
              if (hasLineSuffix) {
                return false;
              }
              break;
          }
        }
        return false;
      }
      function printDocToString(doc, options) {
        const groupModeMap = /* @__PURE__ */ Object.create(null);
        const width = options.printWidth;
        const newLine = convertEndOfLineOptionToCharacter(options.endOfLine);
        let position = 0;
        const commands = [{
          indent: ROOT_INDENT,
          mode: MODE_BREAK,
          doc
        }];
        let output = "";
        let shouldRemeasure = false;
        const lineSuffix2 = [];
        const cursorPositions = [];
        const settledOutput = [];
        const settledCursorPositions = [];
        let settledTextLength = 0;
        propagateBreaks(doc);
        while (commands.length > 0) {
          const {
            indent: indent2,
            mode,
            doc: doc2
          } = commands.pop();
          switch (get_doc_type_default(doc2)) {
            case DOC_TYPE_STRING: {
              const formatted2 = newLine !== "\n" ? method_replace_all_default(
                /* OPTIONAL_OBJECT: false */
                0,
                doc2,
                "\n",
                newLine
              ) : doc2;
              if (formatted2) {
                output += formatted2;
                if (commands.length > 0) {
                  position += get_string_width_default(formatted2);
                }
              }
              break;
            }
            case DOC_TYPE_ARRAY:
              for (let index = doc2.length - 1; index >= 0; index--) {
                commands.push({
                  indent: indent2,
                  mode,
                  doc: doc2[index]
                });
              }
              break;
            case DOC_TYPE_CURSOR:
              if (cursorPositions.length >= 2) {
                throw new Error("There are too many 'cursor' in doc.");
              }
              cursorPositions.push(settledTextLength + output.length);
              break;
            case DOC_TYPE_INDENT:
              commands.push({
                indent: makeIndent(indent2, options),
                mode,
                doc: doc2.contents
              });
              break;
            case DOC_TYPE_ALIGN:
              commands.push({
                indent: makeAlign(indent2, doc2.n, options),
                mode,
                doc: doc2.contents
              });
              break;
            case DOC_TYPE_TRIM:
              trim2();
              break;
            case DOC_TYPE_GROUP:
              switch (mode) {
                case MODE_FLAT:
                  if (!shouldRemeasure) {
                    commands.push({
                      indent: indent2,
                      mode: doc2.break ? MODE_BREAK : MODE_FLAT,
                      doc: doc2.contents
                    });
                    break;
                  }
                // fallthrough
                case MODE_BREAK: {
                  shouldRemeasure = false;
                  const next = {
                    indent: indent2,
                    mode: MODE_FLAT,
                    doc: doc2.contents
                  };
                  const remainingWidth = width - position;
                  const hasLineSuffix = lineSuffix2.length > 0;
                  if (!doc2.break && fits(next, commands, remainingWidth, hasLineSuffix, groupModeMap)) {
                    commands.push(next);
                  } else {
                    if (doc2.expandedStates) {
                      const mostExpanded = method_at_default(
                        /* OPTIONAL_OBJECT: false */
                        0,
                        doc2.expandedStates,
                        -1
                      );
                      if (doc2.break) {
                        commands.push({
                          indent: indent2,
                          mode: MODE_BREAK,
                          doc: mostExpanded
                        });
                        break;
                      } else {
                        for (let index = 1; index < doc2.expandedStates.length + 1; index++) {
                          if (index >= doc2.expandedStates.length) {
                            commands.push({
                              indent: indent2,
                              mode: MODE_BREAK,
                              doc: mostExpanded
                            });
                            break;
                          } else {
                            const state = doc2.expandedStates[index];
                            const cmd2 = {
                              indent: indent2,
                              mode: MODE_FLAT,
                              doc: state
                            };
                            if (fits(cmd2, commands, remainingWidth, hasLineSuffix, groupModeMap)) {
                              commands.push(cmd2);
                              break;
                            }
                          }
                        }
                      }
                    } else {
                      commands.push({
                        indent: indent2,
                        mode: MODE_BREAK,
                        doc: doc2.contents
                      });
                    }
                  }
                  break;
                }
              }
              if (doc2.id) {
                groupModeMap[doc2.id] = method_at_default(
                  /* OPTIONAL_OBJECT: false */
                  0,
                  commands,
                  -1
                ).mode;
              }
              break;
            // Fills each line with as much code as possible before moving to a new
            // line with the same indentation.
            //
            // Expects doc.parts to be an array of alternating content and
            // whitespace. The whitespace contains the linebreaks.
            //
            // For example:
            //   ["I", line, "love", line, "monkeys"]
            // or
            //   [{ type: group, ... }, softline, { type: group, ... }]
            //
            // It uses this parts structure to handle three main layout cases:
            // * The first two content items fit on the same line without
            //   breaking
            //   -> output the first content item and the whitespace "flat".
            // * Only the first content item fits on the line without breaking
            //   -> output the first content item "flat" and the whitespace with
            //   "break".
            // * Neither content item fits on the line without breaking
            //   -> output the first content item and the whitespace with "break".
            case DOC_TYPE_FILL: {
              const remainingWidth = width - position;
              const offset = doc2[DOC_FILL_PRINTED_LENGTH] ?? 0;
              const {
                parts
              } = doc2;
              const length = parts.length - offset;
              if (length === 0) {
                break;
              }
              const content = parts[offset + 0];
              const whitespace = parts[offset + 1];
              const contentFlatCommand = {
                indent: indent2,
                mode: MODE_FLAT,
                doc: content
              };
              const contentBreakCommand = {
                indent: indent2,
                mode: MODE_BREAK,
                doc: content
              };
              const contentFits = fits(contentFlatCommand, [], remainingWidth, lineSuffix2.length > 0, groupModeMap, true);
              if (length === 1) {
                if (contentFits) {
                  commands.push(contentFlatCommand);
                } else {
                  commands.push(contentBreakCommand);
                }
                break;
              }
              const whitespaceFlatCommand = {
                indent: indent2,
                mode: MODE_FLAT,
                doc: whitespace
              };
              const whitespaceBreakCommand = {
                indent: indent2,
                mode: MODE_BREAK,
                doc: whitespace
              };
              if (length === 2) {
                if (contentFits) {
                  commands.push(whitespaceFlatCommand, contentFlatCommand);
                } else {
                  commands.push(whitespaceBreakCommand, contentBreakCommand);
                }
                break;
              }
              const secondContent = parts[offset + 2];
              const remainingCommand = {
                indent: indent2,
                mode,
                doc: {
                  ...doc2,
                  [DOC_FILL_PRINTED_LENGTH]: offset + 2
                }
              };
              const firstAndSecondContentFlatCommand = {
                indent: indent2,
                mode: MODE_FLAT,
                doc: [content, whitespace, secondContent]
              };
              const firstAndSecondContentFits = fits(firstAndSecondContentFlatCommand, [], remainingWidth, lineSuffix2.length > 0, groupModeMap, true);
              commands.push(remainingCommand);
              if (firstAndSecondContentFits) {
                commands.push(whitespaceFlatCommand, contentFlatCommand);
              } else if (contentFits) {
                commands.push(whitespaceBreakCommand, contentFlatCommand);
              } else {
                commands.push(whitespaceBreakCommand, contentBreakCommand);
              }
              break;
            }
            case DOC_TYPE_IF_BREAK:
            case DOC_TYPE_INDENT_IF_BREAK: {
              const groupMode = doc2.groupId ? groupModeMap[doc2.groupId] : mode;
              if (groupMode === MODE_BREAK) {
                const breakContents = doc2.type === DOC_TYPE_IF_BREAK ? doc2.breakContents : doc2.negate ? doc2.contents : indent(doc2.contents);
                if (breakContents) {
                  commands.push({
                    indent: indent2,
                    mode,
                    doc: breakContents
                  });
                }
              }
              if (groupMode === MODE_FLAT) {
                const flatContents = doc2.type === DOC_TYPE_IF_BREAK ? doc2.flatContents : doc2.negate ? indent(doc2.contents) : doc2.contents;
                if (flatContents) {
                  commands.push({
                    indent: indent2,
                    mode,
                    doc: flatContents
                  });
                }
              }
              break;
            }
            case DOC_TYPE_LINE_SUFFIX:
              lineSuffix2.push({
                indent: indent2,
                mode,
                doc: doc2.contents
              });
              break;
            case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
              if (lineSuffix2.length > 0) {
                commands.push({
                  indent: indent2,
                  mode,
                  doc: hardlineWithoutBreakParent
                });
              }
              break;
            case DOC_TYPE_LINE:
              switch (mode) {
                case MODE_FLAT:
                  if (!doc2.hard) {
                    if (!doc2.soft) {
                      output += " ";
                      position += 1;
                    }
                    break;
                  } else {
                    shouldRemeasure = true;
                  }
                // fallthrough
                case MODE_BREAK:
                  if (lineSuffix2.length > 0) {
                    commands.push({
                      indent: indent2,
                      mode,
                      doc: doc2
                    }, ...lineSuffix2.reverse());
                    lineSuffix2.length = 0;
                    break;
                  }
                  if (doc2.literal) {
                    output += newLine;
                    position = 0;
                    if (indent2.root) {
                      if (indent2.root.value) {
                        output += indent2.root.value;
                      }
                      position = indent2.root.length;
                    }
                  } else {
                    trim2();
                    output += newLine + indent2.value;
                    position = indent2.length;
                  }
                  break;
              }
              break;
            case DOC_TYPE_LABEL:
              commands.push({
                indent: indent2,
                mode,
                doc: doc2.contents
              });
              break;
            case DOC_TYPE_BREAK_PARENT:
              break;
            default:
              throw new invalid_doc_error_default(doc2);
          }
          if (commands.length === 0 && lineSuffix2.length > 0) {
            commands.push(...lineSuffix2.reverse());
            lineSuffix2.length = 0;
          }
        }
        const formatted = settledOutput.join("") + output;
        const finalCursorPositions = [...settledCursorPositions, ...cursorPositions];
        if (finalCursorPositions.length !== 2) {
          return {
            formatted
          };
        }
        const cursorNodeStart = finalCursorPositions[0];
        return {
          formatted,
          cursorNodeStart,
          cursorNodeText: formatted.slice(cursorNodeStart, method_at_default(
            /* OPTIONAL_OBJECT: false */
            0,
            finalCursorPositions,
            -1
          ))
        };
        function trim2() {
          const {
            text: trimmed,
            count
          } = trimIndentation(output);
          if (trimmed) {
            settledOutput.push(trimmed);
            settledTextLength += trimmed.length;
          }
          output = "";
          position -= count;
          if (cursorPositions.length > 0) {
            settledCursorPositions.push(...cursorPositions.map((position2) => Math.min(position2, settledTextLength)));
            cursorPositions.length = 0;
          }
        }
      }
      var builders = {
        join,
        line,
        softline,
        hardline,
        literalline,
        group,
        conditionalGroup,
        fill,
        lineSuffix,
        lineSuffixBoundary,
        cursor,
        breakParent,
        ifBreak,
        trim,
        indent,
        indentIfBreak,
        align,
        addAlignmentToDoc,
        markAsRoot,
        dedentToRoot,
        dedent,
        hardlineWithoutBreakParent,
        literallineWithoutBreakParent,
        label,
        // TODO: Remove this in v4
        concat: (parts) => parts
      };
      var printer = { printDocToString };
      var utils = {
        willBreak,
        traverseDoc: traverse_doc_default,
        findInDoc,
        mapDoc,
        removeLines,
        stripTrailingHardline,
        replaceEndOfLine,
        canBreak
      };
      return __toCommonJS2(public_exports);
    });
  }
});

// ../../node_modules/.pnpm/prettier@3.7.4/node_modules/prettier/index.cjs
var require_prettier = __commonJS({
  "../../node_modules/.pnpm/prettier@3.7.4/node_modules/prettier/index.cjs"(exports, module2) {
    "use strict";
    init_esm_shims();
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __esm2 = (fn, res) => function __init() {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    };
    var __export2 = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS2 = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var OPTIONAL_OBJECT;
    var createMethodShim;
    var init_shared = __esm2({
      "scripts/build/shims/shared.js"() {
        OPTIONAL_OBJECT = 1;
        createMethodShim = (methodName, getImplementation) => (flags, object, ...arguments_) => {
          if (flags | OPTIONAL_OBJECT && (object === void 0 || object === null)) {
            return;
          }
          const implementation = getImplementation.call(object) ?? object[methodName];
          return implementation.apply(object, arguments_);
        };
      }
    });
    var stringReplaceAll;
    var replaceAll;
    var method_replace_all_default;
    var init_method_replace_all = __esm2({
      "scripts/build/shims/method-replace-all.js"() {
        init_shared();
        stringReplaceAll = String.prototype.replaceAll ?? function(pattern, replacement) {
          if (pattern.global) {
            return this.replace(pattern, replacement);
          }
          return this.split(pattern).join(replacement);
        };
        replaceAll = createMethodShim("replaceAll", function() {
          if (typeof this === "string") {
            return stringReplaceAll;
          }
        });
        method_replace_all_default = replaceAll;
      }
    });
    function skip(characters) {
      return (text, startIndex, options) => {
        const backwards = Boolean(options?.backwards);
        if (startIndex === false) {
          return false;
        }
        const { length } = text;
        let cursor = startIndex;
        while (cursor >= 0 && cursor < length) {
          const character = text.charAt(cursor);
          if (characters instanceof RegExp) {
            if (!characters.test(character)) {
              return cursor;
            }
          } else if (!characters.includes(character)) {
            return cursor;
          }
          backwards ? cursor-- : cursor++;
        }
        if (cursor === -1 || cursor === length) {
          return cursor;
        }
        return false;
      };
    }
    var skipWhitespace;
    var skipSpaces;
    var skipToLineEnd;
    var skipEverythingButNewLine;
    var init_skip = __esm2({
      "src/utilities/skip.js"() {
        skipWhitespace = skip(/\s/u);
        skipSpaces = skip(" 	");
        skipToLineEnd = skip(",; 	");
        skipEverythingButNewLine = skip(/[^\n\r]/u);
      }
    });
    function skipInlineComment(text, startIndex) {
      if (startIndex === false) {
        return false;
      }
      if (text.charAt(startIndex) === "/" && text.charAt(startIndex + 1) === "*") {
        for (let i = startIndex + 2; i < text.length; ++i) {
          if (text.charAt(i) === "*" && text.charAt(i + 1) === "/") {
            return i + 2;
          }
        }
      }
      return startIndex;
    }
    var skip_inline_comment_default;
    var init_skip_inline_comment = __esm2({
      "src/utilities/skip-inline-comment.js"() {
        skip_inline_comment_default = skipInlineComment;
      }
    });
    function skipNewline(text, startIndex, options) {
      const backwards = Boolean(options?.backwards);
      if (startIndex === false) {
        return false;
      }
      const character = text.charAt(startIndex);
      if (backwards) {
        if (text.charAt(startIndex - 1) === "\r" && character === "\n") {
          return startIndex - 2;
        }
        if (isNewlineCharacter(character)) {
          return startIndex - 1;
        }
      } else {
        if (character === "\r" && text.charAt(startIndex + 1) === "\n") {
          return startIndex + 2;
        }
        if (isNewlineCharacter(character)) {
          return startIndex + 1;
        }
      }
      return startIndex;
    }
    var isNewlineCharacter;
    var skip_newline_default;
    var init_skip_newline = __esm2({
      "src/utilities/skip-newline.js"() {
        isNewlineCharacter = (character) => character === "\n" || character === "\r" || character === "\u2028" || character === "\u2029";
        skip_newline_default = skipNewline;
      }
    });
    function skipTrailingComment(text, startIndex) {
      if (startIndex === false) {
        return false;
      }
      if (text.charAt(startIndex) === "/" && text.charAt(startIndex + 1) === "/") {
        return skipEverythingButNewLine(text, startIndex);
      }
      return startIndex;
    }
    var skip_trailing_comment_default;
    var init_skip_trailing_comment = __esm2({
      "src/utilities/skip-trailing-comment.js"() {
        init_skip();
        skip_trailing_comment_default = skipTrailingComment;
      }
    });
    function getNextNonSpaceNonCommentCharacterIndex(text, startIndex) {
      let oldIdx = null;
      let nextIdx = startIndex;
      while (nextIdx !== oldIdx) {
        oldIdx = nextIdx;
        nextIdx = skipSpaces(text, nextIdx);
        nextIdx = skip_inline_comment_default(text, nextIdx);
        nextIdx = skip_trailing_comment_default(text, nextIdx);
        nextIdx = skip_newline_default(text, nextIdx);
      }
      return nextIdx;
    }
    var get_next_non_space_non_comment_character_index_default;
    var init_get_next_non_space_non_comment_character_index = __esm2({
      "src/utilities/get-next-non-space-non-comment-character-index.js"() {
        init_skip();
        init_skip_inline_comment();
        init_skip_newline();
        init_skip_trailing_comment();
        get_next_non_space_non_comment_character_index_default = getNextNonSpaceNonCommentCharacterIndex;
      }
    });
    function hasNewline(text, startIndex, options = {}) {
      const idx = skipSpaces(
        text,
        options.backwards ? startIndex - 1 : startIndex,
        options
      );
      const idx2 = skip_newline_default(text, idx, options);
      return idx !== idx2;
    }
    var has_newline_default;
    var init_has_newline = __esm2({
      "src/utilities/has-newline.js"() {
        init_skip();
        init_skip_newline();
        has_newline_default = hasNewline;
      }
    });
    function isNextLineEmpty(text, startIndex) {
      let oldIdx = null;
      let idx = startIndex;
      while (idx !== oldIdx) {
        oldIdx = idx;
        idx = skipToLineEnd(text, idx);
        idx = skip_inline_comment_default(text, idx);
        idx = skipSpaces(text, idx);
      }
      idx = skip_trailing_comment_default(text, idx);
      idx = skip_newline_default(text, idx);
      return idx !== false && has_newline_default(text, idx);
    }
    var is_next_line_empty_default;
    var init_is_next_line_empty = __esm2({
      "src/utilities/is-next-line-empty.js"() {
        init_has_newline();
        init_skip();
        init_skip_inline_comment();
        init_skip_newline();
        init_skip_trailing_comment();
        is_next_line_empty_default = isNextLineEmpty;
      }
    });
    function isPreviousLineEmpty(text, startIndex) {
      let idx = startIndex - 1;
      idx = skipSpaces(text, idx, { backwards: true });
      idx = skip_newline_default(text, idx, { backwards: true });
      idx = skipSpaces(text, idx, { backwards: true });
      const idx2 = skip_newline_default(text, idx, { backwards: true });
      return idx !== idx2;
    }
    var is_previous_line_empty_default;
    var init_is_previous_line_empty = __esm2({
      "src/utilities/is-previous-line-empty.js"() {
        init_skip();
        init_skip_newline();
        is_previous_line_empty_default = isPreviousLineEmpty;
      }
    });
    function describeNodeForDebugging(node) {
      const nodeType = node.type || node.kind || "(unknown type)";
      let nodeName = String(
        node.name || node.id && (typeof node.id === "object" ? node.id.name : node.id) || node.key && (typeof node.key === "object" ? node.key.name : node.key) || node.value && (typeof node.value === "object" ? "" : String(node.value)) || node.operator || ""
      );
      if (nodeName.length > 20) {
        nodeName = nodeName.slice(0, 19) + "\u2026";
      }
      return nodeType + (nodeName ? " " + nodeName : "");
    }
    function addCommentHelper(node, comment) {
      const comments = node.comments ?? (node.comments = []);
      comments.push(comment);
      comment.printed = false;
      comment.nodeDescription = describeNodeForDebugging(node);
    }
    function addLeadingComment(node, comment) {
      comment.leading = true;
      comment.trailing = false;
      addCommentHelper(node, comment);
    }
    function addDanglingComment(node, comment, marker) {
      comment.leading = false;
      comment.trailing = false;
      if (marker) {
        comment.marker = marker;
      }
      addCommentHelper(node, comment);
    }
    function addTrailingComment(node, comment) {
      comment.leading = false;
      comment.trailing = true;
      addCommentHelper(node, comment);
    }
    var init_utilities = __esm2({
      "src/main/comments/utilities.js"() {
      }
    });
    function getAlignmentSize(text, tabWidth, startIndex = 0) {
      let size = 0;
      for (let i = startIndex; i < text.length; ++i) {
        if (text[i] === "	") {
          size = size + tabWidth - size % tabWidth;
        } else {
          size++;
        }
      }
      return size;
    }
    var get_alignment_size_default;
    var init_get_alignment_size = __esm2({
      "src/utilities/get-alignment-size.js"() {
        get_alignment_size_default = getAlignmentSize;
      }
    });
    function getIndentSize(value, tabWidth) {
      const lastNewlineIndex = value.lastIndexOf("\n");
      if (lastNewlineIndex === -1) {
        return 0;
      }
      return get_alignment_size_default(
        // All the leading whitespaces
        value.slice(lastNewlineIndex + 1).match(/^[\t ]*/u)[0],
        tabWidth
      );
    }
    var get_indent_size_default;
    var init_get_indent_size = __esm2({
      "src/utilities/get-indent-size.js"() {
        init_get_alignment_size();
        get_indent_size_default = getIndentSize;
      }
    });
    function escapeStringRegexp(string) {
      if (typeof string !== "string") {
        throw new TypeError("Expected a string");
      }
      return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
    }
    var init_escape_string_regexp = __esm2({
      "node_modules/escape-string-regexp/index.js"() {
      }
    });
    function getMaxContinuousCount(text, searchString) {
      let results = text.matchAll(
        new RegExp(`(?:${escapeStringRegexp(searchString)})+`, "gu")
      );
      if (!results.reduce) {
        results = [...results];
      }
      return results.reduce(
        (maxCount, [result]) => Math.max(maxCount, result.length),
        0
      ) / searchString.length;
    }
    var get_max_continuous_count_default;
    var init_get_max_continuous_count = __esm2({
      "src/utilities/get-max-continuous-count.js"() {
        init_escape_string_regexp();
        get_max_continuous_count_default = getMaxContinuousCount;
      }
    });
    function getNextNonSpaceNonCommentCharacter(text, startIndex) {
      const index = get_next_non_space_non_comment_character_index_default(text, startIndex);
      return index === false ? "" : text.charAt(index);
    }
    var get_next_non_space_non_comment_character_default;
    var init_get_next_non_space_non_comment_character = __esm2({
      "src/utilities/get-next-non-space-non-comment-character.js"() {
        init_get_next_non_space_non_comment_character_index();
        get_next_non_space_non_comment_character_default = getNextNonSpaceNonCommentCharacter;
      }
    });
    function getPreferredQuote(text, preferredQuoteOrPreferSingleQuote) {
      const { preferred, alternate } = preferredQuoteOrPreferSingleQuote === true || preferredQuoteOrPreferSingleQuote === SINGLE_QUOTE ? SINGLE_QUOTE_SETTINGS : DOUBLE_QUOTE_SETTINGS;
      const { length } = text;
      let preferredQuoteCount = 0;
      let alternateQuoteCount = 0;
      for (let index = 0; index < length; index++) {
        const codePoint = text.charCodeAt(index);
        if (codePoint === preferred.codePoint) {
          preferredQuoteCount++;
        } else if (codePoint === alternate.codePoint) {
          alternateQuoteCount++;
        }
      }
      return (preferredQuoteCount > alternateQuoteCount ? alternate : preferred).character;
    }
    var SINGLE_QUOTE;
    var DOUBLE_QUOTE;
    var SINGLE_QUOTE_DATA;
    var DOUBLE_QUOTE_DATA;
    var SINGLE_QUOTE_SETTINGS;
    var DOUBLE_QUOTE_SETTINGS;
    var get_preferred_quote_default;
    var init_get_preferred_quote = __esm2({
      "src/utilities/get-preferred-quote.js"() {
        SINGLE_QUOTE = "'";
        DOUBLE_QUOTE = '"';
        SINGLE_QUOTE_DATA = Object.freeze({
          character: SINGLE_QUOTE,
          codePoint: 39
        });
        DOUBLE_QUOTE_DATA = Object.freeze({
          character: DOUBLE_QUOTE,
          codePoint: 34
        });
        SINGLE_QUOTE_SETTINGS = Object.freeze({
          preferred: SINGLE_QUOTE_DATA,
          alternate: DOUBLE_QUOTE_DATA
        });
        DOUBLE_QUOTE_SETTINGS = Object.freeze({
          preferred: DOUBLE_QUOTE_DATA,
          alternate: SINGLE_QUOTE_DATA
        });
        get_preferred_quote_default = getPreferredQuote;
      }
    });
    var emoji_regex_default;
    var init_emoji_regex = __esm2({
      "node_modules/emoji-regex/index.mjs"() {
        emoji_regex_default = () => {
          return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E-\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED8\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDD1D\uDEEF]\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE]|[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE]|\uDEEF\u200D\uD83D\uDC69\uD83C[\uDFFB-\uDFFE])))?))?|\uDD75(?:\uD83C[\uDFFB-\uDFFF]|\uFE0F)?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3C-\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC2\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF]|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC30\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3\uDE70]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF]|\uDEEF\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
        };
      }
    });
    function isFullWidth(x) {
      return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
    }
    function isWide(x) {
      return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9776 && x <= 9783 || x >= 9800 && x <= 9811 || x === 9855 || x >= 9866 && x <= 9871 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12773 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x >= 94192 && x <= 94198 || x >= 94208 && x <= 101589 || x >= 101631 && x <= 101662 || x >= 101760 && x <= 101874 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x >= 119552 && x <= 119638 || x >= 119648 && x <= 119670 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128728 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129674 || x >= 129678 && x <= 129734 || x === 129736 || x >= 129741 && x <= 129756 || x >= 129759 && x <= 129770 || x >= 129775 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
    }
    var init_lookup = __esm2({
      "node_modules/get-east-asian-width/lookup.js"() {
      }
    });
    var init_get_east_asian_width = __esm2({
      "node_modules/get-east-asian-width/index.js"() {
        init_lookup();
      }
    });
    var narrow_emojis_evaluate_default;
    var init_narrow_emojis_evaluate = __esm2({
      "src/utilities/narrow-emojis.evaluate.js"() {
        narrow_emojis_evaluate_default = "\xA9\xAE\u203C\u2049\u2122\u2139\u2194\u2195\u2196\u2197\u2198\u2199\u21A9\u21AA\u2328\u23CF\u23F1\u23F2\u23F8\u23F9\u23FA\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600\u2601\u2602\u2603\u2604\u260E\u2611\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638\u2639\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694\u2695\u2696\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F1\u26F7\u26F8\u26F9\u2702\u2708\u2709\u270C\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u2764\u27A1\u2934\u2935\u2B05\u2B06\u2B07";
      }
    });
    function getStringWidth(text) {
      if (!text) {
        return 0;
      }
      if (!notAsciiRegex.test(text)) {
        return text.length;
      }
      text = text.replace(
        emoji_regex_default(),
        (match) => narrowEmojisSet.has(match) ? " " : "  "
      );
      let width = 0;
      for (const character of text) {
        const codePoint = character.codePointAt(0);
        if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
          continue;
        }
        if (codePoint >= 768 && codePoint <= 879) {
          continue;
        }
        if (codePoint >= 65024 && codePoint <= 65039) {
          continue;
        }
        width += isFullWidth(codePoint) || isWide(codePoint) ? 2 : 1;
      }
      return width;
    }
    var notAsciiRegex;
    var narrowEmojisSet;
    var get_string_width_default;
    var init_get_string_width = __esm2({
      "src/utilities/get-string-width.js"() {
        init_emoji_regex();
        init_get_east_asian_width();
        init_narrow_emojis_evaluate();
        notAsciiRegex = /[^\x20-\x7F]/u;
        narrowEmojisSet = new Set(narrow_emojis_evaluate_default);
        get_string_width_default = getStringWidth;
      }
    });
    function hasNewlineInRange(text, startIndex, endIndex) {
      for (let i = startIndex; i < endIndex; ++i) {
        if (text.charAt(i) === "\n") {
          return true;
        }
      }
      return false;
    }
    var has_newline_in_range_default;
    var init_has_newline_in_range = __esm2({
      "src/utilities/has-newline-in-range.js"() {
        has_newline_in_range_default = hasNewlineInRange;
      }
    });
    function hasSpaces(text, startIndex, options = {}) {
      const idx = skipSpaces(
        text,
        options.backwards ? startIndex - 1 : startIndex,
        options
      );
      return idx !== startIndex;
    }
    var has_spaces_default;
    var init_has_spaces = __esm2({
      "src/utilities/has-spaces.js"() {
        init_skip();
        has_spaces_default = hasSpaces;
      }
    });
    var public_exports = {};
    __export2(public_exports, {
      addDanglingComment: () => addDanglingComment,
      addLeadingComment: () => addLeadingComment,
      addTrailingComment: () => addTrailingComment,
      getAlignmentSize: () => get_alignment_size_default,
      getIndentSize: () => get_indent_size_default,
      getMaxContinuousCount: () => get_max_continuous_count_default,
      getNextNonSpaceNonCommentCharacter: () => get_next_non_space_non_comment_character_default,
      getNextNonSpaceNonCommentCharacterIndex: () => getNextNonSpaceNonCommentCharacterIndex2,
      getPreferredQuote: () => get_preferred_quote_default,
      getStringWidth: () => get_string_width_default,
      hasNewline: () => has_newline_default,
      hasNewlineInRange: () => has_newline_in_range_default,
      hasSpaces: () => has_spaces_default,
      isNextLineEmpty: () => isNextLineEmpty2,
      isNextLineEmptyAfterIndex: () => is_next_line_empty_default,
      isPreviousLineEmpty: () => isPreviousLineEmpty2,
      makeString: () => makeString,
      skip: () => skip,
      skipEverythingButNewLine: () => skipEverythingButNewLine,
      skipInlineComment: () => skip_inline_comment_default,
      skipNewline: () => skip_newline_default,
      skipSpaces: () => skipSpaces,
      skipToLineEnd: () => skipToLineEnd,
      skipTrailingComment: () => skip_trailing_comment_default,
      skipWhitespace: () => skipWhitespace
    });
    function legacyGetNextNonSpaceNonCommentCharacterIndex(text, node, locEnd) {
      return get_next_non_space_non_comment_character_index_default(text, locEnd(node));
    }
    function getNextNonSpaceNonCommentCharacterIndex2(text, startIndex) {
      return arguments.length === 2 || typeof startIndex === "number" ? get_next_non_space_non_comment_character_index_default(text, startIndex) : (
        // @ts-expect-error -- expected
        // eslint-disable-next-line prefer-rest-params
        legacyGetNextNonSpaceNonCommentCharacterIndex(...arguments)
      );
    }
    function legacyIsPreviousLineEmpty(text, node, locStart) {
      return is_previous_line_empty_default(text, locStart(node));
    }
    function isPreviousLineEmpty2(text, startIndex) {
      return arguments.length === 2 || typeof startIndex === "number" ? is_previous_line_empty_default(text, startIndex) : (
        // @ts-expect-error -- expected
        // eslint-disable-next-line prefer-rest-params
        legacyIsPreviousLineEmpty(...arguments)
      );
    }
    function legacyIsNextLineEmpty(text, node, locEnd) {
      return is_next_line_empty_default(text, locEnd(node));
    }
    function makeString(rawText, enclosingQuote, unescapeUnnecessaryEscapes) {
      const otherQuote = enclosingQuote === '"' ? "'" : '"';
      const regex = /\\(.)|(["'])/gsu;
      const raw = method_replace_all_default(
        /* OPTIONAL_OBJECT: false */
        0,
        rawText,
        regex,
        (match, escaped, quote) => {
          if (escaped === otherQuote) {
            return escaped;
          }
          if (quote === enclosingQuote) {
            return "\\" + quote;
          }
          if (quote) {
            return quote;
          }
          return unescapeUnnecessaryEscapes && /^[^\n\r"'0-7\\bfnrt-vx\u2028\u2029]$/u.test(escaped) ? escaped : "\\" + escaped;
        }
      );
      return enclosingQuote + raw + enclosingQuote;
    }
    function isNextLineEmpty2(text, startIndex) {
      return arguments.length === 2 || typeof startIndex === "number" ? is_next_line_empty_default(text, startIndex) : (
        // @ts-expect-error -- expected
        // eslint-disable-next-line prefer-rest-params
        legacyIsNextLineEmpty(...arguments)
      );
    }
    var init_public = __esm2({
      "src/utilities/public.js"() {
        init_method_replace_all();
        init_get_next_non_space_non_comment_character_index();
        init_is_next_line_empty();
        init_is_previous_line_empty();
        init_utilities();
        init_get_alignment_size();
        init_get_indent_size();
        init_get_max_continuous_count();
        init_get_next_non_space_non_comment_character();
        init_get_preferred_quote();
        init_get_string_width();
        init_has_newline();
        init_has_newline_in_range();
        init_has_spaces();
        init_skip();
        init_skip_inline_comment();
        init_skip_newline();
        init_skip_trailing_comment();
      }
    });
    var version_evaluate_exports = {};
    __export2(version_evaluate_exports, {
      default: () => version_evaluate_default
    });
    var version_evaluate_default;
    var init_version_evaluate = __esm2({
      "src/main/version.evaluate.js"() {
        version_evaluate_default = "3.7.4";
      }
    });
    var prettierPromise = import("./prettier-FCFKLZJL.js");
    var functionNames = [
      "formatWithCursor",
      "format",
      "check",
      "resolveConfig",
      "resolveConfigFile",
      "clearConfigCache",
      "getFileInfo",
      "getSupportInfo"
    ];
    var prettier = /* @__PURE__ */ Object.create(null);
    for (const name of functionNames) {
      prettier[name] = async (...args) => {
        const prettier2 = await prettierPromise;
        return prettier2[name](...args);
      };
    }
    var debugApiFunctionNames = [
      "parse",
      "formatAST",
      "formatDoc",
      "printToDoc",
      "printDocToString"
    ];
    var debugApis = /* @__PURE__ */ Object.create(null);
    for (const name of debugApiFunctionNames) {
      debugApis[name] = async (...args) => {
        const prettier2 = await prettierPromise;
        return prettier2.__debug[name](...args);
      };
    }
    prettier.__debug = debugApis;
    if (true) {
      prettier.util = (init_public(), __toCommonJS2(public_exports));
      prettier.doc = require_doc();
      prettier.version = (init_version_evaluate(), __toCommonJS2(version_evaluate_exports)).default;
    } else {
      Object.defineProperties(prettier, {
        util: {
          get() {
            try {
              return null;
            } catch {
            }
            throw new Error(
              "prettier.util is not available in development CommonJS version"
            );
          }
        },
        doc: {
          get() {
            try {
              return null;
            } catch {
            }
            throw new Error(
              "prettier.doc is not available in development CommonJS version"
            );
          }
        }
      });
      prettier.version = null.version;
    }
    module2.exports = prettier;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/formatter.js
var require_formatter = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/formatter.js"(exports) {
    "use strict";
    init_esm_shims();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
          resolve2(value);
        });
      }
      return new (P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.format = void 0;
    var prettier_1 = require_prettier();
    function format3(code, options) {
      return __awaiter(this, void 0, void 0, function* () {
        if (!options.format) {
          return code;
        }
        return (0, prettier_1.format)(code, Object.assign({ parser: "typescript" }, options.style));
      });
    }
    exports.format = format3;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/types/AST.js
var require_AST = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/types/AST.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.T_UNKNOWN_ADDITIONAL_PROPERTIES = exports.T_UNKNOWN = exports.T_ANY_ADDITIONAL_PROPERTIES = exports.T_ANY = exports.hasStandaloneName = exports.hasComment = void 0;
    function hasComment(ast) {
      return "comment" in ast && ast.comment != null && ast.comment !== "" || // Compare to true because ast.deprecated might be undefined
      "deprecated" in ast && ast.deprecated === true;
    }
    exports.hasComment = hasComment;
    function hasStandaloneName(ast) {
      return "standaloneName" in ast && ast.standaloneName != null && ast.standaloneName !== "";
    }
    exports.hasStandaloneName = hasStandaloneName;
    exports.T_ANY = {
      type: "ANY"
    };
    exports.T_ANY_ADDITIONAL_PROPERTIES = {
      keyName: "[k: string]",
      type: "ANY"
    };
    exports.T_UNKNOWN = {
      type: "UNKNOWN"
    };
    exports.T_UNKNOWN_ADDITIONAL_PROPERTIES = {
      keyName: "[k: string]",
      type: "UNKNOWN"
    };
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/types/JSONSchema.js
var require_JSONSchema = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/types/JSONSchema.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isCompound = exports.isPrimitive = exports.isBoolean = exports.getRootSchema = exports.Intersection = exports.Types = exports.Parent = void 0;
    var lodash_1 = require_lodash();
    exports.Parent = /* @__PURE__ */ Symbol("Parent");
    exports.Types = /* @__PURE__ */ Symbol("Types");
    exports.Intersection = /* @__PURE__ */ Symbol("Intersection");
    exports.getRootSchema = (0, lodash_1.memoize)((schema) => {
      const parent = schema[exports.Parent];
      if (!parent) {
        return schema;
      }
      return (0, exports.getRootSchema)(parent);
    });
    function isBoolean(schema) {
      return schema === true || schema === false;
    }
    exports.isBoolean = isBoolean;
    function isPrimitive(schema) {
      return !(0, lodash_1.isPlainObject)(schema);
    }
    exports.isPrimitive = isPrimitive;
    function isCompound(schema) {
      return Array.isArray(schema.type) || "anyOf" in schema || "oneOf" in schema;
    }
    exports.isCompound = isCompound;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/common.js
var require_common = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/common.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    function isNothing(subject) {
      return typeof subject === "undefined" || subject === null;
    }
    function isObject(subject) {
      return typeof subject === "object" && subject !== null;
    }
    function toArray(sequence) {
      if (Array.isArray(sequence)) return sequence;
      else if (isNothing(sequence)) return [];
      return [sequence];
    }
    function extend2(target, source) {
      var index, length, key, sourceKeys;
      if (source) {
        sourceKeys = Object.keys(source);
        for (index = 0, length = sourceKeys.length; index < length; index += 1) {
          key = sourceKeys[index];
          target[key] = source[key];
        }
      }
      return target;
    }
    function repeat(string, count) {
      var result = "", cycle;
      for (cycle = 0; cycle < count; cycle += 1) {
        result += string;
      }
      return result;
    }
    function isNegativeZero(number) {
      return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
    }
    module2.exports.isNothing = isNothing;
    module2.exports.isObject = isObject;
    module2.exports.toArray = toArray;
    module2.exports.repeat = repeat;
    module2.exports.isNegativeZero = isNegativeZero;
    module2.exports.extend = extend2;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/exception.js
var require_exception = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/exception.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    function formatError(exception, compact) {
      var where = "", message = exception.reason || "(unknown reason)";
      if (!exception.mark) return message;
      if (exception.mark.name) {
        where += 'in "' + exception.mark.name + '" ';
      }
      where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
      if (!compact && exception.mark.snippet) {
        where += "\n\n" + exception.mark.snippet;
      }
      return message + " " + where;
    }
    function YAMLException(reason, mark) {
      Error.call(this);
      this.name = "YAMLException";
      this.reason = reason;
      this.mark = mark;
      this.message = formatError(this, false);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack || "";
      }
    }
    YAMLException.prototype = Object.create(Error.prototype);
    YAMLException.prototype.constructor = YAMLException;
    YAMLException.prototype.toString = function toString(compact) {
      return this.name + ": " + formatError(this, compact);
    };
    module2.exports = YAMLException;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/snippet.js
var require_snippet = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/snippet.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var common = require_common();
    function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
      var head = "";
      var tail = "";
      var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
      if (position - lineStart > maxHalfLength) {
        head = " ... ";
        lineStart = position - maxHalfLength + head.length;
      }
      if (lineEnd - position > maxHalfLength) {
        tail = " ...";
        lineEnd = position + maxHalfLength - tail.length;
      }
      return {
        str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
        pos: position - lineStart + head.length
        // relative position
      };
    }
    function padStart(string, max) {
      return common.repeat(" ", max - string.length) + string;
    }
    function makeSnippet(mark, options) {
      options = Object.create(options || null);
      if (!mark.buffer) return null;
      if (!options.maxLength) options.maxLength = 79;
      if (typeof options.indent !== "number") options.indent = 1;
      if (typeof options.linesBefore !== "number") options.linesBefore = 3;
      if (typeof options.linesAfter !== "number") options.linesAfter = 2;
      var re = /\r?\n|\r|\0/g;
      var lineStarts = [0];
      var lineEnds = [];
      var match;
      var foundLineNo = -1;
      while (match = re.exec(mark.buffer)) {
        lineEnds.push(match.index);
        lineStarts.push(match.index + match[0].length);
        if (mark.position <= match.index && foundLineNo < 0) {
          foundLineNo = lineStarts.length - 2;
        }
      }
      if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
      var result = "", i, line;
      var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
      var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
      for (i = 1; i <= options.linesBefore; i++) {
        if (foundLineNo - i < 0) break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo - i],
          lineEnds[foundLineNo - i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
          maxLineLength
        );
        result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
      }
      line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
      result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
      for (i = 1; i <= options.linesAfter; i++) {
        if (foundLineNo + i >= lineEnds.length) break;
        line = getLine(
          mark.buffer,
          lineStarts[foundLineNo + i],
          lineEnds[foundLineNo + i],
          mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
          maxLineLength
        );
        result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
      }
      return result.replace(/\n$/, "");
    }
    module2.exports = makeSnippet;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type.js
var require_type = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var YAMLException = require_exception();
    var TYPE_CONSTRUCTOR_OPTIONS = [
      "kind",
      "multi",
      "resolve",
      "construct",
      "instanceOf",
      "predicate",
      "represent",
      "representName",
      "defaultStyle",
      "styleAliases"
    ];
    var YAML_NODE_KINDS = [
      "scalar",
      "sequence",
      "mapping"
    ];
    function compileStyleAliases(map) {
      var result = {};
      if (map !== null) {
        Object.keys(map).forEach(function(style) {
          map[style].forEach(function(alias) {
            result[String(alias)] = style;
          });
        });
      }
      return result;
    }
    function Type(tag, options) {
      options = options || {};
      Object.keys(options).forEach(function(name) {
        if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
          throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
        }
      });
      this.options = options;
      this.tag = tag;
      this.kind = options["kind"] || null;
      this.resolve = options["resolve"] || function() {
        return true;
      };
      this.construct = options["construct"] || function(data) {
        return data;
      };
      this.instanceOf = options["instanceOf"] || null;
      this.predicate = options["predicate"] || null;
      this.represent = options["represent"] || null;
      this.representName = options["representName"] || null;
      this.defaultStyle = options["defaultStyle"] || null;
      this.multi = options["multi"] || false;
      this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
      if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
        throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
      }
    }
    module2.exports = Type;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema.js
var require_schema = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var YAMLException = require_exception();
    var Type = require_type();
    function compileList(schema, name) {
      var result = [];
      schema[name].forEach(function(currentType) {
        var newIndex = result.length;
        result.forEach(function(previousType, previousIndex) {
          if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
            newIndex = previousIndex;
          }
        });
        result[newIndex] = currentType;
      });
      return result;
    }
    function compileMap() {
      var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {},
        multi: {
          scalar: [],
          sequence: [],
          mapping: [],
          fallback: []
        }
      }, index, length;
      function collectType(type) {
        if (type.multi) {
          result.multi[type.kind].push(type);
          result.multi["fallback"].push(type);
        } else {
          result[type.kind][type.tag] = result["fallback"][type.tag] = type;
        }
      }
      for (index = 0, length = arguments.length; index < length; index += 1) {
        arguments[index].forEach(collectType);
      }
      return result;
    }
    function Schema(definition) {
      return this.extend(definition);
    }
    Schema.prototype.extend = function extend2(definition) {
      var implicit = [];
      var explicit = [];
      if (definition instanceof Type) {
        explicit.push(definition);
      } else if (Array.isArray(definition)) {
        explicit = explicit.concat(definition);
      } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
        if (definition.implicit) implicit = implicit.concat(definition.implicit);
        if (definition.explicit) explicit = explicit.concat(definition.explicit);
      } else {
        throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
      }
      implicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
        if (type.loadKind && type.loadKind !== "scalar") {
          throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
        }
        if (type.multi) {
          throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
        }
      });
      explicit.forEach(function(type) {
        if (!(type instanceof Type)) {
          throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
        }
      });
      var result = Object.create(Schema.prototype);
      result.implicit = (this.implicit || []).concat(implicit);
      result.explicit = (this.explicit || []).concat(explicit);
      result.compiledImplicit = compileList(result, "implicit");
      result.compiledExplicit = compileList(result, "explicit");
      result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
      return result;
    };
    module2.exports = Schema;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/str.js
var require_str = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/str.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:str", {
      kind: "scalar",
      construct: function(data) {
        return data !== null ? data : "";
      }
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/seq.js
var require_seq = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/seq.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:seq", {
      kind: "sequence",
      construct: function(data) {
        return data !== null ? data : [];
      }
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/map.js
var require_map = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/map.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    module2.exports = new Type("tag:yaml.org,2002:map", {
      kind: "mapping",
      construct: function(data) {
        return data !== null ? data : {};
      }
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/failsafe.js
var require_failsafe = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/failsafe.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Schema = require_schema();
    module2.exports = new Schema({
      explicit: [
        require_str(),
        require_seq(),
        require_map()
      ]
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/null.js
var require_null = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/null.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    function resolveYamlNull(data) {
      if (data === null) return true;
      var max = data.length;
      return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
    }
    function constructYamlNull() {
      return null;
    }
    function isNull(object) {
      return object === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:null", {
      kind: "scalar",
      resolve: resolveYamlNull,
      construct: constructYamlNull,
      predicate: isNull,
      represent: {
        canonical: function() {
          return "~";
        },
        lowercase: function() {
          return "null";
        },
        uppercase: function() {
          return "NULL";
        },
        camelcase: function() {
          return "Null";
        },
        empty: function() {
          return "";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/bool.js
var require_bool = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/bool.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    function resolveYamlBoolean(data) {
      if (data === null) return false;
      var max = data.length;
      return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
    }
    function constructYamlBoolean(data) {
      return data === "true" || data === "True" || data === "TRUE";
    }
    function isBoolean(object) {
      return Object.prototype.toString.call(object) === "[object Boolean]";
    }
    module2.exports = new Type("tag:yaml.org,2002:bool", {
      kind: "scalar",
      resolve: resolveYamlBoolean,
      construct: constructYamlBoolean,
      predicate: isBoolean,
      represent: {
        lowercase: function(object) {
          return object ? "true" : "false";
        },
        uppercase: function(object) {
          return object ? "TRUE" : "FALSE";
        },
        camelcase: function(object) {
          return object ? "True" : "False";
        }
      },
      defaultStyle: "lowercase"
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/int.js
var require_int = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/int.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var common = require_common();
    var Type = require_type();
    function isHexCode(c) {
      return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
    }
    function isOctCode(c) {
      return 48 <= c && c <= 55;
    }
    function isDecCode(c) {
      return 48 <= c && c <= 57;
    }
    function resolveYamlInteger(data) {
      if (data === null) return false;
      var max = data.length, index = 0, hasDigits = false, ch;
      if (!max) return false;
      ch = data[index];
      if (ch === "-" || ch === "+") {
        ch = data[++index];
      }
      if (ch === "0") {
        if (index + 1 === max) return true;
        ch = data[++index];
        if (ch === "b") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (ch !== "0" && ch !== "1") return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "x") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isHexCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
        if (ch === "o") {
          index++;
          for (; index < max; index++) {
            ch = data[index];
            if (ch === "_") continue;
            if (!isOctCode(data.charCodeAt(index))) return false;
            hasDigits = true;
          }
          return hasDigits && ch !== "_";
        }
      }
      if (ch === "_") return false;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isDecCode(data.charCodeAt(index))) {
          return false;
        }
        hasDigits = true;
      }
      if (!hasDigits || ch === "_") return false;
      return true;
    }
    function constructYamlInteger(data) {
      var value = data, sign = 1, ch;
      if (value.indexOf("_") !== -1) {
        value = value.replace(/_/g, "");
      }
      ch = value[0];
      if (ch === "-" || ch === "+") {
        if (ch === "-") sign = -1;
        value = value.slice(1);
        ch = value[0];
      }
      if (value === "0") return 0;
      if (ch === "0") {
        if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
        if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
        if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
      }
      return sign * parseInt(value, 10);
    }
    function isInteger(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:int", {
      kind: "scalar",
      resolve: resolveYamlInteger,
      construct: constructYamlInteger,
      predicate: isInteger,
      represent: {
        binary: function(obj) {
          return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
        },
        octal: function(obj) {
          return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
        },
        decimal: function(obj) {
          return obj.toString(10);
        },
        /* eslint-disable max-len */
        hexadecimal: function(obj) {
          return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
        }
      },
      defaultStyle: "decimal",
      styleAliases: {
        binary: [2, "bin"],
        octal: [8, "oct"],
        decimal: [10, "dec"],
        hexadecimal: [16, "hex"]
      }
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/float.js
var require_float = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/float.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var common = require_common();
    var Type = require_type();
    var YAML_FLOAT_PATTERN = new RegExp(
      // 2.5e4, 2.5 and integers
      "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
    );
    function resolveYamlFloat(data) {
      if (data === null) return false;
      if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === "_") {
        return false;
      }
      return true;
    }
    function constructYamlFloat(data) {
      var value, sign;
      value = data.replace(/_/g, "").toLowerCase();
      sign = value[0] === "-" ? -1 : 1;
      if ("+-".indexOf(value[0]) >= 0) {
        value = value.slice(1);
      }
      if (value === ".inf") {
        return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      } else if (value === ".nan") {
        return NaN;
      }
      return sign * parseFloat(value, 10);
    }
    var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
    function representYamlFloat(object, style) {
      var res;
      if (isNaN(object)) {
        switch (style) {
          case "lowercase":
            return ".nan";
          case "uppercase":
            return ".NAN";
          case "camelcase":
            return ".NaN";
        }
      } else if (Number.POSITIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return ".inf";
          case "uppercase":
            return ".INF";
          case "camelcase":
            return ".Inf";
        }
      } else if (Number.NEGATIVE_INFINITY === object) {
        switch (style) {
          case "lowercase":
            return "-.inf";
          case "uppercase":
            return "-.INF";
          case "camelcase":
            return "-.Inf";
        }
      } else if (common.isNegativeZero(object)) {
        return "-0.0";
      }
      res = object.toString(10);
      return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
    }
    function isFloat(object) {
      return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
    }
    module2.exports = new Type("tag:yaml.org,2002:float", {
      kind: "scalar",
      resolve: resolveYamlFloat,
      construct: constructYamlFloat,
      predicate: isFloat,
      represent: representYamlFloat,
      defaultStyle: "lowercase"
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/json.js
var require_json = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/json.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    module2.exports = require_failsafe().extend({
      implicit: [
        require_null(),
        require_bool(),
        require_int(),
        require_float()
      ]
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/core.js
var require_core = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/core.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    module2.exports = require_json();
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/timestamp.js
var require_timestamp = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/timestamp.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    var YAML_DATE_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
    );
    var YAML_TIMESTAMP_REGEXP = new RegExp(
      "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
    );
    function resolveYamlTimestamp(data) {
      if (data === null) return false;
      if (YAML_DATE_REGEXP.exec(data) !== null) return true;
      if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
      return false;
    }
    function constructYamlTimestamp(data) {
      var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
      match = YAML_DATE_REGEXP.exec(data);
      if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
      if (match === null) throw new Error("Date resolve error");
      year = +match[1];
      month = +match[2] - 1;
      day = +match[3];
      if (!match[4]) {
        return new Date(Date.UTC(year, month, day));
      }
      hour = +match[4];
      minute = +match[5];
      second = +match[6];
      if (match[7]) {
        fraction = match[7].slice(0, 3);
        while (fraction.length < 3) {
          fraction += "0";
        }
        fraction = +fraction;
      }
      if (match[9]) {
        tz_hour = +match[10];
        tz_minute = +(match[11] || 0);
        delta = (tz_hour * 60 + tz_minute) * 6e4;
        if (match[9] === "-") delta = -delta;
      }
      date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
      if (delta) date.setTime(date.getTime() - delta);
      return date;
    }
    function representYamlTimestamp(object) {
      return object.toISOString();
    }
    module2.exports = new Type("tag:yaml.org,2002:timestamp", {
      kind: "scalar",
      resolve: resolveYamlTimestamp,
      construct: constructYamlTimestamp,
      instanceOf: Date,
      represent: representYamlTimestamp
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/merge.js
var require_merge = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/merge.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    function resolveYamlMerge(data) {
      return data === "<<" || data === null;
    }
    module2.exports = new Type("tag:yaml.org,2002:merge", {
      kind: "scalar",
      resolve: resolveYamlMerge
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/binary.js
var require_binary = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/binary.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
    function resolveYamlBinary(data) {
      if (data === null) return false;
      var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        code = map.indexOf(data.charAt(idx));
        if (code > 64) continue;
        if (code < 0) return false;
        bitlen += 6;
      }
      return bitlen % 8 === 0;
    }
    function constructYamlBinary(data) {
      var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
      for (idx = 0; idx < max; idx++) {
        if (idx % 4 === 0 && idx) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        }
        bits = bits << 6 | map.indexOf(input.charAt(idx));
      }
      tailbits = max % 4 * 6;
      if (tailbits === 0) {
        result.push(bits >> 16 & 255);
        result.push(bits >> 8 & 255);
        result.push(bits & 255);
      } else if (tailbits === 18) {
        result.push(bits >> 10 & 255);
        result.push(bits >> 2 & 255);
      } else if (tailbits === 12) {
        result.push(bits >> 4 & 255);
      }
      return new Uint8Array(result);
    }
    function representYamlBinary(object) {
      var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
      for (idx = 0; idx < max; idx++) {
        if (idx % 3 === 0 && idx) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        }
        bits = (bits << 8) + object[idx];
      }
      tail = max % 3;
      if (tail === 0) {
        result += map[bits >> 18 & 63];
        result += map[bits >> 12 & 63];
        result += map[bits >> 6 & 63];
        result += map[bits & 63];
      } else if (tail === 2) {
        result += map[bits >> 10 & 63];
        result += map[bits >> 4 & 63];
        result += map[bits << 2 & 63];
        result += map[64];
      } else if (tail === 1) {
        result += map[bits >> 2 & 63];
        result += map[bits << 4 & 63];
        result += map[64];
        result += map[64];
      }
      return result;
    }
    function isBinary(obj) {
      return Object.prototype.toString.call(obj) === "[object Uint8Array]";
    }
    module2.exports = new Type("tag:yaml.org,2002:binary", {
      kind: "scalar",
      resolve: resolveYamlBinary,
      construct: constructYamlBinary,
      predicate: isBinary,
      represent: representYamlBinary
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/omap.js
var require_omap = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/omap.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var _toString = Object.prototype.toString;
    function resolveYamlOmap(data) {
      if (data === null) return true;
      var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        pairHasKey = false;
        if (_toString.call(pair) !== "[object Object]") return false;
        for (pairKey in pair) {
          if (_hasOwnProperty.call(pair, pairKey)) {
            if (!pairHasKey) pairHasKey = true;
            else return false;
          }
        }
        if (!pairHasKey) return false;
        if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
        else return false;
      }
      return true;
    }
    function constructYamlOmap(data) {
      return data !== null ? data : [];
    }
    module2.exports = new Type("tag:yaml.org,2002:omap", {
      kind: "sequence",
      resolve: resolveYamlOmap,
      construct: constructYamlOmap
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/pairs.js
var require_pairs = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/pairs.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    var _toString = Object.prototype.toString;
    function resolveYamlPairs(data) {
      if (data === null) return true;
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        if (_toString.call(pair) !== "[object Object]") return false;
        keys = Object.keys(pair);
        if (keys.length !== 1) return false;
        result[index] = [keys[0], pair[keys[0]]];
      }
      return true;
    }
    function constructYamlPairs(data) {
      if (data === null) return [];
      var index, length, pair, keys, result, object = data;
      result = new Array(object.length);
      for (index = 0, length = object.length; index < length; index += 1) {
        pair = object[index];
        keys = Object.keys(pair);
        result[index] = [keys[0], pair[keys[0]]];
      }
      return result;
    }
    module2.exports = new Type("tag:yaml.org,2002:pairs", {
      kind: "sequence",
      resolve: resolveYamlPairs,
      construct: constructYamlPairs
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/set.js
var require_set = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/type/set.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var Type = require_type();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    function resolveYamlSet(data) {
      if (data === null) return true;
      var key, object = data;
      for (key in object) {
        if (_hasOwnProperty.call(object, key)) {
          if (object[key] !== null) return false;
        }
      }
      return true;
    }
    function constructYamlSet(data) {
      return data !== null ? data : {};
    }
    module2.exports = new Type("tag:yaml.org,2002:set", {
      kind: "mapping",
      resolve: resolveYamlSet,
      construct: constructYamlSet
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/default.js
var require_default = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/schema/default.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    module2.exports = require_core().extend({
      implicit: [
        require_timestamp(),
        require_merge()
      ],
      explicit: [
        require_binary(),
        require_omap(),
        require_pairs(),
        require_set()
      ]
    });
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/loader.js
var require_loader = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/loader.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var common = require_common();
    var YAMLException = require_exception();
    var makeSnippet = require_snippet();
    var DEFAULT_SCHEMA = require_default();
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CONTEXT_FLOW_IN = 1;
    var CONTEXT_FLOW_OUT = 2;
    var CONTEXT_BLOCK_IN = 3;
    var CONTEXT_BLOCK_OUT = 4;
    var CHOMPING_CLIP = 1;
    var CHOMPING_STRIP = 2;
    var CHOMPING_KEEP = 3;
    var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
    var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
    var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
    var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
    var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
    function _class(obj) {
      return Object.prototype.toString.call(obj);
    }
    function is_EOL(c) {
      return c === 10 || c === 13;
    }
    function is_WHITE_SPACE(c) {
      return c === 9 || c === 32;
    }
    function is_WS_OR_EOL(c) {
      return c === 9 || c === 32 || c === 10 || c === 13;
    }
    function is_FLOW_INDICATOR(c) {
      return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
    }
    function fromHexCode(c) {
      var lc;
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      lc = c | 32;
      if (97 <= lc && lc <= 102) {
        return lc - 97 + 10;
      }
      return -1;
    }
    function escapedHexLen(c) {
      if (c === 120) {
        return 2;
      }
      if (c === 117) {
        return 4;
      }
      if (c === 85) {
        return 8;
      }
      return 0;
    }
    function fromDecimalCode(c) {
      if (48 <= c && c <= 57) {
        return c - 48;
      }
      return -1;
    }
    function simpleEscapeSequence(c) {
      return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
    }
    function charFromCodepoint(c) {
      if (c <= 65535) {
        return String.fromCharCode(c);
      }
      return String.fromCharCode(
        (c - 65536 >> 10) + 55296,
        (c - 65536 & 1023) + 56320
      );
    }
    function setProperty(object, key, value) {
      if (key === "__proto__") {
        Object.defineProperty(object, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value
        });
      } else {
        object[key] = value;
      }
    }
    var simpleEscapeCheck = new Array(256);
    var simpleEscapeMap = new Array(256);
    for (i = 0; i < 256; i++) {
      simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
      simpleEscapeMap[i] = simpleEscapeSequence(i);
    }
    var i;
    function State(input, options) {
      this.input = input;
      this.filename = options["filename"] || null;
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.onWarning = options["onWarning"] || null;
      this.legacy = options["legacy"] || false;
      this.json = options["json"] || false;
      this.listener = options["listener"] || null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.typeMap = this.schema.compiledTypeMap;
      this.length = input.length;
      this.position = 0;
      this.line = 0;
      this.lineStart = 0;
      this.lineIndent = 0;
      this.firstTabInLine = -1;
      this.documents = [];
    }
    function generateError(state, message) {
      var mark = {
        name: state.filename,
        buffer: state.input.slice(0, -1),
        // omit trailing \0
        position: state.position,
        line: state.line,
        column: state.position - state.lineStart
      };
      mark.snippet = makeSnippet(mark);
      return new YAMLException(message, mark);
    }
    function throwError(state, message) {
      throw generateError(state, message);
    }
    function throwWarning(state, message) {
      if (state.onWarning) {
        state.onWarning.call(null, generateError(state, message));
      }
    }
    var directiveHandlers = {
      YAML: function handleYamlDirective(state, name, args) {
        var match, major, minor;
        if (state.version !== null) {
          throwError(state, "duplication of %YAML directive");
        }
        if (args.length !== 1) {
          throwError(state, "YAML directive accepts exactly one argument");
        }
        match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
        if (match === null) {
          throwError(state, "ill-formed argument of the YAML directive");
        }
        major = parseInt(match[1], 10);
        minor = parseInt(match[2], 10);
        if (major !== 1) {
          throwError(state, "unacceptable YAML version of the document");
        }
        state.version = args[0];
        state.checkLineBreaks = minor < 2;
        if (minor !== 1 && minor !== 2) {
          throwWarning(state, "unsupported YAML version of the document");
        }
      },
      TAG: function handleTagDirective(state, name, args) {
        var handle, prefix;
        if (args.length !== 2) {
          throwError(state, "TAG directive accepts exactly two arguments");
        }
        handle = args[0];
        prefix = args[1];
        if (!PATTERN_TAG_HANDLE.test(handle)) {
          throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
        }
        if (_hasOwnProperty.call(state.tagMap, handle)) {
          throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
        }
        if (!PATTERN_TAG_URI.test(prefix)) {
          throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
        }
        try {
          prefix = decodeURIComponent(prefix);
        } catch (err) {
          throwError(state, "tag prefix is malformed: " + prefix);
        }
        state.tagMap[handle] = prefix;
      }
    };
    function captureSegment(state, start, end, checkJson) {
      var _position, _length, _character, _result;
      if (start < end) {
        _result = state.input.slice(start, end);
        if (checkJson) {
          for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
            _character = _result.charCodeAt(_position);
            if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
              throwError(state, "expected valid JSON character");
            }
          }
        } else if (PATTERN_NON_PRINTABLE.test(_result)) {
          throwError(state, "the stream contains non-printable characters");
        }
        state.result += _result;
      }
    }
    function mergeMappings(state, destination, source, overridableKeys) {
      var sourceKeys, key, index, quantity;
      if (!common.isObject(source)) {
        throwError(state, "cannot merge mappings; the provided source object is unacceptable");
      }
      sourceKeys = Object.keys(source);
      for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
        key = sourceKeys[index];
        if (!_hasOwnProperty.call(destination, key)) {
          setProperty(destination, key, source[key]);
          overridableKeys[key] = true;
        }
      }
    }
    function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
      var index, quantity;
      if (Array.isArray(keyNode)) {
        keyNode = Array.prototype.slice.call(keyNode);
        for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
          if (Array.isArray(keyNode[index])) {
            throwError(state, "nested arrays are not supported inside keys");
          }
          if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
            keyNode[index] = "[object Object]";
          }
        }
      }
      if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
        keyNode = "[object Object]";
      }
      keyNode = String(keyNode);
      if (_result === null) {
        _result = {};
      }
      if (keyTag === "tag:yaml.org,2002:merge") {
        if (Array.isArray(valueNode)) {
          for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
            mergeMappings(state, _result, valueNode[index], overridableKeys);
          }
        } else {
          mergeMappings(state, _result, valueNode, overridableKeys);
        }
      } else {
        if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
          state.line = startLine || state.line;
          state.lineStart = startLineStart || state.lineStart;
          state.position = startPos || state.position;
          throwError(state, "duplicated mapping key");
        }
        setProperty(_result, keyNode, valueNode);
        delete overridableKeys[keyNode];
      }
      return _result;
    }
    function readLineBreak(state) {
      var ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 10) {
        state.position++;
      } else if (ch === 13) {
        state.position++;
        if (state.input.charCodeAt(state.position) === 10) {
          state.position++;
        }
      } else {
        throwError(state, "a line break is expected");
      }
      state.line += 1;
      state.lineStart = state.position;
      state.firstTabInLine = -1;
    }
    function skipSeparationSpace(state, allowComments, checkIndent) {
      var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          if (ch === 9 && state.firstTabInLine === -1) {
            state.firstTabInLine = state.position;
          }
          ch = state.input.charCodeAt(++state.position);
        }
        if (allowComments && ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 10 && ch !== 13 && ch !== 0);
        }
        if (is_EOL(ch)) {
          readLineBreak(state);
          ch = state.input.charCodeAt(state.position);
          lineBreaks++;
          state.lineIndent = 0;
          while (ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
        } else {
          break;
        }
      }
      if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
        throwWarning(state, "deficient indentation");
      }
      return lineBreaks;
    }
    function testDocumentSeparator(state) {
      var _position = state.position, ch;
      ch = state.input.charCodeAt(_position);
      if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
        _position += 3;
        ch = state.input.charCodeAt(_position);
        if (ch === 0 || is_WS_OR_EOL(ch)) {
          return true;
        }
      }
      return false;
    }
    function writeFoldedLines(state, count) {
      if (count === 1) {
        state.result += " ";
      } else if (count > 1) {
        state.result += common.repeat("\n", count - 1);
      }
    }
    function readPlainScalar(state, nodeIndent, withinFlowCollection) {
      var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
      ch = state.input.charCodeAt(state.position);
      if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
        return false;
      }
      if (ch === 63 || ch === 45) {
        following = state.input.charCodeAt(state.position + 1);
        if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
          return false;
        }
      }
      state.kind = "scalar";
      state.result = "";
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
      while (ch !== 0) {
        if (ch === 58) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            break;
          }
        } else if (ch === 35) {
          preceding = state.input.charCodeAt(state.position - 1);
          if (is_WS_OR_EOL(preceding)) {
            break;
          }
        } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
          break;
        } else if (is_EOL(ch)) {
          _line = state.line;
          _lineStart = state.lineStart;
          _lineIndent = state.lineIndent;
          skipSeparationSpace(state, false, -1);
          if (state.lineIndent >= nodeIndent) {
            hasPendingContent = true;
            ch = state.input.charCodeAt(state.position);
            continue;
          } else {
            state.position = captureEnd;
            state.line = _line;
            state.lineStart = _lineStart;
            state.lineIndent = _lineIndent;
            break;
          }
        }
        if (hasPendingContent) {
          captureSegment(state, captureStart, captureEnd, false);
          writeFoldedLines(state, state.line - _line);
          captureStart = captureEnd = state.position;
          hasPendingContent = false;
        }
        if (!is_WHITE_SPACE(ch)) {
          captureEnd = state.position + 1;
        }
        ch = state.input.charCodeAt(++state.position);
      }
      captureSegment(state, captureStart, captureEnd, false);
      if (state.result) {
        return true;
      }
      state.kind = _kind;
      state.result = _result;
      return false;
    }
    function readSingleQuotedScalar(state, nodeIndent) {
      var ch, captureStart, captureEnd;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 39) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 39) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (ch === 39) {
            captureStart = state.position;
            state.position++;
            captureEnd = state.position;
          } else {
            return true;
          }
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a single quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a single quoted scalar");
    }
    function readDoubleQuotedScalar(state, nodeIndent) {
      var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 34) {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      state.position++;
      captureStart = captureEnd = state.position;
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        if (ch === 34) {
          captureSegment(state, captureStart, state.position, true);
          state.position++;
          return true;
        } else if (ch === 92) {
          captureSegment(state, captureStart, state.position, true);
          ch = state.input.charCodeAt(++state.position);
          if (is_EOL(ch)) {
            skipSeparationSpace(state, false, nodeIndent);
          } else if (ch < 256 && simpleEscapeCheck[ch]) {
            state.result += simpleEscapeMap[ch];
            state.position++;
          } else if ((tmp = escapedHexLen(ch)) > 0) {
            hexLength = tmp;
            hexResult = 0;
            for (; hexLength > 0; hexLength--) {
              ch = state.input.charCodeAt(++state.position);
              if ((tmp = fromHexCode(ch)) >= 0) {
                hexResult = (hexResult << 4) + tmp;
              } else {
                throwError(state, "expected hexadecimal character");
              }
            }
            state.result += charFromCodepoint(hexResult);
            state.position++;
          } else {
            throwError(state, "unknown escape sequence");
          }
          captureStart = captureEnd = state.position;
        } else if (is_EOL(ch)) {
          captureSegment(state, captureStart, captureEnd, true);
          writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
          captureStart = captureEnd = state.position;
        } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
          throwError(state, "unexpected end of the document within a double quoted scalar");
        } else {
          state.position++;
          captureEnd = state.position;
        }
      }
      throwError(state, "unexpected end of the stream within a double quoted scalar");
    }
    function readFlowCollection(state, nodeIndent) {
      var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 91) {
        terminator = 93;
        isMapping = false;
        _result = [];
      } else if (ch === 123) {
        terminator = 125;
        isMapping = true;
        _result = {};
      } else {
        return false;
      }
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(++state.position);
      while (ch !== 0) {
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === terminator) {
          state.position++;
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = isMapping ? "mapping" : "sequence";
          state.result = _result;
          return true;
        } else if (!readNext) {
          throwError(state, "missed comma between flow collection entries");
        } else if (ch === 44) {
          throwError(state, "expected the node content, but found ','");
        }
        keyTag = keyNode = valueNode = null;
        isPair = isExplicitPair = false;
        if (ch === 63) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following)) {
            isPair = isExplicitPair = true;
            state.position++;
            skipSeparationSpace(state, true, nodeIndent);
          }
        }
        _line = state.line;
        _lineStart = state.lineStart;
        _pos = state.position;
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        keyTag = state.tag;
        keyNode = state.result;
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if ((isExplicitPair || state.line === _line) && ch === 58) {
          isPair = true;
          ch = state.input.charCodeAt(++state.position);
          skipSeparationSpace(state, true, nodeIndent);
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          valueNode = state.result;
        }
        if (isMapping) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
        } else if (isPair) {
          _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
        } else {
          _result.push(keyNode);
        }
        skipSeparationSpace(state, true, nodeIndent);
        ch = state.input.charCodeAt(state.position);
        if (ch === 44) {
          readNext = true;
          ch = state.input.charCodeAt(++state.position);
        } else {
          readNext = false;
        }
      }
      throwError(state, "unexpected end of the stream within a flow collection");
    }
    function readBlockScalar(state, nodeIndent) {
      var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch === 124) {
        folding = false;
      } else if (ch === 62) {
        folding = true;
      } else {
        return false;
      }
      state.kind = "scalar";
      state.result = "";
      while (ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
        if (ch === 43 || ch === 45) {
          if (CHOMPING_CLIP === chomping) {
            chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
          } else {
            throwError(state, "repeat of a chomping mode identifier");
          }
        } else if ((tmp = fromDecimalCode(ch)) >= 0) {
          if (tmp === 0) {
            throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
          } else if (!detectedIndent) {
            textIndent = nodeIndent + tmp - 1;
            detectedIndent = true;
          } else {
            throwError(state, "repeat of an indentation width identifier");
          }
        } else {
          break;
        }
      }
      if (is_WHITE_SPACE(ch)) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (is_WHITE_SPACE(ch));
        if (ch === 35) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (!is_EOL(ch) && ch !== 0);
        }
      }
      while (ch !== 0) {
        readLineBreak(state);
        state.lineIndent = 0;
        ch = state.input.charCodeAt(state.position);
        while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
        if (!detectedIndent && state.lineIndent > textIndent) {
          textIndent = state.lineIndent;
        }
        if (is_EOL(ch)) {
          emptyLines++;
          continue;
        }
        if (state.lineIndent < textIndent) {
          if (chomping === CHOMPING_KEEP) {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (chomping === CHOMPING_CLIP) {
            if (didReadContent) {
              state.result += "\n";
            }
          }
          break;
        }
        if (folding) {
          if (is_WHITE_SPACE(ch)) {
            atMoreIndented = true;
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          } else if (atMoreIndented) {
            atMoreIndented = false;
            state.result += common.repeat("\n", emptyLines + 1);
          } else if (emptyLines === 0) {
            if (didReadContent) {
              state.result += " ";
            }
          } else {
            state.result += common.repeat("\n", emptyLines);
          }
        } else {
          state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
        }
        didReadContent = true;
        detectedIndent = true;
        emptyLines = 0;
        captureStart = state.position;
        while (!is_EOL(ch) && ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, state.position, false);
      }
      return true;
    }
    function readBlockSequence(state, nodeIndent) {
      var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        if (ch !== 45) {
          break;
        }
        following = state.input.charCodeAt(state.position + 1);
        if (!is_WS_OR_EOL(following)) {
          break;
        }
        detected = true;
        state.position++;
        if (skipSeparationSpace(state, true, -1)) {
          if (state.lineIndent <= nodeIndent) {
            _result.push(null);
            ch = state.input.charCodeAt(state.position);
            continue;
          }
        }
        _line = state.line;
        composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
        _result.push(state.result);
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a sequence entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "sequence";
        state.result = _result;
        return true;
      }
      return false;
    }
    function readBlockMapping(state, nodeIndent, flowIndent) {
      var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
      if (state.firstTabInLine !== -1) return false;
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = _result;
      }
      ch = state.input.charCodeAt(state.position);
      while (ch !== 0) {
        if (!atExplicitKey && state.firstTabInLine !== -1) {
          state.position = state.firstTabInLine;
          throwError(state, "tab characters must not be used in indentation");
        }
        following = state.input.charCodeAt(state.position + 1);
        _line = state.line;
        if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
          if (ch === 63) {
            if (atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            detected = true;
            atExplicitKey = true;
            allowCompact = true;
          } else if (atExplicitKey) {
            atExplicitKey = false;
            allowCompact = true;
          } else {
            throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
          }
          state.position += 1;
          ch = following;
        } else {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
          if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
            break;
          }
          if (state.line === _line) {
            ch = state.input.charCodeAt(state.position);
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 58) {
              ch = state.input.charCodeAt(++state.position);
              if (!is_WS_OR_EOL(ch)) {
                throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
              }
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = false;
              allowCompact = false;
              keyTag = state.tag;
              keyNode = state.result;
            } else if (detected) {
              throwError(state, "can not read an implicit mapping pair; a colon is missed");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          } else if (detected) {
            throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true;
          }
        }
        if (state.line === _line || state.lineIndent > nodeIndent) {
          if (atExplicitKey) {
            _keyLine = state.line;
            _keyLineStart = state.lineStart;
            _keyPos = state.position;
          }
          if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
            if (atExplicitKey) {
              keyNode = state.result;
            } else {
              valueNode = state.result;
            }
          }
          if (!atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
        }
        if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
          throwError(state, "bad indentation of a mapping entry");
        } else if (state.lineIndent < nodeIndent) {
          break;
        }
      }
      if (atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
      }
      if (detected) {
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = "mapping";
        state.result = _result;
      }
      return detected;
    }
    function readTagProperty(state) {
      var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 33) return false;
      if (state.tag !== null) {
        throwError(state, "duplication of a tag property");
      }
      ch = state.input.charCodeAt(++state.position);
      if (ch === 60) {
        isVerbatim = true;
        ch = state.input.charCodeAt(++state.position);
      } else if (ch === 33) {
        isNamed = true;
        tagHandle = "!!";
        ch = state.input.charCodeAt(++state.position);
      } else {
        tagHandle = "!";
      }
      _position = state.position;
      if (isVerbatim) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && ch !== 62);
        if (state.position < state.length) {
          tagName = state.input.slice(_position, state.position);
          ch = state.input.charCodeAt(++state.position);
        } else {
          throwError(state, "unexpected end of the stream within a verbatim tag");
        }
      } else {
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          if (ch === 33) {
            if (!isNamed) {
              tagHandle = state.input.slice(_position - 1, state.position + 1);
              if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                throwError(state, "named tag handle cannot contain such characters");
              }
              isNamed = true;
              _position = state.position + 1;
            } else {
              throwError(state, "tag suffix cannot contain exclamation marks");
            }
          }
          ch = state.input.charCodeAt(++state.position);
        }
        tagName = state.input.slice(_position, state.position);
        if (PATTERN_FLOW_INDICATORS.test(tagName)) {
          throwError(state, "tag suffix cannot contain flow indicator characters");
        }
      }
      if (tagName && !PATTERN_TAG_URI.test(tagName)) {
        throwError(state, "tag name cannot contain such characters: " + tagName);
      }
      try {
        tagName = decodeURIComponent(tagName);
      } catch (err) {
        throwError(state, "tag name is malformed: " + tagName);
      }
      if (isVerbatim) {
        state.tag = tagName;
      } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
        state.tag = state.tagMap[tagHandle] + tagName;
      } else if (tagHandle === "!") {
        state.tag = "!" + tagName;
      } else if (tagHandle === "!!") {
        state.tag = "tag:yaml.org,2002:" + tagName;
      } else {
        throwError(state, 'undeclared tag handle "' + tagHandle + '"');
      }
      return true;
    }
    function readAnchorProperty(state) {
      var _position, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 38) return false;
      if (state.anchor !== null) {
        throwError(state, "duplication of an anchor property");
      }
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an anchor node must contain at least one character");
      }
      state.anchor = state.input.slice(_position, state.position);
      return true;
    }
    function readAlias(state) {
      var _position, alias, ch;
      ch = state.input.charCodeAt(state.position);
      if (ch !== 42) return false;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (state.position === _position) {
        throwError(state, "name of an alias node must contain at least one character");
      }
      alias = state.input.slice(_position, state.position);
      if (!_hasOwnProperty.call(state.anchorMap, alias)) {
        throwError(state, 'unidentified alias "' + alias + '"');
      }
      state.result = state.anchorMap[alias];
      skipSeparationSpace(state, true, -1);
      return true;
    }
    function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
      var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type, flowIndent, blockIndent;
      if (state.listener !== null) {
        state.listener("open", state);
      }
      state.tag = null;
      state.anchor = null;
      state.kind = null;
      state.result = null;
      allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
      if (allowToSeek) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        }
      }
      if (indentStatus === 1) {
        while (readTagProperty(state) || readAnchorProperty(state)) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            allowBlockCollections = allowBlockStyles;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          } else {
            allowBlockCollections = false;
          }
        }
      }
      if (allowBlockCollections) {
        allowBlockCollections = atNewLine || allowCompact;
      }
      if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
        if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
          flowIndent = parentIndent;
        } else {
          flowIndent = parentIndent + 1;
        }
        blockIndent = state.position - state.lineStart;
        if (indentStatus === 1) {
          if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
            hasContent = true;
          } else {
            if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
              hasContent = true;
            } else if (readAlias(state)) {
              hasContent = true;
              if (state.tag !== null || state.anchor !== null) {
                throwError(state, "alias node should not have any properties");
              }
            } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
              hasContent = true;
              if (state.tag === null) {
                state.tag = "?";
              }
            }
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        } else if (indentStatus === 0) {
          hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
        }
      }
      if (state.tag === null) {
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      } else if (state.tag === "?") {
        if (state.result !== null && state.kind !== "scalar") {
          throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
        }
        for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
          type = state.implicitTypes[typeIndex];
          if (type.resolve(state.result)) {
            state.result = type.construct(state.result);
            state.tag = type.tag;
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
            break;
          }
        }
      } else if (state.tag !== "!") {
        if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
          type = state.typeMap[state.kind || "fallback"][state.tag];
        } else {
          type = null;
          typeList = state.typeMap.multi[state.kind || "fallback"];
          for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
            if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
              type = typeList[typeIndex];
              break;
            }
          }
        }
        if (!type) {
          throwError(state, "unknown tag !<" + state.tag + ">");
        }
        if (state.result !== null && type.kind !== state.kind) {
          throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
        }
        if (!type.resolve(state.result, state.tag)) {
          throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
        } else {
          state.result = type.construct(state.result, state.tag);
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      }
      if (state.listener !== null) {
        state.listener("close", state);
      }
      return state.tag !== null || state.anchor !== null || hasContent;
    }
    function readDocument(state) {
      var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
      state.version = null;
      state.checkLineBreaks = state.legacy;
      state.tagMap = /* @__PURE__ */ Object.create(null);
      state.anchorMap = /* @__PURE__ */ Object.create(null);
      while ((ch = state.input.charCodeAt(state.position)) !== 0) {
        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
        if (state.lineIndent > 0 || ch !== 37) {
          break;
        }
        hasDirectives = true;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        directiveName = state.input.slice(_position, state.position);
        directiveArgs = [];
        if (directiveName.length < 1) {
          throwError(state, "directive name must not be less than one character in length");
        }
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 0 && !is_EOL(ch));
            break;
          }
          if (is_EOL(ch)) break;
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveArgs.push(state.input.slice(_position, state.position));
        }
        if (ch !== 0) readLineBreak(state);
        if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
          directiveHandlers[directiveName](state, directiveName, directiveArgs);
        } else {
          throwWarning(state, 'unknown document directive "' + directiveName + '"');
        }
      }
      skipSeparationSpace(state, true, -1);
      if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      } else if (hasDirectives) {
        throwError(state, "directives end mark is expected");
      }
      composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
      skipSeparationSpace(state, true, -1);
      if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
        throwWarning(state, "non-ASCII line breaks are interpreted as content");
      }
      state.documents.push(state.result);
      if (state.position === state.lineStart && testDocumentSeparator(state)) {
        if (state.input.charCodeAt(state.position) === 46) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        }
        return;
      }
      if (state.position < state.length - 1) {
        throwError(state, "end of the stream or a document separator is expected");
      } else {
        return;
      }
    }
    function loadDocuments(input, options) {
      input = String(input);
      options = options || {};
      if (input.length !== 0) {
        if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
          input += "\n";
        }
        if (input.charCodeAt(0) === 65279) {
          input = input.slice(1);
        }
      }
      var state = new State(input, options);
      var nullpos = input.indexOf("\0");
      if (nullpos !== -1) {
        state.position = nullpos;
        throwError(state, "null byte is not allowed in input");
      }
      state.input += "\0";
      while (state.input.charCodeAt(state.position) === 32) {
        state.lineIndent += 1;
        state.position += 1;
      }
      while (state.position < state.length - 1) {
        readDocument(state);
      }
      return state.documents;
    }
    function loadAll(input, iterator, options) {
      if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
        options = iterator;
        iterator = null;
      }
      var documents = loadDocuments(input, options);
      if (typeof iterator !== "function") {
        return documents;
      }
      for (var index = 0, length = documents.length; index < length; index += 1) {
        iterator(documents[index]);
      }
    }
    function load(input, options) {
      var documents = loadDocuments(input, options);
      if (documents.length === 0) {
        return void 0;
      } else if (documents.length === 1) {
        return documents[0];
      }
      throw new YAMLException("expected a single document in the stream, but found more");
    }
    module2.exports.loadAll = loadAll;
    module2.exports.load = load;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/dumper.js
var require_dumper = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/lib/dumper.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var common = require_common();
    var YAMLException = require_exception();
    var DEFAULT_SCHEMA = require_default();
    var _toString = Object.prototype.toString;
    var _hasOwnProperty = Object.prototype.hasOwnProperty;
    var CHAR_BOM = 65279;
    var CHAR_TAB = 9;
    var CHAR_LINE_FEED = 10;
    var CHAR_CARRIAGE_RETURN = 13;
    var CHAR_SPACE = 32;
    var CHAR_EXCLAMATION = 33;
    var CHAR_DOUBLE_QUOTE = 34;
    var CHAR_SHARP = 35;
    var CHAR_PERCENT = 37;
    var CHAR_AMPERSAND = 38;
    var CHAR_SINGLE_QUOTE = 39;
    var CHAR_ASTERISK = 42;
    var CHAR_COMMA = 44;
    var CHAR_MINUS = 45;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_GREATER_THAN = 62;
    var CHAR_QUESTION = 63;
    var CHAR_COMMERCIAL_AT = 64;
    var CHAR_LEFT_SQUARE_BRACKET = 91;
    var CHAR_RIGHT_SQUARE_BRACKET = 93;
    var CHAR_GRAVE_ACCENT = 96;
    var CHAR_LEFT_CURLY_BRACKET = 123;
    var CHAR_VERTICAL_LINE = 124;
    var CHAR_RIGHT_CURLY_BRACKET = 125;
    var ESCAPE_SEQUENCES = {};
    ESCAPE_SEQUENCES[0] = "\\0";
    ESCAPE_SEQUENCES[7] = "\\a";
    ESCAPE_SEQUENCES[8] = "\\b";
    ESCAPE_SEQUENCES[9] = "\\t";
    ESCAPE_SEQUENCES[10] = "\\n";
    ESCAPE_SEQUENCES[11] = "\\v";
    ESCAPE_SEQUENCES[12] = "\\f";
    ESCAPE_SEQUENCES[13] = "\\r";
    ESCAPE_SEQUENCES[27] = "\\e";
    ESCAPE_SEQUENCES[34] = '\\"';
    ESCAPE_SEQUENCES[92] = "\\\\";
    ESCAPE_SEQUENCES[133] = "\\N";
    ESCAPE_SEQUENCES[160] = "\\_";
    ESCAPE_SEQUENCES[8232] = "\\L";
    ESCAPE_SEQUENCES[8233] = "\\P";
    var DEPRECATED_BOOLEANS_SYNTAX = [
      "y",
      "Y",
      "yes",
      "Yes",
      "YES",
      "on",
      "On",
      "ON",
      "n",
      "N",
      "no",
      "No",
      "NO",
      "off",
      "Off",
      "OFF"
    ];
    var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
    function compileStyleMap(schema, map) {
      var result, keys, index, length, tag, style, type;
      if (map === null) return {};
      result = {};
      keys = Object.keys(map);
      for (index = 0, length = keys.length; index < length; index += 1) {
        tag = keys[index];
        style = String(map[tag]);
        if (tag.slice(0, 2) === "!!") {
          tag = "tag:yaml.org,2002:" + tag.slice(2);
        }
        type = schema.compiledTypeMap["fallback"][tag];
        if (type && _hasOwnProperty.call(type.styleAliases, style)) {
          style = type.styleAliases[style];
        }
        result[tag] = style;
      }
      return result;
    }
    function encodeHex(character) {
      var string, handle, length;
      string = character.toString(16).toUpperCase();
      if (character <= 255) {
        handle = "x";
        length = 2;
      } else if (character <= 65535) {
        handle = "u";
        length = 4;
      } else if (character <= 4294967295) {
        handle = "U";
        length = 8;
      } else {
        throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
      }
      return "\\" + handle + common.repeat("0", length - string.length) + string;
    }
    var QUOTING_TYPE_SINGLE = 1;
    var QUOTING_TYPE_DOUBLE = 2;
    function State(options) {
      this.schema = options["schema"] || DEFAULT_SCHEMA;
      this.indent = Math.max(1, options["indent"] || 2);
      this.noArrayIndent = options["noArrayIndent"] || false;
      this.skipInvalid = options["skipInvalid"] || false;
      this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
      this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
      this.sortKeys = options["sortKeys"] || false;
      this.lineWidth = options["lineWidth"] || 80;
      this.noRefs = options["noRefs"] || false;
      this.noCompatMode = options["noCompatMode"] || false;
      this.condenseFlow = options["condenseFlow"] || false;
      this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
      this.forceQuotes = options["forceQuotes"] || false;
      this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
      this.implicitTypes = this.schema.compiledImplicit;
      this.explicitTypes = this.schema.compiledExplicit;
      this.tag = null;
      this.result = "";
      this.duplicates = [];
      this.usedDuplicates = null;
    }
    function indentString(string, spaces) {
      var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
      while (position < length) {
        next = string.indexOf("\n", position);
        if (next === -1) {
          line = string.slice(position);
          position = length;
        } else {
          line = string.slice(position, next + 1);
          position = next + 1;
        }
        if (line.length && line !== "\n") result += ind;
        result += line;
      }
      return result;
    }
    function generateNextLine(state, level) {
      return "\n" + common.repeat(" ", state.indent * level);
    }
    function testImplicitResolving(state, str) {
      var index, length, type;
      for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
        type = state.implicitTypes[index];
        if (type.resolve(str)) {
          return true;
        }
      }
      return false;
    }
    function isWhitespace(c) {
      return c === CHAR_SPACE || c === CHAR_TAB;
    }
    function isPrintable(c) {
      return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
    }
    function isNsCharOrWhitespace(c) {
      return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
    }
    function isPlainSafe(c, prev, inblock) {
      var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
      var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
      return (
        // ns-plain-safe
        (inblock ? (
          // c = flow-in
          cIsNsCharOrWhitespace
        ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
      );
    }
    function isPlainSafeFirst(c) {
      return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
    }
    function isPlainSafeLast(c) {
      return !isWhitespace(c) && c !== CHAR_COLON;
    }
    function codePointAt(string, pos) {
      var first = string.charCodeAt(pos), second;
      if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
        second = string.charCodeAt(pos + 1);
        if (second >= 56320 && second <= 57343) {
          return (first - 55296) * 1024 + second - 56320 + 65536;
        }
      }
      return first;
    }
    function needIndentIndicator(string) {
      var leadingSpaceRe = /^\n* /;
      return leadingSpaceRe.test(string);
    }
    var STYLE_PLAIN = 1;
    var STYLE_SINGLE = 2;
    var STYLE_LITERAL = 3;
    var STYLE_FOLDED = 4;
    var STYLE_DOUBLE = 5;
    function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
      var i;
      var char = 0;
      var prevChar = null;
      var hasLineBreak = false;
      var hasFoldableLine = false;
      var shouldTrackWidth = lineWidth !== -1;
      var previousLineBreak = -1;
      var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
      if (singleLineOnly || forceQuotes) {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
      } else {
        for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          if (char === CHAR_LINE_FEED) {
            hasLineBreak = true;
            if (shouldTrackWidth) {
              hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
              i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
              previousLineBreak = i;
            }
          } else if (!isPrintable(char)) {
            return STYLE_DOUBLE;
          }
          plain = plain && isPlainSafe(char, prevChar, inblock);
          prevChar = char;
        }
        hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
      }
      if (!hasLineBreak && !hasFoldableLine) {
        if (plain && !forceQuotes && !testAmbiguousType(string)) {
          return STYLE_PLAIN;
        }
        return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
      }
      if (indentPerLevel > 9 && needIndentIndicator(string)) {
        return STYLE_DOUBLE;
      }
      if (!forceQuotes) {
        return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    function writeScalar(state, string, level, iskey, inblock) {
      state.dump = (function() {
        if (string.length === 0) {
          return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
        }
        if (!state.noCompatMode) {
          if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
            return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
          }
        }
        var indent = state.indent * Math.max(1, level);
        var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
        var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
        function testAmbiguity(string2) {
          return testImplicitResolving(state, string2);
        }
        switch (chooseScalarStyle(
          string,
          singleLineOnly,
          state.indent,
          lineWidth,
          testAmbiguity,
          state.quotingType,
          state.forceQuotes && !iskey,
          inblock
        )) {
          case STYLE_PLAIN:
            return string;
          case STYLE_SINGLE:
            return "'" + string.replace(/'/g, "''") + "'";
          case STYLE_LITERAL:
            return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
          case STYLE_FOLDED:
            return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
          case STYLE_DOUBLE:
            return '"' + escapeString(string, lineWidth) + '"';
          default:
            throw new YAMLException("impossible error: invalid scalar style");
        }
      })();
    }
    function blockHeader(string, indentPerLevel) {
      var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
      var clip = string[string.length - 1] === "\n";
      var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
      var chomp = keep ? "+" : clip ? "" : "-";
      return indentIndicator + chomp + "\n";
    }
    function dropEndingNewline(string) {
      return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
    }
    function foldString(string, width) {
      var lineRe = /(\n+)([^\n]*)/g;
      var result = (function() {
        var nextLF = string.indexOf("\n");
        nextLF = nextLF !== -1 ? nextLF : string.length;
        lineRe.lastIndex = nextLF;
        return foldLine(string.slice(0, nextLF), width);
      })();
      var prevMoreIndented = string[0] === "\n" || string[0] === " ";
      var moreIndented;
      var match;
      while (match = lineRe.exec(string)) {
        var prefix = match[1], line = match[2];
        moreIndented = line[0] === " ";
        result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
        prevMoreIndented = moreIndented;
      }
      return result;
    }
    function foldLine(line, width) {
      if (line === "" || line[0] === " ") return line;
      var breakRe = / [^ ]/g;
      var match;
      var start = 0, end, curr = 0, next = 0;
      var result = "";
      while (match = breakRe.exec(line)) {
        next = match.index;
        if (next - start > width) {
          end = curr > start ? curr : next;
          result += "\n" + line.slice(start, end);
          start = end + 1;
        }
        curr = next;
      }
      result += "\n";
      if (line.length - start > width && curr > start) {
        result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
      } else {
        result += line.slice(start);
      }
      return result.slice(1);
    }
    function escapeString(string) {
      var result = "";
      var char = 0;
      var escapeSeq;
      for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
        char = codePointAt(string, i);
        escapeSeq = ESCAPE_SEQUENCES[char];
        if (!escapeSeq && isPrintable(char)) {
          result += string[i];
          if (char >= 65536) result += string[i + 1];
        } else {
          result += escapeSeq || encodeHex(char);
        }
      }
      return result;
    }
    function writeFlowSequence(state, level, object) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
          if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = "[" + _result + "]";
    }
    function writeBlockSequence(state, level, object, compact) {
      var _result = "", _tag = state.tag, index, length, value;
      for (index = 0, length = object.length; index < length; index += 1) {
        value = object[index];
        if (state.replacer) {
          value = state.replacer.call(object, String(index), value);
        }
        if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
          if (!compact || _result !== "") {
            _result += generateNextLine(state, level);
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            _result += "-";
          } else {
            _result += "- ";
          }
          _result += state.dump;
        }
      }
      state.tag = _tag;
      state.dump = _result || "[]";
    }
    function writeFlowMapping(state, level, object) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (_result !== "") pairBuffer += ", ";
        if (state.condenseFlow) pairBuffer += '"';
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level, objectKey, false, false)) {
          continue;
        }
        if (state.dump.length > 1024) pairBuffer += "? ";
        pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
        if (!writeNode(state, level, objectValue, false, false)) {
          continue;
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = "{" + _result + "}";
    }
    function writeBlockMapping(state, level, object, compact) {
      var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
      if (state.sortKeys === true) {
        objectKeyList.sort();
      } else if (typeof state.sortKeys === "function") {
        objectKeyList.sort(state.sortKeys);
      } else if (state.sortKeys) {
        throw new YAMLException("sortKeys must be a boolean or a function");
      }
      for (index = 0, length = objectKeyList.length; index < length; index += 1) {
        pairBuffer = "";
        if (!compact || _result !== "") {
          pairBuffer += generateNextLine(state, level);
        }
        objectKey = objectKeyList[index];
        objectValue = object[objectKey];
        if (state.replacer) {
          objectValue = state.replacer.call(object, objectKey, objectValue);
        }
        if (!writeNode(state, level + 1, objectKey, true, true, true)) {
          continue;
        }
        explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
        if (explicitPair) {
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += "?";
          } else {
            pairBuffer += "? ";
          }
        }
        pairBuffer += state.dump;
        if (explicitPair) {
          pairBuffer += generateNextLine(state, level);
        }
        if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
          continue;
        }
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += ":";
        } else {
          pairBuffer += ": ";
        }
        pairBuffer += state.dump;
        _result += pairBuffer;
      }
      state.tag = _tag;
      state.dump = _result || "{}";
    }
    function detectType(state, object, explicit) {
      var _result, typeList, index, length, type, style;
      typeList = explicit ? state.explicitTypes : state.implicitTypes;
      for (index = 0, length = typeList.length; index < length; index += 1) {
        type = typeList[index];
        if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
          if (explicit) {
            if (type.multi && type.representName) {
              state.tag = type.representName(object);
            } else {
              state.tag = type.tag;
            }
          } else {
            state.tag = "?";
          }
          if (type.represent) {
            style = state.styleMap[type.tag] || type.defaultStyle;
            if (_toString.call(type.represent) === "[object Function]") {
              _result = type.represent(object, style);
            } else if (_hasOwnProperty.call(type.represent, style)) {
              _result = type.represent[style](object, style);
            } else {
              throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
            }
            state.dump = _result;
          }
          return true;
        }
      }
      return false;
    }
    function writeNode(state, level, object, block, compact, iskey, isblockseq) {
      state.tag = null;
      state.dump = object;
      if (!detectType(state, object, false)) {
        detectType(state, object, true);
      }
      var type = _toString.call(state.dump);
      var inblock = block;
      var tagStr;
      if (block) {
        block = state.flowLevel < 0 || state.flowLevel > level;
      }
      var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
      if (objectOrArray) {
        duplicateIndex = state.duplicates.indexOf(object);
        duplicate = duplicateIndex !== -1;
      }
      if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
        compact = false;
      }
      if (duplicate && state.usedDuplicates[duplicateIndex]) {
        state.dump = "*ref_" + duplicateIndex;
      } else {
        if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
          state.usedDuplicates[duplicateIndex] = true;
        }
        if (type === "[object Object]") {
          if (block && Object.keys(state.dump).length !== 0) {
            writeBlockMapping(state, level, state.dump, compact);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowMapping(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object Array]") {
          if (block && state.dump.length !== 0) {
            if (state.noArrayIndent && !isblockseq && level > 0) {
              writeBlockSequence(state, level - 1, state.dump, compact);
            } else {
              writeBlockSequence(state, level, state.dump, compact);
            }
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + state.dump;
            }
          } else {
            writeFlowSequence(state, level, state.dump);
            if (duplicate) {
              state.dump = "&ref_" + duplicateIndex + " " + state.dump;
            }
          }
        } else if (type === "[object String]") {
          if (state.tag !== "?") {
            writeScalar(state, state.dump, level, iskey, inblock);
          }
        } else if (type === "[object Undefined]") {
          return false;
        } else {
          if (state.skipInvalid) return false;
          throw new YAMLException("unacceptable kind of an object to dump " + type);
        }
        if (state.tag !== null && state.tag !== "?") {
          tagStr = encodeURI(
            state.tag[0] === "!" ? state.tag.slice(1) : state.tag
          ).replace(/!/g, "%21");
          if (state.tag[0] === "!") {
            tagStr = "!" + tagStr;
          } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
            tagStr = "!!" + tagStr.slice(18);
          } else {
            tagStr = "!<" + tagStr + ">";
          }
          state.dump = tagStr + " " + state.dump;
        }
      }
      return true;
    }
    function getDuplicateReferences(object, state) {
      var objects = [], duplicatesIndexes = [], index, length;
      inspectNode(object, objects, duplicatesIndexes);
      for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
        state.duplicates.push(objects[duplicatesIndexes[index]]);
      }
      state.usedDuplicates = new Array(length);
    }
    function inspectNode(object, objects, duplicatesIndexes) {
      var objectKeyList, index, length;
      if (object !== null && typeof object === "object") {
        index = objects.indexOf(object);
        if (index !== -1) {
          if (duplicatesIndexes.indexOf(index) === -1) {
            duplicatesIndexes.push(index);
          }
        } else {
          objects.push(object);
          if (Array.isArray(object)) {
            for (index = 0, length = object.length; index < length; index += 1) {
              inspectNode(object[index], objects, duplicatesIndexes);
            }
          } else {
            objectKeyList = Object.keys(object);
            for (index = 0, length = objectKeyList.length; index < length; index += 1) {
              inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
            }
          }
        }
      }
    }
    function dump(input, options) {
      options = options || {};
      var state = new State(options);
      if (!state.noRefs) getDuplicateReferences(input, state);
      var value = input;
      if (state.replacer) {
        value = state.replacer.call({ "": value }, "", value);
      }
      if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
      return "";
    }
    module2.exports.dump = dump;
  }
});

// ../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/index.js
var require_js_yaml = __commonJS({
  "../../node_modules/.pnpm/js-yaml@4.1.1/node_modules/js-yaml/index.js"(exports, module2) {
    "use strict";
    init_esm_shims();
    var loader = require_loader();
    var dumper = require_dumper();
    function renamed(from, to) {
      return function() {
        throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
      };
    }
    module2.exports.Type = require_type();
    module2.exports.Schema = require_schema();
    module2.exports.FAILSAFE_SCHEMA = require_failsafe();
    module2.exports.JSON_SCHEMA = require_json();
    module2.exports.CORE_SCHEMA = require_core();
    module2.exports.DEFAULT_SCHEMA = require_default();
    module2.exports.load = loader.load;
    module2.exports.loadAll = loader.loadAll;
    module2.exports.dump = dumper.dump;
    module2.exports.YAMLException = require_exception();
    module2.exports.types = {
      binary: require_binary(),
      float: require_float(),
      map: require_map(),
      null: require_null(),
      pairs: require_pairs(),
      set: require_set(),
      timestamp: require_timestamp(),
      bool: require_bool(),
      int: require_int(),
      merge: require_merge(),
      omap: require_omap(),
      seq: require_seq(),
      str: require_str()
    };
    module2.exports.safeLoad = renamed("safeLoad", "load");
    module2.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
    module2.exports.safeDump = renamed("safeDump", "dump");
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/utils.js
var require_utils = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/utils.js"(exports) {
    "use strict";
    init_esm_shims();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseFileAsJSONSchema = exports.isSchemaLike = exports.appendToDescription = exports.maybeStripDefault = exports.pathTransform = exports.escapeBlockComment = exports.log = exports.error = exports.generateName = exports.toSafeString = exports.stripExtension = exports.justName = exports.traverse = exports.Try = void 0;
    var lodash_1 = require_lodash();
    var path_1 = __require("path");
    var JSONSchema_1 = require_JSONSchema();
    var js_yaml_1 = __importDefault(require_js_yaml());
    function Try(fn, err) {
      try {
        return fn();
      } catch (e) {
        return err(e);
      }
    }
    exports.Try = Try;
    var BLACKLISTED_KEYS = /* @__PURE__ */ new Set([
      "id",
      "$defs",
      "$id",
      "$schema",
      "title",
      "description",
      "default",
      "multipleOf",
      "maximum",
      "exclusiveMaximum",
      "minimum",
      "exclusiveMinimum",
      "maxLength",
      "minLength",
      "pattern",
      "additionalItems",
      "items",
      "maxItems",
      "minItems",
      "uniqueItems",
      "maxProperties",
      "minProperties",
      "required",
      "additionalProperties",
      "definitions",
      "properties",
      "patternProperties",
      "dependencies",
      "enum",
      "type",
      "allOf",
      "anyOf",
      "oneOf",
      "not"
    ]);
    function traverseObjectKeys(obj, callback, processed) {
      Object.keys(obj).forEach((k) => {
        if (obj[k] && typeof obj[k] === "object" && !Array.isArray(obj[k])) {
          traverse(obj[k], callback, processed, k);
        }
      });
    }
    function traverseArray(arr, callback, processed) {
      arr.forEach((s, k) => traverse(s, callback, processed, k.toString()));
    }
    function traverseIntersection(schema, callback, processed) {
      if (typeof schema !== "object" || !schema) {
        return;
      }
      const r = schema;
      const intersection = r[JSONSchema_1.Intersection];
      if (!intersection) {
        return;
      }
      if (Array.isArray(intersection.allOf)) {
        traverseArray(intersection.allOf, callback, processed);
      }
    }
    function traverse(schema, callback, processed = /* @__PURE__ */ new Set(), key) {
      if (processed.has(schema)) {
        return;
      }
      processed.add(schema);
      callback(schema, key !== null && key !== void 0 ? key : null);
      if (schema.anyOf) {
        traverseArray(schema.anyOf, callback, processed);
      }
      if (schema.allOf) {
        traverseArray(schema.allOf, callback, processed);
      }
      if (schema.oneOf) {
        traverseArray(schema.oneOf, callback, processed);
      }
      if (schema.properties) {
        traverseObjectKeys(schema.properties, callback, processed);
      }
      if (schema.patternProperties) {
        traverseObjectKeys(schema.patternProperties, callback, processed);
      }
      if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
        traverse(schema.additionalProperties, callback, processed);
      }
      if (schema.items) {
        const { items } = schema;
        if (Array.isArray(items)) {
          traverseArray(items, callback, processed);
        } else {
          traverse(items, callback, processed);
        }
      }
      if (schema.additionalItems && typeof schema.additionalItems === "object") {
        traverse(schema.additionalItems, callback, processed);
      }
      if (schema.dependencies) {
        if (Array.isArray(schema.dependencies)) {
          traverseArray(schema.dependencies, callback, processed);
        } else {
          traverseObjectKeys(schema.dependencies, callback, processed);
        }
      }
      if (schema.definitions) {
        traverseObjectKeys(schema.definitions, callback, processed);
      }
      if (schema.$defs) {
        traverseObjectKeys(schema.$defs, callback, processed);
      }
      if (schema.not) {
        traverse(schema.not, callback, processed);
      }
      traverseIntersection(schema, callback, processed);
      Object.keys(schema).filter((key2) => !BLACKLISTED_KEYS.has(key2)).forEach((key2) => {
        const child = schema[key2];
        if (child && typeof child === "object") {
          traverseObjectKeys(child, callback, processed);
        }
      });
    }
    exports.traverse = traverse;
    function justName(filename = "") {
      return stripExtension((0, path_1.basename)(filename));
    }
    exports.justName = justName;
    function stripExtension(filename) {
      return filename.replace((0, path_1.extname)(filename), "");
    }
    exports.stripExtension = stripExtension;
    function toSafeString(string) {
      return (0, lodash_1.upperFirst)(
        // remove accents, umlauts, ... by their basic latin letters
        (0, lodash_1.deburr)(string).replace(/(^\s*[^a-zA-Z_$])|([^a-zA-Z_$\d])/g, " ").replace(/^_[a-z]/g, (match) => match.toUpperCase()).replace(/_[a-z]/g, (match) => match.substr(1, match.length).toUpperCase()).replace(/([\d$]+[a-zA-Z])/g, (match) => match.toUpperCase()).replace(/\s+([a-zA-Z])/g, (match) => (0, lodash_1.trim)(match.toUpperCase())).replace(/\s/g, "")
      );
    }
    exports.toSafeString = toSafeString;
    function generateName(from, usedNames) {
      let name = toSafeString(from);
      if (!name) {
        name = "NoName";
      }
      if (usedNames.has(name)) {
        let counter = 1;
        let nameWithCounter = `${name}${counter}`;
        while (usedNames.has(nameWithCounter)) {
          nameWithCounter = `${name}${counter}`;
          counter++;
        }
        name = nameWithCounter;
      }
      usedNames.add(name);
      return name;
    }
    exports.generateName = generateName;
    function error(...messages) {
      var _a;
      if (!process.env.VERBOSE) {
        return console.error(messages);
      }
      console.error((_a = getStyledTextForLogging("red")) === null || _a === void 0 ? void 0 : _a("error"), ...messages);
    }
    exports.error = error;
    function log(style, title, ...messages) {
      var _a, _b;
      if (!process.env.VERBOSE) {
        return;
      }
      let lastMessage = null;
      if (messages.length > 1 && typeof messages[messages.length - 1] !== "string") {
        lastMessage = messages.splice(messages.length - 1, 1);
      }
      console.info((_a = color()) === null || _a === void 0 ? void 0 : _a.whiteBright.bgCyan("debug"), (_b = getStyledTextForLogging(style)) === null || _b === void 0 ? void 0 : _b(title), ...messages);
      if (lastMessage) {
        console.dir(lastMessage, { depth: 6, maxArrayLength: 6 });
      }
    }
    exports.log = log;
    function getStyledTextForLogging(style) {
      var _a, _b, _c, _d, _e, _f, _g;
      if (!process.env.VERBOSE) {
        return;
      }
      switch (style) {
        case "blue":
          return (_a = color()) === null || _a === void 0 ? void 0 : _a.whiteBright.bgBlue;
        case "cyan":
          return (_b = color()) === null || _b === void 0 ? void 0 : _b.whiteBright.bgCyan;
        case "green":
          return (_c = color()) === null || _c === void 0 ? void 0 : _c.whiteBright.bgGreen;
        case "magenta":
          return (_d = color()) === null || _d === void 0 ? void 0 : _d.whiteBright.bgMagenta;
        case "red":
          return (_e = color()) === null || _e === void 0 ? void 0 : _e.whiteBright.bgRedBright;
        case "white":
          return (_f = color()) === null || _f === void 0 ? void 0 : _f.black.bgWhite;
        case "yellow":
          return (_g = color()) === null || _g === void 0 ? void 0 : _g.whiteBright.bgYellow;
      }
    }
    function escapeBlockComment(schema) {
      const replacer = "* /";
      if (schema === null || typeof schema !== "object") {
        return;
      }
      for (const key of Object.keys(schema)) {
        if (key === "description" && typeof schema[key] === "string") {
          schema[key] = schema[key].replace(/\*\//g, replacer);
        }
      }
    }
    exports.escapeBlockComment = escapeBlockComment;
    function pathTransform(outputPath, inputPath, filePath) {
      const inPathList = (0, path_1.normalize)(inputPath).split(path_1.sep);
      const filePathList = (0, path_1.dirname)((0, path_1.normalize)(filePath)).split(path_1.sep);
      const filePathRel = filePathList.filter((f, i) => f !== inPathList[i]);
      return path_1.posix.join(path_1.posix.normalize(outputPath), ...filePathRel);
    }
    exports.pathTransform = pathTransform;
    function maybeStripDefault(schema) {
      if (!("default" in schema)) {
        return schema;
      }
      switch (schema.type) {
        case "array":
          if (Array.isArray(schema.default)) {
            return schema;
          }
          break;
        case "boolean":
          if (typeof schema.default === "boolean") {
            return schema;
          }
          break;
        case "integer":
        case "number":
          if (typeof schema.default === "number") {
            return schema;
          }
          break;
        case "string":
          if (typeof schema.default === "string") {
            return schema;
          }
          break;
        case "null":
          if (schema.default === null) {
            return schema;
          }
          break;
        case "object":
          if ((0, lodash_1.isPlainObject)(schema.default)) {
            return schema;
          }
          break;
      }
      delete schema.default;
      return schema;
    }
    exports.maybeStripDefault = maybeStripDefault;
    function appendToDescription(existingDescription, ...values) {
      if (existingDescription) {
        return `${existingDescription}

${values.join("\n")}`;
      }
      return values.join("\n");
    }
    exports.appendToDescription = appendToDescription;
    function isSchemaLike(schema) {
      if (!(0, lodash_1.isPlainObject)(schema)) {
        return false;
      }
      const parent = schema[JSONSchema_1.Parent];
      if (parent === null) {
        return true;
      }
      const JSON_SCHEMA_KEYWORDS = [
        "$defs",
        "allOf",
        "anyOf",
        "definitions",
        "dependencies",
        "enum",
        "not",
        "oneOf",
        "patternProperties",
        "properties",
        "required"
      ];
      if (JSON_SCHEMA_KEYWORDS.some((_) => parent[_] === schema)) {
        return false;
      }
      return true;
    }
    exports.isSchemaLike = isSchemaLike;
    function parseFileAsJSONSchema(filename, contents) {
      if (filename != null && isYaml(filename)) {
        return Try(() => js_yaml_1.default.load(contents.toString()), () => {
          throw new TypeError(`Error parsing YML in file "${filename}"`);
        });
      }
      return Try(() => JSON.parse(contents.toString()), () => {
        throw new TypeError(`Error parsing JSON in file "${filename}"`);
      });
    }
    exports.parseFileAsJSONSchema = parseFileAsJSONSchema;
    function isYaml(filename) {
      return filename.endsWith(".yaml") || filename.endsWith(".yml");
    }
    function color() {
      let cliColor;
      try {
        cliColor = __require("cli-color");
      } catch (_a) {
      }
      return cliColor;
    }
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/generator.js
var require_generator = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/generator.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.generateType = exports.generate = void 0;
    var lodash_1 = require_lodash();
    var index_1 = require_src();
    var AST_1 = require_AST();
    var utils_1 = require_utils();
    function generate2(ast, options = index_1.DEFAULT_OPTIONS) {
      return [
        options.bannerComment,
        declareNamedTypes(ast, options, ast.standaloneName),
        declareNamedInterfaces(ast, options, ast.standaloneName),
        declareEnums(ast, options)
      ].filter(Boolean).join("\n\n") + "\n";
    }
    exports.generate = generate2;
    function declareEnums(ast, options, processed = /* @__PURE__ */ new Set()) {
      if (processed.has(ast)) {
        return "";
      }
      processed.add(ast);
      let type = "";
      switch (ast.type) {
        case "ENUM":
          return generateStandaloneEnum(ast, options) + "\n";
        case "ARRAY":
          return declareEnums(ast.params, options, processed);
        case "UNION":
        case "INTERSECTION":
          return ast.params.reduce((prev, ast2) => prev + declareEnums(ast2, options, processed), "");
        case "TUPLE":
          type = ast.params.reduce((prev, ast2) => prev + declareEnums(ast2, options, processed), "");
          if (ast.spreadParam) {
            type += declareEnums(ast.spreadParam, options, processed);
          }
          return type;
        case "INTERFACE":
          return getSuperTypesAndParams(ast).reduce((prev, ast2) => prev + declareEnums(ast2, options, processed), "");
        default:
          return "";
      }
    }
    function declareNamedInterfaces(ast, options, rootASTName, processed = /* @__PURE__ */ new Set()) {
      if (processed.has(ast)) {
        return "";
      }
      processed.add(ast);
      let type = "";
      switch (ast.type) {
        case "ARRAY":
          type = declareNamedInterfaces(ast.params, options, rootASTName, processed);
          break;
        case "INTERFACE":
          type = [
            (0, AST_1.hasStandaloneName)(ast) && (ast.standaloneName === rootASTName || options.declareExternallyReferenced) && generateStandaloneInterface(ast, options),
            getSuperTypesAndParams(ast).map((ast2) => declareNamedInterfaces(ast2, options, rootASTName, processed)).filter(Boolean).join("\n")
          ].filter(Boolean).join("\n");
          break;
        case "INTERSECTION":
        case "TUPLE":
        case "UNION":
          type = ast.params.map((_) => declareNamedInterfaces(_, options, rootASTName, processed)).filter(Boolean).join("\n");
          if (ast.type === "TUPLE" && ast.spreadParam) {
            type += declareNamedInterfaces(ast.spreadParam, options, rootASTName, processed);
          }
          break;
        default:
          type = "";
      }
      return type;
    }
    function declareNamedTypes(ast, options, rootASTName, processed = /* @__PURE__ */ new Set()) {
      if (processed.has(ast)) {
        return "";
      }
      processed.add(ast);
      switch (ast.type) {
        case "ARRAY":
          return [
            declareNamedTypes(ast.params, options, rootASTName, processed),
            (0, AST_1.hasStandaloneName)(ast) ? generateStandaloneType(ast, options) : void 0
          ].filter(Boolean).join("\n");
        case "ENUM":
          return "";
        case "INTERFACE":
          return getSuperTypesAndParams(ast).map((ast2) => (ast2.standaloneName === rootASTName || options.declareExternallyReferenced) && declareNamedTypes(ast2, options, rootASTName, processed)).filter(Boolean).join("\n");
        case "INTERSECTION":
        case "TUPLE":
        case "UNION":
          return [
            (0, AST_1.hasStandaloneName)(ast) ? generateStandaloneType(ast, options) : void 0,
            ast.params.map((ast2) => declareNamedTypes(ast2, options, rootASTName, processed)).filter(Boolean).join("\n"),
            "spreadParam" in ast && ast.spreadParam ? declareNamedTypes(ast.spreadParam, options, rootASTName, processed) : void 0
          ].filter(Boolean).join("\n");
        default:
          if ((0, AST_1.hasStandaloneName)(ast)) {
            return generateStandaloneType(ast, options);
          }
          return "";
      }
    }
    function generateTypeUnmemoized(ast, options) {
      const type = generateRawType(ast, options);
      if (options.strictIndexSignatures && ast.keyName === "[k: string]") {
        return `${type} | undefined`;
      }
      return type;
    }
    exports.generateType = (0, lodash_1.memoize)(generateTypeUnmemoized);
    function generateRawType(ast, options) {
      (0, utils_1.log)("magenta", "generator", ast);
      if ((0, AST_1.hasStandaloneName)(ast)) {
        return (0, utils_1.toSafeString)(ast.standaloneName);
      }
      switch (ast.type) {
        case "ANY":
          return "any";
        case "ARRAY":
          return (() => {
            const type = (0, exports.generateType)(ast.params, options);
            return type.endsWith('"') ? "(" + type + ")[]" : type + "[]";
          })();
        case "BOOLEAN":
          return "boolean";
        case "INTERFACE":
          return generateInterface(ast, options);
        case "INTERSECTION":
          return generateSetOperation(ast, options);
        case "LITERAL":
          return JSON.stringify(ast.params);
        case "NEVER":
          return "never";
        case "NUMBER":
          return "number";
        case "NULL":
          return "null";
        case "OBJECT":
          return "object";
        case "REFERENCE":
          return ast.params;
        case "STRING":
          return "string";
        case "TUPLE":
          return (() => {
            const minItems = ast.minItems;
            const maxItems = ast.maxItems || -1;
            let spreadParam = ast.spreadParam;
            const astParams = [...ast.params];
            if (minItems > 0 && minItems > astParams.length && ast.spreadParam === void 0) {
              if (maxItems < 0) {
                spreadParam = options.unknownAny ? AST_1.T_UNKNOWN : AST_1.T_ANY;
              }
            }
            if (maxItems > astParams.length && ast.spreadParam === void 0) {
              for (let i = astParams.length; i < maxItems; i += 1) {
                astParams.push(options.unknownAny ? AST_1.T_UNKNOWN : AST_1.T_ANY);
              }
            }
            function addSpreadParam(params) {
              if (spreadParam) {
                const spread = "...(" + (0, exports.generateType)(spreadParam, options) + ")[]";
                params.push(spread);
              }
              return params;
            }
            function paramsToString(params) {
              return "[" + params.join(", ") + "]";
            }
            const paramsList = astParams.map((param) => (0, exports.generateType)(param, options));
            if (paramsList.length > minItems) {
              const cumulativeParamsList = paramsList.slice(0, minItems);
              const typesToUnion = [];
              if (cumulativeParamsList.length > 0) {
                typesToUnion.push(paramsToString(cumulativeParamsList));
              } else {
                typesToUnion.push(paramsToString([]));
              }
              for (let i = minItems; i < paramsList.length; i += 1) {
                cumulativeParamsList.push(paramsList[i]);
                if (i === paramsList.length - 1) {
                  addSpreadParam(cumulativeParamsList);
                }
                typesToUnion.push(paramsToString(cumulativeParamsList));
              }
              return typesToUnion.join("|");
            }
            return paramsToString(addSpreadParam(paramsList));
          })();
        case "UNION":
          return generateSetOperation(ast, options);
        case "UNKNOWN":
          return "unknown";
        case "CUSTOM_TYPE":
          return ast.params;
      }
    }
    function generateSetOperation(ast, options) {
      const members = ast.params.map((_) => (0, exports.generateType)(_, options));
      const separator = ast.type === "UNION" ? "|" : "&";
      return members.length === 1 ? members[0] : "(" + members.join(" " + separator + " ") + ")";
    }
    function generateInterface(ast, options) {
      return `{
` + ast.params.filter((_) => !_.isPatternProperty && !_.isUnreachableDefinition).map(({ isRequired, keyName, ast: ast2 }) => [isRequired, keyName, ast2, (0, exports.generateType)(ast2, options)]).map(([isRequired, keyName, ast2, type]) => ((0, AST_1.hasComment)(ast2) && !ast2.standaloneName ? generateComment(ast2.comment, ast2.deprecated) + "\n" : "") + escapeKeyName(keyName) + (isRequired ? "" : "?") + ": " + type).join("\n") + "\n}";
    }
    function generateComment(comment, deprecated) {
      const commentLines = ["/**"];
      if (deprecated) {
        commentLines.push(" * @deprecated");
      }
      if (typeof comment !== "undefined") {
        commentLines.push(...comment.split("\n").map((_) => " * " + _));
      }
      commentLines.push(" */");
      return commentLines.join("\n");
    }
    function generateStandaloneEnum(ast, options) {
      const containsSpecialCharacters = (key) => /[^a-zA-Z0-9_]/.test(key);
      return ((0, AST_1.hasComment)(ast) ? generateComment(ast.comment, ast.deprecated) + "\n" : "") + "export " + (options.enableConstEnums ? "const " : "") + `enum ${(0, utils_1.toSafeString)(ast.standaloneName)} {
` + ast.params.map(({ ast: ast2, keyName }) => (containsSpecialCharacters(keyName) ? `"${keyName}"` : keyName) + " = " + (0, exports.generateType)(ast2, options)).join(",\n") + "\n}";
    }
    function generateStandaloneInterface(ast, options) {
      return ((0, AST_1.hasComment)(ast) ? generateComment(ast.comment, ast.deprecated) + "\n" : "") + `export interface ${(0, utils_1.toSafeString)(ast.standaloneName)} ` + (ast.superTypes.length > 0 ? `extends ${ast.superTypes.map((superType) => (0, utils_1.toSafeString)(superType.standaloneName)).join(", ")} ` : "") + generateInterface(ast, options);
    }
    function generateStandaloneType(ast, options) {
      return ((0, AST_1.hasComment)(ast) ? generateComment(ast.comment) + "\n" : "") + `export type ${(0, utils_1.toSafeString)(ast.standaloneName)} = ${(0, exports.generateType)((0, lodash_1.omit)(ast, "standaloneName"), options)}`;
    }
    function escapeKeyName(keyName) {
      if (keyName.length && /[A-Za-z_$]/.test(keyName.charAt(0)) && /^[\w$]+$/.test(keyName)) {
        return keyName;
      }
      if (keyName === "[k: string]") {
        return keyName;
      }
      return JSON.stringify(keyName);
    }
    function getSuperTypesAndParams(ast) {
      return ast.params.map((param) => param.ast).concat(ast.superTypes);
    }
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/typesOfSchema.js
var require_typesOfSchema = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/typesOfSchema.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.typesOfSchema = void 0;
    var lodash_1 = require_lodash();
    var JSONSchema_1 = require_JSONSchema();
    function typesOfSchema(schema) {
      if (schema.tsType) {
        return /* @__PURE__ */ new Set(["CUSTOM_TYPE"]);
      }
      const matchedTypes = /* @__PURE__ */ new Set();
      for (const [schemaType, f] of Object.entries(matchers)) {
        if (f(schema)) {
          matchedTypes.add(schemaType);
        }
      }
      if (!matchedTypes.size) {
        matchedTypes.add("UNNAMED_SCHEMA");
      }
      return matchedTypes;
    }
    exports.typesOfSchema = typesOfSchema;
    var matchers = {
      ALL_OF(schema) {
        return "allOf" in schema;
      },
      ANY(schema) {
        if (Object.keys(schema).length === 0) {
          return true;
        }
        return schema.type === "any";
      },
      ANY_OF(schema) {
        return "anyOf" in schema;
      },
      BOOLEAN(schema) {
        if ("enum" in schema) {
          return false;
        }
        if (schema.type === "boolean") {
          return true;
        }
        if (!(0, JSONSchema_1.isCompound)(schema) && typeof schema.default === "boolean") {
          return true;
        }
        return false;
      },
      CUSTOM_TYPE() {
        return false;
      },
      NAMED_ENUM(schema) {
        return "enum" in schema && "tsEnumNames" in schema;
      },
      NAMED_SCHEMA(schema) {
        return "$id" in schema && ("patternProperties" in schema || "properties" in schema);
      },
      NEVER(schema) {
        return schema === false;
      },
      NULL(schema) {
        return schema.type === "null";
      },
      NUMBER(schema) {
        if ("enum" in schema) {
          return false;
        }
        if (schema.type === "integer" || schema.type === "number") {
          return true;
        }
        if (!(0, JSONSchema_1.isCompound)(schema) && typeof schema.default === "number") {
          return true;
        }
        return false;
      },
      OBJECT(schema) {
        return schema.type === "object" && !(0, lodash_1.isPlainObject)(schema.additionalProperties) && !schema.allOf && !schema.anyOf && !schema.oneOf && !schema.patternProperties && !schema.properties && !schema.required;
      },
      ONE_OF(schema) {
        return "oneOf" in schema;
      },
      REFERENCE(schema) {
        return "$ref" in schema;
      },
      STRING(schema) {
        if ("enum" in schema) {
          return false;
        }
        if (schema.type === "string") {
          return true;
        }
        if (!(0, JSONSchema_1.isCompound)(schema) && typeof schema.default === "string") {
          return true;
        }
        return false;
      },
      TYPED_ARRAY(schema) {
        if (schema.type && schema.type !== "array") {
          return false;
        }
        return "items" in schema;
      },
      UNION(schema) {
        return Array.isArray(schema.type);
      },
      UNNAMED_ENUM(schema) {
        if ("tsEnumNames" in schema) {
          return false;
        }
        if (schema.type && schema.type !== "boolean" && schema.type !== "integer" && schema.type !== "number" && schema.type !== "string") {
          return false;
        }
        return "enum" in schema;
      },
      UNNAMED_SCHEMA() {
        return false;
      },
      UNTYPED_ARRAY(schema) {
        return schema.type === "array" && !("items" in schema);
      }
    };
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/applySchemaTyping.js
var require_applySchemaTyping = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/applySchemaTyping.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.applySchemaTyping = void 0;
    var JSONSchema_1 = require_JSONSchema();
    var typesOfSchema_1 = require_typesOfSchema();
    function applySchemaTyping(schema) {
      var _a;
      const types = (0, typesOfSchema_1.typesOfSchema)(schema);
      Object.defineProperty(schema, JSONSchema_1.Types, {
        enumerable: false,
        value: types,
        writable: false
      });
      if (types.size === 1) {
        return;
      }
      const intersection = {
        [JSONSchema_1.Parent]: schema,
        [JSONSchema_1.Types]: /* @__PURE__ */ new Set(["ALL_OF"]),
        $id: schema.$id,
        description: schema.description,
        name: schema.name,
        title: schema.title,
        allOf: (_a = schema.allOf) !== null && _a !== void 0 ? _a : [],
        required: [],
        additionalProperties: false
      };
      types.delete("ALL_OF");
      delete schema.allOf;
      delete schema.$id;
      delete schema.description;
      delete schema.name;
      delete schema.title;
      Object.defineProperty(schema, JSONSchema_1.Intersection, {
        enumerable: false,
        value: intersection,
        writable: false
      });
    }
    exports.applySchemaTyping = applySchemaTyping;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/normalizer.js
var require_normalizer = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/normalizer.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.normalize = void 0;
    var JSONSchema_1 = require_JSONSchema();
    var utils_1 = require_utils();
    var applySchemaTyping_1 = require_applySchemaTyping();
    var util_1 = __require("util");
    var rules = /* @__PURE__ */ new Map();
    function hasType(schema, type) {
      return schema.type === type || Array.isArray(schema.type) && schema.type.includes(type);
    }
    function isObjectType(schema) {
      return schema.properties !== void 0 || hasType(schema, "object") || hasType(schema, "any");
    }
    function isArrayType(schema) {
      return schema.items !== void 0 || hasType(schema, "array") || hasType(schema, "any");
    }
    function isEnumTypeWithoutTsEnumNames(schema) {
      return schema.type === "string" && schema.enum !== void 0 && schema.tsEnumNames === void 0;
    }
    rules.set('Remove `type=["null"]` if `enum=[null]`', (schema) => {
      if (Array.isArray(schema.enum) && schema.enum.some((e) => e === null) && Array.isArray(schema.type) && schema.type.includes("null")) {
        schema.type = schema.type.filter((type) => type !== "null");
      }
    });
    rules.set("Destructure unary types", (schema) => {
      if (schema.type && Array.isArray(schema.type) && schema.type.length === 1) {
        schema.type = schema.type[0];
      }
    });
    rules.set("Add empty `required` property if none is defined", (schema) => {
      if (isObjectType(schema) && !("required" in schema)) {
        schema.required = [];
      }
    });
    rules.set("Transform `required`=false to `required`=[]", (schema) => {
      if (schema.required === false) {
        schema.required = [];
      }
    });
    rules.set("Default additionalProperties", (schema, _, options) => {
      if (isObjectType(schema) && !("additionalProperties" in schema) && schema.patternProperties === void 0) {
        schema.additionalProperties = options.additionalProperties;
      }
    });
    rules.set("Transform id to $id", (schema, fileName) => {
      if (!(0, utils_1.isSchemaLike)(schema)) {
        return;
      }
      if (schema.id && schema.$id && schema.id !== schema.$id) {
        throw ReferenceError(`Schema must define either id or $id, not both. Given id=${schema.id}, $id=${schema.$id} in ${fileName}`);
      }
      if (schema.id) {
        schema.$id = schema.id;
        delete schema.id;
      }
    });
    rules.set("Add an $id to anything that needs it", (schema, fileName, _options, _key, dereferencedPaths) => {
      if (!(0, utils_1.isSchemaLike)(schema)) {
        return;
      }
      if (!schema.$id && !schema[JSONSchema_1.Parent]) {
        schema.$id = (0, utils_1.toSafeString)((0, utils_1.justName)(fileName));
        return;
      }
      if (!isArrayType(schema) && !isObjectType(schema)) {
        return;
      }
      const dereferencedName = dereferencedPaths.get(schema);
      if (!schema.$id && !schema.title && dereferencedName) {
        schema.$id = (0, utils_1.toSafeString)((0, utils_1.justName)(dereferencedName));
      }
      if (dereferencedName) {
        dereferencedPaths.delete(schema);
      }
    });
    rules.set("Escape closing JSDoc comment", (schema) => {
      (0, utils_1.escapeBlockComment)(schema);
    });
    rules.set("Add JSDoc comments for minItems and maxItems", (schema) => {
      if (!isArrayType(schema)) {
        return;
      }
      const commentsToAppend = [
        "minItems" in schema ? `@minItems ${schema.minItems}` : "",
        "maxItems" in schema ? `@maxItems ${schema.maxItems}` : ""
      ].filter(Boolean);
      if (commentsToAppend.length) {
        schema.description = (0, utils_1.appendToDescription)(schema.description, ...commentsToAppend);
      }
    });
    rules.set("Optionally remove maxItems and minItems", (schema, _fileName, options) => {
      if (!isArrayType(schema)) {
        return;
      }
      if ("minItems" in schema && options.ignoreMinAndMaxItems) {
        delete schema.minItems;
      }
      if ("maxItems" in schema && (options.ignoreMinAndMaxItems || options.maxItems === -1)) {
        delete schema.maxItems;
      }
    });
    rules.set("Normalize schema.minItems", (schema, _fileName, options) => {
      if (options.ignoreMinAndMaxItems) {
        return;
      }
      if (!isArrayType(schema)) {
        return;
      }
      const { minItems } = schema;
      schema.minItems = typeof minItems === "number" ? minItems : 0;
    });
    rules.set("Remove maxItems if it is big enough to likely cause OOMs", (schema, _fileName, options) => {
      if (options.ignoreMinAndMaxItems || options.maxItems === -1) {
        return;
      }
      if (!isArrayType(schema)) {
        return;
      }
      const { maxItems, minItems } = schema;
      if (maxItems !== void 0 && maxItems - minItems > options.maxItems) {
        delete schema.maxItems;
      }
    });
    rules.set("Normalize schema.items", (schema, _fileName, options) => {
      if (options.ignoreMinAndMaxItems) {
        return;
      }
      const { maxItems, minItems } = schema;
      const hasMaxItems = typeof maxItems === "number" && maxItems >= 0;
      const hasMinItems = typeof minItems === "number" && minItems > 0;
      if (schema.items && !Array.isArray(schema.items) && (hasMaxItems || hasMinItems)) {
        const items = schema.items;
        const newItems = Array(maxItems || minItems || 0).fill(items);
        if (!hasMaxItems) {
          schema.additionalItems = items;
        }
        schema.items = newItems;
      }
      if (Array.isArray(schema.items) && hasMaxItems && maxItems < schema.items.length) {
        schema.items = schema.items.slice(0, maxItems);
      }
      return schema;
    });
    rules.set("Remove extends, if it is empty", (schema) => {
      if (!schema.hasOwnProperty("extends")) {
        return;
      }
      if (schema.extends == null || Array.isArray(schema.extends) && schema.extends.length === 0) {
        delete schema.extends;
      }
    });
    rules.set("Make extends always an array, if it is defined", (schema) => {
      if (schema.extends == null) {
        return;
      }
      if (!Array.isArray(schema.extends)) {
        schema.extends = [schema.extends];
      }
    });
    rules.set("Transform definitions to $defs", (schema, fileName) => {
      if (schema.definitions && schema.$defs && !(0, util_1.isDeepStrictEqual)(schema.definitions, schema.$defs)) {
        throw ReferenceError(`Schema must define either definitions or $defs, not both. Given id=${schema.id} in ${fileName}`);
      }
      if (schema.definitions) {
        schema.$defs = schema.definitions;
        delete schema.definitions;
      }
    });
    rules.set("Transform const to singleton enum", (schema) => {
      if (schema.const !== void 0) {
        schema.enum = [schema.const];
        delete schema.const;
      }
    });
    rules.set("Add tsEnumNames to enum types", (schema, _, options) => {
      var _a;
      if (isEnumTypeWithoutTsEnumNames(schema) && options.inferStringEnumKeysFromValues) {
        schema.tsEnumNames = (_a = schema.enum) === null || _a === void 0 ? void 0 : _a.map(String);
      }
    });
    rules.set("Pre-calculate schema types and intersections", (schema) => {
      if (schema !== null && typeof schema === "object") {
        (0, applySchemaTyping_1.applySchemaTyping)(schema);
      }
    });
    function normalize(rootSchema, dereferencedPaths, filename, options) {
      rules.forEach((rule) => (0, utils_1.traverse)(rootSchema, (schema, key) => rule(schema, filename, options, key, dereferencedPaths)));
      return rootSchema;
    }
    exports.normalize = normalize;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/optimizer.js
var require_optimizer = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/optimizer.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.optimize = void 0;
    var lodash_1 = require_lodash();
    var generator_1 = require_generator();
    var AST_1 = require_AST();
    var utils_1 = require_utils();
    function optimize(ast, options, processed = /* @__PURE__ */ new Set()) {
      if (processed.has(ast)) {
        return ast;
      }
      processed.add(ast);
      switch (ast.type) {
        case "ARRAY":
          return Object.assign(ast, {
            params: optimize(ast.params, options, processed)
          });
        case "INTERFACE":
          return Object.assign(ast, {
            params: ast.params.map((_) => Object.assign(_, { ast: optimize(_.ast, options, processed) }))
          });
        case "INTERSECTION":
        case "UNION":
          const optimizedAST = Object.assign(ast, {
            params: ast.params.map((_) => optimize(_, options, processed))
          });
          if (optimizedAST.params.some((_) => _.type === "ANY")) {
            (0, utils_1.log)("cyan", "optimizer", "[A, B, C, Any] -> Any", optimizedAST);
            return AST_1.T_ANY;
          }
          if (optimizedAST.params.some((_) => _.type === "UNKNOWN")) {
            (0, utils_1.log)("cyan", "optimizer", "[A, B, C, Unknown] -> Unknown", optimizedAST);
            return AST_1.T_UNKNOWN;
          }
          if (optimizedAST.params.every((_) => {
            const a = (0, generator_1.generateType)(omitStandaloneName(_), options);
            const b = (0, generator_1.generateType)(omitStandaloneName(optimizedAST.params[0]), options);
            return a === b;
          }) && optimizedAST.params.some((_) => _.standaloneName !== void 0)) {
            (0, utils_1.log)("cyan", "optimizer", "[A (named), A] -> [A (named)]", optimizedAST);
            optimizedAST.params = optimizedAST.params.filter((_) => _.standaloneName !== void 0);
          }
          const params = (0, lodash_1.uniqBy)(optimizedAST.params, (_) => (0, generator_1.generateType)(_, options));
          if (params.length !== optimizedAST.params.length) {
            (0, utils_1.log)("cyan", "optimizer", "[A, B, B] -> [A, B]", optimizedAST);
            optimizedAST.params = params;
          }
          return Object.assign(optimizedAST, {
            params: optimizedAST.params.map((_) => optimize(_, options, processed))
          });
        default:
          return ast;
      }
    }
    exports.optimize = optimize;
    function omitStandaloneName(ast) {
      switch (ast.type) {
        case "ENUM":
          return ast;
        default:
          return Object.assign(Object.assign({}, ast), { standaloneName: void 0 });
      }
    }
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/parser.js
var require_parser = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/parser.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = void 0;
    var lodash_1 = require_lodash();
    var util_1 = __require("util");
    var applySchemaTyping_1 = require_applySchemaTyping();
    var AST_1 = require_AST();
    var JSONSchema_1 = require_JSONSchema();
    var utils_1 = require_utils();
    function parse(schema, options, keyName, processed = /* @__PURE__ */ new Map(), usedNames = /* @__PURE__ */ new Set()) {
      if ((0, JSONSchema_1.isPrimitive)(schema)) {
        if ((0, JSONSchema_1.isBoolean)(schema)) {
          return parseBooleanSchema(schema, keyName, options);
        }
        return parseLiteral(schema, keyName);
      }
      const intersection = schema[JSONSchema_1.Intersection];
      const types = schema[JSONSchema_1.Types];
      if (intersection) {
        const ast = parseAsTypeWithCache(intersection, "ALL_OF", options, keyName, processed, usedNames);
        types.forEach((type) => {
          ast.params.push(parseAsTypeWithCache(schema, type, options, keyName, processed, usedNames));
        });
        (0, utils_1.log)("blue", "parser", "Types:", [...types], "Input:", schema, "Output:", ast);
        return ast;
      }
      if (types.size === 1) {
        const type = [...types][0];
        const ast = parseAsTypeWithCache(schema, type, options, keyName, processed, usedNames);
        (0, utils_1.log)("blue", "parser", "Type:", type, "Input:", schema, "Output:", ast);
        return ast;
      }
      throw new ReferenceError("Expected intersection schema. Please file an issue on GitHub.");
    }
    exports.parse = parse;
    function parseAsTypeWithCache(schema, type, options, keyName, processed = /* @__PURE__ */ new Map(), usedNames = /* @__PURE__ */ new Set()) {
      let cachedTypeMap = processed.get(schema);
      if (!cachedTypeMap) {
        cachedTypeMap = /* @__PURE__ */ new Map();
        processed.set(schema, cachedTypeMap);
      }
      const cachedAST = cachedTypeMap.get(type);
      if (cachedAST) {
        return cachedAST;
      }
      const ast = {};
      cachedTypeMap.set(type, ast);
      return Object.assign(ast, parseNonLiteral(schema, type, options, keyName, processed, usedNames));
    }
    function parseBooleanSchema(schema, keyName, options) {
      if (schema) {
        return {
          keyName,
          type: options.unknownAny ? "UNKNOWN" : "ANY"
        };
      }
      return {
        keyName,
        type: "NEVER"
      };
    }
    function parseLiteral(schema, keyName) {
      return {
        keyName,
        params: schema,
        type: "LITERAL"
      };
    }
    function parseNonLiteral(schema, type, options, keyName, processed, usedNames) {
      const definitions = getDefinitionsMemoized((0, JSONSchema_1.getRootSchema)(schema));
      const keyNameFromDefinition = (0, lodash_1.findKey)(definitions, (_) => _ === schema);
      switch (type) {
        case "ALL_OF":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            params: schema.allOf.map((_) => parse(_, options, void 0, processed, usedNames)),
            type: "INTERSECTION"
          };
        case "ANY":
          return Object.assign(Object.assign({}, options.unknownAny ? AST_1.T_UNKNOWN : AST_1.T_ANY), { comment: schema.description, deprecated: schema.deprecated, keyName, standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options) });
        case "ANY_OF":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            params: schema.anyOf.map((_) => parse(_, options, void 0, processed, usedNames)),
            type: "UNION"
          };
        case "BOOLEAN":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "BOOLEAN"
          };
        case "CUSTOM_TYPE":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            params: schema.tsType,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "CUSTOM_TYPE"
          };
        case "NAMED_ENUM":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition !== null && keyNameFromDefinition !== void 0 ? keyNameFromDefinition : keyName, usedNames, options),
            params: schema.enum.map((_, n) => ({
              ast: parseLiteral(_, void 0),
              keyName: schema.tsEnumNames[n]
            })),
            type: "ENUM"
          };
        case "NAMED_SCHEMA":
          return newInterface(schema, options, processed, usedNames, keyName);
        case "NEVER":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "NEVER"
          };
        case "NULL":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "NULL"
          };
        case "NUMBER":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "NUMBER"
          };
        case "OBJECT":
          return {
            comment: schema.description,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "OBJECT",
            deprecated: schema.deprecated
          };
        case "ONE_OF":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            params: schema.oneOf.map((_) => parse(_, options, void 0, processed, usedNames)),
            type: "UNION"
          };
        case "REFERENCE":
          throw Error((0, util_1.format)("Refs should have been resolved by the resolver!", schema));
        case "STRING":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "STRING"
          };
        case "TYPED_ARRAY":
          if (Array.isArray(schema.items)) {
            const minItems2 = schema.minItems;
            const maxItems2 = schema.maxItems;
            const arrayType = {
              comment: schema.description,
              deprecated: schema.deprecated,
              keyName,
              maxItems: maxItems2,
              minItems: minItems2,
              standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
              params: schema.items.map((_) => parse(_, options, void 0, processed, usedNames)),
              type: "TUPLE"
            };
            if (schema.additionalItems === true) {
              arrayType.spreadParam = options.unknownAny ? AST_1.T_UNKNOWN : AST_1.T_ANY;
            } else if (schema.additionalItems) {
              arrayType.spreadParam = parse(schema.additionalItems, options, void 0, processed, usedNames);
            }
            return arrayType;
          } else {
            return {
              comment: schema.description,
              deprecated: schema.deprecated,
              keyName,
              standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
              params: parse(schema.items, options, `{keyNameFromDefinition}Items`, processed, usedNames),
              type: "ARRAY"
            };
          }
        case "UNION":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            params: schema.type.map((type2) => {
              const member = Object.assign(Object.assign({}, (0, lodash_1.omit)(schema, "$id", "description", "title")), { type: type2 });
              (0, utils_1.maybeStripDefault)(member);
              (0, applySchemaTyping_1.applySchemaTyping)(member);
              return parse(member, options, void 0, processed, usedNames);
            }),
            type: "UNION"
          };
        case "UNNAMED_ENUM":
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            params: schema.enum.map((_) => parseLiteral(_, void 0)),
            type: "UNION"
          };
        case "UNNAMED_SCHEMA":
          return newInterface(schema, options, processed, usedNames, keyName, keyNameFromDefinition);
        case "UNTYPED_ARRAY":
          const minItems = schema.minItems;
          const maxItems = typeof schema.maxItems === "number" ? schema.maxItems : -1;
          const params = options.unknownAny ? AST_1.T_UNKNOWN : AST_1.T_ANY;
          if (minItems > 0 || maxItems >= 0) {
            return {
              comment: schema.description,
              deprecated: schema.deprecated,
              keyName,
              maxItems: schema.maxItems,
              minItems,
              // create a tuple of length N
              params: Array(Math.max(maxItems, minItems) || 0).fill(params),
              // if there is no maximum, then add a spread item to collect the rest
              spreadParam: maxItems >= 0 ? void 0 : params,
              standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
              type: "TUPLE"
            };
          }
          return {
            comment: schema.description,
            deprecated: schema.deprecated,
            keyName,
            params,
            standaloneName: standaloneName(schema, keyNameFromDefinition, usedNames, options),
            type: "ARRAY"
          };
      }
    }
    function standaloneName(schema, keyNameFromDefinition, usedNames, options) {
      var _a;
      const name = ((_a = options.customName) === null || _a === void 0 ? void 0 : _a.call(options, schema, keyNameFromDefinition)) || schema.title || schema.$id || keyNameFromDefinition;
      if (name) {
        return (0, utils_1.generateName)(name, usedNames);
      }
    }
    function newInterface(schema, options, processed, usedNames, keyName, keyNameFromDefinition) {
      const name = standaloneName(schema, keyNameFromDefinition, usedNames, options);
      return {
        comment: schema.description,
        deprecated: schema.deprecated,
        keyName,
        params: parseSchema(schema, options, processed, usedNames, name),
        standaloneName: name,
        superTypes: parseSuperTypes(schema, options, processed, usedNames),
        type: "INTERFACE"
      };
    }
    function parseSuperTypes(schema, options, processed, usedNames) {
      const superTypes = schema.extends;
      if (!superTypes) {
        return [];
      }
      return superTypes.map((_) => parse(_, options, void 0, processed, usedNames));
    }
    function parseSchema(schema, options, processed, usedNames, parentSchemaName) {
      let asts = (0, lodash_1.map)(schema.properties, (value, key) => ({
        ast: parse(value, options, key, processed, usedNames),
        isPatternProperty: false,
        isRequired: (0, lodash_1.includes)(schema.required || [], key),
        isUnreachableDefinition: false,
        keyName: key
      }));
      let singlePatternProperty = false;
      if (schema.patternProperties) {
        singlePatternProperty = !schema.additionalProperties && Object.keys(schema.patternProperties).length === 1;
        asts = asts.concat((0, lodash_1.map)(schema.patternProperties, (value, key) => {
          const ast = parse(value, options, key, processed, usedNames);
          const comment = `This interface was referenced by \`${parentSchemaName}\`'s JSON-Schema definition
via the \`patternProperty\` "${key.replace("*/", "*\\/")}".`;
          ast.comment = ast.comment ? `${ast.comment}

${comment}` : comment;
          return {
            ast,
            isPatternProperty: !singlePatternProperty,
            isRequired: singlePatternProperty || (0, lodash_1.includes)(schema.required || [], key),
            isUnreachableDefinition: false,
            keyName: singlePatternProperty ? "[k: string]" : key
          };
        }));
      }
      if (options.unreachableDefinitions) {
        asts = asts.concat((0, lodash_1.map)(schema.$defs, (value, key) => {
          const ast = parse(value, options, key, processed, usedNames);
          const comment = `This interface was referenced by \`${parentSchemaName}\`'s JSON-Schema
via the \`definition\` "${key}".`;
          ast.comment = ast.comment ? `${ast.comment}

${comment}` : comment;
          return {
            ast,
            isPatternProperty: false,
            isRequired: (0, lodash_1.includes)(schema.required || [], key),
            isUnreachableDefinition: true,
            keyName: key
          };
        }));
      }
      switch (schema.additionalProperties) {
        case void 0:
        case true:
          if (singlePatternProperty) {
            return asts;
          }
          return asts.concat({
            ast: options.unknownAny ? AST_1.T_UNKNOWN_ADDITIONAL_PROPERTIES : AST_1.T_ANY_ADDITIONAL_PROPERTIES,
            isPatternProperty: false,
            isRequired: true,
            isUnreachableDefinition: false,
            keyName: "[k: string]"
          });
        case false:
          return asts;
        // pass "true" as the last param because in TS, properties
        // defined via index signatures are already optional
        default:
          return asts.concat({
            ast: parse(schema.additionalProperties, options, "[k: string]", processed, usedNames),
            isPatternProperty: false,
            isRequired: true,
            isUnreachableDefinition: false,
            keyName: "[k: string]"
          });
      }
    }
    function getDefinitions(schema, isSchema = true, processed = /* @__PURE__ */ new Set()) {
      if (processed.has(schema)) {
        return {};
      }
      processed.add(schema);
      if (Array.isArray(schema)) {
        return schema.reduce((prev, cur) => Object.assign(Object.assign({}, prev), getDefinitions(cur, false, processed)), {});
      }
      if ((0, lodash_1.isPlainObject)(schema)) {
        return Object.assign(Object.assign({}, isSchema && hasDefinitions(schema) ? schema.$defs : {}), Object.keys(schema).reduce((prev, cur) => Object.assign(Object.assign({}, prev), getDefinitions(schema[cur], false, processed)), {}));
      }
      return {};
    }
    var getDefinitionsMemoized = (0, lodash_1.memoize)(getDefinitions);
    function hasDefinitions(schema) {
      return "$defs" in schema;
    }
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/to-json.js
function toJSON() {
  let pojo = {};
  let error = this;
  for (let key of getDeepKeys(error)) {
    if (typeof key === "string") {
      let value = error[key];
      let type = typeof value;
      if (!nonJsonTypes.includes(type)) {
        pojo[key] = value;
      }
    }
  }
  return pojo;
}
function getDeepKeys(obj, omit = []) {
  let keys = [];
  while (obj && obj !== objectPrototype) {
    keys = keys.concat(Object.getOwnPropertyNames(obj), Object.getOwnPropertySymbols(obj));
    obj = Object.getPrototypeOf(obj);
  }
  let uniqueKeys = new Set(keys);
  for (let key of omit.concat(protectedProps)) {
    uniqueKeys.delete(key);
  }
  return uniqueKeys;
}
var nonJsonTypes, protectedProps, objectPrototype;
var init_to_json = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/to-json.js"() {
    "use strict";
    init_esm_shims();
    nonJsonTypes = ["function", "symbol", "undefined"];
    protectedProps = ["constructor", "prototype", "__proto__"];
    objectPrototype = Object.getPrototypeOf({});
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/isomorphic.node.js
import * as util from "util";
function addInspectMethod(newError) {
  newError[inspectMethod] = inspect2;
}
function inspect2() {
  let pojo = {};
  let error = this;
  for (let key of getDeepKeys(error)) {
    let value = error[key];
    pojo[key] = value;
  }
  delete pojo[inspectMethod];
  return pojo;
}
var inspectMethod, format2;
var init_isomorphic_node = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/isomorphic.node.js"() {
    "use strict";
    init_esm_shims();
    init_to_json();
    inspectMethod = util.inspect.custom || /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
    format2 = util.format;
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/stack.js
function isLazyStack(stackProp) {
  return Boolean(stackProp && stackProp.configurable && typeof stackProp.get === "function");
}
function isWritableStack(stackProp) {
  return Boolean(
    // If there is no stack property, then it's writable, since assigning it will create it
    !stackProp || stackProp.writable || typeof stackProp.set === "function"
  );
}
function joinStacks(newError, originalError) {
  let newStack = popStack(newError.stack);
  let originalStack = originalError ? originalError.stack : void 0;
  if (newStack && originalStack) {
    return newStack + "\n\n" + originalStack;
  } else {
    return newStack || originalStack;
  }
}
function lazyJoinStacks(lazyStack, newError, originalError) {
  if (originalError) {
    Object.defineProperty(newError, "stack", {
      get: () => {
        let newStack = lazyStack.get.apply(newError);
        return joinStacks({ stack: newStack }, originalError);
      },
      enumerable: false,
      configurable: true
    });
  } else {
    lazyPopStack(newError, lazyStack);
  }
}
function popStack(stack) {
  if (stack) {
    let lines = stack.split(newline);
    let onoStart;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (onoCall.test(line)) {
        if (onoStart === void 0) {
          onoStart = i;
        }
      } else if (onoStart !== void 0) {
        lines.splice(onoStart, i - onoStart);
        break;
      }
    }
    if (lines.length > 0) {
      return lines.join("\n");
    }
  }
  return stack;
}
function lazyPopStack(error, lazyStack) {
  Object.defineProperty(error, "stack", {
    get: () => popStack(lazyStack.get.apply(error)),
    enumerable: false,
    configurable: true
  });
}
var newline, onoCall;
var init_stack = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/stack.js"() {
    "use strict";
    init_esm_shims();
    newline = /\r?\n/;
    onoCall = /\bono[ @]/;
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/extend-error.js
function extendError(error, originalError, props) {
  let onoError = error;
  extendStack(onoError, originalError);
  if (originalError && typeof originalError === "object") {
    mergeErrors(onoError, originalError);
  }
  onoError.toJSON = toJSON;
  if (addInspectMethod) {
    addInspectMethod(onoError);
  }
  if (props && typeof props === "object") {
    Object.assign(onoError, props);
  }
  return onoError;
}
function extendStack(newError, originalError) {
  let stackProp = Object.getOwnPropertyDescriptor(newError, "stack");
  if (isLazyStack(stackProp)) {
    lazyJoinStacks(stackProp, newError, originalError);
  } else if (isWritableStack(stackProp)) {
    newError.stack = joinStacks(newError, originalError);
  }
}
function mergeErrors(newError, originalError) {
  let keys = getDeepKeys(originalError, protectedProps2);
  let _newError = newError;
  let _originalError = originalError;
  for (let key of keys) {
    if (_newError[key] === void 0) {
      try {
        _newError[key] = _originalError[key];
      } catch (e) {
      }
    }
  }
}
var protectedProps2;
var init_extend_error = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/extend-error.js"() {
    "use strict";
    init_esm_shims();
    init_isomorphic_node();
    init_stack();
    init_to_json();
    protectedProps2 = ["name", "message", "stack"];
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/normalize.js
function normalizeOptions(options) {
  options = options || {};
  return {
    concatMessages: options.concatMessages === void 0 ? true : Boolean(options.concatMessages),
    format: options.format === void 0 ? format2 : typeof options.format === "function" ? options.format : false
  };
}
function normalizeArgs(args, options) {
  let originalError;
  let props;
  let formatArgs;
  let message = "";
  if (typeof args[0] === "string") {
    formatArgs = args;
  } else if (typeof args[1] === "string") {
    if (args[0] instanceof Error) {
      originalError = args[0];
    } else {
      props = args[0];
    }
    formatArgs = args.slice(1);
  } else {
    originalError = args[0];
    props = args[1];
    formatArgs = args.slice(2);
  }
  if (formatArgs.length > 0) {
    if (options.format) {
      message = options.format.apply(void 0, formatArgs);
    } else {
      message = formatArgs.join(" ");
    }
  }
  if (options.concatMessages && originalError && originalError.message) {
    message += (message ? " \n" : "") + originalError.message;
  }
  return { originalError, props, message };
}
var init_normalize = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/normalize.js"() {
    "use strict";
    init_esm_shims();
    init_isomorphic_node();
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/constructor.js
function Ono(ErrorConstructor, options) {
  options = normalizeOptions(options);
  function ono2(...args) {
    let { originalError, props, message } = normalizeArgs(args, options);
    let newError = new ErrorConstructor(message);
    return extendError(newError, originalError, props);
  }
  ono2[Symbol.species] = ErrorConstructor;
  return ono2;
}
var constructor;
var init_constructor = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/constructor.js"() {
    "use strict";
    init_esm_shims();
    init_extend_error();
    init_normalize();
    init_to_json();
    constructor = Ono;
    Ono.toJSON = function toJSON2(error) {
      return toJSON.call(error);
    };
    Ono.extend = function extend(error, originalError, props) {
      if (props || originalError instanceof Error) {
        return extendError(error, originalError, props);
      } else if (originalError) {
        return extendError(error, void 0, originalError);
      } else {
        return extendError(error);
      }
    };
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/singleton.js
function ono(...args) {
  let originalError = args[0];
  if (typeof originalError === "object" && typeof originalError.name === "string") {
    for (let typedOno of Object.values(onoMap)) {
      if (typeof typedOno === "function" && typedOno.name === "ono") {
        let species = typedOno[Symbol.species];
        if (species && species !== Error && (originalError instanceof species || originalError.name === species.name)) {
          return typedOno.apply(void 0, args);
        }
      }
    }
  }
  return ono.error.apply(void 0, args);
}
var singleton, onoMap;
var init_singleton = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/singleton.js"() {
    "use strict";
    init_esm_shims();
    init_constructor();
    singleton = ono;
    ono.error = new constructor(Error);
    ono.eval = new constructor(EvalError);
    ono.range = new constructor(RangeError);
    ono.reference = new constructor(ReferenceError);
    ono.syntax = new constructor(SyntaxError);
    ono.type = new constructor(TypeError);
    ono.uri = new constructor(URIError);
    onoMap = ono;
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/types.js
var init_types = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/types.js"() {
    "use strict";
    init_esm_shims();
  }
});

// ../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  Ono: () => constructor,
  default: () => esm_default,
  ono: () => singleton
});
var esm_default;
var init_esm = __esm({
  "../../node_modules/.pnpm/@jsdevtools+ono@7.1.3/node_modules/@jsdevtools/ono/esm/index.js"() {
    "use strict";
    init_esm_shims();
    init_singleton();
    init_constructor();
    init_types();
    esm_default = singleton;
    if (typeof module === "object" && typeof module.exports === "object") {
      module.exports = Object.assign(module.exports.default, module.exports);
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/convert-path-to-posix.js
var require_convert_path_to_posix = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/convert-path-to-posix.js"(exports) {
    "use strict";
    init_esm_shims();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = convertPathToPosix;
    var path_1 = __importDefault(__require("path"));
    function convertPathToPosix(filePath) {
      const isExtendedLengthPath = filePath.startsWith("\\\\?\\");
      if (isExtendedLengthPath) {
        return filePath;
      }
      return filePath.split(path_1.default?.win32?.sep).join(path_1.default?.posix?.sep ?? "/");
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/is-windows.js
var require_is_windows = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/is-windows.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isWindows = void 0;
    var isWindowsConst = /^win/.test(globalThis.process ? globalThis.process.platform : "");
    var isWindows = () => isWindowsConst;
    exports.isWindows = isWindows;
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/url.js
var require_url = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/url.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parse = void 0;
    exports.resolve = resolve2;
    exports.cwd = cwd;
    exports.getProtocol = getProtocol;
    exports.getExtension = getExtension;
    exports.stripQuery = stripQuery;
    exports.getHash = getHash;
    exports.stripHash = stripHash;
    exports.isHttp = isHttp;
    exports.isFileSystemPath = isFileSystemPath;
    exports.fromFileSystemPath = fromFileSystemPath;
    exports.toFileSystemPath = toFileSystemPath;
    exports.safePointerToPath = safePointerToPath;
    exports.relative = relative;
    var convert_path_to_posix_1 = __importDefault(require_convert_path_to_posix());
    var path_1 = __importStar(__require("path"));
    var forwardSlashPattern = /\//g;
    var protocolPattern = /^(\w{2,}):\/\//i;
    var jsonPointerSlash = /~1/g;
    var jsonPointerTilde = /~0/g;
    var path_2 = __require("path");
    var is_windows_1 = require_is_windows();
    var urlEncodePatterns = [
      [/\?/g, "%3F"],
      [/#/g, "%23"]
    ];
    var urlDecodePatterns = [/%23/g, "#", /%24/g, "$", /%26/g, "&", /%2C/g, ",", /%40/g, "@"];
    var parse = (u) => new URL(u);
    exports.parse = parse;
    function resolve2(from, to) {
      const fromUrl = new URL((0, convert_path_to_posix_1.default)(from), "https://aaa.nonexistanturl.com");
      const resolvedUrl = new URL((0, convert_path_to_posix_1.default)(to), fromUrl);
      const endSpaces = to.match(/(\s*)$/)?.[1] || "";
      if (resolvedUrl.hostname === "aaa.nonexistanturl.com") {
        const { pathname, search, hash } = resolvedUrl;
        return pathname + search + hash + endSpaces;
      }
      return resolvedUrl.toString() + endSpaces;
    }
    function cwd() {
      if (typeof window !== "undefined") {
        return location.href;
      }
      const path = process.cwd();
      const lastChar = path.slice(-1);
      if (lastChar === "/" || lastChar === "\\") {
        return path;
      } else {
        return path + "/";
      }
    }
    function getProtocol(path) {
      const match = protocolPattern.exec(path || "");
      if (match) {
        return match[1].toLowerCase();
      }
      return void 0;
    }
    function getExtension(path) {
      const lastDot = path.lastIndexOf(".");
      if (lastDot >= 0) {
        return stripQuery(path.substr(lastDot).toLowerCase());
      }
      return "";
    }
    function stripQuery(path) {
      const queryIndex = path.indexOf("?");
      if (queryIndex >= 0) {
        path = path.substr(0, queryIndex);
      }
      return path;
    }
    function getHash(path) {
      if (!path) {
        return "#";
      }
      const hashIndex = path.indexOf("#");
      if (hashIndex >= 0) {
        return path.substring(hashIndex);
      }
      return "#";
    }
    function stripHash(path) {
      if (!path) {
        return "";
      }
      const hashIndex = path.indexOf("#");
      if (hashIndex >= 0) {
        path = path.substring(0, hashIndex);
      }
      return path;
    }
    function isHttp(path) {
      const protocol = getProtocol(path);
      if (protocol === "http" || protocol === "https") {
        return true;
      } else if (protocol === void 0) {
        return typeof window !== "undefined";
      } else {
        return false;
      }
    }
    function isFileSystemPath(path) {
      if (typeof window !== "undefined" || typeof process !== "undefined" && process.browser) {
        return false;
      }
      const protocol = getProtocol(path);
      return protocol === void 0 || protocol === "file";
    }
    function fromFileSystemPath(path) {
      if ((0, is_windows_1.isWindows)()) {
        const projectDir = cwd();
        const upperPath = path.toUpperCase();
        const projectDirPosixPath = (0, convert_path_to_posix_1.default)(projectDir);
        const posixUpper = projectDirPosixPath.toUpperCase();
        const hasProjectDir = upperPath.includes(posixUpper);
        const hasProjectUri = upperPath.includes(posixUpper);
        const isAbsolutePath = path_1.win32?.isAbsolute(path) || path.startsWith("http://") || path.startsWith("https://") || path.startsWith("file://");
        if (!(hasProjectDir || hasProjectUri || isAbsolutePath) && !projectDir.startsWith("http")) {
          path = (0, path_2.join)(projectDir, path);
        }
        path = (0, convert_path_to_posix_1.default)(path);
      }
      path = encodeURI(path);
      for (const pattern of urlEncodePatterns) {
        path = path.replace(pattern[0], pattern[1]);
      }
      return path;
    }
    function toFileSystemPath(path, keepFileProtocol) {
      path = decodeURI(path);
      for (let i = 0; i < urlDecodePatterns.length; i += 2) {
        path = path.replace(urlDecodePatterns[i], urlDecodePatterns[i + 1]);
      }
      let isFileUrl = path.substr(0, 7).toLowerCase() === "file://";
      if (isFileUrl) {
        path = path[7] === "/" ? path.substr(8) : path.substr(7);
        if ((0, is_windows_1.isWindows)() && path[1] === "/") {
          path = path[0] + ":" + path.substr(1);
        }
        if (keepFileProtocol) {
          path = "file:///" + path;
        } else {
          isFileUrl = false;
          path = (0, is_windows_1.isWindows)() ? path : "/" + path;
        }
      }
      if ((0, is_windows_1.isWindows)() && !isFileUrl) {
        path = path.replace(forwardSlashPattern, "\\");
        if (path.substr(1, 2) === ":\\") {
          path = path[0].toUpperCase() + path.substr(1);
        }
      }
      return path;
    }
    function safePointerToPath(pointer) {
      if (pointer.length <= 1 || pointer[0] !== "#" || pointer[1] !== "/") {
        return [];
      }
      return pointer.slice(2).split("/").map((value) => {
        return decodeURIComponent(value).replace(jsonPointerSlash, "/").replace(jsonPointerTilde, "~");
      });
    }
    function relative(from, to) {
      if (!isFileSystemPath(from) || !isFileSystemPath(to)) {
        return resolve2(from, to);
      }
      const fromDir = path_1.default.dirname(stripHash(from));
      const toPath = stripHash(to);
      const result = path_1.default.relative(fromDir, toPath);
      return result + getHash(to);
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/errors.js
var require_errors = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/errors.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InvalidPointerError = exports.TimeoutError = exports.MissingPointerError = exports.UnmatchedResolverError = exports.ResolverError = exports.UnmatchedParserError = exports.ParserError = exports.JSONParserErrorGroup = exports.JSONParserError = void 0;
    exports.isHandledError = isHandledError;
    exports.normalizeError = normalizeError;
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var url_js_1 = require_url();
    var JSONParserError = class extends Error {
      constructor(message, source) {
        super();
        this.code = "EUNKNOWN";
        this.name = "JSONParserError";
        this.message = message;
        this.source = source;
        this.path = null;
        ono_1.Ono.extend(this);
      }
      get footprint() {
        return `${this.path}+${this.source}+${this.code}+${this.message}`;
      }
    };
    exports.JSONParserError = JSONParserError;
    var JSONParserErrorGroup = class _JSONParserErrorGroup extends Error {
      constructor(parser) {
        super();
        this.files = parser;
        this.name = "JSONParserErrorGroup";
        this.message = `${this.errors.length} error${this.errors.length > 1 ? "s" : ""} occurred while reading '${(0, url_js_1.toFileSystemPath)(parser.$refs._root$Ref.path)}'`;
        ono_1.Ono.extend(this);
      }
      static getParserErrors(parser) {
        const errors = [];
        for (const $ref of Object.values(parser.$refs._$refs)) {
          if ($ref.errors) {
            errors.push(...$ref.errors);
          }
        }
        return errors;
      }
      get errors() {
        return _JSONParserErrorGroup.getParserErrors(this.files);
      }
    };
    exports.JSONParserErrorGroup = JSONParserErrorGroup;
    var ParserError = class extends JSONParserError {
      constructor(message, source) {
        super(`Error parsing ${source}: ${message}`, source);
        this.code = "EPARSER";
        this.name = "ParserError";
      }
    };
    exports.ParserError = ParserError;
    var UnmatchedParserError = class extends JSONParserError {
      constructor(source) {
        super(`Could not find parser for "${source}"`, source);
        this.code = "EUNMATCHEDPARSER";
        this.name = "UnmatchedParserError";
      }
    };
    exports.UnmatchedParserError = UnmatchedParserError;
    var ResolverError = class extends JSONParserError {
      constructor(ex, source) {
        super(ex.message || `Error reading file "${source}"`, source);
        this.code = "ERESOLVER";
        this.name = "ResolverError";
        if ("code" in ex) {
          this.ioErrorCode = String(ex.code);
        }
      }
    };
    exports.ResolverError = ResolverError;
    var UnmatchedResolverError = class extends JSONParserError {
      constructor(source) {
        super(`Could not find resolver for "${source}"`, source);
        this.code = "EUNMATCHEDRESOLVER";
        this.name = "UnmatchedResolverError";
      }
    };
    exports.UnmatchedResolverError = UnmatchedResolverError;
    var MissingPointerError = class extends JSONParserError {
      constructor(token, path, targetRef, targetFound, parentPath) {
        super(`Missing $ref pointer "${(0, url_js_1.getHash)(path)}". Token "${token}" does not exist.`, (0, url_js_1.stripHash)(path));
        this.code = "EMISSINGPOINTER";
        this.name = "MissingPointerError";
        this.targetToken = token;
        this.targetRef = targetRef;
        this.targetFound = targetFound;
        this.parentPath = parentPath;
      }
    };
    exports.MissingPointerError = MissingPointerError;
    var TimeoutError = class extends JSONParserError {
      constructor(timeout) {
        super(`Dereferencing timeout reached: ${timeout}ms`);
        this.code = "ETIMEOUT";
        this.name = "TimeoutError";
      }
    };
    exports.TimeoutError = TimeoutError;
    var InvalidPointerError = class extends JSONParserError {
      constructor(pointer, path) {
        super(`Invalid $ref pointer "${pointer}". Pointers must begin with "#/"`, (0, url_js_1.stripHash)(path));
        this.code = "EUNMATCHEDRESOLVER";
        this.name = "InvalidPointerError";
      }
    };
    exports.InvalidPointerError = InvalidPointerError;
    function isHandledError(err) {
      return err instanceof JSONParserError || err instanceof JSONParserErrorGroup;
    }
    function normalizeError(err) {
      if (err.path === null) {
        err.path = [];
      }
      return err;
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/pointer.js
var require_pointer = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/pointer.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.nullSymbol = void 0;
    var ref_js_1 = __importDefault(require_ref());
    var url = __importStar(require_url());
    var errors_js_1 = require_errors();
    exports.nullSymbol = /* @__PURE__ */ Symbol("null");
    var slashes = /\//g;
    var tildes = /~/g;
    var escapedSlash = /~1/g;
    var escapedTilde = /~0/g;
    var safeDecodeURIComponent = (encodedURIComponent) => {
      try {
        return decodeURIComponent(encodedURIComponent);
      } catch {
        return encodedURIComponent;
      }
    };
    var Pointer = class _Pointer {
      constructor($ref, path, friendlyPath) {
        this.$ref = $ref;
        this.path = path;
        this.originalPath = friendlyPath || path;
        this.value = void 0;
        this.circular = false;
        this.indirections = 0;
      }
      /**
       * Resolves the value of a nested property within the given object.
       *
       * @param obj - The object that will be crawled
       * @param options
       * @param pathFromRoot - the path of place that initiated resolving
       *
       * @returns
       * Returns a JSON pointer whose {@link Pointer#value} is the resolved value.
       * If resolving this value required resolving other JSON references, then
       * the {@link Pointer#$ref} and {@link Pointer#path} will reflect the resolution path
       * of the resolved value.
       */
      resolve(obj, options, pathFromRoot) {
        const tokens = _Pointer.parse(this.path, this.originalPath);
        const found = [];
        this.value = unwrapOrThrow(obj);
        for (let i = 0; i < tokens.length; i++) {
          if (resolveIf$Ref(this, options, pathFromRoot)) {
            this.path = _Pointer.join(this.path, tokens.slice(i));
          }
          if (typeof this.value === "object" && this.value !== null && !isRootPath(pathFromRoot) && "$ref" in this.value) {
            return this;
          }
          const token = tokens[i];
          if (this.value[token] === void 0 || this.value[token] === null && i === tokens.length - 1) {
            let didFindSubstringSlashMatch = false;
            for (let j = tokens.length - 1; j > i; j--) {
              const joinedToken = tokens.slice(i, j + 1).join("/");
              if (this.value[joinedToken] !== void 0) {
                this.value = this.value[joinedToken];
                i = j;
                didFindSubstringSlashMatch = true;
                break;
              }
            }
            if (didFindSubstringSlashMatch) {
              continue;
            }
            if (token in this.value && this.value[token] === null) {
              this.value = exports.nullSymbol;
              continue;
            }
            this.value = null;
            const path = this.$ref.path || "";
            const targetRef = this.path.replace(path, "");
            const targetFound = _Pointer.join("", found);
            const parentPath = pathFromRoot?.replace(path, "");
            throw new errors_js_1.MissingPointerError(token, decodeURI(this.originalPath), targetRef, targetFound, parentPath);
          } else {
            this.value = this.value[token];
          }
          found.push(token);
        }
        if (!this.value || this.value.$ref && url.resolve(this.path, this.value.$ref) !== pathFromRoot) {
          resolveIf$Ref(this, options, pathFromRoot);
        }
        return this;
      }
      /**
       * Sets the value of a nested property within the given object.
       *
       * @param obj - The object that will be crawled
       * @param value - the value to assign
       * @param options
       *
       * @returns
       * Returns the modified object, or an entirely new object if the entire object is overwritten.
       */
      set(obj, value, options) {
        const tokens = _Pointer.parse(this.path);
        let token;
        if (tokens.length === 0) {
          this.value = value;
          return value;
        }
        this.value = unwrapOrThrow(obj);
        for (let i = 0; i < tokens.length - 1; i++) {
          resolveIf$Ref(this, options);
          token = tokens[i];
          if (this.value && this.value[token] !== void 0) {
            this.value = this.value[token];
          } else {
            this.value = setValue(this, token, {});
          }
        }
        resolveIf$Ref(this, options);
        token = tokens[tokens.length - 1];
        setValue(this, token, value);
        return obj;
      }
      /**
       * Parses a JSON pointer (or a path containing a JSON pointer in the hash)
       * and returns an array of the pointer's tokens.
       * (e.g. "schema.json#/definitions/person/name" => ["definitions", "person", "name"])
       *
       * The pointer is parsed according to RFC 6901
       * {@link https://tools.ietf.org/html/rfc6901#section-3}
       *
       * @param path
       * @param [originalPath]
       * @returns
       */
      static parse(path, originalPath) {
        const pointer = url.getHash(path).substring(1);
        if (!pointer) {
          return [];
        }
        const split = pointer.split("/");
        for (let i = 0; i < split.length; i++) {
          split[i] = safeDecodeURIComponent(split[i].replace(escapedSlash, "/").replace(escapedTilde, "~"));
        }
        if (split[0] !== "") {
          throw new errors_js_1.InvalidPointerError(pointer, originalPath === void 0 ? path : originalPath);
        }
        return split.slice(1);
      }
      /**
       * Creates a JSON pointer path, by joining one or more tokens to a base path.
       *
       * @param base - The base path (e.g. "schema.json#/definitions/person")
       * @param tokens - The token(s) to append (e.g. ["name", "first"])
       * @returns
       */
      static join(base, tokens) {
        if (base.indexOf("#") === -1) {
          base += "#";
        }
        tokens = Array.isArray(tokens) ? tokens : [tokens];
        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          base += "/" + encodeURIComponent(token.replace(tildes, "~0").replace(slashes, "~1"));
        }
        return base;
      }
    };
    function resolveIf$Ref(pointer, options, pathFromRoot) {
      if (ref_js_1.default.isAllowed$Ref(pointer.value, options)) {
        const $refPath = url.resolve(pointer.path, pointer.value.$ref);
        if ($refPath === pointer.path && !isRootPath(pathFromRoot)) {
          pointer.circular = true;
        } else {
          const resolved = pointer.$ref.$refs._resolve($refPath, pointer.path, options);
          if (resolved === null) {
            return false;
          }
          pointer.indirections += resolved.indirections + 1;
          if (ref_js_1.default.isExtended$Ref(pointer.value)) {
            pointer.value = ref_js_1.default.dereference(pointer.value, resolved.value);
            return false;
          } else {
            pointer.$ref = resolved.$ref;
            pointer.path = resolved.path;
            pointer.value = resolved.value;
          }
          return true;
        }
      }
      return void 0;
    }
    exports.default = Pointer;
    function setValue(pointer, token, value) {
      if (pointer.value && typeof pointer.value === "object") {
        if (token === "-" && Array.isArray(pointer.value)) {
          pointer.value.push(value);
        } else {
          pointer.value[token] = value;
        }
      } else {
        throw new errors_js_1.JSONParserError(`Error assigning $ref pointer "${pointer.path}". 
Cannot set "${token}" of a non-object.`);
      }
      return value;
    }
    function unwrapOrThrow(value) {
      if ((0, errors_js_1.isHandledError)(value)) {
        throw value;
      }
      return value;
    }
    function isRootPath(pathFromRoot) {
      return typeof pathFromRoot == "string" && Pointer.parse(pathFromRoot).length == 0;
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/ref.js
var require_ref = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/ref.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var pointer_js_1 = __importStar(require_pointer());
    var errors_js_1 = require_errors();
    var url_js_1 = require_url();
    var $Ref = class _$Ref {
      constructor($refs) {
        this.errors = [];
        this.$refs = $refs;
      }
      /**
       * Pushes an error to errors array.
       *
       * @param err - The error to be pushed
       * @returns
       */
      addError(err) {
        if (this.errors === void 0) {
          this.errors = [];
        }
        const existingErrors = this.errors.map(({ footprint }) => footprint);
        if ("errors" in err && Array.isArray(err.errors)) {
          this.errors.push(...err.errors.map(errors_js_1.normalizeError).filter(({ footprint }) => !existingErrors.includes(footprint)));
        } else if (!("footprint" in err) || !existingErrors.includes(err.footprint)) {
          this.errors.push((0, errors_js_1.normalizeError)(err));
        }
      }
      /**
       * Determines whether the given JSON reference exists within this {@link $Ref#value}.
       *
       * @param path - The full path being resolved, optionally with a JSON pointer in the hash
       * @param options
       * @returns
       */
      exists(path, options) {
        try {
          this.resolve(path, options);
          return true;
        } catch {
          return false;
        }
      }
      /**
       * Resolves the given JSON reference within this {@link $Ref#value} and returns the resolved value.
       *
       * @param path - The full path being resolved, optionally with a JSON pointer in the hash
       * @param options
       * @returns - Returns the resolved value
       */
      get(path, options) {
        return this.resolve(path, options)?.value;
      }
      /**
       * Resolves the given JSON reference within this {@link $Ref#value}.
       *
       * @param path - The full path being resolved, optionally with a JSON pointer in the hash
       * @param options
       * @param friendlyPath - The original user-specified path (used for error messages)
       * @param pathFromRoot - The path of `obj` from the schema root
       * @returns
       */
      resolve(path, options, friendlyPath, pathFromRoot) {
        const pointer = new pointer_js_1.default(this, path, friendlyPath);
        try {
          const resolved = pointer.resolve(this.value, options, pathFromRoot);
          if (resolved.value === pointer_js_1.nullSymbol) {
            resolved.value = null;
          }
          return resolved;
        } catch (err) {
          if (!options || !options.continueOnError || !(0, errors_js_1.isHandledError)(err)) {
            throw err;
          }
          if (err.path === null) {
            err.path = (0, url_js_1.safePointerToPath)((0, url_js_1.getHash)(pathFromRoot));
          }
          if (err instanceof errors_js_1.InvalidPointerError) {
            err.source = decodeURI((0, url_js_1.stripHash)(pathFromRoot));
          }
          this.addError(err);
          return null;
        }
      }
      /**
       * Sets the value of a nested property within this {@link $Ref#value}.
       * If the property, or any of its parents don't exist, they will be created.
       *
       * @param path - The full path of the property to set, optionally with a JSON pointer in the hash
       * @param value - The value to assign
       */
      set(path, value) {
        const pointer = new pointer_js_1.default(this, path);
        this.value = pointer.set(this.value, value);
        if (this.value === pointer_js_1.nullSymbol) {
          this.value = null;
        }
      }
      /**
       * Determines whether the given value is a JSON reference.
       *
       * @param value - The value to inspect
       * @returns
       */
      static is$Ref(value) {
        return Boolean(value) && typeof value === "object" && value !== null && "$ref" in value && typeof value.$ref === "string" && value.$ref.length > 0;
      }
      /**
       * Determines whether the given value is an external JSON reference.
       *
       * @param value - The value to inspect
       * @returns
       */
      static isExternal$Ref(value) {
        return _$Ref.is$Ref(value) && value.$ref[0] !== "#";
      }
      /**
       * Determines whether the given value is a JSON reference, and whether it is allowed by the options.
       * For example, if it references an external file, then options.resolve.external must be true.
       *
       * @param value - The value to inspect
       * @param options
       * @returns
       */
      static isAllowed$Ref(value, options) {
        if (this.is$Ref(value)) {
          if (value.$ref.substring(0, 2) === "#/" || value.$ref === "#") {
            return true;
          } else if (value.$ref[0] !== "#" && (!options || options.resolve?.external)) {
            return true;
          }
        }
        return void 0;
      }
      /**
       * Determines whether the given value is a JSON reference that "extends" its resolved value.
       * That is, it has extra properties (in addition to "$ref"), so rather than simply pointing to
       * an existing value, this $ref actually creates a NEW value that is a shallow copy of the resolved
       * value, plus the extra properties.
       *
       * @example: {
         person: {
           properties: {
             firstName: { type: string }
             lastName: { type: string }
           }
         }
         employee: {
           properties: {
             $ref: #/person/properties
             salary: { type: number }
           }
         }
       }
       *  In this example, "employee" is an extended $ref, since it extends "person" with an additional
       *  property (salary).  The result is a NEW value that looks like this:
       *
       *  {
       *    properties: {
       *      firstName: { type: string }
       *      lastName: { type: string }
       *      salary: { type: number }
       *    }
       *  }
       *
       * @param value - The value to inspect
       * @returns
       */
      static isExtended$Ref(value) {
        return _$Ref.is$Ref(value) && Object.keys(value).length > 1;
      }
      /**
       * Returns the resolved value of a JSON Reference.
       * If necessary, the resolved value is merged with the JSON Reference to create a new object
       *
       * @example: {
      person: {
        properties: {
          firstName: { type: string }
          lastName: { type: string }
        }
      }
      employee: {
        properties: {
          $ref: #/person/properties
          salary: { type: number }
        }
      }
      } When "person" and "employee" are merged, you end up with the following object:
       *
       *  {
       *    properties: {
       *      firstName: { type: string }
       *      lastName: { type: string }
       *      salary: { type: number }
       *    }
       *  }
       *
       * @param $ref - The JSON reference object (the one with the "$ref" property)
       * @param resolvedValue - The resolved value, which can be any type
       * @returns - Returns the dereferenced value
       */
      static dereference($ref, resolvedValue) {
        if (resolvedValue && typeof resolvedValue === "object" && _$Ref.isExtended$Ref($ref)) {
          const merged = {};
          for (const key of Object.keys($ref)) {
            if (key !== "$ref") {
              merged[key] = $ref[key];
            }
          }
          for (const key of Object.keys(resolvedValue)) {
            if (!(key in merged)) {
              merged[key] = resolvedValue[key];
            }
          }
          return merged;
        } else {
          return resolvedValue;
        }
      }
    };
    exports.default = $Ref;
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/refs.js
var require_refs = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/refs.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var ref_js_1 = __importDefault(require_ref());
    var url = __importStar(require_url());
    var convert_path_to_posix_1 = __importDefault(require_convert_path_to_posix());
    var $Refs = class {
      /**
       * Returns the paths/URLs of all the files in your schema (including the main schema file).
       *
       * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#pathstypes
       *
       * @param types (optional) Optionally only return certain types of paths ("file", "http", etc.)
       */
      paths(...types) {
        const paths = getPaths(this._$refs, types.flat());
        return paths.map((path) => {
          return (0, convert_path_to_posix_1.default)(path.decoded);
        });
      }
      /**
       * Returns a map of paths/URLs and their correspond values.
       *
       * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#valuestypes
       *
       * @param types (optional) Optionally only return values from certain locations ("file", "http", etc.)
       */
      values(...types) {
        const $refs = this._$refs;
        const paths = getPaths($refs, types.flat());
        return paths.reduce((obj, path) => {
          obj[(0, convert_path_to_posix_1.default)(path.decoded)] = $refs[path.encoded].value;
          return obj;
        }, {});
      }
      /**
       * Returns `true` if the given path exists in the schema; otherwise, returns `false`
       *
       * See https://apitools.dev/json-schema-ref-parser/docs/refs.html#existsref
       *
       * @param $ref The JSON Reference path, optionally with a JSON Pointer in the hash
       */
      /**
       * Determines whether the given JSON reference exists.
       *
       * @param path - The path being resolved, optionally with a JSON pointer in the hash
       * @param [options]
       * @returns
       */
      exists(path, options) {
        try {
          this._resolve(path, "", options);
          return true;
        } catch {
          return false;
        }
      }
      /**
       * Resolves the given JSON reference and returns the resolved value.
       *
       * @param path - The path being resolved, with a JSON pointer in the hash
       * @param [options]
       * @returns - Returns the resolved value
       */
      get(path, options) {
        return this._resolve(path, "", options).value;
      }
      /**
       * Sets the value at the given path in the schema. If the property, or any of its parents, don't exist, they will be created.
       *
       * @param path The JSON Reference path, optionally with a JSON Pointer in the hash
       * @param value The value to assign. Can be anything (object, string, number, etc.)
       */
      set(path, value) {
        const absPath = url.resolve(this._root$Ref.path, path);
        const withoutHash = url.stripHash(absPath);
        const $ref = this._$refs[withoutHash];
        if (!$ref) {
          throw (0, ono_1.ono)(`Error resolving $ref pointer "${path}". 
"${withoutHash}" not found.`);
        }
        $ref.set(absPath, value);
      }
      /**
       * Returns the specified {@link $Ref} object, or undefined.
       *
       * @param path - The path being resolved, optionally with a JSON pointer in the hash
       * @returns
       * @protected
       */
      _get$Ref(path) {
        path = url.resolve(this._root$Ref.path, path);
        const withoutHash = url.stripHash(path);
        return this._$refs[withoutHash];
      }
      /**
       * Creates a new {@link $Ref} object and adds it to this {@link $Refs} object.
       *
       * @param path  - The file path or URL of the referenced file
       */
      _add(path) {
        const withoutHash = url.stripHash(path);
        const $ref = new ref_js_1.default(this);
        $ref.path = withoutHash;
        this._$refs[withoutHash] = $ref;
        this._root$Ref = this._root$Ref || $ref;
        return $ref;
      }
      /**
       * Resolves the given JSON reference.
       *
       * @param path - The path being resolved, optionally with a JSON pointer in the hash
       * @param pathFromRoot - The path of `obj` from the schema root
       * @param [options]
       * @returns
       * @protected
       */
      _resolve(path, pathFromRoot, options) {
        const absPath = url.resolve(this._root$Ref.path, path);
        const withoutHash = url.stripHash(absPath);
        const $ref = this._$refs[withoutHash];
        if (!$ref) {
          throw (0, ono_1.ono)(`Error resolving $ref pointer "${path}". 
"${withoutHash}" not found.`);
        }
        return $ref.resolve(absPath, options, path, pathFromRoot);
      }
      constructor() {
        this._$refs = {};
        this.toJSON = this.values;
        this.circular = false;
        this._$refs = {};
        this._root$Ref = null;
      }
    };
    exports.default = $Refs;
    function getPaths($refs, types) {
      let paths = Object.keys($refs);
      types = Array.isArray(types[0]) ? types[0] : Array.prototype.slice.call(types);
      if (types.length > 0 && types[0]) {
        paths = paths.filter((key) => {
          return types.includes($refs[key].pathType);
        });
      }
      return paths.map((path) => {
        return {
          encoded: path,
          decoded: $refs[path].pathType === "file" ? url.toFileSystemPath(path, true) : path
        };
      });
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/plugins.js
var require_plugins = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/plugins.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.all = all;
    exports.filter = filter;
    exports.sort = sort;
    exports.run = run;
    function all(plugins) {
      return Object.keys(plugins || {}).filter((key) => {
        return typeof plugins[key] === "object";
      }).map((key) => {
        plugins[key].name = key;
        return plugins[key];
      });
    }
    function filter(plugins, method, file) {
      return plugins.filter((plugin) => {
        return !!getResult(plugin, method, file);
      });
    }
    function sort(plugins) {
      for (const plugin of plugins) {
        plugin.order = plugin.order || Number.MAX_SAFE_INTEGER;
      }
      return plugins.sort((a, b) => {
        return a.order - b.order;
      });
    }
    async function run(plugins, method, file, $refs) {
      let plugin;
      let lastError;
      let index = 0;
      return new Promise((resolve2, reject) => {
        runNextPlugin();
        function runNextPlugin() {
          plugin = plugins[index++];
          if (!plugin) {
            return reject(lastError);
          }
          try {
            const result = getResult(plugin, method, file, callback, $refs);
            if (result && typeof result.then === "function") {
              result.then(onSuccess, onError);
            } else if (result !== void 0) {
              onSuccess(result);
            } else if (index === plugins.length) {
              throw new Error("No promise has been returned or callback has been called.");
            }
          } catch (e) {
            onError(e);
          }
        }
        function callback(err, result) {
          if (err) {
            onError(err);
          } else {
            onSuccess(result);
          }
        }
        function onSuccess(result) {
          resolve2({
            plugin,
            result
          });
        }
        function onError(error) {
          lastError = {
            plugin,
            error
          };
          runNextPlugin();
        }
      });
    }
    function getResult(obj, prop, file, callback, $refs) {
      const value = obj[prop];
      if (typeof value === "function") {
        return value.apply(obj, [file, callback, $refs]);
      }
      if (!callback) {
        if (value instanceof RegExp) {
          return value.test(file.url);
        } else if (typeof value === "string") {
          return value === file.extension;
        } else if (Array.isArray(value)) {
          return value.indexOf(file.extension) !== -1;
        }
      }
      return value;
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parse.js
var require_parse = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parse.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var url = __importStar(require_url());
    var plugins = __importStar(require_plugins());
    var errors_js_1 = require_errors();
    async function parse(path, $refs, options) {
      const hashIndex = path.indexOf("#");
      let hash = "";
      if (hashIndex >= 0) {
        hash = path.substring(hashIndex);
        path = path.substring(0, hashIndex);
      }
      const $ref = $refs._add(path);
      const file = {
        url: path,
        hash,
        extension: url.getExtension(path)
      };
      try {
        const resolver = await readFile(file, options, $refs);
        $ref.pathType = resolver.plugin.name;
        file.data = resolver.result;
        const parser = await parseFile(file, options, $refs);
        $ref.value = parser.result;
        return parser.result;
      } catch (err) {
        if ((0, errors_js_1.isHandledError)(err)) {
          $ref.value = err;
        }
        throw err;
      }
    }
    async function readFile(file, options, $refs) {
      let resolvers = plugins.all(options.resolve);
      resolvers = plugins.filter(resolvers, "canRead", file);
      plugins.sort(resolvers);
      try {
        const data = await plugins.run(resolvers, "read", file, $refs);
        return data;
      } catch (err) {
        if (!err && options.continueOnError) {
          throw new errors_js_1.UnmatchedResolverError(file.url);
        } else if (!err || !("error" in err)) {
          throw ono_1.ono.syntax(`Unable to resolve $ref pointer "${file.url}"`);
        } else if (err.error instanceof errors_js_1.ResolverError) {
          throw err.error;
        } else {
          throw new errors_js_1.ResolverError(err, file.url);
        }
      }
    }
    async function parseFile(file, options, $refs) {
      const allParsers = plugins.all(options.parse);
      const filteredParsers = plugins.filter(allParsers, "canParse", file);
      const parsers = filteredParsers.length > 0 ? filteredParsers : allParsers;
      plugins.sort(parsers);
      try {
        const parser = await plugins.run(parsers, "parse", file, $refs);
        if (!parser.plugin.allowEmpty && isEmpty(parser.result)) {
          throw ono_1.ono.syntax(`Error parsing "${file.url}" as ${parser.plugin.name}. 
Parsed value is empty`);
        } else {
          return parser;
        }
      } catch (err) {
        if (!err && options.continueOnError) {
          throw new errors_js_1.UnmatchedParserError(file.url);
        } else if (err && err.message && err.message.startsWith("Error parsing")) {
          throw err;
        } else if (!err || !("error" in err)) {
          throw ono_1.ono.syntax(`Unable to parse ${file.url}`);
        } else if (err.error instanceof errors_js_1.ParserError) {
          throw err.error;
        } else {
          throw new errors_js_1.ParserError(err.error.message, file.url);
        }
      }
    }
    function isEmpty(value) {
      return value === void 0 || typeof value === "object" && Object.keys(value).length === 0 || typeof value === "string" && value.trim().length === 0 || Buffer.isBuffer(value) && value.length === 0;
    }
    exports.default = parse;
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/json.js
var require_json2 = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/json.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    var errors_js_1 = require_errors();
    exports.default = {
      /**
       * The order that this parser will run, in relation to other parsers.
       */
      order: 100,
      /**
       * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
       */
      allowEmpty: true,
      /**
       * Determines whether this parser can parse a given file reference.
       * Parsers that match will be tried, in order, until one successfully parses the file.
       * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
       * every parser will be tried.
       */
      canParse: ".json",
      /**
       * Allow JSON files with byte order marks (BOM)
       */
      allowBOM: true,
      /**
       * Parses the given file as JSON
       */
      async parse(file) {
        let data = file.data;
        if (Buffer.isBuffer(data)) {
          data = data.toString();
        }
        if (typeof data === "string") {
          if (data.trim().length === 0) {
            return;
          } else {
            try {
              return JSON.parse(data);
            } catch (e) {
              if (this.allowBOM) {
                try {
                  const firstCurlyBrace = data.indexOf("{");
                  data = data.slice(firstCurlyBrace);
                  return JSON.parse(data);
                } catch (e2) {
                  throw new errors_js_1.ParserError(e2.message, file.url);
                }
              }
              throw new errors_js_1.ParserError(e.message, file.url);
            }
          }
        } else {
          return data;
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/yaml.js
var require_yaml = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/yaml.js"(exports) {
    "use strict";
    init_esm_shims();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var errors_js_1 = require_errors();
    var js_yaml_1 = __importDefault(require_js_yaml());
    var js_yaml_2 = require_js_yaml();
    exports.default = {
      /**
       * The order that this parser will run, in relation to other parsers.
       */
      order: 200,
      /**
       * Whether to allow "empty" files. This includes zero-byte files, as well as empty JSON objects.
       */
      allowEmpty: true,
      /**
       * Determines whether this parser can parse a given file reference.
       * Parsers that match will be tried, in order, until one successfully parses the file.
       * Parsers that don't match will be skipped, UNLESS none of the parsers match, in which case
       * every parser will be tried.
       */
      canParse: [".yaml", ".yml", ".json"],
      // JSON is valid YAML
      /**
       * Parses the given file as YAML
       *
       * @param file           - An object containing information about the referenced file
       * @param file.url       - The full URL of the referenced file
       * @param file.extension - The lowercased file extension (e.g. ".txt", ".html", etc.)
       * @param file.data      - The file contents. This will be whatever data type was returned by the resolver
       * @returns
       */
      async parse(file) {
        let data = file.data;
        if (Buffer.isBuffer(data)) {
          data = data.toString();
        }
        if (typeof data === "string") {
          try {
            return js_yaml_1.default.load(data, { schema: js_yaml_2.JSON_SCHEMA });
          } catch (e) {
            throw new errors_js_1.ParserError(e?.message || "Parser Error", file.url);
          }
        } else {
          return data;
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/text.js
var require_text = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/text.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    var errors_js_1 = require_errors();
    var TEXT_REGEXP = /\.(txt|htm|html|md|xml|js|min|map|css|scss|less|svg)$/i;
    exports.default = {
      /**
       * The order that this parser will run, in relation to other parsers.
       */
      order: 300,
      /**
       * Whether to allow "empty" files (zero bytes).
       */
      allowEmpty: true,
      /**
       * The encoding that the text is expected to be in.
       */
      encoding: "utf8",
      /**
       * Determines whether this parser can parse a given file reference.
       * Parsers that return true will be tried, in order, until one successfully parses the file.
       * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
       * every parser will be tried.
       */
      canParse(file) {
        return (typeof file.data === "string" || Buffer.isBuffer(file.data)) && TEXT_REGEXP.test(file.url);
      },
      /**
       * Parses the given file as text
       */
      parse(file) {
        if (typeof file.data === "string") {
          return file.data;
        } else if (Buffer.isBuffer(file.data)) {
          return file.data.toString(this.encoding);
        } else {
          throw new errors_js_1.ParserError("data is not text", file.url);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/binary.js
var require_binary2 = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/parsers/binary.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    var BINARY_REGEXP = /\.(jpeg|jpg|gif|png|bmp|ico)$/i;
    exports.default = {
      /**
       * The order that this parser will run, in relation to other parsers.
       */
      order: 400,
      /**
       * Whether to allow "empty" files (zero bytes).
       */
      allowEmpty: true,
      /**
       * Determines whether this parser can parse a given file reference.
       * Parsers that return true will be tried, in order, until one successfully parses the file.
       * Parsers that return false will be skipped, UNLESS all parsers returned false, in which case
       * every parser will be tried.
       */
      canParse(file) {
        return Buffer.isBuffer(file.data) && BINARY_REGEXP.test(file.url);
      },
      /**
       * Parses the given data as a Buffer (byte array).
       */
      parse(file) {
        if (Buffer.isBuffer(file.data)) {
          return file.data;
        } else {
          return Buffer.from(file.data);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolvers/file.js
var require_file = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolvers/file.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs_1 = __importDefault(__require("fs"));
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var url = __importStar(require_url());
    var errors_js_1 = require_errors();
    exports.default = {
      /**
       * The order that this resolver will run, in relation to other resolvers.
       */
      order: 100,
      /**
       * Determines whether this resolver can read a given file reference.
       * Resolvers that return true will be tried, in order, until one successfully resolves the file.
       * Resolvers that return false will not be given a chance to resolve the file.
       */
      canRead(file) {
        return url.isFileSystemPath(file.url);
      },
      /**
       * Reads the given file and returns its raw contents as a Buffer.
       */
      async read(file) {
        let path;
        try {
          path = url.toFileSystemPath(file.url);
        } catch (err) {
          throw new errors_js_1.ResolverError(ono_1.ono.uri(err, `Malformed URI: ${file.url}`), file.url);
        }
        try {
          return await fs_1.default.promises.readFile(path);
        } catch (err) {
          throw new errors_js_1.ResolverError((0, ono_1.ono)(err, `Error opening file "${path}"`), path);
        }
      }
    };
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolvers/http.js
var require_http = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolvers/http.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var url = __importStar(require_url());
    var errors_js_1 = require_errors();
    exports.default = {
      /**
       * The order that this resolver will run, in relation to other resolvers.
       */
      order: 200,
      /**
       * HTTP headers to send when downloading files.
       *
       * @example:
       * {
       *   "User-Agent": "JSON Schema $Ref Parser",
       *   Accept: "application/json"
       * }
       */
      headers: null,
      /**
       * HTTP request timeout (in milliseconds).
       */
      timeout: 6e4,
      // 60 seconds
      /**
       * The maximum number of HTTP redirects to follow.
       * To disable automatic following of redirects, set this to zero.
       */
      redirects: 5,
      /**
       * The `withCredentials` option of XMLHttpRequest.
       * Set this to `true` if you're downloading files from a CORS-enabled server that requires authentication
       */
      withCredentials: false,
      /**
       * Determines whether this resolver can read a given file reference.
       * Resolvers that return true will be tried in order, until one successfully resolves the file.
       * Resolvers that return false will not be given a chance to resolve the file.
       */
      canRead(file) {
        return url.isHttp(file.url);
      },
      /**
       * Reads the given URL and returns its raw contents as a Buffer.
       */
      read(file) {
        const u = url.parse(file.url);
        if (typeof window !== "undefined" && !u.protocol) {
          u.protocol = url.parse(location.href).protocol;
        }
        return download(u, this);
      }
    };
    async function download(u, httpOptions, _redirects) {
      u = url.parse(u);
      const redirects = _redirects || [];
      redirects.push(u.href);
      try {
        const res = await get(u, httpOptions);
        if (res.status >= 400) {
          throw (0, ono_1.ono)({ status: res.status }, `HTTP ERROR ${res.status}`);
        } else if (res.status >= 300) {
          if (!Number.isNaN(httpOptions.redirects) && redirects.length > httpOptions.redirects) {
            throw new errors_js_1.ResolverError((0, ono_1.ono)({ status: res.status }, `Error downloading ${redirects[0]}. 
Too many redirects: 
  ${redirects.join(" \n  ")}`));
          } else if (!("location" in res.headers) || !res.headers.location) {
            throw (0, ono_1.ono)({ status: res.status }, `HTTP ${res.status} redirect with no location header`);
          } else {
            const redirectTo = url.resolve(u.href, res.headers.location);
            return download(redirectTo, httpOptions, redirects);
          }
        } else {
          if (res.body) {
            const buf = await res.arrayBuffer();
            return Buffer.from(buf);
          }
          return Buffer.alloc(0);
        }
      } catch (err) {
        throw new errors_js_1.ResolverError((0, ono_1.ono)(err, `Error downloading ${u.href}`), u.href);
      }
    }
    async function get(u, httpOptions) {
      let controller;
      let timeoutId;
      if (httpOptions.timeout) {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), httpOptions.timeout);
      }
      const response = await fetch(u, {
        method: "GET",
        headers: httpOptions.headers || {},
        credentials: httpOptions.withCredentials ? "include" : "same-origin",
        signal: controller ? controller.signal : null
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      return response;
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/options.js
var require_options = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/options.js"(exports) {
    "use strict";
    init_esm_shims();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getNewOptions = exports.getJsonSchemaRefParserDefaultOptions = void 0;
    var json_js_1 = __importDefault(require_json2());
    var yaml_js_1 = __importDefault(require_yaml());
    var text_js_1 = __importDefault(require_text());
    var binary_js_1 = __importDefault(require_binary2());
    var file_js_1 = __importDefault(require_file());
    var http_js_1 = __importDefault(require_http());
    var getJsonSchemaRefParserDefaultOptions = () => {
      const defaults = {
        /**
         * Determines how different types of files will be parsed.
         *
         * You can add additional parsers of your own, replace an existing one with
         * your own implementation, or disable any parser by setting it to false.
         */
        parse: {
          json: { ...json_js_1.default },
          yaml: { ...yaml_js_1.default },
          text: { ...text_js_1.default },
          binary: { ...binary_js_1.default }
        },
        /**
         * Determines how JSON References will be resolved.
         *
         * You can add additional resolvers of your own, replace an existing one with
         * your own implementation, or disable any resolver by setting it to false.
         */
        resolve: {
          file: { ...file_js_1.default },
          http: { ...http_js_1.default },
          /**
           * Determines whether external $ref pointers will be resolved.
           * If this option is disabled, then none of above resolvers will be called.
           * Instead, external $ref pointers will simply be ignored.
           *
           * @type {boolean}
           */
          external: true
        },
        /**
         * By default, JSON Schema $Ref Parser throws the first error it encounters. Setting `continueOnError` to `true`
         * causes it to keep processing as much as possible and then throw a single error that contains all errors
         * that were encountered.
         */
        continueOnError: false,
        /**
         * Determines the types of JSON references that are allowed.
         */
        dereference: {
          /**
           * Dereference circular (recursive) JSON references?
           * If false, then a {@link ReferenceError} will be thrown if a circular reference is found.
           * If "ignore", then circular references will not be dereferenced.
           *
           * @type {boolean|string}
           */
          circular: true,
          /**
           * A function, called for each path, which can return true to stop this path and all
           * subpaths from being dereferenced further. This is useful in schemas where some
           * subpaths contain literal $ref keys that should not be dereferenced.
           *
           * @type {function}
           */
          excludedPathMatcher: () => false,
          referenceResolution: "relative"
        },
        mutateInputSchema: true
      };
      return defaults;
    };
    exports.getJsonSchemaRefParserDefaultOptions = getJsonSchemaRefParserDefaultOptions;
    var getNewOptions = (options) => {
      const newOptions = (0, exports.getJsonSchemaRefParserDefaultOptions)();
      if (options) {
        merge(newOptions, options);
      }
      return newOptions;
    };
    exports.getNewOptions = getNewOptions;
    function merge(target, source) {
      if (isMergeable(source)) {
        const keys = Object.keys(source).filter((key) => !["__proto__", "constructor", "prototype"].includes(key));
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const sourceSetting = source[key];
          const targetSetting = target[key];
          if (isMergeable(sourceSetting)) {
            target[key] = merge(targetSetting || {}, sourceSetting);
          } else if (sourceSetting !== void 0) {
            target[key] = sourceSetting;
          }
        }
      }
      return target;
    }
    function isMergeable(val) {
      return val && typeof val === "object" && !Array.isArray(val) && !(val instanceof RegExp) && !(val instanceof Date);
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/normalize-args.js
var require_normalize_args = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/normalize-args.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.normalizeArgs = normalizeArgs2;
    var options_js_1 = require_options();
    function normalizeArgs2(_args) {
      let path;
      let schema;
      let options;
      let callback;
      const args = Array.prototype.slice.call(_args);
      if (typeof args[args.length - 1] === "function") {
        callback = args.pop();
      }
      if (typeof args[0] === "string") {
        path = args[0];
        if (typeof args[2] === "object") {
          schema = args[1];
          options = args[2];
        } else {
          schema = void 0;
          options = args[1];
        }
      } else {
        path = "";
        schema = args[0];
        options = args[1];
      }
      try {
        options = (0, options_js_1.getNewOptions)(options);
      } catch (e) {
        console.error(`JSON Schema Ref Parser: Error normalizing options: ${e}`);
      }
      if (!options.mutateInputSchema && typeof schema === "object") {
        schema = JSON.parse(JSON.stringify(schema));
      }
      return {
        path,
        schema,
        options,
        callback
      };
    }
    exports.default = normalizeArgs2;
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolve-external.js
var require_resolve_external = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/resolve-external.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var ref_js_1 = __importDefault(require_ref());
    var pointer_js_1 = __importDefault(require_pointer());
    var parse_js_1 = __importDefault(require_parse());
    var url = __importStar(require_url());
    var errors_js_1 = require_errors();
    function resolveExternal(parser, options) {
      if (!options.resolve?.external) {
        return Promise.resolve();
      }
      try {
        const promises = crawl(parser.schema, parser.$refs._root$Ref.path + "#", parser.$refs, options);
        return Promise.all(promises);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    function crawl(obj, path, $refs, options, seen, external) {
      seen || (seen = /* @__PURE__ */ new Set());
      let promises = [];
      if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj) && !seen.has(obj)) {
        seen.add(obj);
        if (ref_js_1.default.isExternal$Ref(obj)) {
          promises.push(resolve$Ref(obj, path, $refs, options));
        }
        const keys = Object.keys(obj);
        for (const key of keys) {
          const keyPath = pointer_js_1.default.join(path, key);
          const value = obj[key];
          promises = promises.concat(crawl(value, keyPath, $refs, options, seen, external));
        }
      }
      return promises;
    }
    async function resolve$Ref($ref, path, $refs, options) {
      const shouldResolveOnCwd = options.dereference?.externalReferenceResolution === "root";
      const resolvedPath = url.resolve(shouldResolveOnCwd ? url.cwd() : path, $ref.$ref);
      const withoutHash = url.stripHash(resolvedPath);
      const ref = $refs._$refs[withoutHash];
      if (ref) {
        return Promise.resolve(ref.value);
      }
      try {
        const result = await (0, parse_js_1.default)(resolvedPath, $refs, options);
        const promises = crawl(result, withoutHash + "#", $refs, options, /* @__PURE__ */ new Set(), true);
        return Promise.all(promises);
      } catch (err) {
        if (!options?.continueOnError || !(0, errors_js_1.isHandledError)(err)) {
          throw err;
        }
        if ($refs._$refs[withoutHash]) {
          err.source = decodeURI(url.stripHash(path));
          err.path = url.safePointerToPath(url.getHash(path));
        }
        return [];
      }
    }
    exports.default = resolveExternal;
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/bundle.js
var require_bundle = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/bundle.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var ref_js_1 = __importDefault(require_ref());
    var pointer_js_1 = __importDefault(require_pointer());
    var url = __importStar(require_url());
    function bundle(parser, options) {
      const inventory = [];
      crawl(parser, "schema", parser.$refs._root$Ref.path + "#", "#", 0, inventory, parser.$refs, options);
      remap(inventory);
    }
    function crawl(parent, key, path, pathFromRoot, indirections, inventory, $refs, options) {
      const obj = key === null ? parent : parent[key];
      if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj)) {
        if (ref_js_1.default.isAllowed$Ref(obj)) {
          inventory$Ref(parent, key, path, pathFromRoot, indirections, inventory, $refs, options);
        } else {
          const keys = Object.keys(obj).sort((a, b) => {
            if (a === "definitions") {
              return -1;
            } else if (b === "definitions") {
              return 1;
            } else {
              return a.length - b.length;
            }
          });
          for (const key2 of keys) {
            const keyPath = pointer_js_1.default.join(path, key2);
            const keyPathFromRoot = pointer_js_1.default.join(pathFromRoot, key2);
            const value = obj[key2];
            if (ref_js_1.default.isAllowed$Ref(value)) {
              inventory$Ref(obj, key2, path, keyPathFromRoot, indirections, inventory, $refs, options);
            } else {
              crawl(obj, key2, keyPath, keyPathFromRoot, indirections, inventory, $refs, options);
            }
          }
        }
      }
    }
    function inventory$Ref($refParent, $refKey, path, pathFromRoot, indirections, inventory, $refs, options) {
      const $ref = $refKey === null ? $refParent : $refParent[$refKey];
      const $refPath = url.resolve(path, $ref.$ref);
      const pointer = $refs._resolve($refPath, pathFromRoot, options);
      if (pointer === null) {
        return;
      }
      const parsed = pointer_js_1.default.parse(pathFromRoot);
      const depth = parsed.length;
      const file = url.stripHash(pointer.path);
      const hash = url.getHash(pointer.path);
      const external = file !== $refs._root$Ref.path;
      const extended = ref_js_1.default.isExtended$Ref($ref);
      indirections += pointer.indirections;
      const existingEntry = findInInventory(inventory, $refParent, $refKey);
      if (existingEntry) {
        if (depth < existingEntry.depth || indirections < existingEntry.indirections) {
          removeFromInventory(inventory, existingEntry);
        } else {
          return;
        }
      }
      inventory.push({
        $ref,
        // The JSON Reference (e.g. {$ref: string})
        parent: $refParent,
        // The object that contains this $ref pointer
        key: $refKey,
        // The key in `parent` that is the $ref pointer
        pathFromRoot,
        // The path to the $ref pointer, from the JSON Schema root
        depth,
        // How far from the JSON Schema root is this $ref pointer?
        file,
        // The file that the $ref pointer resolves to
        hash,
        // The hash within `file` that the $ref pointer resolves to
        value: pointer.value,
        // The resolved value of the $ref pointer
        circular: pointer.circular,
        // Is this $ref pointer DIRECTLY circular? (i.e. it references itself)
        extended,
        // Does this $ref extend its resolved value? (i.e. it has extra properties, in addition to "$ref")
        external,
        // Does this $ref pointer point to a file other than the main JSON Schema file?
        indirections
        // The number of indirect references that were traversed to resolve the value
      });
      if (!existingEntry || external) {
        crawl(pointer.value, null, pointer.path, pathFromRoot, indirections + 1, inventory, $refs, options);
      }
    }
    function remap(inventory) {
      inventory.sort((a, b) => {
        if (a.file !== b.file) {
          return a.file < b.file ? -1 : 1;
        } else if (a.hash !== b.hash) {
          return a.hash < b.hash ? -1 : 1;
        } else if (a.circular !== b.circular) {
          return a.circular ? -1 : 1;
        } else if (a.extended !== b.extended) {
          return a.extended ? 1 : -1;
        } else if (a.indirections !== b.indirections) {
          return a.indirections - b.indirections;
        } else if (a.depth !== b.depth) {
          return a.depth - b.depth;
        } else {
          const aDefinitionsIndex = a.pathFromRoot.lastIndexOf("/definitions");
          const bDefinitionsIndex = b.pathFromRoot.lastIndexOf("/definitions");
          if (aDefinitionsIndex !== bDefinitionsIndex) {
            return bDefinitionsIndex - aDefinitionsIndex;
          } else {
            return a.pathFromRoot.length - b.pathFromRoot.length;
          }
        }
      });
      let file, hash, pathFromRoot;
      for (const entry of inventory) {
        if (!entry.external) {
          entry.$ref.$ref = entry.hash;
        } else if (entry.file === file && entry.hash === hash) {
          entry.$ref.$ref = pathFromRoot;
        } else if (entry.file === file && entry.hash.indexOf(hash + "/") === 0) {
          entry.$ref.$ref = pointer_js_1.default.join(pathFromRoot, pointer_js_1.default.parse(entry.hash.replace(hash, "#")));
        } else {
          file = entry.file;
          hash = entry.hash;
          pathFromRoot = entry.pathFromRoot;
          entry.$ref = entry.parent[entry.key] = ref_js_1.default.dereference(entry.$ref, entry.value);
          if (entry.circular) {
            entry.$ref.$ref = entry.pathFromRoot;
          }
        }
      }
    }
    function findInInventory(inventory, $refParent, $refKey) {
      for (const existingEntry of inventory) {
        if (existingEntry && existingEntry.parent === $refParent && existingEntry.key === $refKey) {
          return existingEntry;
        }
      }
      return void 0;
    }
    function removeFromInventory(inventory, entry) {
      const index = inventory.indexOf(entry);
      inventory.splice(index, 1);
    }
    exports.default = bundle;
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/dereference.js
var require_dereference = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/dereference.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var ref_js_1 = __importDefault(require_ref());
    var pointer_js_1 = __importDefault(require_pointer());
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var url = __importStar(require_url());
    var errors_1 = require_errors();
    exports.default = dereference;
    function dereference(parser, options) {
      const start = Date.now();
      const dereferenced = crawl(parser.schema, parser.$refs._root$Ref.path, "#", /* @__PURE__ */ new Set(), /* @__PURE__ */ new Set(), /* @__PURE__ */ new Map(), parser.$refs, options, start);
      parser.$refs.circular = dereferenced.circular;
      parser.schema = dereferenced.value;
    }
    function crawl(obj, path, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime) {
      let dereferenced;
      const result = {
        value: obj,
        circular: false
      };
      if (options && options.timeoutMs) {
        if (Date.now() - startTime > options.timeoutMs) {
          throw new errors_1.TimeoutError(options.timeoutMs);
        }
      }
      const derefOptions = options.dereference || {};
      const isExcludedPath = derefOptions.excludedPathMatcher || (() => false);
      if (derefOptions?.circular === "ignore" || !processedObjects.has(obj)) {
        if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj) && !isExcludedPath(pathFromRoot)) {
          parents.add(obj);
          processedObjects.add(obj);
          if (ref_js_1.default.isAllowed$Ref(obj, options)) {
            dereferenced = dereference$Ref(obj, path, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime);
            result.circular = dereferenced.circular;
            result.value = dereferenced.value;
          } else {
            for (const key of Object.keys(obj)) {
              const keyPath = pointer_js_1.default.join(path, key);
              const keyPathFromRoot = pointer_js_1.default.join(pathFromRoot, key);
              if (isExcludedPath(keyPathFromRoot)) {
                continue;
              }
              const value = obj[key];
              let circular = false;
              if (ref_js_1.default.isAllowed$Ref(value, options)) {
                dereferenced = dereference$Ref(value, keyPath, keyPathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime);
                circular = dereferenced.circular;
                if (obj[key] !== dereferenced.value) {
                  const preserved = /* @__PURE__ */ new Map();
                  if (derefOptions?.preservedProperties) {
                    if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
                      derefOptions?.preservedProperties.forEach((prop) => {
                        if (prop in obj[key]) {
                          preserved.set(prop, obj[key][prop]);
                        }
                      });
                    }
                  }
                  obj[key] = dereferenced.value;
                  if (derefOptions?.preservedProperties) {
                    if (preserved.size && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
                      preserved.forEach((value2, prop) => {
                        obj[key][prop] = value2;
                      });
                    }
                  }
                  derefOptions?.onDereference?.(value.$ref, obj[key], obj, key);
                }
              } else {
                if (!parents.has(value)) {
                  dereferenced = crawl(value, keyPath, keyPathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime);
                  circular = dereferenced.circular;
                  if (obj[key] !== dereferenced.value) {
                    obj[key] = dereferenced.value;
                  }
                } else {
                  circular = foundCircularReference(keyPath, $refs, options);
                }
              }
              result.circular = result.circular || circular;
            }
          }
          parents.delete(obj);
        }
      }
      return result;
    }
    function dereference$Ref($ref, path, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime) {
      const isExternalRef = ref_js_1.default.isExternal$Ref($ref);
      const shouldResolveOnCwd = isExternalRef && options?.dereference?.externalReferenceResolution === "root";
      const $refPath = url.resolve(shouldResolveOnCwd ? url.cwd() : path, $ref.$ref);
      const cache = dereferencedCache.get($refPath);
      if (cache && !cache.circular) {
        const refKeys = Object.keys($ref);
        if (refKeys.length > 1) {
          const extraKeys = {};
          for (const key of refKeys) {
            if (key !== "$ref" && !(key in cache.value)) {
              extraKeys[key] = $ref[key];
            }
          }
          return {
            circular: cache.circular,
            value: Object.assign({}, cache.value, extraKeys)
          };
        }
        return cache;
      }
      const pointer = $refs._resolve($refPath, path, options);
      if (pointer === null) {
        return {
          circular: false,
          value: null
        };
      }
      const directCircular = pointer.circular;
      let circular = directCircular || parents.has(pointer.value);
      if (circular) {
        foundCircularReference(path, $refs, options);
      }
      let dereferencedValue = ref_js_1.default.dereference($ref, pointer.value);
      if (!circular) {
        const dereferenced = crawl(dereferencedValue, pointer.path, pathFromRoot, parents, processedObjects, dereferencedCache, $refs, options, startTime);
        circular = dereferenced.circular;
        dereferencedValue = dereferenced.value;
      }
      if (circular && !directCircular && options.dereference?.circular === "ignore") {
        dereferencedValue = $ref;
      }
      if (directCircular) {
        dereferencedValue.$ref = pathFromRoot;
      }
      const dereferencedObject = {
        circular,
        value: dereferencedValue
      };
      if (Object.keys($ref).length === 1) {
        dereferencedCache.set($refPath, dereferencedObject);
      }
      return dereferencedObject;
    }
    function foundCircularReference(keyPath, $refs, options) {
      $refs.circular = true;
      options?.dereference?.onCircular?.(keyPath);
      if (!options.dereference.circular) {
        throw ono_1.ono.reference(`Circular $ref pointer found at ${keyPath}`);
      }
      return true;
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/next.js
var require_next = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/next.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    function makeNext() {
      if (typeof process === "object" && typeof process.nextTick === "function") {
        return process.nextTick;
      } else if (typeof setImmediate === "function") {
        return setImmediate;
      } else {
        return function next(f) {
          setTimeout(f, 0);
        };
      }
    }
    exports.default = makeNext();
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/maybe.js
var require_maybe = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/util/maybe.js"(exports) {
    "use strict";
    init_esm_shims();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = maybe;
    var next_js_1 = __importDefault(require_next());
    function maybe(cb, promise) {
      if (cb) {
        promise.then(function(result) {
          (0, next_js_1.default)(function() {
            cb(null, result);
          });
        }, function(err) {
          (0, next_js_1.default)(function() {
            cb(err);
          });
        });
        return void 0;
      } else {
        return promise;
      }
    }
  }
});

// ../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/index.js
var require_lib = __commonJS({
  "../../node_modules/.pnpm/@apidevtools+json-schema-ref-parser@11.9.3/node_modules/@apidevtools/json-schema-ref-parser/dist/lib/index.js"(exports) {
    "use strict";
    init_esm_shims();
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getJsonSchemaRefParserDefaultOptions = exports.jsonSchemaParserNormalizeArgs = exports.dereferenceInternal = exports.JSONParserErrorGroup = exports.isHandledError = exports.UnmatchedParserError = exports.ParserError = exports.ResolverError = exports.MissingPointerError = exports.InvalidPointerError = exports.JSONParserError = exports.UnmatchedResolverError = exports.dereference = exports.bundle = exports.resolve = exports.parse = exports.$RefParser = void 0;
    var refs_js_1 = __importDefault(require_refs());
    var parse_js_1 = __importDefault(require_parse());
    var normalize_args_js_1 = __importDefault(require_normalize_args());
    exports.jsonSchemaParserNormalizeArgs = normalize_args_js_1.default;
    var resolve_external_js_1 = __importDefault(require_resolve_external());
    var bundle_js_1 = __importDefault(require_bundle());
    var dereference_js_1 = __importDefault(require_dereference());
    exports.dereferenceInternal = dereference_js_1.default;
    var url = __importStar(require_url());
    var errors_js_1 = require_errors();
    Object.defineProperty(exports, "JSONParserError", { enumerable: true, get: function() {
      return errors_js_1.JSONParserError;
    } });
    Object.defineProperty(exports, "InvalidPointerError", { enumerable: true, get: function() {
      return errors_js_1.InvalidPointerError;
    } });
    Object.defineProperty(exports, "MissingPointerError", { enumerable: true, get: function() {
      return errors_js_1.MissingPointerError;
    } });
    Object.defineProperty(exports, "ResolverError", { enumerable: true, get: function() {
      return errors_js_1.ResolverError;
    } });
    Object.defineProperty(exports, "ParserError", { enumerable: true, get: function() {
      return errors_js_1.ParserError;
    } });
    Object.defineProperty(exports, "UnmatchedParserError", { enumerable: true, get: function() {
      return errors_js_1.UnmatchedParserError;
    } });
    Object.defineProperty(exports, "UnmatchedResolverError", { enumerable: true, get: function() {
      return errors_js_1.UnmatchedResolverError;
    } });
    Object.defineProperty(exports, "isHandledError", { enumerable: true, get: function() {
      return errors_js_1.isHandledError;
    } });
    Object.defineProperty(exports, "JSONParserErrorGroup", { enumerable: true, get: function() {
      return errors_js_1.JSONParserErrorGroup;
    } });
    var ono_1 = (init_esm(), __toCommonJS(esm_exports));
    var maybe_js_1 = __importDefault(require_maybe());
    var options_js_1 = require_options();
    Object.defineProperty(exports, "getJsonSchemaRefParserDefaultOptions", { enumerable: true, get: function() {
      return options_js_1.getJsonSchemaRefParserDefaultOptions;
    } });
    var $RefParser = class _$RefParser {
      constructor() {
        this.schema = null;
        this.$refs = new refs_js_1.default();
      }
      async parse() {
        const args = (0, normalize_args_js_1.default)(arguments);
        let promise;
        if (!args.path && !args.schema) {
          const err = (0, ono_1.ono)(`Expected a file path, URL, or object. Got ${args.path || args.schema}`);
          return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
        this.schema = null;
        this.$refs = new refs_js_1.default();
        let pathType = "http";
        if (url.isFileSystemPath(args.path)) {
          args.path = url.fromFileSystemPath(args.path);
          pathType = "file";
        } else if (!args.path && args.schema && "$id" in args.schema && args.schema.$id) {
          const params = url.parse(args.schema.$id);
          const port = params.protocol === "https:" ? 443 : 80;
          args.path = `${params.protocol}//${params.hostname}:${port}`;
        }
        args.path = url.resolve(url.cwd(), args.path);
        if (args.schema && typeof args.schema === "object") {
          const $ref = this.$refs._add(args.path);
          $ref.value = args.schema;
          $ref.pathType = pathType;
          promise = Promise.resolve(args.schema);
        } else {
          promise = (0, parse_js_1.default)(args.path, this.$refs, args.options);
        }
        try {
          const result = await promise;
          if (result !== null && typeof result === "object" && !Buffer.isBuffer(result)) {
            this.schema = result;
            return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
          } else if (args.options.continueOnError) {
            this.schema = null;
            return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
          } else {
            throw ono_1.ono.syntax(`"${this.$refs._root$Ref.path || result}" is not a valid JSON Schema`);
          }
        } catch (err) {
          if (!args.options.continueOnError || !(0, errors_js_1.isHandledError)(err)) {
            return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
          }
          if (this.$refs._$refs[url.stripHash(args.path)]) {
            this.$refs._$refs[url.stripHash(args.path)].addError(err);
          }
          return (0, maybe_js_1.default)(args.callback, Promise.resolve(null));
        }
      }
      static parse() {
        const parser = new _$RefParser();
        return parser.parse.apply(parser, arguments);
      }
      async resolve() {
        const args = (0, normalize_args_js_1.default)(arguments);
        try {
          await this.parse(args.path, args.schema, args.options);
          await (0, resolve_external_js_1.default)(this, args.options);
          finalize(this);
          return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.$refs));
        } catch (err) {
          return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
      }
      static resolve() {
        const instance = new _$RefParser();
        return instance.resolve.apply(instance, arguments);
      }
      static bundle() {
        const instance = new _$RefParser();
        return instance.bundle.apply(instance, arguments);
      }
      async bundle() {
        const args = (0, normalize_args_js_1.default)(arguments);
        try {
          await this.resolve(args.path, args.schema, args.options);
          (0, bundle_js_1.default)(this, args.options);
          finalize(this);
          return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
        } catch (err) {
          return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
      }
      static dereference() {
        const instance = new _$RefParser();
        return instance.dereference.apply(instance, arguments);
      }
      async dereference() {
        const args = (0, normalize_args_js_1.default)(arguments);
        try {
          await this.resolve(args.path, args.schema, args.options);
          (0, dereference_js_1.default)(this, args.options);
          finalize(this);
          return (0, maybe_js_1.default)(args.callback, Promise.resolve(this.schema));
        } catch (err) {
          return (0, maybe_js_1.default)(args.callback, Promise.reject(err));
        }
      }
    };
    exports.$RefParser = $RefParser;
    exports.default = $RefParser;
    function finalize(parser) {
      const errors = errors_js_1.JSONParserErrorGroup.getParserErrors(parser);
      if (errors.length > 0) {
        throw new errors_js_1.JSONParserErrorGroup(parser);
      }
    }
    exports.parse = $RefParser.parse;
    exports.resolve = $RefParser.resolve;
    exports.bundle = $RefParser.bundle;
    exports.dereference = $RefParser.dereference;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/resolver.js
var require_resolver = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/resolver.js"(exports) {
    "use strict";
    init_esm_shims();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
          resolve2(value);
        });
      }
      return new (P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dereference = void 0;
    var json_schema_ref_parser_1 = require_lib();
    var utils_1 = require_utils();
    function dereference(schema_1, _a) {
      return __awaiter(this, arguments, void 0, function* (schema, { cwd, $refOptions }) {
        (0, utils_1.log)("green", "dereferencer", "Dereferencing input schema:", cwd, schema);
        const parser = new json_schema_ref_parser_1.$RefParser();
        const dereferencedPaths = /* @__PURE__ */ new WeakMap();
        const dereferencedSchema = yield parser.dereference(cwd, schema, Object.assign(Object.assign({}, $refOptions), { dereference: Object.assign(Object.assign({}, $refOptions.dereference), { onDereference($ref, schema2) {
          dereferencedPaths.set(schema2, $ref);
        } }) }));
        return { dereferencedPaths, dereferencedSchema };
      });
    }
    exports.dereference = dereference;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/validator.js
var require_validator = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/validator.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validate = void 0;
    var utils_1 = require_utils();
    var rules = /* @__PURE__ */ new Map();
    rules.set("Enum members and tsEnumNames must be of the same length", (schema) => {
      if (schema.enum && schema.tsEnumNames && schema.enum.length !== schema.tsEnumNames.length) {
        return false;
      }
    });
    rules.set("tsEnumNames must be an array of strings", (schema) => {
      if (schema.tsEnumNames && schema.tsEnumNames.some((_) => typeof _ !== "string")) {
        return false;
      }
    });
    rules.set("When both maxItems and minItems are present, maxItems >= minItems", (schema) => {
      const { maxItems, minItems } = schema;
      if (typeof maxItems === "number" && typeof minItems === "number") {
        return maxItems >= minItems;
      }
    });
    rules.set("When maxItems exists, maxItems >= 0", (schema) => {
      const { maxItems } = schema;
      if (typeof maxItems === "number") {
        return maxItems >= 0;
      }
    });
    rules.set("When minItems exists, minItems >= 0", (schema) => {
      const { minItems } = schema;
      if (typeof minItems === "number") {
        return minItems >= 0;
      }
    });
    rules.set("deprecated must be a boolean", (schema) => {
      const typeOfDeprecated = typeof schema.deprecated;
      return typeOfDeprecated === "boolean" || typeOfDeprecated === "undefined";
    });
    function validate(schema, filename) {
      const errors = [];
      rules.forEach((rule, ruleName) => {
        (0, utils_1.traverse)(schema, (schema2, key) => {
          if (rule(schema2) === false) {
            errors.push(`Error at key "${key}" in file "${filename}": ${ruleName}`);
          }
          return schema2;
        });
      });
      return errors;
    }
    exports.validate = validate;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/linker.js
var require_linker = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/linker.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.link = void 0;
    var JSONSchema_1 = require_JSONSchema();
    var lodash_1 = require_lodash();
    function link(schema, parent = null) {
      if (!Array.isArray(schema) && !(0, lodash_1.isPlainObject)(schema)) {
        return schema;
      }
      if (schema.hasOwnProperty(JSONSchema_1.Parent)) {
        return schema;
      }
      Object.defineProperty(schema, JSONSchema_1.Parent, {
        enumerable: false,
        value: parent,
        writable: false
      });
      if (Array.isArray(schema)) {
        schema.forEach((child) => link(child, schema));
      }
      for (const key in schema) {
        link(schema[key], schema);
      }
      return schema;
    }
    exports.link = link;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/optionValidator.js
var require_optionValidator = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/optionValidator.js"(exports) {
    "use strict";
    init_esm_shims();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.validateOptions = void 0;
    function validateOptions({ maxItems }) {
      if (maxItems !== void 0 && maxItems < -1) {
        throw RangeError(`Expected options.maxItems to be >= -1, but was given ${maxItems}.`);
      }
    }
    exports.validateOptions = validateOptions;
  }
});

// ../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/index.js
var require_src = __commonJS({
  "../../node_modules/.pnpm/json-schema-to-typescript@15.0.4/node_modules/json-schema-to-typescript/dist/src/index.js"(exports) {
    "use strict";
    init_esm_shims();
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve2) {
          resolve2(value);
        });
      }
      return new (P || (P = Promise))(function(resolve2, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve2(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ValidationError = exports.compile = exports.compileFromFile = exports.DEFAULT_OPTIONS = void 0;
    var fs_1 = __require("fs");
    var lodash_1 = require_lodash();
    var path_1 = __require("path");
    var formatter_1 = require_formatter();
    var generator_1 = require_generator();
    var normalizer_1 = require_normalizer();
    var optimizer_1 = require_optimizer();
    var parser_1 = require_parser();
    var resolver_1 = require_resolver();
    var utils_1 = require_utils();
    var validator_1 = require_validator();
    var util_1 = __require("util");
    var linker_1 = require_linker();
    var optionValidator_1 = require_optionValidator();
    exports.DEFAULT_OPTIONS = {
      $refOptions: {},
      additionalProperties: true,
      // TODO: default to empty schema (as per spec) instead
      bannerComment: `/* eslint-disable */
/**
* This file was automatically generated by json-schema-to-typescript.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run json-schema-to-typescript to regenerate this file.
*/`,
      cwd: process.cwd(),
      declareExternallyReferenced: true,
      enableConstEnums: true,
      inferStringEnumKeysFromValues: false,
      format: true,
      ignoreMinAndMaxItems: false,
      maxItems: 20,
      strictIndexSignatures: false,
      style: {
        bracketSpacing: false,
        printWidth: 120,
        semi: true,
        singleQuote: false,
        tabWidth: 2,
        trailingComma: "none",
        useTabs: false
      },
      unreachableDefinitions: false,
      unknownAny: true
    };
    function compileFromFile(filename, options = exports.DEFAULT_OPTIONS) {
      const schema = parseAsJSONSchema(filename);
      return compile2(schema, (0, utils_1.stripExtension)(filename), Object.assign({ cwd: (0, path_1.dirname)(filename) }, options));
    }
    exports.compileFromFile = compileFromFile;
    function parseAsJSONSchema(filename) {
      const contents = (0, utils_1.Try)(() => (0, fs_1.readFileSync)(filename), () => {
        throw new ReferenceError(`Unable to read file "${filename}"`);
      });
      return (0, utils_1.parseFileAsJSONSchema)(filename, contents.toString());
    }
    function compile2(schema_1, name_1) {
      return __awaiter(this, arguments, void 0, function* (schema, name, options = {}) {
        (0, optionValidator_1.validateOptions)(options);
        const _options = (0, lodash_1.merge)({}, exports.DEFAULT_OPTIONS, options);
        const start = Date.now();
        function time() {
          return `(${Date.now() - start}ms)`;
        }
        if (!(0, lodash_1.endsWith)(_options.cwd, "/")) {
          _options.cwd += "/";
        }
        const _schema = (0, lodash_1.cloneDeep)(schema);
        const { dereferencedPaths, dereferencedSchema } = yield (0, resolver_1.dereference)(_schema, _options);
        if (process.env.VERBOSE) {
          if ((0, util_1.isDeepStrictEqual)(_schema, dereferencedSchema)) {
            (0, utils_1.log)("green", "dereferencer", time(), "\u2705 No change");
          } else {
            (0, utils_1.log)("green", "dereferencer", time(), "\u2705 Result:", dereferencedSchema);
          }
        }
        const linked = (0, linker_1.link)(dereferencedSchema);
        if (process.env.VERBOSE) {
          (0, utils_1.log)("green", "linker", time(), "\u2705 No change");
        }
        const errors = (0, validator_1.validate)(linked, name);
        if (errors.length) {
          errors.forEach((_) => (0, utils_1.error)(_));
          throw new ValidationError();
        }
        if (process.env.VERBOSE) {
          (0, utils_1.log)("green", "validator", time(), "\u2705 No change");
        }
        const normalized = (0, normalizer_1.normalize)(linked, dereferencedPaths, name, _options);
        (0, utils_1.log)("yellow", "normalizer", time(), "\u2705 Result:", normalized);
        const parsed = (0, parser_1.parse)(normalized, _options);
        (0, utils_1.log)("blue", "parser", time(), "\u2705 Result:", parsed);
        const optimized = (0, optimizer_1.optimize)(parsed, _options);
        (0, utils_1.log)("cyan", "optimizer", time(), "\u2705 Result:", optimized);
        const generated = (0, generator_1.generate)(optimized, _options);
        (0, utils_1.log)("magenta", "generator", time(), "\u2705 Result:", generated);
        const formatted = yield (0, formatter_1.format)(generated, _options);
        (0, utils_1.log)("white", "formatter", time(), "\u2705 Result:", formatted);
        return formatted;
      });
    }
    exports.compile = compile2;
    var ValidationError = class extends Error {
    };
    exports.ValidationError = ValidationError;
  }
});

// src/cli/bin.ts
init_esm_shims();
import { writeFileSync } from "fs";
import { resolve } from "path";

// src/cli/config.ts
init_esm_shims();

// src/cli/define-config.ts
init_esm_shims();

// src/cli/config.ts
async function loadConfig(cwd) {
  const { existsSync } = await import("fs");
  const { join } = await import("path");
  const tsPath = join(cwd, "mcp.config.ts");
  const jsonPath = join(cwd, "mcp.config.json");
  if (existsSync(tsPath)) {
    const { createJiti } = await import("./jiti-ZDKU66JG.js");
    const jiti = createJiti(import.meta.url);
    const mod = await jiti.import(tsPath);
    return mod.default;
  }
  if (existsSync(jsonPath)) {
    const { readFileSync } = await import("fs");
    return JSON.parse(readFileSync(jsonPath, "utf8"));
  }
  throw new Error("No mcp.config.ts or mcp.config.json found in " + cwd);
}

// src/cli/introspect.ts
init_esm_shims();
import { Client } from "@modelcontextprotocol/client";

// src/list-pages.ts
init_esm_shims();
var DEFAULT_MAX_LIST_PAGES = 100;
async function listPages(fetchPage, options) {
  const maxPages = options?.maxPages ?? DEFAULT_MAX_LIST_PAGES;
  const items = [];
  let cursor;
  let pageCount = 0;
  do {
    pageCount++;
    if (pageCount > maxPages) {
      throw new Error(`MCP list pagination exceeded ${maxPages} pages`);
    }
    const page = await fetchPage(cursor);
    items.push(...page.items);
    const nextCursor = page.nextCursor;
    if (nextCursor !== void 0 && nextCursor === cursor) {
      throw new Error("MCP list pagination repeated a cursor");
    }
    cursor = nextCursor;
  } while (cursor);
  return items;
}

// src/transport.ts
init_esm_shims();
import {
  SSEClientTransport,
  StreamableHTTPClientTransport
} from "@modelcontextprotocol/client";
function isTransportInstance(input) {
  return "start" in input && typeof input.start === "function";
}
async function resolveTransport(input) {
  if (isTransportInstance(input)) return input;
  switch (input.type) {
    case "http":
      return new StreamableHTTPClientTransport(new URL(input.url), {
        requestInit: { headers: input.headers },
        fetch: input.fetch,
        authProvider: input.authProvider
      });
    case "sse":
      return new SSEClientTransport(new URL(input.url), {
        requestInit: { headers: input.headers },
        fetch: input.fetch,
        authProvider: input.authProvider
      });
    case "stdio":
      throw new Error(
        "stdio transport must be created via '@tanstack/ai-mcp/stdio': import { stdioTransport } from '@tanstack/ai-mcp/stdio' and pass the result as `transport`."
      );
    default: {
      const unknownConfig = input;
      throw new Error(
        `Unknown MCP transport config: ${JSON.stringify(unknownConfig)}`
      );
    }
  }
}

// src/cli/introspect.ts
function fetchListPage(client, method, cursor) {
  if (cursor === void 0) {
    return client.request({ method });
  }
  const params = { cursor };
  return client.request({ method, params });
}
async function introspectFromTransport(transport) {
  const client = new Client(
    { name: "tanstack-ai-mcp-codegen", version: "0.0.1" },
    { versionNegotiation: { mode: "auto" } }
  );
  try {
    await client.connect(transport);
    const reported = client.getServerCapabilities();
    const serverListsTools = reported?.tools !== void 0;
    const serverListsResources = reported?.resources !== void 0;
    const serverListsPrompts = reported?.prompts !== void 0;
    const tools = serverListsTools ? await listPages(async (cursor) => {
      const page = await fetchListPage(client, "tools/list", cursor);
      return { items: page.tools, nextCursor: page.nextCursor };
    }) : [];
    const resources = serverListsResources ? await listPages(async (cursor) => {
      const page = await fetchListPage(client, "resources/list", cursor);
      return { items: page.resources, nextCursor: page.nextCursor };
    }) : [];
    const prompts = serverListsPrompts ? await listPages(async (cursor) => {
      const page = await fetchListPage(client, "prompts/list", cursor);
      return { items: page.prompts, nextCursor: page.nextCursor };
    }) : [];
    const capabilities = {};
    if (reported !== void 0) {
      const entries = Object.entries(reported);
      for (const [key, entry] of entries) {
        capabilities[key] = entry;
      }
    }
    return {
      tools: tools.map((tool) => ({
        name: tool.name,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        description: tool.description
      })),
      resources: resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name
      })),
      prompts: prompts.map((prompt) => ({
        name: prompt.name,
        arguments: prompt.arguments
      })),
      capabilities
    };
  } finally {
    await client.close().catch(() => void 0);
  }
}
async function introspectServer(config) {
  const transport = await resolveTransport(config.transport);
  return introspectFromTransport(transport);
}

// src/cli/emit.ts
init_esm_shims();
var import_json_schema_to_typescript = __toESM(require_src(), 1);
function pascal(name) {
  const base = name.replace(/[^a-zA-Z0-9]+/g, " ").split(" ").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
  const safe = base || "Generated";
  return /^[A-Za-z_]/.test(safe) ? safe : `_${safe}`;
}
function tsString(value) {
  return JSON.stringify(value);
}
async function schemaToType(schema, typeName) {
  if (!schema || typeof schema !== "object") return "unknown";
  const compiled = await (0, import_json_schema_to_typescript.compile)(schema, typeName, {
    bannerComment: "",
    additionalProperties: false,
    declareExternallyReferenced: true
  });
  return compiled.trim();
}
async function emitDescriptors(input) {
  const blocks = [
    "// AUTO-GENERATED by `npx @tanstack/ai-mcp generate`. Do not edit.",
    "import type { ServerDescriptor } from '@tanstack/ai-mcp'",
    ""
  ];
  const mapEntries = [];
  const seenIfaces = /* @__PURE__ */ new Set();
  for (const [serverName, { prefix, surface }] of Object.entries(input)) {
    const iface = `${pascal(serverName)}Server`;
    if (seenIfaces.has(iface)) {
      throw new Error(
        `Interface name collision for server key "${serverName}" -> ${iface}. Rename one of the colliding servers in your codegen config.`
      );
    }
    seenIfaces.add(iface);
    mapEntries.push([serverName, iface]);
    const toolEntries = [];
    for (const tool of surface.tools) {
      const key = prefix ? `${prefix}_${tool.name}` : tool.name;
      const inputType = await schemaToType(
        tool.inputSchema,
        `${pascal(key)}Input`
      );
      const outputType = tool.outputSchema ? await schemaToType(tool.outputSchema, `${pascal(key)}Output`) : "unknown";
      toolEntries.push(
        `    ${tsString(key)}: { input: ${inlineBody(inputType)}; output: ${inlineBody(outputType)} }`
      );
    }
    blocks.push(
      `export interface ${iface} extends ServerDescriptor {`,
      `  tools: {`,
      toolEntries.join("\n"),
      `  }`,
      `  resources: ${emitResources(surface)}`,
      `  prompts: ${emitPrompts(surface)}`,
      `  capabilities: ${JSON.stringify(surface.capabilities)} & Record<string, unknown>`,
      `}`,
      ""
    );
  }
  blocks.push(
    "export interface MCPServers extends Record<string, ServerDescriptor> {",
    ...mapEntries.map(([key, iface]) => `  ${tsString(key)}: ${iface}`),
    "}",
    ""
  );
  return blocks.join("\n");
}
function inlineBody(compiled) {
  const brace = compiled.indexOf("{");
  return brace >= 0 ? compiled.slice(brace).replace(/\n/g, " ").trim() : "unknown";
}
function emitResources(s) {
  if (!s.resources.length) return "{}";
  return `{ ${s.resources.map(
    (r) => `${tsString(r.uri)}: { uri: ${tsString(r.uri)}; data: unknown }`
  ).join("; ")} }`;
}
function emitPrompts(s) {
  if (!s.prompts.length) return "{}";
  return `{ ${s.prompts.map(
    (p) => `${tsString(p.name)}: { args: Record<string, string>; messages: unknown }`
  ).join("; ")} }`;
}

// src/cli/bin.ts
async function generate(cwd = process.cwd()) {
  const config = await loadConfig(cwd);
  const input = {};
  for (const [name, server] of Object.entries(config.servers)) {
    process.stderr.write(`Introspecting MCP server "${name}"\u2026
`);
    const surface = await introspectServer(server);
    input[name] = { prefix: server.prefix, surface };
  }
  const out = await emitDescriptors(input);
  const outPath = resolve(cwd, config.outFile);
  writeFileSync(outPath, out, "utf8");
  process.stderr.write(`Wrote ${outPath}
`);
}
var cmd = process.argv[2];
if (cmd === "generate") {
  generate().catch((err) => {
    const msg = err instanceof Error ? err.stack ?? String(err) : String(err);
    process.stderr.write(msg + "\n");
    process.exit(1);
  });
} else {
  process.stderr.write("Usage: tanstack-ai-mcp generate\n");
  process.exit(cmd ? 1 : 0);
}
/*! Bundled license information:

lodash/lodash.js:
  (**
   * @license
   * Lodash <https://lodash.com/>
   * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *)
*/
