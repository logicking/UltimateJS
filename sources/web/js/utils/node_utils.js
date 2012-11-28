// Inheritance pattern
Function.prototype.inheritsFrom = function(parentClassOrObject) {
	if (parentClassOrObject.constructor == Function) {
		// Normal Inheritance
		this.prototype = new parentClassOrObject;
		this.prototype.constructor = this;
		this.parent = parentClassOrObject.prototype;
	} else {
		// Pure Virtual Inheritance
		this.prototype = parentClassOrObject;
		this.prototype.constructor = this;
		this.parent = parentClassOrObject;
	}
	return this;
};

function popElementFromArray(item, items) {
	for ( var i = 0; i < items.length; i++) {
		if (items[i] === item) {
			items.splice(i, 1);
			i--;
			return;
		}
	}
};

function popAllElementsFromArray(items) {
	items.splice(0, items.length);
}

function isInArray(item, items) {
	var count = 0;
	for ( var i = 0; i < items.length; i++) {
		if (items[i] === item) {
			count++;
		}
	}
	return count;
}

function getCursorPositionXY(e) {
	var x;
	var y;
	if (isMobile()) {
		x = e.pageX;
		y = e.pageY;
	} else {
		x = e.clientX; // + document.body.scrollLeft +
		// document.documentElement.scrollLeft;
		y = e.clientY; // + document.body.scrollTop +
		// document.documentElement.scrollTop;
	}

	// x = Math.min(x, grid.canvas.width * grid.itemWidth);
	// y = Math.min(y, grid.canvas.height * grid.itemHeight);

	// alert("Cursor position is "+x+":"+y);

	return {
		x : x,
		y : y
	};
};

// Performs crossbrowser transfrom via JQuery
function cssTransform(obj, matrix, rotate, scaleX, scaleY, translate) {

	var transform = "";

	if (matrix != null) {
		transform += "matrix(" + matrix + ")";
	}

	if (Device.supports3dTransfrom()) {
		if (translate != null) {
			transform += " translate3d(" + translate.x + "px, " + translate.y
					+ "px, 0px)";
		}
		if (rotate != null) {
			transform += " rotate3d(0, 0, 1, " + rotate + "deg)";
		}
		if (scaleX || scaleY) {
			scaleX = scaleX ? scaleX : 1;
			scaleY = scaleY ? scaleY : 1;
			transform += " scale3d(" + scaleX + ", " + scaleY + ", 1)";
		}
	} else {
		if (translate != null) {

			transform += " translateX(" + translate.x + "px)";
			transform += " translateY(" + translate.y + "px)";
		}
		if (rotate != null) {
			transform += " rotate(" + rotate + "deg)";
		}
		if (scaleX != null) {
			transform += " scaleX(" + scaleX + ")";
		}
		if (scaleY != null) {
			transform += " scaleY(" + scaleY + ")";
		}
	}

	obj['css']("-webkit-transform", transform);
	obj['css']("-moz-transform", transform);
	obj['css']("transform", transform);
	obj['css']("-o-transform", transform);
	obj['css']("transform", transform);
	obj['css']("msTransform", transform);
	// Should be fixed in the upcoming JQuery to use instead of 'msTransform'
	// http://bugs.jquery.com/ticket/9572
	// obj['css']("-ms-transform", transform);
}

// Generate unique ID number
var uniqueId = (function() {
	var id = 0; // This is the private persistent value
	// The outer function returns a nested function that has access
	// to the persistent value. It is this nested function we're storing
	// in the variable uniqueID above.
	return function() {
		return id++;
	}; // Return and increment
})(); // Invoke the outer function after defining it.

// Console hack for IE
//if(typeof console == "undefined") {
//	var console = {log : function()  {}};
//}


function eLog(message, tag, level) {
	if (!eLog.displayF)
		return;
	if (level && level > eLog.currentLevel)
		return;
	if (tag)
		eLog.displayF(tag + " :  " + message);
	else
		eLog.displayF(message);
};
eLog.displayF = function(msg) {
	try {
		console.log(msg);
	} catch (e) {
	}
};

eLog.currentLevel = 1;

/*
 * Unselectable items
 */

function preventDefaultEventFunction(event) {
	// console.log("preventDefaultEventFunction");
	event.preventDefault();
	return false;
};

function makeUnselectable(obj) {
	obj.addClass("unselectable");
	obj['bind']("touchstart", function(e) {
		e.preventDefault();
		return false;
	});
	obj['bind']("touchmove", function(e) {
		e.preventDefault();
		return false;
	});
	obj['bind']("touchend", function(e) {
		e.preventDefault();
		return false;
	});
};

// either return val is it's a number or calculates
// percentage of parentVal
calcPercentage = function(val, parentVal) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		val = (parseFloat(val.replace("%", "")) * parentVal / 100.0);
	}
	return val;
};

/*
 * 
 * Make divs transparent to clicks
 * http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
 * http://www.searchlawrence.com/click-through-a-div-to-underlying-elements.html
 */

function makeClickTransparent(obj) {
	obj['css']("pointer-events", "none");
	// TODO add IE and Opera support
}

var assets = new Array();

function loadMedia(data, oncomplete, onprogress, onerror) {
	var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
	for (; i < l; ++i) {
		current = data[i];
		ext = current.substr(current.lastIndexOf('.') + 1).toLowerCase();

		if (/* Crafty.support.audio && */(ext === "mp3" || ext === "wav"
				|| ext === "ogg" || ext === "mp4")) {
			obj = new Audio(current);
			// Chrome doesn't trigger onload on audio, see
			// http://code.google.com/p/chromium/issues/detail?id=77794
			if (navigator.userAgent.indexOf('Chrome') != -1)
				j++;
		} else if (ext === "jpg" || ext === "jpeg" || ext === "gif"
				|| ext === "png") {
			obj = new Image();
			obj.src = current;
		} else {
			total--;
			continue; // skip if not applicable
		}

		// add to global asset collection
		assets[current] = obj;

		obj.onload = function() {
			++j;

			// if progress callback, give information of assets loaded,
			// total and percent
			if (onprogress) {
				onprogress.call(this, {
					loaded : j,
					total : total,
					percent : (j / total * 100)
				});
			}
			if (j === total) {
				if (oncomplete)
					oncomplete();
			}
		};

		// if there is an error, pass it in the callback (this will be
		// the object that didn't load)
		obj.onerror = function() {
			if (onerror) {
				onerror.call(this, {
					loaded : j,
					total : total,
					percent : (j / total * 100)
				});
			} else {
				j++;
				if (j === total) {
					if (oncomplete)
						oncomplete();
				}
			}
		};
	}
}

function distance(A, B) {
	return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
}

// Selects first not null value through the list of argument
// and the last one as default
function selectValue() {
	var result;
	for ( var i = 0; i < arguments.length - 1; i++) {
		result = arguments[i];
		if (result != null) {
			return result;
		}
	}
	var result = arguments[arguments.length - 1];
	return result;
}

var utils = function(){
	  "use strict";

	  var _class2type = {};

	  var _type = function( obj ) {
	    return obj == null ?
	      String( obj ) :
	      _class2type[ toString.call(obj) ] || "object";
	  };

	  var _isWindow = function( obj ) {
	    return obj != null && obj == obj.window;
	  };

	  var _isFunction = function(target){
	    return toString.call(target) === "[object Function]";
	  };

	  var _isArray =  Array.isArray || function( obj ) {
	      return _type(obj) === "array";
	  };

	  var _isPlainObject = function( obj ) {
	    // Must be an Object.
	    // Because of IE, we also have to check the presence of the constructor property.
	    // Make sure that DOM nodes and window objects don't pass through, as well
	    if ( !obj || _type(obj) !== "object" || obj.nodeType || _isWindow( obj ) ) {
	      return false;
	    }

	    try {
	      // Not own constructor property must be Object
	      if ( obj.constructor &&
	        !hasOwn.call(obj, "constructor") &&
	        !hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
	        return false;
	      }
	    } catch ( e ) {
	      // IE8,9 Will throw exceptions on certain host objects #9897
	      return false;
	    }

	    // Own properties are enumerated firstly, so to speed up,
	    // if last one is own, then all properties are own.

	    var key;
	    for ( key in obj ) {}

	    return key === undefined || hasOwn.call( obj, key );
	  };

	  var _extend = function() {
	    var options, name, src, copy, copyIsArray, clone,
	      target = arguments[0] || {},
	      i = 1,
	      length = arguments.length,
	      deep = false;

	    // Handle a deep copy situation
	    if ( typeof target === "boolean" ) {
	      deep = target;
	      target = arguments[1] || {};
	      // skip the boolean and the target
	      i = 2;
	    }

	    // Handle case when target is a string or something (possible in deep copy)
	    if ( typeof target !== "object" && !_isFunction(target) ) {
	      target = {};
	    }

	    if ( length === i ) {
	      target = this;
	      --i;
	    }

	    for ( ; i < length; i++ ) {
	      // Only deal with non-null/undefined values
	      if ( (options = arguments[ i ]) != null ) {
	        // Extend the base object
	        for ( name in options ) {
	          src = target[ name ];
	          copy = options[ name ];

	          // Prevent never-ending loop
	          if ( target === copy ) {
	            continue;
	          }

	          // Recurse if we're merging plain objects or arrays
	          if ( deep && copy && ( _isPlainObject(copy) || (copyIsArray = _isArray(copy)) ) ) {
	            if ( copyIsArray ) {
	              copyIsArray = false;
	              clone = src && _isArray(src) ? src : [];

	            } else {
	              clone = src && _isPlainObject(src) ? src : {};
	            }

	            // Never move original objects, clone them
	            target[ name ] = _extend( deep, clone, copy );

	          // Don't bring in undefined values
	          } else if ( copy !== undefined ) {
	            target[ name ] = copy;
	          }
	        }
	      }
	    }
	    // Return the modified object
	    return target;
	  };

	  return {
	    class2type: _class2type,
	    type: _type,
	    isWindow: _isWindow,
	    isFunction: _isFunction,
	    isArray: _isArray,
	    isPlainObject: _isPlainObject,
	    extend: _extend
	  }
	}();

