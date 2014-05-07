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
if(typeof console == "undefined") {
	var console = {log : function()  {}};
}


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

var Recorder = (function(){
	var content = [],
		refTime = -1,
		isRecording = false;
	obj = {};
	function recordAction(action, target, params) {
		if(!isRecording){
			return;
		}
		content.push({
			action : action,
			target : target,
			params : params,
			time : (refTime!=-1)?(Date.now()-refTime):refTime
		});
		console.log("Recorded Action: ", content[content.length-1]);
	};
	
	function clearContent(){
		content = [];
		refTime = -1;
		console.log("Cleared recorder content");
	};
	
	function setRefTime(){
		refTime = Date.now();
		console.log("Setting ref time to ", new Date(refTime));
	};
	
	function saveToFile(){
		var string = "";
		console.log("content on saveToFile: ", content);
		for(var i=0;i<content.length;i++){
			var temp = "" +content[i].action +
				";" + content[i].target +
				";" + content[i].time + ";";
			
			
			if(content[i].action == "clickedAt"){
				temp = temp + content[i].params.x +
					","+content[i].params.y+";";
			}
			
			
			temp = temp + "\n";
			string = string + temp;
		}
		uriContent = "data:application/octet-stream," + encodeURIComponent(string);
		newWindow=window.open(uriContent, 'neuesDokument');
	};
	
	function startRecord(){
		clearContent();
		setRefTime();
		isRecording = true;
	};
	
	function stopRecord(){
		isRecording = false;
		refTime = -1;
		saveToFile();
	};
	
	
	obj["recordAction"] = recordAction;
	obj["clearContent"] = clearContent;
	obj["setRefTime"] = setRefTime;
	obj["saveToFile"] = saveToFile;
	obj["startRecord"] = startRecord;
	obj["stopRecord"] = stopRecord;
	obj["getState"] = function(){
		return (function(state){
			return state;
		})(isRecording);
	};
	return obj;
})();


function RandomNumberGenerator(seed)
{
	var keySchedule = [];
	var keySchedule_i = 0;
	var keySchedule_j = 0;
	
	function init(seed) {
		for (var i = 0; i < 256; i++)
			keySchedule[i] = i;
		
		var j = 0;
		for (var i = 0; i < 256; i++)
		{
			j = (j + keySchedule[i] + seed.charCodeAt(i % seed.length)) % 256;
			
			var t = keySchedule[i];
			keySchedule[i] = keySchedule[j];
			keySchedule[j] = t;
		}
	}
	init(seed);
	
	function getRandomByte() {
		keySchedule_i = (keySchedule_i + 1) % 256;
		keySchedule_j = (keySchedule_j + keySchedule[keySchedule_i]) % 256;
		
		var t = keySchedule[keySchedule_i];
		keySchedule[keySchedule_i] = keySchedule[keySchedule_j];
		keySchedule[keySchedule_j] = t;
		
		return keySchedule[(keySchedule[keySchedule_i] + keySchedule[keySchedule_j]) % 256];
	}
	
	this.next = function() {
		var number = 0;
		var multiplier = 1;
		for (var i = 0; i < 8; i++) {
			number += getRandomByte() * multiplier;
			multiplier *= 256;
		}
		return number / 18446744073709551616;
	};
};

function cloneObject(obj) {
	if ( "object" === typeof obj && obj.length) {
		var ar = [];
		for (var i = 0; i < obj.length; i++) {
			ar[i] = cloneObject(obj[i]);
		}
		return ar;
	}
    if (null == obj || "object" != typeof obj) return obj;
    var copy = {};
    for (var smth in obj) {
    	copy[smth] = cloneObject(obj[smth]);
    }
    return copy;
}

function toggleFullScreen() {
	  if (!document.fullscreenElement &&    // alternative standard method
	      !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
	    if (document.documentElement.requestFullscreen) {
	      document.documentElement.requestFullscreen();
	    } else if (document.documentElement.msRequestFullscreen) {
	      document.documentElement.msRequestFullscreen();
	    } else if (document.documentElement.mozRequestFullScreen) {
	      document.documentElement.mozRequestFullScreen();
	    } else if (document.documentElement.webkitRequestFullscreen) {
	      document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
	    }
	  } else {
	    if (document.exitFullscreen) {
	      document.exitFullscreen();
	    } else if (document.msExitFullscreen) {
	      document.msExitFullscreen();
	    } else if (document.mozCancelFullScreen) {
	      document.mozCancelFullScreen();
	    } else if (document.webkitExitFullscreen) {
	      document.webkitExitFullscreen();
	    }
	  }
	}