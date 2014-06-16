/*
 * Viewporter
 * http://github.com/zynga/viewporter
 *
 * Copyright 2011, Zynga Inc.
 * Licensed under the MIT License.
 * https://raw.github.com/zynga/viewporter/master/MIT-LICENSE.txt
 */
var viewporter;
(function() {

	// initialize private constants
	var DEFAULT_ROTATION_LANDSCAPE = false;

	// initialize viewporter object
	viewporter = {

		// constants
		ACTIVE: (('ontouchstart' in window) || (/webos/i).test(navigator.userAgent)),
		DEVICE_SUPPORTED: false,
		DEVICE_DENSITY: null,
		META_VIEWPORT_CONTENT: null,

		// settings
		settings: {
			maxDensity: 163 // this is iPhone non-retina, set to false for purist/always native
		},

		// methods
		isLandscape: function() {
			return (!DEFAULT_ROTATION_LANDSCAPE ?
				(window.orientation === 90 || window.orientation === -90)
				: (window.orientation === 0 || window.orientation === 180));
		},

		ready: function(callback) {
			window.addEventListener('viewportready', callback, false);
		}

	};

	// if we are on Desktop, no need to go further
	if (!viewporter.ACTIVE) {
		return;
	}

	// create private constructor with prototype..just looks cooler
	var _Viewporter = function() {

		var that = this;

		this.data = {};
		this.IS_ANDROID = /Android/.test(navigator.userAgent);

		// listen for document ready, then try to prepare the visual viewport and start firing custom events
		document.addEventListener('DOMContentLoaded', function() {

			// initialize viewporter
			that.computeViewportInformation();

			// set and update the meta viewport tag for the first time
			that.setMetaViewport();

			// scroll the shit away and fix the viewport!
			that.prepareVisualViewport();

			// listen for orientation change
			var cachedOrientation = window.orientation;
			window.addEventListener('orientationchange', function() {
				if(window.orientation != cachedOrientation) {
					that.computeViewportInformation();
					that.updateMetaViewport();
					that.prepareVisualViewport();
					cachedOrientation = window.orientation;
				}
			}, false);

		}, false);

	};

	_Viewporter.prototype = {

		computeViewportInformation: function() {
			
			//.logicking
			//viewporter.settings.maxDensity = false;

			// try to fetch a profile
			var profile = this.getProfile();

			 // Y U NO FOUND DEVICE?
			if(!profile) {
				return this.triggerWindowEvent('viewportunknown');
			}

			// find out if the device is landscape per default (i.e. the Motorola Xoom)
			DEFAULT_ROTATION_LANDSCAPE = profile ? profile.inverseLandscape : false;

			// initialize working variables
			var landscape = viewporter.isLandscape(),
				ppi = 0, ppiFactor = 1,
				width = !DEFAULT_ROTATION_LANDSCAPE ? screen.height : screen.width,
				height = !DEFAULT_ROTATION_LANDSCAPE ? screen.width : screen.height,
				scale = this.IS_ANDROID ? 1: 1 / window.devicePixelRatio,
				chromeHeight = 0, chromeWasPrescaled = false;

			// little property getter helper
			var _w = width, _h = height, _c = chromeHeight,
				computeProp = function(n) { return (typeof n == 'function' ? n(_w,_h,ppiFactor) : n); };

			// check if the ppi is higher than the max, normalize if it is
			ppi = typeof profile.ppi == 'function' ? profile.ppi() : profile.ppi;
			if(ppi) {
				viewporter.DEVICE_DENSITY = ppi;
				if(viewporter.settings.maxDensity && ppi > viewporter.settings.maxDensity) {
					ppiFactor *= viewporter.settings.maxDensity/ppi;
					scale = this.IS_ANDROID ? 1 : (scale / ppiFactor);
				}
			}

			// width and height, always scaled afterwards
			width = computeProp(profile.width) || width;
			height = computeProp(profile.height) || height;

			// chrome height, needs to be scaled in callback for iPhone only..
			if(profile.chromePrescale) {
				chromeHeight = computeProp(profile.chromePrescale);
				chromeWasPrescaled = true;
			} else {
				chromeHeight = computeProp(profile.chrome) || 0;
			}

			// specific orientation overrides
			var orientationOverride = profile[landscape ? 'landscape' : 'portrait'];
			if(orientationOverride) {
				width = computeProp(orientationOverride.width) || width;
				height = computeProp(orientationOverride.height) || height;
				chromeHeight = computeProp(orientationOverride.chrome) || chromeHeight || 0;
			}

			// save information
			this.data = {
				width: (landscape ? width : height) * ppiFactor,
				height: (landscape ? height : width) * ppiFactor,
				scale: scale,
				chromeHeight: chromeHeight * (chromeWasPrescaled ? 1 : ppiFactor)
			};

			viewporter.DEVICE_SUPPORTED = true;

		},

		prepareVisualViewport: function() {

			// in an interval, try scrolling the top shit away until the window height fits with the height I think should be the right height
			var that = this,
				currentHeight = window.innerHeight,
				iterationCount = 0,
				interval = window.setInterval(function() {

					// make the height of the document really large, so we actually have a chance to scroll the url bar away
					if(!viewporter.DEVICE_SUPPORTED) {
						that.maximizeDocumentElement();
					}

					// this tries to scroll away the top chrome
					window.scrollTo(0,1);

					// try to see if the best condition matches, otherwise timeout after 10 iterations (100ms)
					//$('body').append('<p>'+window.innerHeight+', '+that.data.chromeHeight+'</p>');
					if( (viewporter.DEVICE_SUPPORTED && ( Math.abs(window.innerHeight - Math.ceil(that.data.height - that.data.chromeHeight)) < 5 )) || (iterationCount > 10) ) {

						// clear the running checks
						clearInterval(interval);

						// reset the height of the document
						if(!viewporter.DEVICE_SUPPORTED) {
							//that.fixDocumentElement(window.innerHeight);
						}

						// let everyone know we're finally ready
						that.triggerWindowEvent(!that._firstUpdateExecuted ? 'viewportready' : 'viewportchange');
						that._firstUpdateExecuted = true;

					}

					iterationCount++;

				}, 10);

		},

		triggerWindowEvent: function(name) {
			var event = document.createEvent("Event");
			event.initEvent(name, false, false);
			window.dispatchEvent(event);
		},

		getProfile: function() {
			for(var searchTerm in viewporter.profiles) {
				if(new RegExp(searchTerm).test(navigator.userAgent)) {
					return viewporter.profiles[searchTerm];
				}
			}
			return null;
		},

		/*
		 * Meta viewport functionality
		 */

		maximizeDocumentElement: function() {
			document.documentElement.style.minHeight = '5000px';
		},

		fixDocumentElement: function(height) {
			document.documentElement.style.minHeight = ( height || (this.data.height - this.data.chromeHeight) )+'px';
			document.documentElement.style.minWidth = this.data.width+'px';
		},

		findMetaNode: function(name) {
			var meta = document.getElementsByTagName('meta');
			for (var i=0; i < meta.length; i++) {
				if(meta[i].getAttribute('name') == name) {
					return meta[i];
				}
			}
			return null;
		},

		setMetaViewport: function() {

			// create meta viewport tag (or reuse existing one)
			var node = this.findMetaNode('viewport') || document.createElement('meta');
			node.setAttribute('name', 'viewport');
			node.id = 'metaviewport';

			// update it for the first time
			this.updateMetaViewport(node);

			// append it to the page
			document.getElementsByTagName('head')[0].appendChild(node);

		},

		updateMetaViewport: function(node) {

			node = node || document.getElementById('metaviewport');

			var content = viewporter.DEVICE_SUPPORTED ? [
					'width=' + this.data.width,
					'height=' + (this.data.height - this.data.chromeHeight),
					'initial-scale=' + this.data.scale,
					'minimum-scale=' + this.data.scale,
					'maximum-scale=' + this.data.scale
				] : ['width=device-width', 'initial-scale=1', 'minimum-scale=1', 'maximum-scale=1'];

			// if we're on Android, we need to give the viewport a target density
			if(this.IS_ANDROID) {
				content.unshift('target-densityDpi='+(viewporter.DEVICE_DENSITY ? (viewporter.settings.maxDensity || 'device-dpi') : 'device-dpi'));
			}

			// apply viewport data
			viewporter.META_VIEWPORT_CONTENT = content.join(',');
			node.setAttribute('content', viewporter.META_VIEWPORT_CONTENT);

			if(viewporter.DEVICE_SUPPORTED) {
				this.fixDocumentElement();
			}

		}

	};

	// initialize
	new _Viewporter();

})();


// profiles for viewporter
viewporter.profiles = {

	'iPhone|iPod': {
		ppi: function() { return window.devicePixelRatio >= 2 ? 326 : 163; },
		width: function(w,h) { return w * window.devicePixelRatio; },
		height: function(w,h) {  return h * window.devicePixelRatio; },
		chromePrescale: function(w,h,scale) {

			// TODO: include status bar style
			// find out iOS specific stuff (web app)
			//var statusBarStyle = _findMeta('apple-mobile-web-app-status-bar-style');
			//if(statusBarStyle) {
			//	IOS_STATUS_BAR_STYLE = statusBarStyle.getAttribute('content');
			//}

			if(window.devicePixelRatio >= 2) {
				return ((navigator.standalone ? 0 : (viewporter.isLandscape() ? 100 : 124)) * scale) + 2;
			} else {
				return ((navigator.standalone ? 0 : (viewporter.isLandscape() ? 50 : 62)) * scale) + 2;
			}

		}
	},

	'iPad': {
		ppi: 132,
		chrome: function(w,h) {
			// old, deprecated one:
			// return (navigator.standalone ? 0 : 78);
			return (navigator.standalone ? 0 : ( /OS 5_/.test(navigator.userAgent) ? 96 : 78) );
		}
	},

	// on Samsung Galaxy S, S2 and Nexus S we must hard set w, h
	'GT-I9000|GT-I9100|Nexus S': {
		ppi: function() { // I literally have no idea why the actual ppi is so different from the one I need to put in here.
			if(/GT-I9000/.test(navigator.userAgent)) { return 239.3; }
			if(/GT-I9100/.test(navigator.userAgent)) { return 239.3; }
			if(/Nexus S/.test(navigator.userAgent)) { return 239; }
		},
		width: 800,
		height: 480,
		chrome: 38
	},

	// Motorola Xoom fabulously rotates the screen size. Die in hell.
	'MZ601': {
		ppi: 160,
		portrait: {
			width: function(w, h) { return h; },
			height: function(w, h) { return w; }
		},
		chrome: 152,
		inverseLandscape: true
	},

	// Samsung Galaxy Pad inverts and randomizes screen size...wtf!
	'GT-P1000': {
		width: 1024,
		height: 600,
		portrait: {
			chrome: 38
		}
	},

	// HTC Desire & HTC Desire HD
	// this guy doesn't have a chrome height, if you scroll away, the thing is actually full screen..
	'Desire_A8181|DesireHD_A9191': {
		width: 800,
		height: 480
	},

	// Asus eePad Transformer TF101
	// Thanks to @cubiq
	'TF101': {
		ppi: 160,
		portrait: {
			width: function(w, h) { return h; },
			height: function(w, h) { return w; }
		},
		chrome: 103,
		inverseLandscape: true
	},
	
	//. Logicking
	// Acer Iconia Tab A500
	'A500': {
		portrait: {
			width: function(w, h) { return h; },
			height: function(w, h) { return w; }
		},
		inverseLandscape: true
	}

};
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
}/**
 * @constructor
 */
function AssertException(message) {
	this.message = message;
}

AssertException.prototype.toString = function() {
	return 'AssertException: ' + this.message;
};

function assert(exp, message) {
	if (!exp) {
		throw new AssertException(message);
	}
}// There two approaches to audio support:
// 1. Audio sprites for iOS and Android devices
// 2. Audio objects for general browsers

var Sound = (function() {
	var MP3_OFFSET = 0.07;
	var APPLE_OFFSET = -0.2 * 0;
	var PATH_TO_JPLAYER_SWF = "scripts/";

	// private interface

	var useAudioSprite;
	var soundOn;
	var canPlayOgg, canPlayMp3, canPlayMp4;
	var playOffset = 0;

	// array of sounds samples
	var sounds = new Object();
	// array of currently playing sounds
	var channels = new Object();

	var addFunc = function() {
	};
	var playFunc = function() {
	};
	var stopFunc = function() {
	};

	// HTML5 Audio Interface
	// supported audio '.ogg' or '.mp3'
	var audioExtention = null;

	function addAudio(id, filename) {
		var url = filename + audioExtention;
		var audio = new Audio(url);
		audio.preload = "auto";
		audio.load();

		sounds[id] = {
			url : url,
			audio : audio
		};
	}

	function playAudio(id, loop, volume, priority) {
		var snd = sounds[id];
		var sndInstance = {
			id : id,
			priority : priority
		};
		if (!snd || !snd.audio)
			return null;

		if (volume)
			snd.audio.volume = volume;

		snd.audio.play();
		try {
			// .hack fail on mozilla
			snd.audio.currentTime = 0;
		} catch (e) {
		}

		if (loop) {
			snd.audio.addEventListener('ended', function() {
				try {
					this.currentTime = 0;
				} catch (e) {
				}
				this.play();
			}, false);
		} else {
			snd.audio.addEventListener('ended', function() {
				if (sndInstance.channel) {
					channels[sndInstance.channel] = null;
				}
			}, false);
		}

		// sound instance
		return sndInstance;
	}

	function stopAudio(id, repeat) {
		var snd = sounds[id];
		if (!snd)
			return;
		snd.audio.pause();
	}

	// Audio Sprite Interface
	var audioSpriteTimeoutHandler = null;
	var audioSpriteEndCallback = null;

	// var jPlayerInstance;
	function initAudioSprite(audioSpriteName) {
		if (Device.isAppleMobile()) {
			playOffset = APPLE_OFFSET;
		}

		// add jPlayer
		jQuery['getScript']
				(
						PATH_TO_JPLAYER_SWF + 'jquery.jplayer.min.js',
						function() {
							$("body")['append']
									("<div id='jPlayerInstanceId' style='position:absolute; left:50%; right:50%; width: 0px; height: 0px;'></div>");
							jPlayerInstance = $("#jPlayerInstanceId");
							jPlayerInstance['jPlayer']
									({
										ready : function() {
											$(this)['jPlayer']("setMedia", {
												oga : audioSpriteName + ".ogg",
												m4a : audioSpriteName + ".mp4",
												mp3 : audioSpriteName + ".mp3"
											});
											// alert("READY11");
										},
										supplied : "oga, mp3, m4a",
										solution : "flash, html",
										//solution : "html, flash",
										swfPath : PATH_TO_JPLAYER_SWF,

										ended : function() { // The
											// $.jPlayer.event.ended
											// event
											// console.log("Jplayer ended");
										},
										playing : function(event) { // The
											// $.jPlayer.event.ended
											// event
											var timeNow = event['jPlayer'].status.currentTime;
											//console.log("Jplayer playing " + timeNow);
										},
										timeupdate : function(event) { // The
											// $.jPlayer.event.ended
											// event
											var timeNow = event['jPlayer'].status.currentTime;
											// console.log("Jplayer timeupdate "
											// + timeNow);
										}
									});
						});
	}

	function addAudioSprite(id, filename, timeStart, timeLength) {
		sounds[id] = {
			start : timeStart,
			length : timeLength
		};
	}

	function playAudioSprite(id, repeat, volume, priority) {
		var audioSprite = sounds[id];
		var sndInstance = {
			id : id,
			priority : priority
		};
		
		if (!audioSprite) {
			return null;
		}
			
		if (audioSpriteEndCallback) {
			audioSpriteEndCallback();
			audioSpriteEndCallback = null;
		}
				
		if (volume) {
			jPlayerInstance['jPlayer']("volume", volume);
		}

		jPlayerInstance['jPlayer']("pause", audioSprite.start + playOffset);
		jPlayerInstance['jPlayer']("play", audioSprite.start + playOffset);

		audioSpriteEndCallback = function() {
			stopAudioSprite();
			if (sndInstance.channel) {
				channels[sndInstance.channel] = null;
				//console.log("end audio", sndInstance.id);
			}
		};

		audioSpriteTimeoutHandler = setTimeout(audioSpriteEndCallback,
				audioSprite.length * 1000);

		return sndInstance;
	}

	function stopAudioSprite(dontStopJplayer) {
		clearTimeout(audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = null;

		if (dontStopJplayer != true)
			jPlayerInstance['jPlayer']("pause");
	}

	return {
		// public interface
		TURNED_OFF_BY_DEFAULT : false,
		LOW_PRIORITY : -100,
		NORMAL_PRIORITY : 0,
		HIGH_PRIORITY : 100,
		// init sounds
		init : function(audioSpriteName, forceAudioSprite, pathToScripts) {

			useAudioSprite = forceAudioSprite
					|| (typeof (audioSpriteName) == "string")
					&& Device.isMobile();
			
			soundOn = Device.getStorageItem("soundOn", null);
			// init sound for the first time
			if(soundOn == null) {
				soundOn = Sound.TURNED_OFF_BY_DEFAULT ? false : true;
				Device.setStorageItem("soundOn", soundOn);
			} else {
				soundOn = (soundOn == "true");
			}
			
			if (useAudioSprite) {
				PATH_TO_JPLAYER_SWF = pathToScripts ? pathToScripts
						: PATH_TO_JPLAYER_SWF;
				initAudioSprite(audioSpriteName);
				addFunc = addAudioSprite;
				playFunc = playAudioSprite;
				stopFunc = stopAudioSprite;
			} else {
				var myAudio, audioObjSupport, basicAudioSupport;

				try {
					myAudio = new Audio("");

					audioObjSupport = !!(myAudio.canPlayType);
					basicAudioSupport = !!(!audioObjSupport ? myAudio.play
							: false);
				} catch (e) {
					audioObjSupport = false;
					basicAudioSupport = false;
				}

				if (myAudio && myAudio.canPlayType) {
					// Currently canPlayType(type) returns: "no", "maybe" or
					// "probably"
					canPlayOgg = ("no" != myAudio.canPlayType("audio/ogg"))
							&& ("" != myAudio.canPlayType("audio/ogg"));
					canPlayMp4 = ("no" != myAudio.canPlayType("audio/mp4"))
							&& ("" != myAudio.canPlayType("audio/mp4"));
					canPlayMp3 = ("no" != myAudio.canPlayType("audio/mpeg"))
							&& ("" != myAudio.canPlayType("audio/mpeg"));

					if (canPlayOgg) {
						audioExtention = '.ogg';
						playOffset = 0;
					} else if (canPlayMp4) {
						audioExtention = '.mp4';
						playOffset = 0;
					} else if (canPlayMp3) {
						audioExtention = '.mp3';
						playOffset = MP3_OFFSET;
					}

					if (audioExtention) {
						addFunc = addAudio;
						playFunc = playAudio;
						stopFunc = stopAudio;
					}
				}
			}
		},
		update : function(delta) {
		},

		turnOn : function(isOn) {

			soundOn = isOn;
			Device.setStorageItem("soundOn", soundOn);

			if (useAudioSprite) {
				if (soundOn)
					jPlayerInstance['jPlayer']("unmute");
				else
					jPlayerInstance['jPlayer']("mute");
			} else {
				Sound.stop();
			}
		},
		isOn : function() {
			var on = Device.getStorageItem("soundOn", "true") == "true";
			return on;
		},

		supportedExtention : function() {
			return audioExtention;
		},

		// 
		add : function(id, filename, startTimeInSprite, lengthInSprite,
				ignoreForAudioSprite) {
			if (useAudioSprite && ignoreForAudioSprite)
				return;
			addFunc.call(this, id, filename, startTimeInSprite, lengthInSprite);
		},

		play : function() {
			if (!soundOn)
				return;

			var channel, id, loop, volume = null, priority = null;
			// args: soundId or params
			if (arguments.length == 1) {
				if (typeof (arguments[0]) == "object") {
					var params = arguments[0];
					channel = params.channel;
					id = params.id;
					loop = params.loop;
					volume = params.volume;
					priority = params.priority;
				} else {
					channel = null;
					id = arguments[0];
					loop = null;
				}
				// args: soundId, loop
			} else if (arguments.length == 2) {
				if (typeof (arguments[1]) == "boolean") {
					channel = null;
					id = arguments[0];
					loop = arguments[1];
					// args: channel, soundId
				} else {
					channel = arguments[0];
					id = arguments[1];
					loop = null;
				}
				// args: channel, soundId, loop, priority
			} else {
				channel = arguments[0];
				id = arguments[1];
				loop = arguments[2];
				priority = arguments[3];
			}

			// stop the current sound for the specified channel
			// if channel = null - no channels used
			if (channel != null) {
				var curSnd = channels[channel];

				if (curSnd) {
					var curSndPriority = curSnd.priority
							|| Sound.NORMAL_PRIORITY;
					if (priority >= curSndPriority) {
						//console.log("stop audio", curSnd.id);
						stopFunc.call(this, curSnd);
						channels[channel] = null;
					} else {
						//console.log("can't play audio", id, curSnd.id);
						return null;
					}
				}
			}

			//console.log("play audio", id);
			var newSnd = playFunc.call(this, id, loop, volume, priority);
			if (newSnd && channel != null) {
				channels[channel] = newSnd;
				newSnd.channel = channel;
			}
			return newSnd;
		},
		stop : function(channel) {

			if (channel != null) {
				var curSnd = channels[channel];
				if (curSnd) {
					stopFunc.call(this, curSnd);
				}
			} else {
				// stop all sounds
				for ( var i in channels) {
					var curSnd = channels[i];
					if (curSnd) {
						stopFunc.call(this, curSnd);
					}
				}
			}
		}
	};
})();var MAX_WIDTH = 1280;
var MAX_HEIGHT = 800;
//
// var MAX_WIDTH = 640;
// var MAX_HEIGHT = 480;

var BASE_WIDTH = 800;
var BASE_HEIGHT = 500;

var ENHANCED_BASE_WIDTH = 1138;
var ENHANCED_BASE_HEIGHT = 640;

var ENHANCED_BASE_MARGIN_WIDTH = 169;
var ENHANCED_BASE_MARGIN_HEIGHT = 70;

var Screen = (function() {
	var screenConsts = {};

	// private interface

	// reference to main application class
	var appInstance = null;

	var fieldWidth = BASE_WIDTH;
	var fieldHeight = BASE_HEIGHT;
	var currentFieldHeight, currentFieldWidth;
	var fullWidth, fullHeight, currentFullWidth, currentFullHeight;

	var rotateMsgHeightWidthRatio;

	var widthRatio = 1;
	var heightRatio = 1;

	var offsetX = 0;
	var offsetY = 0;

	var isLandscapeDefault = true;
	var isLandscapeFlag = true;
	var secondTimeInRowOrientationCall = null;
	var secondTimeInRowOrientationCallAttempt = 0;

	// coordinates of the whole screen relative to the root scene
	// Defining this object only once so we can use it as reference
	var fullRect = {
		left : 0,
		top : 0,
		right : 0,
		bottom : 0
	};

	function windowScrollDown() {
		setTimeout(function() {
			window['scrollTo'](0, 1);
		}, 10);
		// .hack for android devices
		setTimeout(function() {
			window['scrollTo'](0, 1);
		}, 500);
	}

	var resizeTimeoutHandle = null;

	function actualResize(w, h) {
		if (Screen.isCorrectOrientation()) {

			// recalculate all field parameters
			var sizeChanged = resizeField(w, h);
			if (sizeChanged) {
				appInstance.resize();
			}
		}
	}

	function resizeField(w, h) {
		var windowInnerWidth = selectValue(w, window.innerWidth);
		var windowInnerHeight = selectValue(h, window.innerHeight);
		fullWidth = windowInnerWidth;
		fullHeight = windowInnerHeight;

		fieldWidth = Math.min(MAX_WIDTH, windowInnerWidth);
		fieldHeight = Math.min(MAX_HEIGHT, windowInnerHeight);

		// proportionally scale the screen and center it
		var normalK = BASE_WIDTH / BASE_HEIGHT;
		if (fieldWidth / normalK >= fieldHeight) {
			fieldWidth = Math.ceil(fieldHeight * normalK);
		} else {
			fieldHeight = Math.ceil(fieldWidth / normalK);
		}

		// nothing to do if field size didn't change
		if (currentFieldHeight == fieldHeight
				&& currentFieldWidth == fieldWidth
				&& currentFullWidth == fullWidth
				&& currentFullHeight == fullHeight) {
			return false;
		}

		offsetX = Math.round((windowInnerWidth - fieldWidth) / 2);
		offsetY = Math.round((windowInnerHeight - fieldHeight) / 2);

		currentFullWidth = fullWidth;
		currentFullHeight = fullHeight;

		currentFieldHeight = fieldHeight;
		currentFieldWidth = fieldWidth;

		// alert("actualResize " + currentFullWidth + ", " + currentFullHeight);

		widthRatio = fieldWidth / BASE_WIDTH;
		heightRatio = fieldHeight / BASE_HEIGHT;

		var rootDiv = $('#root');
		if (rootDiv.length > 0) {
			rootDiv['css']("left", offsetX);
			rootDiv['css']("top", offsetY);
		}

		// Size for the rect of maximum size with root div
		// of base size in the center
		fullRect.left = -Screen.offsetX();
		fullRect.top = -Screen.offsetY();
		fullRect.right = -Screen.offsetX() + Screen.fullWidth();
		fullRect.bottom = -Screen.offsetY() + Screen.fullHeight();
		fullRect.width = fullRect.right - fullRect.left;
		fullRect.height = fullRect.bottom - fullRect.top;
		fullRect.offsetX = 0;
		fullRect.offsetY = 0;
		return true;
	}
	
	var resizeRotateMsg = function(w, h) {
		var obj = $("#rotateMsg");
		if (typeof rotateMsgHeightWidthRatio != "number") {
			rotateMsgHeightWidthRatio = obj.height() / obj.width();
		}
		
		var windowInnerWidth = selectValue(w, window.innerWidth);
		var rotateMsgW = Math.min(MAX_WIDTH, windowInnerWidth);
		var rotateMsgH = rotateMsgW * rotateMsgHeightWidthRatio;
		obj.width(rotateMsgW);
		obj.height(rotateMsgH);
	};
	
	function windowOnResize(event, w, h) {
		// alert("resize " + Screen.isCorrectOrientation());
		if (!Screen.isCorrectOrientation()) {
			resizeRotateMsg(w, h);
			if (!Loader.loadingMessageShowed()) {
				$("#rotateMsg")['css']("display", "block");
				$("#rotateMsg")['css']("z-index", 99999999);
			}
		} else {

			// absorb nearly simultaneous calls to resize
			clearTimeout(resizeTimeoutHandle);
			resizeTimeoutHandle = setTimeout(function() {actualResize(w, h); }, 100);
			windowScrollDown();

			$("#rotateMsg")['css']("z-index", 0);
			$("#rotateMsg")['css']("display", "none");
		}
		return;
	}

	return { // public interface
		init : function(application, isLandscape, params) {
			appInstance = application;

			params = selectValue(params, {});

			// inverse default values
			if (isLandscape === false) {
				var buffer = BASE_HEIGHT;
				BASE_HEIGHT = BASE_WIDTH;
				BASE_WIDTH = buffer;

				buffer = ENHANCED_BASE_HEIGHT;
				ENHANCED_BASE_HEIGHT = ENHANCED_BASE_WIDTH;
				ENHANCED_BASE_WIDTH = buffer;

				buffer = ENHANCED_BASE_MARGIN_HEIGHT;
				ENHANCED_BASE_MARGIN_HEIGHT = ENHANCED_BASE_MARGIN_WIDTH;
				ENHANCED_BASE_MARGIN_WIDTH = buffer;

				buffer = MAX_WIDTH;
				MAX_HEIGHT = MAX_WIDTH;
				MAX_WIDTH = buffer;
			}
			// read user provided values if any
			BASE_WIDTH = selectValue(params['BASE_WIDTH'], BASE_WIDTH);
			BASE_HEIGHT = selectValue(params['BASE_HEIGHT'], BASE_HEIGHT);
			MAX_WIDTH = selectValue(params['MAX_WIDTH'], MAX_WIDTH);
			MAX_HEIGHT = selectValue(params['MAX_HEIGHT'], MAX_HEIGHT);
			ENHANCED_BASE_WIDTH = selectValue(params['ENHANCED_BASE_WIDTH'],
					ENHANCED_BASE_WIDTH);
			ENHANCED_BASE_HEIGHT = selectValue(params['ENHANCED_BASE_HEIGHT'],
					ENHANCED_BASE_HEIGHT);
			ENHANCED_BASE_MARGIN_WIDTH = selectValue(
					params['ENHANCED_BASE_MARGIN_WIDTH'],
					ENHANCED_BASE_MARGIN_WIDTH);
			ENHANCED_BASE_MARGIN_HEIGHT = selectValue(
					params['ENHANCED_BASE_MARGIN_HEIGHT'],
					ENHANCED_BASE_MARGIN_HEIGHT);

			screenConsts = {
				"BASE_WIDTH" : BASE_WIDTH,
				"BASE_HEIGHT" : BASE_HEIGHT,
				"ENHANCED_BASE_WIDTH" : ENHANCED_BASE_WIDTH,
				"ENHANCED_BASE_HEIGHT" : ENHANCED_BASE_HEIGHT,
				"ENHANCED_BASE_MARGIN_WIDTH" : ENHANCED_BASE_MARGIN_WIDTH,
				"ENHANCED_BASE_MARGIN_HEIGHT" : ENHANCED_BASE_MARGIN_HEIGHT,
				"-ENHANCED_BASE_MARGIN_WIDTH" : -ENHANCED_BASE_MARGIN_WIDTH,
				"-ENHANCED_BASE_MARGIN_HEIGHT" : -ENHANCED_BASE_MARGIN_HEIGHT
			};

			if ("onorientationchange" in window
					&& !params['disableOrientation']) {
				if (isLandscape == false) {
					isLandscapeDefault = false;
					$('head')['append']
							('<link rel="stylesheet" href="css/orientationPortrait.css" type="text/css" />');
				} else {
					isLandscapeDefault = true;
					$('head')['append']
							('<link rel="stylesheet" href="css/orientationLandscape.css" type="text/css" />');
				}
			} else {
				isLandscapeDefault = null;
				$('#rotateMsg').remove();
			}

			disableTouchEvents();

			$(window)['resize'](windowOnResize);

			$(window)['bind']("scrollstart", function(e) {
				windowScrollDown();
			});
			$(window)['bind']("scrollstop", function(e) {
				windowScrollDown();
			});

			$(window)['trigger']("orientationchange");

			// For iPhones we will force hiding address bar
			// cause there's no scroll event executes when user shows bar
			// by pressing on status bar panel
			if (Device.is("iphone") || Device.is("ipod")) {
				setInterval(windowScrollDown, 5000);
			}

			// Zynga's viewport single reference in code
			// orientation locking
			$(window)['bind']('viewportready viewportchange', function() {
				$(window)['trigger']("resize");
				return;
			});

		},

		// some portals (like Spil Games) will require manual resize function
		windowOnResize : function(w, h) {
			windowOnResize(null, w, h);
		},
		
		setLandscapeDefault : function(landscapeDefault) {
			isLandscapeDefault = landscapeDefault;
		},

		isCorrectOrientation : function() {
			var isPortrait = window.innerWidth / window.innerHeight < 1.1;
			// alert("correct orient " + window.innerWidth + ", "
			// + window.innerHeight + ", " + window.orientation);
			return (isLandscapeDefault == null)
					|| (isLandscapeDefault === !isPortrait);
		},
		isLandscape : function() {
			return viewporter.isLandscape();
		},
		widthRatio : function() {
			return widthRatio;
		},
		heightRatio : function() {
			return heightRatio;
		},
		// Size of the working screen field
		fieldWidth : function() {
			return currentFieldWidth;
		},
		fieldHeight : function() {
			return currentFieldHeight;
		},
		// Offset for the 'Root' object
		offsetX : function() {
			return offsetX / widthRatio;
		},
		offsetY : function() {
			return offsetY / heightRatio;
		},
		// Size of the whole window
		fullWidth : function() {
			return currentFullWidth / widthRatio;
		},
		fullHeight : function() {
			return currentFullHeight / heightRatio;
		},
		fullRect : function() {
			return fullRect;
		},
		// Screen size by setup by design
		baseWidth : function() {
			return BASE_WIDTH;
		},
		baseHeight : function() {
			return BASE_HEIGHT;
		},
		// for reading numeric constants from JSON
		macro : function(val) {
			if (typeof val == "string") {
				var preprocessedVal = screenConsts[val];
				return preprocessedVal ? preprocessedVal : val;
			}
			return val;
		},
		// Calculating size real in pixels
		// from logic base pixel size
		calcRealSize : function(width, height) {
			if (typeof (width) == "number") {
				width = Math.round(Screen.widthRatio() * width);
			} else if (width == "FULL_WIDTH") {
				width = currentFullWidth;
			}

			if (typeof (height) == "number") {
				height = Math.round(Screen.heightRatio() * height);
			} else if (height == "FULL_HEIGHT") {
				height = currentFullHeight;
			}

			return {
				x : width,
				y : height
			};
		},
		// Calculating size in logic pixels
		// from real pixel's size
		calcLogicSize : function(width, height) {
			return {
				x : (width / Screen.widthRatio()),
				y : (height / Screen.heightRatio())
			};
		}
	};
})();// Global vars for touch event handling
var touchStartX = 0;
var touchStartY = 0;
var touchEndX = 0;
var touchEndY = 0;

var mobileBrowser = null;
function isMobile() {
	// return Crafty.mobile;

	if (mobileBrowser != null) {
		return mobileBrowser;
	}

	var ua = navigator.userAgent.toLowerCase(), match = /(webkit)[ \/]([\w.]+)/.exec(ua) || /(o)pera(?:.*version)?[ \/]([\w.]+)/.exec(ua) || /(ms)ie ([\w.]+)/.exec(ua)
			|| /(moz)illa(?:.*? rv:([\w.]+))?/.exec(ua) || [], mobile = /iPad|iPod|iPhone|Android|webOS/i.exec(ua);

	// if (mobile)
	// Crafty.mobile = mobile[0];
	mobileBrowser = mobile;

	return mobileBrowser;
}

var disableTouchEvents = function() {
	if (isMobile()) {
		document.body.ontouchmove = function(e) {
			e.preventDefault();
		};
		document.body.ontouchstart = function(e) {
			e.preventDefault();
		};
		document.body.ontouchend = function(e) {
			e.preventDefault();
		};
	}
};

var enableTouchEvents = function(push) {
	if (isMobile()) {
		document.body.ontouchstart = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			// } else {
			// touchStartX = touchEndX = null;
			// touchStartY = touchEndY = null;
			// }
			return false;
		};

		document.body.ontouchmove = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			// }
			//push(e);
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				//push(e1);
			}
			return false;
		};
	}
};
// Last updated September 2011 by Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

/**
 * @constructor
 */
function Transform() {
  this.m = [1,0,0,1,0,0];
}

Transform.prototype.reset = function() {
  this.m = [1,0,0,1,0,0];
};

Transform.prototype.multiply = function(matrix) {
  var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
  var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];

  var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
  var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

  var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
  var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
  this.m[4] = dx;
  this.m[5] = dy;
};

Transform.prototype.invert = function() {
  var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
  var m0 = this.m[3] * d;
  var m1 = -this.m[1] * d;
  var m2 = -this.m[2] * d;
  var m3 = this.m[0] * d;
  var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
  var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
  this.m[0] = m0;
  this.m[1] = m1;
  this.m[2] = m2;
  this.m[3] = m3;
  this.m[4] = m4;
  this.m[5] = m5;
};

Transform.prototype.rotate = function(rad) {
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.rotateDegrees = function(angle) {
  var rad = angle * Math.PI / 180;
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.translate = function(x, y) {
  this.m[4] += this.m[0] * x + this.m[2] * y;
  this.m[5] += this.m[1] * x + this.m[3] * y;
};

Transform.prototype.scale = function(sx, sy) {
  this.m[0] *= sx;
  this.m[1] *= sx;
  this.m[2] *= sy;
  this.m[3] *= sy;
};

Transform.prototype.transformPoint = function(px, py) {
  var x = px;
  var y = py;
  px = x * this.m[0] + y * this.m[2] + this.m[4];
  py = x * this.m[1] + y * this.m[3] + this.m[5];
  return [px, py];
};/**
 * Device Properties
 */

var USE_NATIVE_RENDER = true;
var Device = (function() {
	// private interface

	var storageSupported = null;

	var userAgentParsed = null;
	var androidOsVersion = null;
	var isAppleMobileOs = null;
	var isIeBrowser = null;
	var isWebkitBrowser = null;

	var userAgent = null;

	// result of a benchmark test
	// currently set as percentage of IPhone 4
	var benchmarkTest = 9999;

	var touchStartX, touchStartY, touchEndX, touchEndY;

	var nativeRender = (USE_NATIVE_RENDER && window.NativeRender) ? window.NativeRender
			: null;

	function parseUserAgent() {
		if (userAgentParsed)
			return;
		userAgent = navigator.userAgent.toLowerCase();

		// check apple iOs
		isAppleMobileOs = (/iphone|ipod|ipad/gi).test(navigator.platform);

		isWebkitBrowser = userAgent.indexOf("webkit") > -1;

		// check android version
		var androidStr = "android";
		var idx1 = userAgent.indexOf(androidStr);
		if (idx1 > -1) {
			var idx2 = idx1 + androidStr.length;
			var idx3 = userAgent.indexOf(";", idx2);
			var ver = userAgent.substring(idx2, idx3);
			// TODO make correct version parsing
			androidOsVersion = parseFloat(ver);
		}
		userAgentParsed = true;
	}

	function defaultTouchEvents() {
		if (!Device.isTouch())
			return;

		document.ontouchstart = function(e) {
			e.preventDefault();
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			return false;
		};

		document.ontouchmove = function(e) {
			e.preventDefault();
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			return false;
		};

		document.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
			}
			return false;
		};
	}

	//requestAnimationFrame crossbrowser
	 window.requestAnimFrame = (function(){
	      return  window.requestAnimationFrame       || 
	              window.webkitRequestAnimationFrame || 
	              window.mozRequestAnimationFrame    || 
	              window.oRequestAnimationFrame      || 
	              window.msRequestAnimationFrame 
	    })();
	// test to find out relative speed of device
	// and switch graphics resolution accordingly
	function runBenchmark() {
		var IPHONE_4_TIME = 12;
		var time;
		var startTime = new Date(), iterations = 20000;
		while (iterations--) {
			Math.sqrt(iterations * Math.random());
		}
		// adding 1ms to avoid division by zero
		time = (new Date - startTime) + 1;
		benchmarkTest = 100 * IPHONE_4_TIME / time;
		// alert("test " + benchmarkTest + " time " + time);
	}

	function supportsHtml5Storage() {
		if (storageSupported == null) {
			try {
				storageSupported = 'localStorage' in window
						&& window['localStorage'] !== null;
				// making full test, because while in "private" browsing
				// mode on safari setItem is forbidden
				var storage = window['localStorage'];
				storage.setItem("test", "test");
				storage.getItem("test");
			} catch (e) {
				console.error("Local storage not supported!");
				storageSupported = false;
			}
		}
		return storageSupported;
	}

	return { // public interface
		init : function(params) {
			parseUserAgent();

			/*
			 * Add web icons icon114x114.png - with opaque background for iOS
			 * devices icon114x114alpha.png - with alpha background for Androids
			 * 
			 */
			params = selectValue(params, {});
			var icon114x114 = selectValue(params.icon, "images/icon114x114.png");
			var icon114x114alpha = selectValue(params.iconAlpha,
					"images/icon114x114alpha.png");

			$('head')['append']('<link rel="apple-touch-icon"  href="'
					+ icon114x114 + '" />');
			if (Device.isAndroid()) {
				// add web app icon with alpha, otherwise it will
				// overwrite iPad icon
				$('head')['append']
						('<link rel="apple-touch-icon-precomposed" href="'
								+ icon114x114alpha + '" />');
			}

			defaultTouchEvents();
			runBenchmark();
		},
		setStorageItem : function(key, val) {
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				storage.setItem(key, val);
			}
		},
		getStorageItem : function(key, defaultVal) {
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				var val = storage.getItem(key);
				return (val != null) ? val : defaultVal;
			} else {
				return defaultVal;
			}
		},

		removeStorageItem : function(key) {
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				storage.removeItem(key);
			}
		},

		is : function(deviceName) {
			return (userAgent.indexOf(deviceName) > -1);
		},
		isAndroid : function() {
			return androidOsVersion != null;
		},

		androidVersion : function() {
			return androidOsVersion;
		},

		isWebkit : function() {
			return isWebkitBrowser;
		},

		isAppleMobile : function() {
			return isAppleMobileOs;
		},

		isMobile : function() {
			return Device.isTouch();
		},

		supports3dTransfrom : function() {
			return Modernizr.csstransforms3d;
		},
		nativeRender : function() {
			return nativeRender;
		},

		/*
		 * Touch events
		 * 
		 */

		isTouch : function() {
			return 'ontouchstart' in document.documentElement;
		},
		getPositionFromEvent : function(e) {
			if (e['originalEvent'] && e['originalEvent'].touches) {
				// alert(" touch " + e.touches[0].pageX);
				return {
					x : e['originalEvent']['touches'][0].pageX,
					y : e['originalEvent']['touches'][0].pageY
				};
			}
			if (e['touches']) {
				return {
					x : e['touches'][0].pageX,
					y : e['touches'][0].pageY
				};
			}

			return {
				x : e.pageX,
				y : e.pageY
			};
		},
		getLogicPositionFromEvent : function(e) {
			var pos = Device.getPositionFromEvent(e);
			return {
				x : pos.x / Screen.widthRatio() - Screen.offsetX(),
				y : pos.y / Screen.heightRatio() - Screen.offsetY()
			};
		},
		event : function(eventName) {
			var result;
			switch (eventName) {
			case 'click':
				result = Device.isTouch() ? 'touchstart' : 'click';
				break;
			case 'cursorDown':
				result = Device.isTouch() ? 'touchstart' : 'mousedown';
				break;
			case 'cursorUp':
				result = Device.isTouch() ? 'touchend' : 'mouseup';
				break;
			case 'cursorMove':
				result = Device.isTouch() ? 'touchmove' : 'mousemove';
				break;
			case 'cursorOut':
				result = Device.isTouch() ? 'touchstart' : 'mouseout';
				break;
			case 'cursorOver':
				result = Device.isTouch() ? 'touchstart' : 'mouseover';
				break;	
			default:
				assert(false, "Unrecognizible event " + eventName);
				result = eventName;
				break;
			}
			return result;
		},

		touchStartX : function() {
			return touchStartX;
		},
		touchStartY : function() {
			return touchStartY;
		},
		touchEndX : function() {
			return touchEndX;
		},
		touchEndY : function() {
			return touchEndY;
		},

		// becnmark test for slow devices
		isSlow : function() {
			if ((Device.isAndroid() && Device.androidVersion() < 2.3)
					|| benchmarkTest < 80) {
				// alert("Yes, we are slow");
				return true;
			} else {
				return false;
			}
		},

		/*
		 * Miscellaneous functions
		 */

		// shows apple 'Add to home' pop-up
		addToHomeOpenPopup : function() {
			window['addToHomeOpen']();
		}
	};
})();/**
 * Drag'n'Drop utilities
 */

var DragManager = (function() {
	// private interface
	var dragItem = null;

	var dragListeners = new Array();

	function cursorMove(e) {
		// console.log("cursorMove");
		if (dragItem) {
			// console.log("cursorMove dragItem");
			dragItem.dragMove(e);
			// notify listeners
			$['each'](dragListeners, function(id, obj) {
				if (obj.isEventIn(e)) {
					if (!obj.dragItemEntered) {
						// item enters listener zone
						// for the first time
						if (obj.onDragItemEnter) {
							obj.onDragItemEnter(dragItem);
						}
						obj.dragItemEntered = true;
					}
				} else if (obj.dragItemEntered) {
					// item moves out from listener zone
					if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
		}
	}

	function cursorUp() {
		if (dragItem) {

			// notify listeners
			var dragListenerAccepted = null;
			$['each'](dragListeners, function(id, obj) {
				if (obj.dragItemEntered) {
					if (!dragListenerAccepted && obj.onDragItemDrop) {
						if (obj.onDragItemDrop(dragItem)) {
							dragListenerAccepted = obj;
						}
					} else if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
			// console.log("dragCursorUp");
			dragItem.dragEnd(dragListenerAccepted);
			dragItem = null;
		}
	}

	var isInit = false;
	function init() {
		$(document)['bind'](Device.event("cursorUp"), cursorUp);
		$(document)['bind'](Device.event("cursorMove"), cursorMove);
		isInit = true;
	}

	return { // public interface
		//
		addListener : function(listener) {
			assert(listener instanceof GuiDiv,
					"Trying to add illegal drag'n'drop listener. Should be GuiDiv");
			listener.dragItemEntered = false;
			dragListeners.push(listener);
			// sort listeners by priority
			dragListeners.sort(function(l1, l2) {
				var z1 = l1.dragListenerPriority ? l1.dragListenerPriority : 0;
				var z2 = l2.dragListenerPriority ? l2.dragListenerPriority : 0;
				return z2 - z1;
			});
		},
		removeListener : function(listener) {
			popElementFromArray(listener, dragListeners);
		},
		setItem : function(item, e) {
			if (!isInit) {
				init();
			}

			if (dragItem && dragItem.dragEnd) {
				dragItem.dragEnd();
			}
			dragItem = item;

			// immediately update dragListeners
			cursorMove(e);
		},
		getItem : function() {
			return dragItem;
		}
	};
})();
/*
 *  Abstract Factory 
 */
/**
 * @constructor
 */
function AbstractFactory() {
	var objectLibrary = new Object();

	this.addClass = function(clazz, createFunction) {
		var classId;
		if(typeof(clazz) == "function") {
			classId = clazz.prototype.className;
			createFunction = clazz.prototype.createInstance;
		} else {
			classId = clazz;
		}
		
		assert(typeof (classId) == "string", "Invalid classId: " + classId);
		assert(typeof (createFunction) == "function", "Invalid createInstance function for" + " classId " + classId);
		objectLibrary[classId] = createFunction;
	};

	this.createObject = function(classId, args) {
		var createFunc = objectLibrary[classId];
		assert(typeof (createFunc) == "function", "classId: " + classId + " was not properly registered.");
		var obj = null;
		if (typeof (args) == "array") {
			obj = createFunc.apply(null, args);
		} else {
			obj = createFunc.call(null, args);
		}
		return obj;
	};

	this.createObjectsFromJson = function(jsonData, preprocessParamsCallback, onCreateCallback) {
		var objects = new Object();
		var that = this;
		$['each'](jsonData, function(name, value) {
			var params = value["params"];
			assert(params, "Params field not specified in '" + name + "'");
			params['name'] = name;
			if (preprocessParamsCallback) {
				preprocessParamsCallback(name, params);
			}
			obj = that.createObject(value["class"], params);
			objects[name] = obj;
			if (onCreateCallback) {
				onCreateCallback(name, obj, params);
			}
		});

		return objects;
	};
};
//////////////////
/**
 * Resource Manager
 */

var Resources = (function() {
	// private interface
	var assets = new Array();

	var images = new Array();
	var resolutions = new Object();
	
	//enum of strings of current language
	var strings = new Object();
	
	var currentResolution = null;
	var defaultResolution = null;
	
	var loadImage = function(src, callback) {
		var image = new Image();
		image.src = src;
		image.onload = callback;
		return image;
	};
	
	return { // public interface
		
		init : function() {
		},
		
		setResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName + " not exists!");
			currentResolution = resolutionName;
		},
		// if there's no picture in current resolution
		// it will be looking in default
		setDefaultResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName + " not exists!");
			defaultResolution = resolutionName;
		},
		
		addResolution : function(resolutionName, imagesFolder, isDefault) {
			assert(!resolutions[resolutionName], "Resolution " + resolutionName + " already exists!");
			resolutions[resolutionName] = {
					folder : imagesFolder,
					images : new Object()
			};
			
			if(isDefault) {
				Resources.setResolution(resolutionName);
				Resources.setDefaultResolution(resolutionName);
			}
		},
		
		addImage : function(name, resolution) {
			var resArray;
			if(typeof(resolution) == "string") {
				resArray = new Array();
				resArray(resolution);
			} else if(typeof(resolution) == "array") {
				resArray = resolution;
			} else {
				// adding on available resolutions
				resArray = new Array();
				for(var i in resolutions) {
					resArray.push(i);
				}
			}
			
			for(var i = 0; i < resArray.length; i++) {
				var resolutionName = resArray[i];
				assert(resolutions[resolutionName], "Resolution " + resolutionName + " not exists!");
				resolutions[resolutionName].images[name] = name;
			}
		},
		//returnes string
		getString : function(stringId){
			if(strings[stringId]){
				return strings[stringId];
			}else{
				//console.error(stringId + " Not Found");
				return stringId;
			}
			
		},
		//loads json with set language
		setLanguage : function(language){
			var fileName = "resources/localization/" + language + ".json"; 
			$['getJSON'](fileName, function(data){
				strings = data;
			});
		},
		// returns filename of an image for current resolution 
		getImage : function(name, preload, preloadCallback) {
			var imageFilename = null;
			
			// we are not using resolutions
			if(!currentResolution) {
				if(preload) {
					loadImage(name, preloadCallback);
				}
				return name;
			}
			
			if(resolutions[currentResolution].images[name]) {
				imageFilename = resolutions[currentResolution].folder +
			 	 	resolutions[currentResolution].images[name];
			}
			
			if(!imageFilename && defaultResolution && 
				defaultResolution != currentResolution &&
				resolutions[defaultResolution].images[name]) {
				imageFilename = resolutions[defaultResolution].folder + 
					resolutions[defaultResolution].images[name];
			}
			
			// when we are lazy to add all images by the Resource.addImage function
			// we simply add current resolution folder to the requesting name
			// supposing that we have all images for this resolution available 
			if(!imageFilename) {
				imageFilename = resolutions[currentResolution].folder + name;
			}
			
			if(preload) {
				loadImage(name, preloadCallback);
			}
			
			return imageFilename;
		},

		// return an array of registered images filenames, 
		// used for preloading
		getUsedImages : function() {
			var images = new Array();
			
			// walking through default resolution for all images
			// looking for images in current resolution
			for(var i in resolutions[defaultResolution].images[i]) {
				if(resolutions[currentResolution].images[i]) {
					images.push(Resources.getImage(i));
				}
			}
			return images;
		},
		
		// "preloading" font by creating and destroying item with all fonts classes 
		preloadFonts : function(fontClasses) {
			for (var i = 0; i < fontClasses.length; ++i) {
				$("#root")['append']("<div id='fontsPreload" + i + 
						"' + style='opacity:0.1;font-size:1px'>.</div>");
				var testDiv = $("#fontsPreload" + i);
				testDiv['addClass'](fontClasses[i]);
				setTimeout(function() {testDiv.remove();}, 1000); 
			}
		},
		
		//temporary borrowed from CraftyJS game engine
		//TODO rewrite
		loadMedia : function(data, oncomplete, onprogress, onerror) {
			var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
			for (; i < l; ++i) {
				current = data[i];
				ext = current.substr(current.lastIndexOf('.') + 1)
						.toLowerCase();

				if ((ext === "mp3" || ext === "wav" || ext === "ogg" || ext === "mp4")) {
					obj = new Audio(current);
					// Chrome doesn't trigger onload on audio, see
					// http://code.google.com/p/chromium/issues/detail?id=77794
					if (navigator.userAgent.indexOf('Chrome') != -1)
						j++;
				} else if (ext === "jpg" || ext === "jpeg" || ext === "gif"
						|| ext === "png") {
					obj = new Image();
					obj.src = Resources.getImage(current);
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
	};
})();
/**
 * Entity Factory
 */

var entityFactory = new AbstractFactory();

/**
 * @constructor
 */
entityFactory.createEntitiesFromJson = function(json) {
	this.createObjectsFromJson(json, function(name, params) {
		params['id'] = name;
	}, function(name, obj, params) {
		assert(Account.instance);
		Account.instance.addEntity(obj, name, params);
	});
};
/*
 *  Entity is a main logic item of simulation. 
 *  Entities is a mirroring of server object on client. 
 */

/**
 * @constructor
 */
function Entity() {
};

Entity.prototype.init = function(params) {
	this.params = params;
	this.id = params['id'];

	// Variables values for synchronizing with server
	this.properties = {};

	if (params['parent']) {
		// find parent among entities in account
		var parent = params['parent'];
		if (typeof params['parent'] == "string") {
			parent = Account.instance.getEntity(params['parent']);
			this.assert(parent, " No parent found with id='" + params['parent']
					+ "' ");
		}
		parent.addChild(this);
	} else {
		console.log(" No parent provided for entity with id='" + this.id + "'");
	}

	var enabled = selectValue(params['enabled'], true);
	this.setEnable(enabled);

	// this.readUpdate(params);
	this.timeouts = null;
	this.intervals = null;
};

Entity.prototype.assert = function(cond, msg) {
	assert(cond, msg + " for entity id='" + this.id + "'");
};

Entity.prototype.log = function(msg) {
	console.log("Entity id='" + this.id + "', " + msg);
};

Entity.prototype.destroy = function() {
	this.clearTimeouts();
	var child;
	if (this.parent) {
		this.parent.removeChild(this);
	}
	if (this.children) {
		for ( var i = 0; i < this.children.length; i++) {
			child = this.children[i];
			// child.destroy();//may be not necessary
			this.removeChild(child);
			Account.instance.removeEntity(child.id);
			i--;
		}
	}
};

Entity.prototype.addChild = function(child) {
	this.children = this.children ? this.children : new Array();
	this.assert(child != this, "Can't be parent for itself");
	this.assert(child.parent == null, "Can't assign as child id='" + child.id
			+ "' since there's parent id='"
			+ (child.parent ? child.parent.id : "") + "' ");
	child.parent = this;
	this.log("Entity.addChild " + child.id);
	this.children.push(child);
};

Entity.prototype.removeChild = function(child) {
	assert(this.children, "no children been assigned");
	popElementFromArray(child, this.children);
};

Entity.prototype.initChildren = function(params) {
	if (params && params['children']) {
		Account.instance.readGlobalUpdate(params['children']);
	}
};

// scheduled update
Entity.prototype.update = null;

Entity.prototype.isEnabled = function() {
	return this.enabled;
};

Entity.prototype.setEnable = function(isTrue) {
	this.enabled = isTrue;
	if (typeof (this.update) == "function") {
		if (isTrue) {
			Account.instance.addScheduledEntity(this);
		} else {
			Account.instance.removeScheduledEntity(this);
		}
	}
};

// Synchronization with server
Entity.prototype.setDirty = function() {
	var that = this;
	$['each'](arguments, function(id, val) {
		that.dirtyFlags[val] = true;
	});
};

Entity.prototype.clearDirty = function() {
	var that = this;
	$['each'](arguments, function(id, val) {
		that.dirtyFlags[val] = null;
	});
};

Entity.prototype.isDirty = function(name) {
	return this.dirtyFlags[name] == true;
};

Entity.prototype.clearAllDirty = function() {
	this.dirtyFlags = {};
};

Entity.prototype.readUpdate = function(data) {
	var parentId = this.parent ? this.parent['id'] : null;
	// if (data['parent']) {
	if (data['parent'] != parentId) {
		if(this.parent != null){
			this.parent.removeChild(this);
			this.parent = null;	
		}
		if (data['parent']) {
			Account.instance.getEntity(data['parent']).addChild(this);
		}
	}
	// }
};

Entity.prototype.readUpdateProperty = function(data, name) {
	this.properties[name] = data[name];
	return data[name];
};

Entity.prototype.writeUpdateProperty = function(data, name, value) {
	if (this.properties[name] != value) {
		data[name] = value;
		this.properties[name] = value;
	}
};

Entity.prototype.writeUpdate = function(globalData, entityData) {
	globalData[this.id] = entityData;
	entityData['class'] = this.params['class'];
	entityData['parent'] = this.params['parent'];
	if (this.children) {
		$['each'](this.children, function(idx, entity) {
			entity.writeUpdate(globalData, new Object());
		});
	}
};

// Timing of entity
Entity.prototype.setInterval = function(func, time) {
	var handle = setInterval(func, time);
	this.intervals = this.intervals ? this.intervals : new Array();
	this.intervals.push(handle);
	return handle;
};

Entity.prototype.setTimeout = function(func, time) {
	var handle = setTimeout(func, time);
	this.timeouts = this.timeouts ? this.timeouts : new Array();
	this.timeouts.push(handle);
	return handle;
};

Entity.prototype.clearTimeout = function(handle) {
	clearTimeout(handle);
	// TODO add removing from array
};

Entity.prototype.clearInterval = function(handle) {
	clearInterval(handle);
	// TODO add removing from array
};

Entity.prototype.clearTimeouts = function() {
	// TODO deal with infinite timeout and interval array increasing
	for ( var i in this.intervals) {
		clearInterval(this.intervals[i]);
	}
	this.intervals = new Array();

	for ( var i in this.timeouts) {
		clearTimeout(this.timeouts[i]);
	}
	this.timeouts = new Array();
};
/*
 * Account - root entity that is parent to all active entities
 */

Account.prototype = new BaseState();
Account.prototype.constructor = Account;

var GLOBAL_UPDATE_INTERVAL = 50;

/**
 * @constructor
 */
function Account(parent) {
	Account.parent.constructor.call(this);
};

Account.inheritsFrom(BaseState);

Account.prototype.init = function(params) {
	params = params ? params : {};
	Account.parent.init.call(this, params);
	// associative array of all active entities
	this.allEntities = new Object();
	// entities that should be update on timely basis
	this.scheduledEntities = new Object();

	// time interval for scheduled synchronization with server
	this.syncWithServerInterval = params['syncWithServerInterval'];
	// adding itself to allEntities for reading updates
	// in automatic mode
	this.id = selectValue(params['id'], "Account01");
	this.globalUpdateInterval = selectValue(params['globalUpdateInterval'],
			GLOBAL_UPDATE_INTERVAL);

	this.addEntity(this);
	// permanent GUI element
	this.backgroundState = new BackgroundState();
	params['backgroundState'] = selectValue(params['backgroundState'], {});
	params['backgroundState']['id'] = selectValue(
			params['backgroundState']['id'], "backgroundState01");
	this.backgroundState.activate(params['backgroundState']);

	// a singleton object
	assert(Account.instance == null,
			"Only one account object at time are allowed");
	Account.instance = this;
};

Account.prototype.addEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	assert(this.allEntities[newEntity.id] == null, "Entity with ID '"
			+ newEntity.id + "' already exists");
	this.allEntities[newEntity.id] = newEntity;
};

Account.prototype.getEntity = function(id) {
	return this.allEntities[id];
};

Account.prototype.removeEntity = function(id, dontDestroy) {
	var entity = this.allEntities[id];
	if (entity) {
		if (!dontDestroy) {
			this.removeScheduledEntity(entity);
			this.removeChild(entity);
			entity.destroy();
		}

		delete this.allEntities[id];

	}
};

Account.prototype.removeAllEntities = function(id, dontDestroy) {
	$['each'](this.allEntities, function(id, entity) {
		if (entity !== Account.instance) {
			Account.instance.removeEntity(id, false);
		}
	});
};

/*
 * Scheduling for children entities
 */
Account.prototype.addScheduledEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	var dt = this.globalUpdateInterval;
	// if adding first object to scheduling queue start update interval
	if (!this.globalUpdateIntervalHandle) {
		 this.globalUpdateIntervalHandle = this.setInterval(function() {
		 that.update(dt);
		 }, dt);
		
	}
	this.scheduledEntities[newEntity.id] = newEntity;
};

Account.prototype.removeScheduledEntity = function(entity) {
	assert(typeof (entity.id) == "string", "Entity ID must be string");
	delete this.scheduledEntities[entity.id];
	// if nothing to schedule anymore stop interval either
	if (!this.globalUpdateIntervalHandle
			&& $['isEmptyObject'](this.scheduledEntities)) {
		this.clearInterval(this.globalUpdateIntervalHandle);
		this.globalUpdateIntervalHandle = null;
	}
};

// Regular scheduled update for registered enities
Account.prototype.update = function(dt) {
	$['each'](this.scheduledEntities, function(id, entity) {
		if (entity && entity.isEnabled()) {
			entity.update(dt);
		}
	});
};
Account.prototype.setEnable = function(isTrue) {

};

// called from outside, to notify entities about
// screen resize
Account.prototype.resize = function() {
	if (this.children == null)
		return;
	$['each'](this.children, function(idx, entity) {
		if (entity && entity.resize) {
			entity.resize();
		}
	});
	// console.log(this);
	if (this.backgroundState) {
		this.backgroundState.resize();
	}
};

/*
 * NETWORKING FUNCTIONS dealing with external server /* NETWORKING FUNCTIONS
 * dealing with external server
 */
// Creates/Updates/Destroy all active entities
Account.prototype.readGlobalUpdate = function(data) {
	var that = this;
	$['each'](data, function(id, element) {
		// console.log("readGlobalUpdate key is ", id);
		var entity = Account.instance.getEntity(id);
		// entity already exists
		if (entity) {
			// entity should be destroyed with all of its children
			if (element["destroy"]) {
				// console.log("!!!!!Destroy entity '" + entity.id + "'");
				that.removeEntity(id);
				// remove entity from data
				delete data[id];
			} else {
				// updating the entity
				entity.readUpdate(element);
			}
			return;
		} else {
			var parentEntity = Account.instance.getEntity(element['parent']);
			if (parentEntity) {
				// create new entity
				element["id"] = id;
				entity = entityFactory.createObject(element["class"], element);
				// viking test
				// entity.parent = element.parent;
				that.addEntity(entity);
				// console.log("New entity '" + entity.id + "' of class "
				// + element["class"] + " with parent '"
				// + (entity.parent ? entity.parent.id : "no parent") + "'");
			}
		}
	});
};

// Serialize all entities to JSON
Account.prototype.writeGlobalUpdate = function() {
	var data = {};
	this.writeUpdate(data, new Object());
	return data;
};

// read update data from server
Account.prototype.getUpdateFromServer = function(callback) {
	this.server.receiveData(callback);
};

// send data to server
Account.prototype.saveUpdateToServer = function(data, callback) {
	this.server.sendData(data, callback);
};

// perform specific command on server
Account.prototype.commandToServer = function(name, args, callback) {
	var that = this;
	this.server.command(name, args, function(result, data) {
		that.readGlobalUpdate(data);
		callback(result);
	});
};

// make sure client and server are synchronized at the moment
// var acc = 0;
Account.prototype.syncWithServer = function(callback, data, syncInterval) {
	// console.log("startShedule#",acc++);
	// var d = new Date();
	// var g = d.getTime();
	var writeData = this.writeGlobalUpdate();
	if (data) {
		$['extend'](true, writeData, data);
	}
	var that = this;
	this.server.sendData(writeData, function(data) {
		that.readGlobalUpdate(data);
		if (callback) {
			callback();
		}
	});
	syncInterval = selectValue(syncInterval, this.syncWithServerInterval);
	if (syncInterval != null) {
		this.clearTimeout(this.syncWithServerTimeoutId);
		var that = this;
		this.syncWithServerTimeoutId = this.setTimeout(function() {
			that.syncWithServer();
		}, 5000);
		// console.log("sheduleStoped"+(acc-1),((new Date()).getTime() - g));
	}
};
/*
 * BaseState - abstract class - current state of the game.
 * Loads GUI preset and operate with GUI elements.
 * Preloads any required resources
 */

BaseState.prototype = new Entity();
BaseState.prototype.constructor = BaseState;

/**
 * @constructor
 */
function BaseState() {
	BaseState.parent.constructor.call(this);
};

BaseState.inheritsFrom(Entity);

BaseState.prototype.init = function(params) {
	BaseState.parent.init.call(this, params);
	this.guiContainer = new GuiContainer();
	this.guiContainer.init();
	this.guiContainer.resize();
};

BaseState.prototype.destroy = function() {
	BaseState.parent.destroy.call(this);
	this.guiContainer.clear();
};

BaseState.prototype.addGui = function(entity, name) {
	this.guiContainer.addGui(entity, name);
};
BaseState.prototype.removeGui = function(entity) {
	this.guiContainer.removeGui(entity);
};
BaseState.prototype.getGui = function(name) {
	return this.guiContainer.getGui(name);
};

BaseState.prototype.resize = function() {
	this.guiContainer.resize();
};

// Activate will either init object immediately or
// preload required resources and then call init
BaseState.prototype.activate = function(params) {
	this.id = params ? params['id'] : null;
	this.params = params;
	if (this.resources) {
		this.preload();
	} else {
		this.init(this.params);
	}
};

// Preloading of static resources - resources that
// should be upload before the use of the state
BaseState.prototype.preload = function() {
	// Loading JSONs first
	var totalToLoad = 0;
	var that = this;
	if (!this.resources)
		this.preloadComplete();

	
	if (this.resources.json) {
		$['each'](this.resources.json, function(key, val) {
			totalToLoad++;
			$['getJSON'](key, function(data) {
				that.resources.json[key] = data;
			}).error(function() {
				assert(false, "error reading JSON " + key);
			}).complete(function() {
				totalToLoad--;
				if (totalToLoad <= 0)
					that.jsonPreloadComplete();
				
			});
		});
	} else {
		this.jsonPreloadComplete();
	}
};

BaseState.prototype.jsonPreloadComplete = function() {
	var that = this;
	if (this.resources.media) {
		var startTime = new Date();
		Resources.loadMedia(this.resources.media, function() {
			//console.log("Media loaded for %d ms", (new Date() - startTime));
			that.preloadComplete();
		}, this.preloadingCallback);
	} else {
		this.preloadComplete();
	}
};

BaseState.prototype.preloadComplete = function() {
	// loading complete, make initializing
	this.init(this.params);
};

BaseState.prototype.preloadJson = function(jsonToPreload) {
	if (!this.resources)
		this.resources = new Object();
	if (!this.resources.json)
		this.resources.json = new Object();
	if (typeof jsonToPreload === "string") {
		this.resources.json[jsonToPreload] = null;
	} else if (typeof jsonToPreload === "array") {
		$['each'](this.resources.json, function(key, val) {
			this.resources.json[val] = null;
		});
	} else {
		console.error("Invalid argument for preloadJson: should be array of json urls or single url.");
	}
	//this.jsonPreloadComplete();
};

BaseState.prototype.preloadMedia = function(mediaToPreload, callback) {
	if (!this.resources)
		this.resources = new Object();
	if (!this.resources.media)
		this.resources.media = new Array();
	
	this.preloadingCallback = callback;

	// if (typeof mediaToPreload === "array") {
	if (mediaToPreload instanceof Array) {
		// this.resources.media.concat(mediaToPreload);
		this.resources.media = mediaToPreload;
	} else {
		console.error("Invalid argument for preloadMedia: array of media urls.");
	}
};
/**
 * VisualEntity - Entity with visual representation
 */

VisualEntity.prototype = new Entity();
VisualEntity.prototype.constructor = VisualEntity;

/**
 * @constructor
 */
function VisualEntity() {
	VisualEntity.parent.constructor.call(this);
};

VisualEntity.inheritsFrom(Entity);

VisualEntity.prototype.init = function(params) {
	VisualEntity.parent.init.call(this, params);
	this.x = params['x'];
	this.y = params['y'];
	this.z = params['z'];
	this.width = params['width'];
	this.height = params['height'];
	this.visible = params['visible'];
	this.visuals = {}; // associative array of all attached visuals
};

VisualEntity.prototype.createVisual = function() {
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");
};

VisualEntity.prototype.addVisual = function(visualId, visualInfo) {
	var id = (visualId == null) ? 0 : visualId;
	this.assert(this.visuals[id] == null, "Visual id = '" + id
			+ "' is already created.");
	this.visuals[id] = visualInfo;

};

VisualEntity.prototype.getVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id] ? this.visuals[id].visual : null;
};

VisualEntity.prototype.removeVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	var visual = this.visuals[id].visual;
	this.guiParent.removeGui(visual);
	delete this.visuals[id];
};

VisualEntity.prototype.getVisualInfo = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id];
};

VisualEntity.prototype.attachToGui = function(guiParent, clampByParentViewport) {
	if (!this.visual) {
		this.guiParent = guiParent ? guiParent : this.params['guiParent'];
		this.assert(this.guiParent, "No guiParent provided");
		this.createVisual();

		var that = this;
		$['each'](that.visuals, function(id, visualInfo) {
			visualInfo.visual.visualEntity = that;
			that.guiParent.addGui(visualInfo.visual);
			if (visualInfo.visual.clampByParentViewport)
				visualInfo.visual.clampByParentViewport(clampByParentViewport);
		});
	}
	
};

VisualEntity.prototype.destroy = function() {
	VisualEntity.parent.destroy.call(this);
	if (this.guiParent) {
		var that = this;
		$['each'](this.visuals, function(id, visualInfo) {
			that.guiParent.removeGui(visualInfo.visual);
		});
	}
};

VisualEntity.prototype.setZ = function(z) {
	if (typeof z == "number") {
		this.z = z;
	}
	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		if (typeof that.z == "number") {
			visualInfo.visual.setZ(that.z + visualInfo.z);
		}
	});
};

VisualEntity.prototype.setPosition = function(x, y) {

	this.x = x;
	this.y = y;
	
	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		// dont' move dependent
		if(visualInfo.dependent) {
			return;
		}
		var x = that.x, y = that.y;
		if (typeof visualInfo.offsetX == "number") {
			x -= visualInfo.offsetX;
		}
		if (typeof visualInfo.offsetY == "number") {
			y -= visualInfo.offsetY;
		}
		
		visualInfo.visual.setPosition(x, y);
	});
};

VisualEntity.prototype.move = function(dx, dy) {
	this.setPosition(this.x + dx, this.y + dy);
};

// Aligns logic position of visualEntity to the one
// of actual visual
VisualEntity.prototype.setPositionToVisual = function(visualId) {
	var visualInfo = this.getVisualInfo(visualId);
	this.x = visualInfo.visual.x + visualInfo.offsetX;
	this.y = visualInfo.visual.y + visualInfo.offsetY;
	this.setPosition(this.x, this.y);
};

VisualEntity.prototype.show = function() {
	this.visible = true;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.show();
	});
};

VisualEntity.prototype.hide = function() {
	this.visible = false;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.hide();
	});
};

VisualEntity.prototype.resize = function() {
	var that = this;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.resize();
	});
};

VisualEntity.prototype.writeUpdate = function(globalData, entityData) {
	// if(this.id == "Door01"){
	// console.log("FALSE",this.x,this.y);
	// }
	this.writeUpdateProperty(entityData, 'x', this.x);
	this.writeUpdateProperty(entityData, 'y', this.y);
	VisualEntity.parent.writeUpdate.call(this, globalData, entityData);
};

VisualEntity.prototype.readUpdate = function(data) {
	//this.x = this.readUpdateProperty(data, 'x');
	//this.y = this.readUpdateProperty(data, 'y');
	VisualEntity.parent.readUpdate.call(this, data);

};
/**
 * Scene - Container for VisualEntities
 */

Scene.prototype = new VisualEntity();
Scene.prototype.constructor = Scene;

function Scene() {
	Scene.parent.constructor.call(this);
};

Scene.inheritsFrom(VisualEntity);
Scene.prototype.className = "Scene";

Scene.prototype.createInstance = function(params) {
	var entity = new Scene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Scene);

Scene.prototype.init = function(params) {
	Scene.parent.init.call(this, params);
};

Scene.prototype.createVisual = function() {
	var params = this.params;
	var visual = guiFactory.createObject("GuiScene", {
		parent : this.guiParent,
		style : "scene",
		x : params['x'],
		y : params['y'],
		width : params['width'],
		height : params['height'],
		background : params['background']
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	this.addVisual(null, visualInfo);

	var that = this;
	this.children = this.children ? this.children : new Array();
	$['each'](this.children, function(id, val) {
		that.attachChildVisual(val);
	});
};

Scene.prototype.attachChildVisual = function(child) {
	if (child.attachToGui) {
		child.attachToGui(this.getVisual(), true);
	}
};

Scene.prototype.move = function(dx, dy, parallaxDepth) {
	var visual = this.getVisual();
	if (parallaxDepth) {
		$['each'](visual.backgrounds, function(i, back) {
			if (!back)
				return;
			if (i != visual.backgrounds.length - 1) {
				visual.setBackgroundPosition(visual.backgrounds[i].left
						- (dx * (i / parallaxDepth)), visual.backgrounds[i].top
						- (dy * (i / parallaxDepth)), i);
			}
		});
	}

	visual.move(dx, dy);
	//visual.resize();
};
/**
 * Item - VisualEntity that can be stored in inventory or placed inside scene.
 */
var ITEM_NAME = "Item";

Item.prototype = new VisualEntity();
Item.prototype.constructor = Item;

/**
 * @constructor
 */
function Item() {
	Item.parent.constructor.call(this);
};

Item.inheritsFrom(VisualEntity);
Item.prototype.className = ITEM_NAME;

Item.prototype.createInstance = function(params) {
	var entity = new Item();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Item);

Item.prototype.init = function(params) {
	Item.parent.init.call(this, params);
	this.stashed = params['stashed'];
	if (this.stashed) {
		return;
	} else {
		var guiParent = this.params['guiParent'] ? this.params['guiParent']
				: this.parent.visual;
		if (guiParent) {
			this.attachToGui(guiParent);
		}
	}

	this.z = (this.z != null) ? this.z : 0;
};

Item.prototype.getIcon = function() {
	return this.description['totalImage'];
};

Item.prototype.createVisual = function() {
	this.assert(this.guiParent, "No gui parent provided for creating visuals");
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");

	var totalImage = Resources.getImage(this.description['totalImage']);

	visual = guiFactory.createObject("GuiSprite", {
		parent : this.guiParent,
		style : "sprite",
		x : this.params['x'],
		y : this.params['y'],
		width : this.description['totalImageWidth'],
		height : this.description['totalImageHeight'],
		totalImage : totalImage,
		totalImageWidth : this.description['totalImageWidth'],
		totalImageHeight : this.description['totalImageHeight'],
		totalTile : this.description['totalTile']
	});
//	for(var i=0;i<=10;i++){
//		for(var j=0;j<=10;j++){
//		x=i*100;
//		y=j*100;
//		visual.jObject['append']("<div class='sprite' style='width : 100px; height : 100px; -webkit-transform: translateX("+x+"px) translateY("+y+"px) scaleX(1) scaleY(1);background-image: url(http://logicking.com/html5/KittyWorldTest/images/introScreen.jpg); background-size : cover'></div>")
//		}
//	}

	var visualInfo = {};
	visualInfo.visual = visual;
	visualInfo.z = this.description['z-index'];
	visualInfo.offsetX = this.description['centerX'] ? calcPercentage(
			this.description['centerX'], this.description['width']) : 0;
	visualInfo.offsetY = this.description['centerY'] ? calcPercentage(
			this.description['centerY'], this.description['height']) : 0;

	this.addVisual(null, visualInfo);
	this.setPosition(this.x, this.y);
	this.setZ(null);
};

Item.prototype.writeUpdate = function(globalData, entityData) {
	Item.parent.writeUpdate.call(this, globalData, entityData);
};
Item.prototype.readUpdate = function(data) {
	// this.params['count'] = data['count'];
	Item.parent.readUpdate.call(this, data);
};
/**
 * SimpleCountdown - VisualEntity with only countdown label.
 */
SimpleCountdown.prototype = new VisualEntity();
SimpleCountdown.prototype.constructor = SimpleCountdown;

/**
 * @constructor
 */
function SimpleCountdown() {
	SimpleCountdown.parent.constructor.call(this);
};

SimpleCountdown.inheritsFrom(VisualEntity);
SimpleCountdown.prototype.className = "SimpleCountdown";

SimpleCountdown.prototype.createInstance = function(params) {
	var entity = new SimpleCountdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(SimpleCountdown);

SimpleCountdown.prototype.init = function(params) {
	SimpleCountdown.parent.init.call(this, params);
};

/**
 * Will be called after a cycle will be finished
 * 
 * @param animationCycleEndCallback
 */
SimpleCountdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

SimpleCountdown.prototype.createVisual = function() {
	SimpleCountdown.parent.createVisual.call(this);
	this.description['style'] = (this.description['style'] == null) ? "dialogButtonLabel lcdmono-ultra"
			: this.description['style'];
	this.label = guiFactory.createObject("GuiLabel", {
		"parent" : this.guiParent,
		"x" : this.params['x'],
		"y" : this.params['y'],
		"style" : this.description['style'],// "dialogButtonLabel
											// lcdmono-ultra",
		"width" : this.description['width'],
		"height" : this.description['height'],
		"align" : "center",
		"verticalAlign" : "middle",
		"text" : this.params['count'],
		"fontSize" : this.description['fontSize'],
		"color" : this.description['color']
	});
	// this.visual.addGui(this.label);

	var visualInfo = {};
	visualInfo.visual = this.label;
	this.addVisual(null, visualInfo);

	this.count = this.params['count'] * 1000;
	this.alarmCount = this.params['alarmCount'] * 1000;

	this.paused = false;
};

SimpleCountdown.prototype.pause = function() {
	this.paused = true;
};

SimpleCountdown.prototype.resume = function() {
	this.paused = false;
};

SimpleCountdown.prototype.getTimeRemains = function() {
	return this.count;
};

SimpleCountdown.prototype.update = function(updateTime) {
	if (!this.paused) {
		this.count -= updateTime;
		if (this.count > 0) {
			if (this.alarmCount && (this.count < this.alarmCount)) {
				this.label.setColor(this.description['alarmColor']);
				this.alarmCount = null;
			} else {
				this.label.change(Math.floor(this.count / 1000));
			}
		} else {
			this.label.change(this.description['go']);
			if (this.cycleEndCallback) {
				this.cycleEndCallback();
				this.cycleEndCallback = null;
			}
		}
	}
};
/**
 * Countdown - VisualEntity with countdown label inside it.
 */
Countdown.prototype = new VisualEntity();
Countdown.prototype.constructor = Countdown;

/**
 * @constructor
 */
function Countdown() {
	Countdown.parent.constructor.call(this);
};

Countdown.inheritsFrom(VisualEntity);
Countdown.prototype.className = "Countdown";

Countdown.prototype.createInstance = function(params) {
	var entity = new Countdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Countdown);

Countdown.prototype.init = function(params) {
	Countdown.parent.init.call(this, params);
};

/**
 * Will be called after a cycle of animation finished
 * 
 * @param animationCycleEndCallback
 */
Countdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

/**
 * Will be called after the countdown completely finished
 * 
 * @param animationEndCallback
 */
Countdown.prototype.setEndCallback = function(EndCallback) {
	this.EndCallback = EndCallback;
};

Countdown.prototype.createVisual = function() {
	Countdown.parent.createVisual.call(this);
	if (this.description['sprite']) {
		this.sprite = guiFactory
				.createObject(
						"GuiSprite",
						{
							'parent' : this.guiParent,
							'style' : "dialogButton",
							'x' : this.params['x'],
							'y' : this.params['y'],
							'width' : this.description['sprite']['width'],
							'height' : this.description['sprite']['height'],
							'totalImage' : Resources
									.getImage(this.description['sprite']['totalImage']),
							'totalImageWidth' : this.description['sprite']['totalImageWidth'],
							'totalImageHeight' : this.description['sprite']['totalImageHeight'],
							'totalTile' : this.description['sprite']['totalTile'],
							'spriteAnimations' : this.description['sprite']['spriteAnimations']

						});
		var visualInfo = {};
		visualInfo.visual = this.sprite;
		this.addVisual("sprite", visualInfo);
	}
	this.tickSound = this.description['tickSound'] ? this.description['tickSound']
			: "beepShort";
	this.lastSound = this.description['lastSound'] ? this.description['lastSound']
			: "beepShort";
	this.tickDuration = this.description['tickDuration'] ? this.description['tickDuration']
			: 1000;
	this.count = this.params['count'];
	this.duration = this.count * this.tickDuration;
	this.alarmColor = this.description['alarmColor'];
	this.alarmCount = this.params['alarmCount'];
	this.paused = this.description['paused'] ? this.description['paused']
			: false;
	// this.go = this.description['go'];
	if (this.description['label']) {
		this.label = guiFactory
				.createObject(
						"GuiLabel",
						{
							"parent" : this.guiParent,
							"style" : this.description['label']['params']['style'] ? this.description['label']['params']['style']
									: "dialogButtonLabel lcdmono-ultra",
							"width" : this.description['label']['params']['width'],
							"height" : this.description['label']['params']['height'],
							"x" : this.description['label']['params']['x'] ? this.description['label']['params']['x']
									: this.params['x'],
							"y" : this.description['label']['params']['y'] ? this.description['label']['params']['y']
									: this.params['y'],
							"align" : "center",
							"verticalAlign" : "middle",
							"text" : this.count,
							"fontSize" : this.description['label']['params']['fontSize'],
							"color" : this.description['label']['params']['color']
						});
		var labelVisualInfo = {};
		labelVisualInfo.visual = this.label;
		this.addVisual("label", labelVisualInfo);
	}

	var that = this;
	var animationEnd = function() {
		if (!that.paused) {
			if (that.count > 1) {
				that.count--;
//				if (that.cycleEndCallback) {
//					that.cycleEndCallback();
//				}
				if (that.label)
					that.label.change(that.count);
				if (that.sprite)
					that.sprite.playAnimation("countdown", that.tickDuration,
							false);
				that.sprite.setAnimationEndCallback(animationEnd);
			} else {
				if (that.sprite)
					that.sprite.playAnimation("empty", that.tickDuration, true);
				if (that.label)
					that.label.change(that.description["go"]);
				if (that.EndCallback) {
					that.EndCallback();
				}
				return;
			}
		}
	};
	// Sound.play("beepShort");
	if (this.sprite) {
		this.sprite.playAnimation("countdown", 1000, false);
		this.sprite.setAnimationEndCallback(animationEnd);
	}
};

Countdown.prototype.update = function(updateTime) {
	var text = Math.floor(this.duration / 1000) + 1;
	if (!this.paused) {
		if (this.sprite) {
			this.sprite.update(updateTime);
		}
		if (this.label) {
			this.duration -= updateTime;
			if (this.duration > 0) {
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = this.label.text;
				}
				if (this.alarmCount
						&& ((this.duration / 1000) < this.alarmCount)) {
					this.label.setColor(this.description['alarmColor']);
					this.alarmCount = null;
				} else {
					if (!this.sprite) {
						this.label.change(Math.floor(this.duration / 1000) + 1);
					}
				}
			} else {
				if (!this.sprite) {
					this.label.change(this.description['go']);
					if (this.EndCallback) {
						this.EndCallback();
						delete this.update;
					}
				}
			}
		}
		if (!this.label && !this.sprite) {
			if (this.duration > 0) {
				this.duration -= updateTime;
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = Math.floor(this.duration / 1000) + 1;
				}
			} else {
				if (this.EndCallback) {
					this.EndCallback();
					delete this.update;
				}
			}
		}
	}
};
Countdown.prototype.pause = function() {
	this.paused = true;
};

Countdown.prototype.resume = function() {
	this.paused = false;
};
Countdown.prototype.getTimeRemains = function() {
	return this.count;
};
/**
 * Inventory
 */

Inventory.prototype = new Entity();
Inventory.prototype.constructor = Inventory;

/**
 * @constructor
 */
function Inventory() {
	Inventory.parent.constructor.call(this);
};

Inventory.inheritsFrom(Entity);

Inventory.prototype.className = "Inventory";
Inventory.prototype.createInstance = function(params) {
	var entity = new Inventory();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Inventory);

Inventory.prototype.init = function(params) {
	this.children = new Array();
	Inventory.parent.init.call(this, params);
	// this.add();
};
Inventory.prototype.clear = function() {
	this.params.itemList = null;
};
Inventory.prototype.addItem = function(item) {
	if (item instanceof Item) {
		Account.instance.commandToServer("changeParent", [ item['id'],this.id ],
				function(success) {
					if (success) {
						console.log("SUCCESS");
						console.log("ItemADDED");
					} else {
						console.log("FAIL");
					}
				});
	} 
};

Inventory.prototype.readUpdate = function(params) {
	Inventory.parent.readUpdate.call(this, params);
};
Inventory.prototype.writeUpdate = function(globalData, entityData) {
	Inventory.parent.writeUpdate.call(this, globalData, entityData);
};
////////////////////////////////////////////////////
/**
 * BackgroundState set of useful functions, operating div that permanently exist
 * in game
 */

var LEVEL_FADE_TIME = 500;

BackgroundState.prototype = new BaseState();
BackgroundState.prototype.constructor = BaseState;

/**
 * @constructor
 */
function BackgroundState() {
	BackgroundState.parent.constructor.call(this);
};

BackgroundState.inheritsFrom(BaseState);

BackgroundState.prototype.init = function(params) {
	params = params ? params : {};
	var image = selectValue(
			params['image'],
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	var background;
	if (params['background']) {
		background = params['background'];
		image = null;
	}

	// foreach(params['dialogs'])
	// ['Ok']
	this.dialogs = new Object();
	var that = this;
	if (params['dialogs'])
		$['each'](params['dialogs'], function(index, value) {
			that.dialogs[index] = guiFactory.createObject("GuiMessageBox",
					value['params']);
		});
	BackgroundState.parent.init.call(this, params);
	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	this.mask = guiFactory.createObject("GuiDiv", {
		parent : "body",
		image : image,
		background : background,
		style : "mask",
		width : "FULL_WIDTH",
		height : "FULL_HEIGHT",
		x : 0,
		y : 0
	});
	this.addGui(this.mask);
	this.mask.$()['css']("opacity", 0);
	this.mask.setZ(10000);
	this.mask.hide();
};

BackgroundState.prototype.fadeIn = function(fadeTime, color, callback) {
	this.mask.$()['css']("opacity", 0);
	this.mask.$()['css']("background-color", color);
	this.mask.fadeTo(1, fadeTime, callback);
};

BackgroundState.prototype.fadeOut = function(fadeTime, callback) {
	var that = this;
	this.mask.fadeTo(0, fadeTime, function(s) {
		that.mask.hide();
		if (callback)
			callback();
	});
};

BackgroundState.prototype.resize = function() {
	BackgroundState.parent.resize.call(this);
	$['each'](this.dialogs, function(index, value) {
		value.resize();
	});
};function boxPolyVertices(positionX, positionY, extentionX, extentionY) {
	var px = positionX;
	var py = positionY;
	var ex = extentionX;
	var ey = extentionY;
	return [ {
		x : px,
		y : py
	}, {
		x : px + ex,
		y : py
	}, {
		x : px + ex,
		y : py + ey
	}, {
		x : px,
		y : py + ey
	} ];
};

var MathUtils = (function() {
	return {
		toRad : function(angle) {
			return Math.PI / 180. * angle;
		},
		toDeg : function(angle) {
			return 180. / Math.PI * angle;
		}
	};
})();

function calculateAngle(vec1,vec2){
	var v1 = new b2Vec2(vec1.x, vec1.y);
	var v2 = new b2Vec2(vec2.x, vec2.y);
	
	var dot = (vec1.x*vec2.x) + (vec1.y*vec2.y);
	var cosA = dot/(v1.Length()*v2.Length());
	return MathUtils.toDeg(Math.acos(cosA));
};

function calculateSignedAngle(vec1,vec2){
	var v1 = new b2Vec2(vec1.x, vec1.y);
	var v2 = new b2Vec2(vec2.x, vec2.y);
	
	var f = (vec1.x*vec2.y) + (vec1.y*vec2.x);
	var sinA = f/(v1.Length()*v2.Length());
	return sinA;
};

/**
 * 
 */

function DebugCanvas() {

	var canvasElm = document.getElementById("debugCanvas");
	if (!canvasElm) {
		$("#root")
				.append(
						"<canvas id='debugCanvas' width='800' height='500' style='position :absolute; top: 0 px; left: 0 px;'></canvas>");
		canvasElm = document.getElementById("debugCanvas");
	}
	this.debugDrawContext = canvasElm.getContext("2d");
	var canvasElm = document.getElementById("debugCanvas");
	this.debugDrawContext = canvasElm.getContext("2d");
	canvasElm.width = BASE_WIDTH;
	canvasElm.height = BASE_HEIGHT;

	canvasElm.style.width = BASE_WIDTH * Screen.widthRatio();
	canvasElm.style.height = BASE_HEIGHT * Screen.heightRatio();

	this.debugCanvasWidth = parseInt(canvasElm.width);
	this.debugCanvasHeight = parseInt(canvasElm.height);
	debugCanvasTop = parseInt(canvasElm.style.top);
	debugCanvasLeft = parseInt(canvasElm.style.left);
	eLog("left " + canvasElm.style.left, "top " + canvasElm.style.top);
};

var Physics = (function() {
	var world = null;
	var worldBorder = null;
	var timeout = null;
	var pause = false;
	var debugMode = true;
	var debugCanvas = null;
	var updateItems = [];
	var contactListener = null;
	var contactProcessor = null;
	// var activeContacts = new Array();

	function debugDraw() {
		if (!debugCanvas)
			return;
		debugCanvas.debugDrawContext.clearRect(0, 0,
				debugCanvas.debugCanvasWidth, debugCanvas.debugCanvasHeight);
		drawWorld(world, debugCanvas.debugDrawContext);
	}

	function debugDrawing(v) {

		if (v && !debugCanvas)
			debugCanvas = new DebugCanvas();

		if (!v && debugCanvas) {
			debugCanvas.debugDrawContext
					.clearRect(0, 0, debugCanvas.debugCanvasWidth,
							debugCanvas.debugCanvasHeight);
			debugCanvas = null;
		}

	}

	function createWorld() {
		if (world != null)
			return;
		var worldAABB = new b2AABB();
		worldAABB['minVertex']['Set'](-1000, -1000);
		worldAABB['maxVertex']['Set'](2000, 2000);
		var gravity = new b2Vec2(0, 300);
		var doSleep = true;
		world = new b2World(worldAABB, gravity, doSleep);

		contactProcessor = new ContactProcessor();
		contactListener = new ContactListener(contactProcessor);

	}

	function createWorldBorder(params) {
		assert(world);

		var SIDE = ENHANCED_BASE_MARGIN_WIDTH;
		if (!GROUND)
			var GROUND = 0;
		var ADD_HEIGHT = 1000;
		var borderWidth = 100;
		var B = borderWidth;
		var W = BASE_WIDTH;
		var H = BASE_HEIGHT;
		var WE = W + 2 * B + 2 * SIDE;
		var HE = H + 2 * B - GROUND;
		// boxPolyVertices(-B - SIDE, -B, WE, B),
		var poligons = [
				boxPolyVertices(-B - SIDE, -B - ADD_HEIGHT, B, HE + ADD_HEIGHT),
				boxPolyVertices(W + SIDE, -B - ADD_HEIGHT, B, HE + ADD_HEIGHT),
				boxPolyVertices(-B - SIDE, H - GROUND, WE, B) ];
		worldBorder = Physics.createPolyComposite(0, 0, 0, poligons);
	}

	function putToSleep() { // 2dBody function
		world['m_contactManager']['CleanContactList']();
		this['m_flags'] |= b2Body['e_sleepFlag'];
		this['m_linearVelocity']['Set'](0.0, 0.0);
		this['m_angularVelocity'] = 0.0;
		this['m_sleepTime'] = 0.0;
	}

	function setBodyPoseByShape(position, angle) {
		this['SetCenterPosition'](position, angle);
		var shapeToBody = b2Math['SubtractVV'](this['m_position'],
				this['GetShapeList']()['GetPosition']());
		this['SetCenterPosition']
				(b2Math['AddVV'](position, shapeToBody), angle);
	}
	function getShapesCount() {// 2dBody function
		var shape = this['GetShapeList']();
		var shapesCount = 0;
		for (; shape != null; ++shapesCount, shape = shape['m_next'])
			;
		return shapesCount;
	}

	function getShapeByIdx(shapeIdx) {// 2dBody function
		var shapesCount = this.getShapesCount();
		var listPosition = shapesCount - 1 - shapeIdx;
		var shape = this['GetShapeList']();
		for ( var i = 0; i < listPosition; ++i) {
			if (!shape['m_next']) {
				eLog("bad shape idx!");
				return null;
			}
			shape = shape['m_next'];
		}

		return shape;
	}

	function getLogicPose() {
		var position = undefined;
		if (this.positionInshape)
			position = this['GetShapeList']()['GetPosition']();
		else
			position = this['GetCenterPosition']();
		var x = position.x - this.offset.x;
		var y = position.y - this.offset.y;
		var angle = this['GetRotation']();
		return {
			x : x,
			y : y,
			angle : angle
		};
	}

	function setLogicPose(pose) {
		//
		var position = new b2Vec2(parseFloat(pose.x) + this.offset.x,
				parseFloat(pose.y) + this.offset.y);

		if (this.positionInshape)
			this.setPoseByShape(position, pose.angle);
		else
			this['SetCenterPosition'](position, pose.angle);
		//
	}

	function setupShapeDef(shapeDef) {
		var density = 0.01;
		shapeDef['friction'] = 0.5;
		shapeDef['restitution'] = 0.3;
		shapeDef['density'] = density;
		// shapeDef.categoryBits = 0x0001;
		// shapeDef.maskBits = 0xFFFF;
		// shapeDef.groupIndex = 0;
	}
	function setupBodyDef(bodyDef) {
		bodyDef['linearDamping'] = 0.0001;
		bodyDef['angularDamping'] = 0.001;
		// bodyDef.allowSleep = true;
		// bodyDef.isSleeping = false;
		// bodyDef.preventRotation = false;
	}
	function createBody(x, y, angle, shapeDef, shapesCount) {
		var bd = new b2BodyDef();
		setupBodyDef(bd);
		if (shapesCount != undefined) {
			for ( var i = 0; i < shapesCount; ++i)
				bd['AddShape'](shapeDef[i]);
		} else {
			bd['AddShape'](shapeDef);
		}
		bd['position']['Set'](x, y);
		bd['rotation'] = angle;
		bd['isSleeping'] = true;
		bd['allowSleep'] = true;
		var body = Physics.getWorld()['CreateBody'](bd);
		body.putToSleep = putToSleep;
		body.getShapesCount = getShapesCount;
		body.getShapeByIdx = getShapeByIdx;
		body.setPoseByShape = setBodyPoseByShape;
		body.setContactCallback = setContactCallback;
		body.getLogicPose = getLogicPose;
		body.setLogicPose = setLogicPose;
		return body;
	}

	function createPolyDef(vertices, localPosition, fixed) {
		if (typeof (fixed) == 'undefined')
			fixed = true;
		var polySd = new b2PolyDef();
		if (!fixed)
			setupShapeDef(polySd);

		if (localPosition)
			polySd['localPosition']['SetV'](localPosition);
		polySd['vertexCount'] = vertices.length;
		for ( var i = 0; i < vertices.length; i++) {
			polySd['vertices'][i]['Set'](vertices[i].x, vertices[i].y);
		}
		return polySd;
	}

	function setContactCallback(callback, shapeIdx) {
		if (shapeIdx != undefined) {
			this.getShapeByIdx(shapeIdx)['contactCallback'] = callback;
			return;
		}
		var shape = this['GetShapeList']();
		for (; shape != null; shape = shape['m_next']) {
			shape['contactCallback'] = callback;
		}
	}

	return { // public interface
		getWorld : function() {
			createWorld();
			assert(world, "No physics world created!");
			return world;
		},
		createWorldBorder : function(params) {
			createWorldBorder(params);
		},
		getContactProcessor : function() {
			return contactProcessor;
		},
		getContactListener : function() {
			return contactListener;
		},
		updateWorld : function(delta) {

			if (pause)
				return;

			var world = this.getWorld();

			world['Step'](delta / 1350, 50);
			// this.getWorld().Step(delta / 1000 * (1.0), 20);
			// this.getWorld().Step(delta / 1000 * (0.00), 20);
			if (timeout)
				timeout.tick(delta);

			if (debugCanvas) {
				debugDraw();
			}

			//contactListener.update();

			for ( var i = 0; i < updateItems.length; ++i)
				updateItems[i].updatePhysics();
		},
		createSphere : function(x, y, radius, localPosition) {
			var sphereSd = new b2CircleDef();
			setupShapeDef(sphereSd);

			sphereSd['radius'] = radius;
			var body = createBody(x, y, 0, sphereSd);
			if (localPosition) {
				body['GetShapeList']()['m_localPosition']['Set'](
						localPosition.x, localPosition.y);
				body.setPoseByShape({
					x : x,
					y : y
				}, 0);
			}
			return body;
		},
		createBox : function(x, y, angle, width, height, fixed) {
			if (typeof (fixed) == 'undefined')
				fixed = true;
			var boxSd = new b2BoxDef();
			if (!fixed)
				setupShapeDef(boxSd);

			boxSd['extents']['Set'](width / 2, height / 2);
			return createBody(x, y, angle, boxSd);
		},
		createPoly : function(x, y, vertices, fixed) {
			var polySd = createPolyDef(vertices, fixed);
			return createBody(x, y, 0, polySd);
		},
		createPolyComposite : function(x, y, angle, poligons, localPosition,
				fixed) {
			poligonsDefs = [];
			for ( var i = 0; i < poligons.length; ++i)
				poligonsDefs.push(createPolyDef(poligons[i], localPosition,
						fixed));
			var output = createBody(x, y, angle, poligonsDefs,
					poligonsDefs.length);
			output.m_userData = {
				"id" : "Ground01",
				"params" : {
					"type" : "Ground"
				}
			};
			return output;
		},
		destroy : function(physics) {
			if (!physics)
				return;
			assert(world);
			world['DestroyBody'](physics);
		},
		destroyWorld : function() {
			Physics.destroy(worldBorder);
			world = null;
			updateItems = [];
		},
		getWorldBorder : function() {
			if (!worldBorder)
				createWorld();
			assert(worldBorder);
			return worldBorder;
		},
		pause : function(v) {
			if (v == null)
				pause = !pause;
			else
				pause = v;
		},
		paused : function() {
			return pause;
		},
		resetTimeout : function(addTime) {
			if (!timeout)
				return;
			timeout.timeOut += addTime;
		},
		clearTimeout : function() {
			timeout = null;
		},
		setTimout : function(callback, time) {
			timeout = {
				time : 0,
				callback : callback,
				timeOut : time,
				tick : function(delta) {
					this.time += delta;
					if (this.time < this.timeOut)
						return;
					this.callback();
					timeout = null;
				}
			};
		},
		updateItemAdd : function(entity) {
			var idx = updateItems.indexOf(entity);
			if (idx == -1)
				updateItems.push(entity);
		},
		updateItemRemove : function(entity) {
			var idx = updateItems.indexOf(entity);
			if (idx != -1)
				updateItems.splice(idx, 1);
		},
		destroy : function(entity) {
			if (!entity)
				return;
			Physics.updateItemRemove(entity);
			if (world && entity.physics)
				world['DestroyBody'](entity.physics);
		},
		debugDrawing : function(trueOrFalse) {
			debugDrawing(trueOrFalse);
		},
		debugDrawingIsOn : function(trueOrFalse) {
			return !!debugCanvas;
		},
		setDebugModeEnabled : function(trueOrFalse) {
			debugMode = trueOrFalse;
		},
		debugMode : function() {
			return debugMode;
		},
		explode : function() {
			
		}
	};
})();

//
/*
 * if (callbacks.BeginContact) listener.BeginContact = function(contact) {
 * callbacks.BeginContact(contact.GetFixtureA().GetBody().GetUserData(),
 * contact.GetFixtureB().GetBody().GetUserData()); } if (callbacks.EndContact)
 * listener.EndContact = function(contact) {
 * callbacks.EndContact(contact.GetFixtureA().GetBody().GetUserData(),
 * contact.GetFixtureB().GetBody().GetUserData()); } if (callbacks.PostSolve)
 * listener.PostSolve = function(contact, impulse) {
 * callbacks.PostSolve(contact.GetFixtureA().GetBody().GetUserData(),
 * contact.GetFixtureB().GetBody().GetUserData(), impulse.normalImpulses[0]); }
 * this.world.SetContactListener(listener);
 */

var collisionCallback = function() {
	var entity1 = contact.GetFixtureA().GetBody().GetUserData();
	var entity2 = contact.GetFixtureB().GetBody().GetUserData();
	var material1 = entity1.descriptions.material;
	var material2 = entity2.descriptions.material;

	/*
	 * MaterialImpact : { sound particles object1Damage }
	 * 
	 * 
	 */
	var materialImpact = Physics.getMaterialImpact(material1, material2);

	if (entity1.beginContact) {
		entity1.beginContact(entity2, materialImpact);
	}
	if (entity2.beginContact) {
		entity12.beginContact(entity1, materialImpact);
	}

	// position
	if (materialImpact.effect) {
		var effect = new VisualEffect(materialImpact.effect);
	}
};


var DAMAGE_DECR = 180;
var FORCE_RATING = 100;

// Creates physics explosion without any visual presentation
// just an explosion in physics world.
// center - center of the explosion;
// radiusMin, radiusMax - it`s radius <point>
// force - scalar force of impulse <number>
// damage - scalar force of damage <number>
// duration - explosion effect duration in <ms>
// decr - how fast force decreases by distance from center <number>
// owner - object that initiate explosion, should not affect it
Physics.explode = function(params) { // (center, radius, force, duration,
	// owner, decr) {
	var decr = (params.decr != null) ? params.decr : 1;
	DAMAGE_DECR = (params.damageDecr != null) ? params.damageDecr : 150;
	var world = Physics.getWorld();
	var score = 0;
	var delta = (params.delta > 0) ? params.delta : 20;
	var time = params.duration / delta;
	function tick() {
		setTimeout(function() {
			var body = world.m_bodyList;
			for (; body != null; body = body['m_next']) {
				var bodyCenter = body.GetCenterPosition();
				var rVec = new b2Vec2(bodyCenter.x - params.center.x,
						bodyCenter.y - params.center.y);
				var dist = rVec.Length();
				if (dist < params.radius) {
					var impulse = rVec;
					impulse.Normalize();
					impulse.Multiply(FORCE_RATING * params.force
							/ Math.pow(1 + dist, decr));
					if (body.m_userData) {
						if (body.m_userData.params.id != "CannonBall") {
							body.WakeUp();
							body
									.ApplyImpulse(impulse, body
											.GetCenterPosition());
							body.AllowSleeping(true);
						}
					}

					if ((body.m_userData) && (body.m_userData.destructable)) {
						var damage = impulse.Length() / DAMAGE_DECR;
						body.m_userData.onDamage(damage);
						score += damage;
					}
				}
				;
			}
			;
			if (time < params.duration)
				tick();
			time += delta;
		}, 5);
	}
	;
	tick();
};/**
 * Contact Processor - part of the Physics singleton to
 * handle and process cantact events
 */

function ContactProcessor() {
	this.pairs = {};
	this.defaultBegin = function() {};
	this.defaultEnd = function() {};
};

//
//	Adds pair to contact events dataset 
//
ContactProcessor.prototype.addPair = function(type1, type2, event, action) {
	if (type1 in this.pairs) {
		if (this.pairs[type1][type2])
			this.pairs[type1][type2][event] = action;
		else {
			this.pairs[type1][type2] = {};
			this.pairs[type1][type2][event] = action;
		}
	} else if (type2 in this.pairs) {
		if (this.pairs[type2][type1])
			this.pairs[type2][type1][event] = action;
		else {
			this.pairs[type2][type1] = {};
			this.pairs[type2][type1][event] = action;
		}
	} else {
		this.pairs[type1] = {};
		this.pairs[type1][type2] = {};
		this.pairs[type1][type2][event] = action;
	}
};

ContactProcessor.prototype.setDefaultBeginContact = function(begin) {
	this.defaultBegin = begin;
};

ContactProcessor.prototype.setDefaultEndContact = function(end) {
	this.defaultEnd = end;
};

//
//	Predefined BeginContact processor
//
ContactProcessor.prototype.processBegin = function(type1, type2, contact) {
	if ((type1 in this.pairs)&&(type2 in this.pairs[type1])&&(this.pairs[type1][type2])["beginContact"])
		this.pairs[type1][type2]["beginContact"](contact); else
	if ((type2 in this.pairs)&&(type1 in this.pairs[type2])&&(this.pairs[type2][type1])["beginContact"])
		this.pairs[type2][type1]["beginContact"](contact); else
			this.defaultBegin(contact);
};

//
//	Predefined EndContact processor
//
ContactProcessor.prototype.processEnd = function(type1, type2, contact) {
	if ((type1 in this.pairs)&&(type2 in this.pairs[type1])&&(this.pairs[type1][type2]["endContact"]))
		this.pairs[type1][type2]["endContact"](contact); else
	if ((type2 in this.pairs)&&(type1 in this.pairs[type2])&&(this.pairs[type2][type1]["endContact"]))
		this.pairs[type2][type1]["endContact"](contact); else
			this.defaultEnd(contact);
};
/**
 * Contact Listener - part of the Physics singleton to
 * listen and register contacts dynamics,
 */

var LOG_DEBUG = false;

/**
 * @constructor
 */
function ContactListener(contactProcessor, body) {
	this.body = body;
	this.contactProcessor = contactProcessor;
	if (!contactProcessor)
		console.log("No contact processor were added! Will be defaults");
	//world = Physics.getWorld();
	this.activeContacts = new Array();
	this.activeContactIDs = new Array();
//	this.contactShape1 = null;
//	this.contactShape2 = null;	
//	this.currentContact = null;
	this.events = new Array();
};

//
//	Returns list of contacts and contacted entities id
//
ContactListener.prototype.getContacts = function(body) {
	//var body = world.m_bodyList;
	var contactIDs = new Array();
	var contacts = new Array();
	//for (; body != null; body = body['m_next']) {
		var contact = body.m_contactList;
		if (contact!=null)
		for (; contact != null; contact = contact['m_next']) {
			if ($.inArray(contact, contacts) == -1)
				{
					contactIDs.push(contact.contact.m_shape1.m_body.m_userData.id + ':'
							+ contact.contact.m_shape2.m_body.m_userData.id);
					contacts.push(contact.contact);
				}
		}
	//}
	return {
		"iDs" : contactIDs,
		"contacts" : contacts
	};
};

//
//	Main part of the listener
//
ContactListener.prototype.update = function() {
	var that = this;
	var contactList = this.getContacts(this.body);

	var newContactIDs = contactList["iDs"];
	var newContacts = contactList["contacts"];

	if (this.activeContactIDs && this.contactProcessor) {
		$['each'](newContactIDs, function(id, value) {
			if ($.inArray(value, that.activeContactIDs) == -1) {
				var type1 = newContacts[id].m_shape1.m_body.m_userData.params["type"];
				var type2 = newContacts[id].m_shape2.m_body.m_userData.params["type"];
//				that.contactShape1 = newContacts[id].m_shape1;
//				that.contactShape2 = newContacts[id].m_shape2;
//				that.currentContact = newContacts[id];
				var contact = newContacts[id];
				that.contactProcessor.processBegin(type1, type2, contact);								
			}
		});
		$['each'](that.activeContactIDs, function(id, value) {
			if ($.inArray(value, newContactIDs) == -1) {
				var type1 = that.activeContacts[id].m_shape1.m_body.m_userData.params["type"];
				var type2 = that.activeContacts[id].m_shape2.m_body.m_userData.params["type"];

//				that.contactShape1 = that.activeContacts[id].m_shape1;
//				that.contactShape2 = that.activeContacts[id].m_shape2;
//				that.currentContact = that.activeContacts[id];
				var contact = that.activeContacts[id];
				that.contactProcessor.processEnd(type1, type2, contact);
			}
		});
	}
	
	this.activeContactIDs = newContactIDs;
	this.activeContacts = newContacts;
};/**
 * PhysicEntity - visual entity with representation in physics world
 */

var ANIM_DELAY = 400;

PhysicEntity.prototype = new VisualEntity();
PhysicEntity.prototype.constructor = PhysicEntity;

/**
 * @constructor
 */
function PhysicEntity() {
	PhysicEntity.parent.constructor.call(this);
};

PhysicEntity.inheritsFrom(VisualEntity);
PhysicEntity.prototype.className = "PhysicEntity";

PhysicEntity.prototype.createInstance = function(params) {
	var entity = new PhysicEntity();
	entity.init(params);
	return entity;
};

entityFactory.addClass(PhysicEntity);

//
// Initializing and creating physic entity with visuals
//
PhysicEntity.prototype.init = function(params) {
	var description = {};
	this.physicsEnabled = true;

	if (params.type != null)
		description = Account.instance.descriptionsData[params.type];
	PhysicEntity.parent.init.call(this, $['extend'](params, description));
	if (this.params.physics) {
		this.createPhysics();

		assert(!this.physics['m_userData']);
		this.physics['m_userData'] = this;

		this.updatePositionFromPhysics();
		if (!this.physics['IsStatic']() || Physics.debugMode())
			Physics.updateItemAdd(this);
	}
};

//
// Create and register physics body function
//
PhysicEntity.prototype.createPhysics = function() {
	var that = this;
	var shapeDefinition;
	var bodyDefinition;
	var physicParams = this.params['physics']; // preloaded from json
	var logicPosition = {
		x : this.params.x,
		y : this.params.y
	};

	function setShapeParams(shapeDefinition, physicParams) {
		shapeDefinition.density = selectValue(physicParams['density'],
				(physicParams['static'] == true) ? 0 : 1);
		shapeDefinition.restitution = selectValue(physicParams.restitution, 1);
		shapeDefinition.friction = selectValue(physicParams.friction, 0);
	}

	bodyDefinition = new b2BodyDef();

	// Configuring shape params depends on "type" in json
	switch (physicParams.type) {
	case "Box": {
		shapeDefinition = new b2BoxDef();
		shapeDefinition.extents = new b2Vec2(physicParams.width / 2,
				physicParams.height / 2);
		setShapeParams(shapeDefinition, physicParams);
		bodyDefinition.AddShape(shapeDefinition);
		break;
	}
	case "Circle": {
		shapeDefinition = new b2CircleDef();
		shapeDefinition.radius = physicParams.radius;
		setShapeParams(shapeDefinition, physicParams);
		bodyDefinition.AddShape(shapeDefinition);
		//bodyDefinition.bullet == true;
		break;
	}
	case "Poly": {
		shapeDefinition = new b2PolyDef();
		shapeDefinition.vertexCount = physicParams.vertexCount;
		shapeDefinition.vertices = physicParams.vertices;
		setShapeParams(shapeDefinition, physicParams);
		bodyDefinition.AddShape(shapeDefinition);
		break;
	}
	case "Triangle": {
		shapeDefinition = new b2PolyDef();
		shapeDefinition.vertexCount = 3;
		shapeDefinition.vertices = physicParams.vertices;
		bodyDefinition.AddShape(shapeDefinition);
		setShapeParams(shapeDefinition, physicParams);
		break;
	}
	case "PolyComposite": {
		$['each'](physicParams.shapes, function(id, shapeData) {

			var shapeDef = new b2PolyDef();
			shapeDef.vertexCount = shapeData.vertexCount;
			var vertices = new Array();
			$['each'](shapeData.vertices, function(idx, vertex) {
				var newVertex = {};
				newVertex.x = physicParams.scale ? vertex.x
						* physicParams.scale : vertex.x;
				newVertex.y = physicParams.scale ? vertex.y
						* physicParams.scale : vertex.y;
				vertices.push(newVertex);
			});
			shapeDef.vertices = vertices;

			setShapeParams(shapeDef, shapeData);

			bodyDefinition.AddShape(shapeDef);
		});
		break;
	}
	case "PrimitiveComposite": {
		$['each'](physicParams.shapes, function(id, shapeData) {
			switch (shapeData.type) {
				case "Box": {
					shapeDefinition = new b2BoxDef();
					shapeDefinition.extents = new b2Vec2(shapeData.width / 2,
							shapeData.height / 2);
					setShapeParams(shapeDefinition, shapeData);
					shapeDefinition.localPosition = new b2Vec2(shapeData.x, shapeData.y);

					bodyDefinition.AddShape(shapeDefinition);

					break;
				}
				case "Circle": {
					shapeDefinition = new b2CircleDef();
					shapeDefinition.radius = physicParams.radius;
					setShapeParams(shapeDefinition, physicParams);

					bodyDefinition.AddShape(shapeDefinition);
					break;
				}
				case "Poly": {
					shapeDefinition = new b2PolyDef();
					shapeDefinition.vertexCount = physicParams.vertexCount;
					shapeDefinition.vertices = physicParams.vertices;
					setShapeParams(shapeDefinition, physicParams);

					bodyDefinition.AddShape(shapeDefinition);
					break;
				}
				case "Triangle": {
					shapeDefinition = new b2PolyDef();
					shapeDefinition.vertexCount = 3;
					shapeDefinition.vertices = physicParams.vertices;

					bodyDefinition.AddShape(shapeDefinition);
					setShapeParams(shapeDefinition, physicParams);
					break;
				}
			}
		});
		break;
	}
	}

	// Configuring and creating body (returning it)

	bodyDefinition.position.Set(0, 0);
	bodyDefinition.linearDamping = physicParams.linearDamping;
	physicWorld = Physics.getWorld();
	this.physics = physicWorld.CreateBody(bodyDefinition);
	this.physics.SetCenterPosition(
			new b2Vec2(logicPosition.x, logicPosition.y), 0);
	this.destructable = physicParams["destructable"];
	if (this.destructable)
		this.health = physicParams["health"];
	else
		this.health = null;
	if (this.params.angle)
		this.rotate(this.params.angle * 2);
};

PhysicEntity.prototype.getContactedBody = function() {
	if (this.physics.m_contactList)
		return this.physics.m_contactList.other;
};

PhysicEntity.prototype.getContactList = function() {
	return this.physics.m_contactList;
};

PhysicEntity.prototype.setContactCallback = function(callback) {
	var shape = this.physics['GetShapeList']();
	for (; shape != null; shape = shape['m_next']) {
		shape['contactCallback'] = callback;
	}
};

PhysicEntity.prototype.createVisual = function() {
	PhysicEntity.parent.createVisual.call(this);

};

// Update visual position from physics world
PhysicEntity.prototype.updatePositionFromPhysics = function() {
	var that = this;

	if (that.physics==null)
		return;
	that.setPosition(that.physics.m_position.x - that.params.physics.x
			- that.params.physics.width / 2, that.physics.m_position.y
			- that.params.physics.y - that.params.physics.height / 2);

	if (that.params.physics.type != "Circle")

		$['each'](this.visuals, function(id, visualInfo) {
			var angleInDeg = that.getPhysicsRotation().toFixed(3);
			angleInDeg = MathUtils.toDeg(angleInDeg);

			var localPoint = {
				"x" : that.physics.GetCenterPosition()['x'],
				"y" : that.physics.GetCenterPosition()['y']
			};
			localPoint.x -= (visualInfo.visual.width / 2);
			localPoint.y -= (visualInfo.visual.height / 2);

			var matTrans = new Transform();
			var matRot = new Transform();
			matTrans.translate((localPoint.x) * Screen.widthRatio(),
					localPoint.y * Screen.heightRatio());
			matRot.rotateDegrees(angleInDeg / 2);
			matTrans.multiply(matRot);
			matRot.translate(-localPoint.x * Screen.widthRatio(), -localPoint.y
					* Screen.heightRatio());
			matTrans.multiply(matRot);

			visualInfo.visual.setTransform(matTrans.m, 0);
		});
};

// Makes entity "kinematic" or dynamic
PhysicEntity.prototype.physicsEnable = function(v) {

	// if (!v) {
	// Physics.updateItemRemove(this);
	// } else {
	// if (!this.physics['IsStatic']() || Physics.debugMode())
	// Physics.updateItemAdd(this);
	// }
	this.physicsEnabled = v;
};

// PhysicEntity update function
PhysicEntity.prototype.updatePhysics = function() {
	if ((this.params.physics) && (this.physicsEnabled) && (!Physics.paused()))
		{
			this.updatePositionFromPhysics();
				//this.physics.SetCenterPosition(this.physics.GetCenterPosition(), this.physics.GetRotation());
		}
};

// Gets object rotation from physics (IN WHAT MEASURE? - in !Radians!)
PhysicEntity.prototype.getPhysicsRotation = function() {
	return this.physics['GetRotation']();
};

PhysicEntity.prototype.onDragBegin = function() {
	this.physicsEnable(false);
};

PhysicEntity.prototype.onDragEnd = function() {
	this.physicsEnable(true);
};

// Rotates object (as visual as physics) by local coord axis/ degrees angle
PhysicEntity.prototype.rotateByAxis = function(axis, angle) {
	// this.angle = angle;
	// Calculating rotation matrix for canon barrel and power line
	var matTrans = new Transform();
	matTrans.translate(axis.x, axis.y);
	var matRot = new Transform();

	matRot.rotateDegrees(angle);
	matTrans.multiply(matRot);
	matRot.reset();
	matRot.translate(-axis.x, -axis.y);
	matTrans.multiply(matRot);
	that = this;
	$['each'](this.visuals, function(id, visualInfo) {
		var t = matTrans.transformPoint(that.params.x - that.params.physics.x,
				that.params.y - that.params.physics.y);
		that.physics.SetCenterPosition(new b2Vec2(t[0], t[1]), that.physics.GetRotation());
	});
};

// Rotates physics bodyand updates visual position
PhysicEntity.prototype.rotate = function(angleInRad) {
	var position = this.physics.GetCenterPosition();
	var oldAngle = this.physics.GetRotation();
	var newAngle = oldAngle + angleInRad;
	this.physics.SetCenterPosition(position, newAngle / 2);

	this.updatePositionFromPhysics();
};

PhysicEntity.prototype.destroy = function() {
	PhysicEntity.parent.destroy.call(this);
	if (this.physics) {
		Physics.getWorld().DestroyBody(this.physics);
	}
	Account.instance.removeEntity(this.id, true);
};

// damage received by other object
PhysicEntity.prototype.onDamage = function(damage) {
	var that = this;
	if (!this.destructable || this.health <= 0) {
		return;
	}

	this.health -= damage;

	// damage levels - show animation of different damages levels
	if (this.params.physics.destructionLevels) {
		$['each'](that.params.physics.destructionLevels, function(id, value) {
			if ((that.health < value["minHealth"])
					|| (that.health == value["minHealth"])) {
				$['each'](that.visuals, function(id, visualInfo) {
					visualInfo.visual.playAnimation(value["animName"],
							ANIM_DELAY, false, true);
				});
				return;
			}
		});
	}

	if (this.health <= 0) {
		$['each'](that.visuals, function(id, visualInfo) {
			if (that.params.builtInDestruction)
				visualInfo.visual.setAnimationEndCallback(function() {
					that.destroy();
//					delete that;
				});
			else {
				that.destroy();
//				delete that;
			}
			return;
		});
	}
};
/**
 * PhysicsScene - abstract Scene class witch represents local physic world,
 * PhysicEntity`s container
 */

// var FLOOR_LEVEL = 352;
PhysicScene.prototype = new Scene();
PhysicScene.prototype.constructor = PhysicScene;

/**
 * @constructor
 */
function PhysicScene() {
	PhysicScene.parent.constructor.call(this);
};

PhysicScene.inheritsFrom(Scene);

PhysicScene.prototype.className = "PhysicScene";
PhysicScene.prototype.createInstance = function(params) {
	var entity = new PhysicScene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(PhysicScene);

PhysicScene.prototype.init = function(params) {
	PhysicScene.parent.init.call(this, params);
	this.physicWorld = Physics.getWorld();
	if(params['physicsBorder']) {
		Physics.createWorldBorder(params['physicsBorder']);
	}
	this.contactProcessor = function(contactProcessor) {

	};
};

PhysicScene.prototype.addChild = function(child) {
	PhysicScene.parent.addChild.call(this, child);
};

PhysicScene.prototype.createVisual = function() {
	PhysicScene.parent.createVisual.call(this);
	that = this;
	function updateWorld() {
		Physics.updateWorld(30);
		that.setTimeout(updateWorld, 15);
	}
	updateWorld();
//	Physics.pause(true);
};

PhysicScene.prototype.setBackgrounds = function(backgrounds, visual) {
	if (!visual) visual = this.getVisual();
	$['each'](backgrounds, function(key, value) {
		visual.setBackground(value.src, value.backWidth, value.backHeight,
				value.backX, value.backY, value.repeat, value.idx);
	});
	visual.resize();
};

PhysicScene.prototype.attachChildVisual = function(child) {
	PhysicScene.parent.attachChildVisual.call(this, child);
};

// PhysicScene.prototype.move = function(dx, dy) {
//
// };

PhysicScene.prototype.destroy = function() {
	PhysicScene.parent.destroy.call(this);
	// $(document)['unbind'](".BattleSceneEvent");
};
/**
 * Physics Trigger
 */

CreatePhysicsTrigger = function(world, rect, action) {
	var instance = {};
	instance.rect = rect;
	instance.world = world;
	instance.action = action;

	instance.checkIfIn = function(position) {
		var ifIn = false;
		if (((position.x > instance.rect.left) && (position.x < instance.rect.right))
				&& ((position.y > instance.rect.top) && (position.y < instance.rect.bottom)))
			ifIn = true;
		return ifIn;
	};
	
	instance.move = function(x, y)
	{
		this.rect.left += x;
		this.rect.right += x;
		this.rect.top += y;
		this.rect.bottom += y;
	};
	
	instance.setPosition = function(x, y)
	{
		var w = rect.right - rect.left;
		var h = rect.bottom - rect.top;
		this.rect.left = x;
		this.rect.right = x + w;
		this.rect.top = y;
		this.rect.bottom = y + h;
	};

	instance.update = function() {
		var body = instance.world.m_bodyList;
		for (; body != null; body = body['m_next']) {
			if (instance.checkIfIn(body.m_position))
				instance.action(body);
		}
	};

	return instance;
};/**
 * Effect represents visual, sound etc effects
 */

Effect.prototype = new VisualEntity();
Effect.prototype.constructor = Effect;

/**
 * @constructor
 */
function Effect() {
	Effect.parent.constructor.call(this);
};

Effect.inheritsFrom(VisualEntity);
Effect.prototype.className = "Effect";

Effect.prototype.createInstance = function(params) {
	var entity = new Effect();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Effect);

Effect.prototype.init = function(params) {
	var description = {};
	if (params.type != null)
		description = Account.instance.descriptionsData[params.type];
	Effect.parent.init.call(this, $.extend(params, description));
	this.guis = new Array();
};

Effect.prototype.createVisual = function() {
};

//
//	Plays an effect, and destroys it`s result data after lifetime ended
//
Effect.prototype.play = function(position, callback) {
	var that = this;
	if (position) {
		that.x = position.x;
		that.y = position.y;
	}

	$['each'](that.params.visuals, function(id, value) {
		value.parent = that.guiParent;

		var gui = guiFactory.createObject(value['class'], $['extend'](
				value, position));
		gui.clampByParentViewport();
		that.guis.push(gui);
		$['each'](gui.animations, function(id, anim) {
			gui.playAnimation(id, that.params.lifeTime, false, true);		
			that.setTimeout(function() {
				gui.remove();
				if (callback) callback();
			}, that.params.lifeTime);		
		});	
	});

//	that.setTimeout(function() {
//		that.destroy();
//	
//		if (callback) callback();
//	}, this.params.lifeTime);
};

Effect.prototype.destroy = function() {
	var that = this;
	Effect.parent.destroy.call(this);
	$['each'](that.guis, function(id, value) {
		value.remove();
		delete value;
	});
	that.guis = new Array();
};
//
var guiFactory = new AbstractFactory();

/**
 * @constructor
 */
guiFactory.createGuiFromJson = function(json, state) {
	guiFactory.createObjectsFromJson(json, function(name, params) {
		if (params['parent'] && typeof params['parent'] == "string") {
			// find parent among local objects or
			// assume that it is ID of existing DOM object
			var localParent = state.getGui(params['parent']);
			if (!localParent) {
				localParent = $(params['parent']);
				if (localParent.length == 0) {
					localParent = null;
				}
			}
			if (localParent) {
				params['parent'] = localParent;
				return;
			}
		}
		console.warn("For object '" + name + "' wrong parent '" + params['parent'] + "' is provided.");
	}, function(name, obj) {
		state.addGui(obj, name);
		obj.name = name;
	});
};
/**
 * @constructor
 */
function GuiContainer() {
	this.guiEntities = null;
}

GuiContainer.prototype.init = function() {
	this.guiEntities = new Array();
	this.guiEntitiesMap = new Object();
};
GuiContainer.prototype.resize = function() {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].resize) {
			this.guiEntities[i].resize();
		}
	}
};

GuiContainer.prototype.update = function(time) {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].update) {
			this.guiEntities[i].update(time);
		}
	}
};

GuiContainer.prototype.setUpdateInterval = function(time) {
	var that = this;
	this.updateIntervalTime = time;
	this.updateIntervalHandler = setInterval(function() {
		that.update(that.updateIntervalTime);
	}, this.updateIntervalTime);
};

GuiContainer.prototype.resetUpdateInterval = function() {
	if (this.updateIntervalHandler) {
		clearInterval(this.updateIntervalHandler);
		this.updateIntervalHandler = null;
		this.updateIntervalTime = null;
	}
};

GuiContainer.prototype.clear = function() {
	// console.log("Clear GuiContainer, there is %d entities",
	// this.guiEntities.length);
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].remove) {
			// console.log("Remove entity %s", this.guiEntities[i].src);
			this.guiEntities[i].remove();
		}
	}
	popAllElementsFromArray(this.guiEntities);
	this.guiEntitiesMap = {};
};

GuiContainer.prototype.remove = function() {
	this.clear();
	this.resetUpdateInterval();
};

GuiContainer.prototype.addGui = function(entity, name) {
	assert(entity, "Trying to add null pointer!");
	this.guiEntities.push(entity);

	if (typeof (name) == "string") {
		entity.name = name;
		this.guiEntitiesMap[name] = entity;
	}
};

GuiContainer.prototype.removeGui = function(entity) {
	popElementFromArray(entity, this.guiEntities);
	if (this.guiEntitiesMap[entity.name]) {
		delete this.guiEntitiesMap[entity.name];
	}
	entity.remove();
};

GuiContainer.prototype.getGui = function(name) {
	return this.guiEntitiesMap[name];
};
/**
 * @constructor
 */
function GuiElement() {
}

GuiElement.prototype.className = "GuiElement";

GuiElement.prototype.createInstance = function(params) {
	var entity = new GuiElement();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiElement);

GuiElement.prototype.generateId = function() {
	return this.className + uniqueId();
};

GuiElement.prototype.generate = function(src) {
	assert(this.id, "Id not defined");
	assert(this.style, "Class for object with id = '" + this.id
			+ "' is not defined");
	return "<div id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\">" + src + "</div>";
};

GuiElement.prototype.create = function(src) {
	// initial parent set

	// console.log("Creating item with id %s, src = %s and classname = %s",
	// this.id, src, this.className);

	if (!this.setParent(this.parent)) {
		// if no parent provided assigning to the body object
		this.setParent($("body"));
		console.warn("No parent was provided for object id = " + this.id);
	}

	src = (src == null) ? "" : src;
	this.parent.jObject.append(this.generate(src));

	// remember jQuery object
	this.jObject = $("#" + this.id);
	assert(this.jObject.length > 0, "Object id ='" + this.id
			+ "' was not properly created");
};

GuiElement.prototype.$ = function() {
	return this.jObject;
};

GuiElement.prototype.setEnable = function(isEnable) {
	this.enable = isEnable;
};

GuiElement.prototype.isEnabled = function() {
	return this.enable == true;
};

GuiElement.prototype.callBindedFunction = function(event, bindType) {
	if (this.isEnabled()) {
		this[bindType](event);
	} else {
		console.log("Button is not enabled " + this.id);
	}
};

GuiElement.prototype.bind = function(bindFunction, bindType) {
	bindType = (typeof (bindType) == "string") ? bindType : "click";
	if (bindFunction) {
		this[bindType] = bindFunction;
	}
	if (!this[bindType]) {
		return;
	}

	this.unbind(bindType);

	var that = this;
	var callbackCaller = function(event) {
		that.callBindedFunction(event, bindType);
	};

	this.jObject['bind'](Device.event(bindType) + ".guiElementEvents",
			callbackCaller);
};

GuiElement.prototype.unbind = function(callbackType) {
	callbackType = (typeof (callbackType) == "string") ? callbackType : "";
	this.jObject['unbind'](callbackType + ".guiElementEvents");
};

GuiElement.prototype.init = function() {
	this.children.init();

	this.create(this.src);
	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	this.resize();
};

GuiElement.prototype.initialize = function(params) {
	this.params = params;

	this.parent = params['parent'];

	// generate ID
	this.id = this.generateId();
	// Check whether element with such id is already in scene
	if ($("#" + this.id).length > 0) {
		console.error(" GuiElement with  id = '" + this.id
				+ "' is already exists.");
	}

	this.style = params['style'];
	this.width = params['width'];
	this.height = params['height'];
	// preventing clicking on the item to appear
	this.enable = true;
	this.children = new GuiContainer();
	this.children.init();

	this.src = params['html'] ? params['html'] : this.src;
	if (params['jObject']) {
		this.jObject = params['jObject'];

		// if (this.jObject[0] !== $('body')[0]) {
		// this.parent = guiFactory.createObject("GuiElement", {
		// "jObject" : this.jObject.parent()
		// });
		// }

	} else {
		this.create(this.src);
	}

	// attach 'this' as data to the element, so we can reference to it by
	// element id
	this.jObject['data']("guiElement", this);

	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	var that = this;
	if (params['animations']) {
		$['each'](params['animations'], function(name, value) {
			that.addJqueryAnimation(name, value);
		});
	}

	this.setOffset(Screen.macro(params['offsetX']), Screen
			.macro(params['offsetY']));
	this.setPosition(Screen.macro(params['x']), Screen.macro(params['y']));
	this.setSize(Screen.macro(params['width']), Screen.macro(params['height']));
	if (typeof params['z'] == "number") {
		this.setZ(params['z']);
	}

	if (params['hide']) {
		this.hide();
	} else {
		this.show();
	}

	if (typeof params['opacity'] == "number") {
		this.setOpacity(params['opacity']);
	}

	this.resize();
};

GuiElement.prototype.setOffset = function(offsetX, offsetY) {
	this.offsetX = offsetX;
	this.offsetY = offsetY;
};

GuiElement.prototype.calcPercentageWidth = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentWidth = this.parent.jObject.width() / Screen.widthRatio();
		assert(typeof (parentWidth) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentWidth / 100.0);
	}
	return val;
};

GuiElement.prototype.calcPercentageHeight = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentHeight = this.parent.jObject.height() / Screen.heightRatio();
		assert(typeof (parentHeight) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentHeight / 100.0);
	}
	return val;
};

GuiElement.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	var offsetX = 0, offsetY = 0;
	if (typeof (this.offsetX) == "number") {
		offsetX = this.offsetX;
	}

	if (this.offsetY != null) {
		offsetY = this.offsetY;
	}

	x = this.calcPercentageWidth(x);
	y = this.calcPercentageHeight(y);

	this.setRealPosition(x + offsetX, y + offsetY);
};

GuiElement.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.setPosition(this.x, this.y);
};

GuiElement.prototype.getRealPosition = function() {
	return {
		x : this.jObject['css']("left").replace("px", ""),
		y : this.jObject['css']("top").replace("px", "")
	};
};

GuiElement.prototype.getPosition = function() {
	return {
		x : this.x,
		y : this.y
	};
};

GuiElement.prototype.setZ = function(z) {
	this.jObject['css']("z-index", z);
	this.z = z;
};

GuiElement.prototype.show = function() {
	this.jObject['show']();
	this.visible = true;
};

GuiElement.prototype.hide = function() {
	this.jObject['hide']();
	this.visible = false;
};

GuiElement.prototype.setOpacity = function(opacity) {
	this.jObject['css']("opacity", opacity);
};

GuiElement.prototype.isEventIn = function(e) {
	var pos = Device.getPositionFromEvent(e);

	var left = this.$()['offset']()['left'];
	var right = left + this.$()['width']();
	var top = this.$()['offset']()['top'];
	var bottom = top + this.$()['height']();
	var isIn = (pos.x > left) && (pos.x < right) && (pos.y > top)
			&& (pos.y < bottom);

	return isIn;
};

GuiElement.prototype.addJqueryAnimation = function(name, description) {
	this.jqueryAnimations = this.jqueryAnimations ? this.jqueryAnimations
			: new Object();
	this.jqueryAnimations[name] = description;
};

GuiElement.prototype.playJqueryAnimation = function(name, callback) {
	var desc = this.jqueryAnimations[name];
	assert(desc, "No animation found with name '" + name + "'");

	this.stopJqueryAnimation();
	var finalAnimationState = null;

	var that = this;

	var updateDisplay = function(that, action) {
		that.setPosition(action["x"] || that.x, action["y"] || that.y);
		if (action["display"]) {
			if (action["display"] === "hide") {
				that.hide();
			} else if (action["display"] === "show") {
				that.show();
			}
		}
		// that.setSize(action["width"] || that.width, action["height"]
		// || that.height);
	};

	for ( var i = 0; i < desc.length; i++) {
		var actionDesc = desc[i];
		var action;
		if (action = actionDesc["animate"]) {
			var anim = new Object();
			$['each'](action["actions"], function(idx, params) {
				var param01 = params[0];
				var param02 = params[1];
				var param03 = params[2];

				if (param01 == "left" || param01 == "width") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.widthRatio()) : param03;
				} else if (param01 == "top" || param01 == "height") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.heightRatio()) : param03;
				}
				anim[param01] = param02 + param03.toString();
			});

			that.$()['animate'](anim, action["time"]);

		} else if (action = actionDesc["start"]) {
			var x = action["x"] != null ? action["x"] : that.x;
			var y = action["y"] != null ? action["y"] : that.y;
			that.setPosition(x, y);
			updateDisplay(that, action);
		} else if (action = actionDesc["final"]) {
			// force final params after all animations since
			// resize will call reset animation sequence or there's
			// can be option with animations disabled
			finalAnimationState = function() {
				var x = action["x"] != null ? action["x"] : that.x;
				var y = action["y"] != null ? action["y"] : that.y;
				that.setPosition(x, y);
				updateDisplay(that, action);
			};
		}
	}

	this.jqueryAnimationCallback = function() {
		if (finalAnimationState)
			finalAnimationState();
		if (callback)
			callback();
	};

	this.$()['queue']("fx", function() {
		that.jqueryAnimationCallback();
		that.jqueryAnimationCallback = null;
		that.jObject['stop'](true);
	});
};

GuiElement.prototype.stopJqueryAnimation = function() {
	if (!this.$()['is'](':animated')) {
		return;
	}
	this.$()['stop'](true);
	if (this.jqueryAnimationCallback) {
		this.jqueryAnimationCallback();
		this.jqueryAnimationCallback = null;
	}
};

GuiElement.prototype.isVisible = function() {
	return this.visible;
};

GuiElement.prototype.setSize = function(width, height) {
	this.width = width;
	this.height = height;

	this.resize();
};

GuiElement.prototype.setRealSize = function(width, height) {
	var size = Screen.calcRealSize(width, height);
	this.jObject['css']("width", size.x);
	this.jObject['css']("height", size.y);
};

GuiElement.prototype.setRealPosition = function(x, y) {
	var pos = Screen.calcRealSize(x, y);
	this.jObject['css']("left", pos.x);
	this.jObject['css']("top", pos.y);
};

GuiElement.prototype.resize = function() {
	w = this.calcPercentageWidth(this.width);
	h = this.calcPercentageHeight(this.height);
	this.setRealSize(w, h);
	this.setPosition(this.x, this.y);

	this.children.resize();
};

// prevents resizing of element
GuiElement.prototype.disableResize = function(isTrue) {
	if (this.originalResize == null) {
		this.originalResize = this.resize;
	}
	if (isTrue == false) {
		this.resize = this.originalResize;
	} else {
		this.resize = function() {
		};
	}
};

GuiElement.prototype.change = function(src) {
	this.src = src;
	this.detach();
	this.create(src);
	if (this.pushFunction) {
		this['bind'](this.pushFunction);
	}
	this.resize();
	this.show();
};

GuiElement.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	return {
		x : pos.x,
		y : pos.y
	};
};

GuiElement.prototype.setParent = function(newParent, saveGlobalPosition) {
	// 'newParent' can be either string ID, JQuery object,
	// or object inherited of GuiElement
	var parent = null;
	var jParent = null;
	if (typeof newParent == "string") {
		jParent = $(newParent);
	} else if (newParent && typeof newParent == "object") {
		if (newParent['jquery']) {
			jParent = newParent;
		} else if (newParent.jObject && newParent.jObject.length > 0) {
			parent = newParent;
		}
	}
	// parent been represented as JQuery object
	if (jParent) {
		assert(jParent.length > 0, "Object id ='" + this.id
				+ "' has wrong parent: '" + newParent + "'");

		// check whether our parent already has GuiElement representation
		parent = jParent['data']("guiElement");
		if (!parent) {
			parent = guiFactory.createObject("GuiElement", {
				"jObject" : jParent
			});
		}
	}

	if (parent) {
		var oldParent = this.parent;
		this.parent = parent;
		

		// recalculate entity x,y so it will
		// stay at the same place on the screen after the parent change
		if (oldParent && saveGlobalPosition) {
			var oldParentPos, newParentPos;

			oldParentPos = oldParent.globalOffset();
			newParentPos = parent.globalOffset();

			var left = oldParentPos.x - newParentPos.x;
			var top = oldParentPos.y - newParentPos.y;
			this.move(left, top);
		}
		
		
		if (this.jObject) {
			this.jObject['appendTo'](parent.jObject);
		}
		return true;
	} else {
		console.error("Can't attach object '" + this.id
				+ "' to parent that doesn't exists '" + newParent + "'");
		return false;
	}
};

GuiElement.prototype.remove = function() {

	// console.log("Removing item with id %s, classname = %s", this.id,
	// this.className);

	this.children.remove();
	this.jObject['remove']();
};

GuiElement.prototype.detach = function() {
	this.jObject['detach']();
};

GuiElement.prototype.addGui = function(entity, name) {
	this.children.addGui(entity, name);
};
GuiElement.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};
GuiElement.prototype.getGui = function(name) {
	return this.children.getGui(name);
};

GuiElement.prototype.center = function() {
	this.jObject['css']("text-align", "center");
	// obj.wrap("<div class='middle'/>");
	// obj.wrap("<div class='inner'/>");
};

GuiElement.prototype.fadeTo = function(fadeValue, time, callback,
		dontChangeVisibility) {
	var that = this;
	if (this.fadeToTimeout) {
		clearTimeout(this.fadeToTimeout);
		this.fadeToTimeout = null;
	}

	if (!this.visible && !dontChangeVisibility) {
		// .hack for iOs devices we need a tiny delay
		// to avoid blinking

		// TODO setTimeout move to GuiElement class or create a GuiBase class
		this.fadeToTimeout = setTimeout(function() {
			that.show();
		}, 1);
	}
	this.jObject['animate']({
		opacity : fadeValue
	}, time, callback);
};

GuiElement.prototype.blinking = function(isOn, blinkTime, blinkMin, blinkMax) {

	if (isOn) {
		var fadeTime = blinkTime ? blinkTime : 1000;

		var fadeIn, fadeOut;
		var that = this;
		fadeIn = function() {
			that.jObject['animate']({
				opacity : (blinkMin ? blinkMin : 0)
			}, fadeTime, fadeOut);
		};
		fadeOut = function() {
			that.jObject['animate']({
				opacity : (blinkMax ? blinkMax : 1)
			}, fadeTime, fadeIn);
		};
		fadeIn();
	} else {
		this.jObject['stop']();
	}
};

GuiElement.prototype.right = function() {
	this.jObject['css']("text-align", "right");
};

GuiElement.prototype.left = function() {
	this.jObject['css']("text-align", "left");
};

GuiElement.prototype.setClickTransparent = function(isTrue) {
	// TODO add IE and Opera support
	if (isTrue) {
		this.jObject['css']("pointer-events", "none");
	} else {
		this.jObject['css']("pointer-events", "auto");
	}
};

GuiElement.prototype.enableTouchEvents = function(push) {
	if (Device.isTouch()) {
		document.body.ontouchstart = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			// } else {
			// touchStartX = touchEndX = null;
			// touchStartY = touchEndY = null;
			// }
			return false;
		};

		document.body.ontouchmove = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			// }
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				push(e1);
			}
			return false;
		};
	} else {
		this.jObject['bind']("mousedown", push);
	}
};

// checks whether (x, y) in real global coords is inside element's bounds
GuiElement.prototype.isPointInsideReal = function(x, y) {
	var pos = this.jObject.offset();
	var width = this.jObject.width();
	var height = this.jObject.height(); 
	if ((x > pos.left && x < (pos.left + width))
			&& (y > pos.top && y < (pos.top + height))) {
		return true;
	} else {
		return false;
	}
};

GuiElement.prototype.getEventPosition = function(e){
	var pos = Device.getPositionFromEvent(e);
	var elementPos = this.jObject['offset']();
	var needed = {}; 
	needed.x =  pos.x - elementPos.left;
	needed.y =  pos.y - elementPos.top;
	return Screen.calcLogicSize(needed.x, needed.y);
};
/*
 * GuiDiv - main GuiElement with background manipulations,
 * viewport and dragn drop functions 
 */
GuiDiv.prototype = new GuiElement();
GuiDiv.prototype.constructor = GuiDiv;

/**
 * @constructor
 */
function GuiDiv() {
	GuiDiv.parent.constructor.call(this);
}

GuiDiv.inheritsFrom(GuiElement);
GuiDiv.prototype.className = "GuiDiv";

GuiDiv.prototype.createInstance = function(params) {
	var entity = new GuiDiv();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDiv);

GuiDiv.prototype.initialize = function(params) {

	this.backgrounds = new Array();
	// short alias for background
	if (params['image']) {
		params['background'] = {
			image : params['image']
		};
	}
	/*
	 * if(params['background']instanceof Array){ for(var i = 0;i <
	 * params['background'].length;i++) {
	 * this.backgrounds.push(params['background'][i]); } }
	 */
	// ref to rect clamped by viewport
	this.viewRect = {};

	// DIV will be used as enhanced background to cover as much available
	// space on the screen as possible
	if (params['enhancedScene']) {
		params['width'] = params['width'] ? params['width']
				: ENHANCED_BASE_WIDTH;
		params['height'] = params['height'] ? params['height']
				: ENHANCED_BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : -ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : -ENHANCED_BASE_MARGIN_HEIGHT;
		this.enhancedScene = true;
		// enhancedScene is clamped by the maximum allowed screen size
		this.setViewport(Screen.fullRect());
	} else if (params['innerScene']) {
		// main scene is located on normal position inside enhanced scene
		params['width'] = params['width'] ? params['width'] : BASE_WIDTH;
		params['height'] = params['height'] ? params['height'] : BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : ENHANCED_BASE_MARGIN_HEIGHT;
		this.innerScene = true;
	}
	GuiDiv.parent.initialize.call(this, params);
	this.applyBackground(params['background']);

	if (params['enhancedScene']) {
		this.resize();
	}

	assert(!this.innerScene || this.parent.enhancedScene,
			"inner scene should always be child to enhanced scene");

	if (this.innerScene) {
		this.clampByParentViewport();
	}
};

GuiDiv.prototype.generate = function(src) {
	return "<div id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\"></div>";
};

GuiDiv.prototype.empty = function() {
	this.jObject['empty']();
};

GuiDiv.prototype.applyBackground = function(params) {
	if (params instanceof Array) {
		var j = params.length - 1;
		for ( var i = 0; i < params.length; i++) {
			params[i]['image'] = Resources.getImage(params[i]['image']);
			this.setBackgroundFromParams(params[i], j--);
		}
	} else if (params) {
		params['image'] = Resources.getImage(params['image']);
		this.setBackgroundFromParams(params, null);
	}
};

GuiDiv.prototype.setBackground = function(src, backWidth, backHeight, backX,
		backY, repeat, idx) {

	if (idx == "begin") {
		this.backgrounds.unshift({});
		idx = 0;
	} else if (idx == "end") {
		idx = this.backgrounds.length;
	}

	idx = idx ? idx : 0;

	this.backgrounds[idx] = {
		url : src,
		width : backWidth ? backWidth : this.width,
		height : backHeight ? backHeight : this.height,
		left : backX ? backX : 0,
		top : backY ? backY : 0,
		repeat : (repeat ? repeat : "no-repeat")
	};

	this.showBackground();
	this.resizeBackground();
};
GuiDiv.prototype.setBackgroundFromParams = function(param, j) {
	var x = param['x'] ? Screen.macro(param['x']) : 0;
	var y = param['y'] ? Screen.macro(param['y']) : 0;
	var w = param['width'] ? Screen.macro(param['width']) : this.width;
	var h = param['height'] ? Screen.macro(param['height']) : this.height;
	var r = param['repeat'] ? param['repeat'] : null;
	this.setBackground(param['image'], w, h, x, y, r, j);
};
GuiDiv.prototype.setBackgroundPosition = function(backX, backY, idx) {
	idx = idx ? idx : 0;

	var backgroundX = backX ? backX : 0;
	var backgroundY = backY ? backY : 0;
	this.backgrounds[idx].left = backgroundX;
	this.backgrounds[idx].top = backgroundY;

	this.setRealBackgroundPosition(0, 0);
};

GuiDiv.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	var positions = " ";
	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		var pos = Screen.calcRealSize(back.left + offsetX, back.top + offsetY);
		positions += pos.x + "px " + pos.y + "px,";
	});
	positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.resizeBackground = function() {
	var positions = " ";
	var sizes = " ";
	var that = this;
	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;

		var pos = Screen.calcRealSize(back.left, back.top);
		positions += pos.x + "px " + pos.y + "px,";

		w = that.calcPercentageWidth(back.width);
		h = that.calcPercentageHeight(back.height);
		var size = Screen.calcRealSize(w, h);
		sizes += size.x + "px " + size.y + "px,";
	});
	sizes = sizes.substr(0, sizes.length - 1);
	positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-size", sizes);
	this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.setPosition = function(x, y) {
	GuiDiv.parent.setPosition.call(this, x, y);
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.resize = function() {
	// if this DIV is inner scene than adjust our position
	// by parent - enhancedScene
	// if (this.innerScene) {
	// var parent = this.parent;
	// this.setPosition(parent.viewRect.left, parent.viewRect.top);
	//
	// // innerScene by default is always visible, so it's
	// // clamped only by enhanced scene
	// this.viewRect.left = -parent.viewRect.left;
	// this.viewRect.top = -parent.viewRect.top;
	// this.viewRect.right = this.viewRect.left + parent.viewRect.width;
	// this.viewRect.bottom = this.viewRect.top + parent.viewRect.height;
	// this.viewRect.width = parent.viewRect.width;
	// this.viewRect.height = parent.viewRect.height;
	// }

	GuiDiv.parent.resize.call(this);

	this.resizeBackground();
	// TODO make optimization, currently setting size and pos twice
	// Consider removing this from GuiDiv
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.dragBegin = function(e) {
	if (this.dragStarted)
		return;

	DragManager.setItem(this, e);

	this.dragStarted = true;
	var pos = Device.getPositionFromEvent(e);
	this.dragX = pos.x;
	this.dragY = pos.y;
	if (this.onDragBegin)
		this.onDragBegin();
	this.$()['addClass']("dragged");

	// console.log("dragBegin");
};

GuiDiv.prototype.dragMove = function(e) {
	if (this.dragStarted) {
		var pos = Device.getPositionFromEvent(e);
		var dX = pos.x - this.dragX;
		var dY = pos.y - this.dragY;
		this.move(dX / Screen.widthRatio(), dY / Screen.heightRatio());
		this.dragX = pos.x;
		this.dragY = pos.y;
		// console.log("dragMove real " + this.id + ", " + this.x + ", " +
		// this.y);
	} else {
		// console.log("dragMove not real");
	}

};

GuiDiv.prototype.dragEnd = function(dragListener) {
	if (!this.dragStarted)
		return;

	// .hack seem like webkit bug, touchmove event will be halted
	// once we remove item form scene. So we remove button
	// only after drag n drop complete, thus onBeforeDragEnd callback
	if (this.onBeforeDragEnd)
		this.onBeforeDragEnd(dragListener);

	if (this.onDragEnd)
		this.onDragEnd(dragListener);
	this.$()['removeClass']("dragged");
	this.dragStarted = false;

	// console.log("dragEnd");
};

GuiDiv.prototype.setDragable = function(isTrue) {
	this.dragable = isTrue;
	if (isTrue) {
		var that = this;
		this.$().bind(Device.event("cursorDown") + ".dragEvents", function(e) {
			that.dragBegin(e);
		});
	} else {
		this.$()['unbind'](".dragEvents");
	}
};

// Setups Div as reciver for drag items
// callbacks to override: onDragItemEnter, onDragItemOut, onDragItemDrop
GuiDiv.prototype.setDragListener = function(isTrue, priority) {
	this.dragSlot = isTrue;
	if (isTrue) {
		if (priority) {
			this.dragListenerPriority = priority;
		}
		DragManager.addListener(this);
	} else {
		DragManager.removeListener(this);
		this.$()['unbind'](".dragEvents");
	}
};

GuiDiv.prototype.hideBackground = function() {
	this.jObject['css']("background-image", "none");
};

GuiDiv.prototype.showBackground = function() {
	var urls = " ";
	var repeats = " ";

	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		urls += "url('" + back.url + "'),";
		repeats += back.repeat + ",";
	});
	urls = urls.substr(0, urls.length - 1);
	repeats = repeats.substr(0, repeats.length - 1);
	this.jObject['css']("background-image", urls);
	this.jObject['css']("background-repeat", repeats);
};

GuiDiv.prototype.clampByParentViewport = function(isTrue) {
	if (isTrue == false) {
		this.setViewport(null, null);
		this.resize();
	} else {
		this.setViewport(this.parent.viewRect, true);
	}
};

GuiDiv.prototype.setViewport = function(rect, isParent) {
	this.viewport = rect;
	this.isParentsViewport = isParent;

	if (this.jObject && this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	var viewLeft = (this.viewRect && this.viewRect.left) ? this.viewRect.left
			: 0;
	var viewTop = (this.viewRect && this.viewRect.top) ? this.viewRect.top : 0;

	return {
		x : pos.x - viewLeft,
		y : pos.y - viewTop
	};
};

GuiDiv.prototype.clampByViewport = function() {
	if (!this.isVisible()) {
		return;
	}

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	// 2) find out intersection rect between our rect and
	// parent rect - it will be new visibile rect for our div.
	// Rect will be in parent's coordinates
	var rect = this.viewport;
	var left = Math.max(originalRect.left, rect.left);
	var top = Math.max(originalRect.top, rect.top);
	var right = Math.min(originalRect.right, rect.right);
	var bottom = Math.min(originalRect.bottom, rect.bottom);

	var w = right - left;
	var h = bottom - top;

	// item is completely outside viewport, hide it
	if (w < 0 || h < 0) {
		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.viewRect.isOutside = false;
			if (this.isVisible()) {
				this.jObject['show']();
			}
		}
	}

	var screenLeft = left;
	var screenTop = top;

	if (this.isParentsViewport) {
		screenLeft -= Math.max(rect.left, 0);
		screenTop -= Math.max(rect.top, 0);
	}
	this.setRealPosition(screenLeft, screenTop);
	this.setRealSize(w, h);

	// 3) calculate offset
	var offsetX = originalRect.left - left;
	var offsetY = originalRect.top - top;
	this.setRealBackgroundPosition(offsetX, offsetY);

	// calculate viewport for this Div for childrens to use
	if (this.innerScene) {
		// ignore boundaries of innerScene
		this.viewRect.left = rect.left - x;
		this.viewRect.top = rect.top - y;
		this.viewRect.right = rect.right - x;
		this.viewRect.bottom = rect.bottom - y;
		this.viewRect.width = rect.width;
		this.viewRect.height = rect.height;
		return;
	} else {
		this.viewRect.left = left - x;
		this.viewRect.top = top - y;
	}
	this.viewRect.right = this.viewRect.left + w;
	this.viewRect.bottom = this.viewRect.top + h;
	this.viewRect.width = w;
	this.viewRect.height = h;
	this.viewRect.offsetX = screenLeft;
	this.viewRect.offsetY = screenTop;

	var name = this.id;
	if (this.enhancedScene) {
		name += " Enhanced";
	} else if (this.innerScene) {
		name += " Inner";
	}

	// console.log(name + " " + "screen " + Math.round(screenLeft) + ", "
	// + Math.round(screenTop) + " originalRect "
	// + Math.round(originalRect.left) + ", "
	// + Math.round(originalRect.top) + " rect " + Math.round(rect.left)
	// + ", " + Math.round(rect.top) + " offset "
	// + Math.round(this.viewRect.left) + ", "
	// + Math.round(this.viewRect.top));

};


// Only perform show/hide check
GuiDiv.prototype.clampByViewportSimple = function() {

	// console.log("clamped");
	if (!this.isVisible()) {
		return;
	}
	var rect = this.viewport;

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	var rect = this.viewport;

	var screenLeft, screenTop;
	if (this.isParentsViewport) {
		screenLeft = originalRect.left - rect.left;
		screenTop = originalRect.top - rect.top;
	}
	if (screenLeft + this.width < 0 || screenLeft > rect.width
			|| screenTop + this.height < 0 || screenTop > rect.height) {

		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.jObject['show']();
			this.viewRect.isOutside = false;
		}
	}
	this.setRealPosition(screenLeft, screenTop);
};


GuiDiv.prototype.remove = function() {
	GuiDiv.parent.remove.call(this);
	this.setDragListener(false);
};
GuiButton.prototype = new GuiDiv();
GuiButton.prototype.constructor = GuiButton;

/**
 * @constructor
 */
function GuiButton() {
	GuiButton.parent.constructor.call(this);
}

GuiButton.inheritsFrom(GuiDiv);
GuiButton.prototype.className = "GuiButton";

GuiButton.prototype.createInstance = function(params) {
	var entity = new GuiButton();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiButton);

GuiButton.prototype.generate = function(src) {
	var htmlText = "<div id='" + this.id + "' class='" + this.style
			+ " unselectable'>";
	htmlText += "</div>";

	return htmlText;
};

GuiButton.prototype.initialize = function(params) {
	GuiButton.parent.initialize.call(this, params);
	
	// buttons is supposed to be small, so clamping it simple
	this.clampByViewport = GuiDiv.prototype.clampByViewportSimple;

	this.jObject['css']("cursor", "pointer");
	this.params = params;
	var that = this;
	var labelParams;
	var normalParams = {};
	// this.$()['css']("border", "solid");
	// this.$()['css']("border-color", "red");

	var prepareButtonState = function(params) {

		params['image'] = Resources.getImage(params['image']);
		var image = GuiDiv.prototype
				.createInstance({
					parent : that,
					style : params['imageStyle'] ? params['imageStyle']
							: "buttonImage",
					width : that.width,
					height : that.height,
					x : params['x'] ? params['x'] : "50%",
					y : params['y'] ? params['y'] : "50%"
				});

		// image.$()['css']("border", "solid");
		// image.$()['css']("border-color", "black");

		that.children.addGui(image);

		var w = selectValue(params['width'], normalParams['width'], that.width);
		var h = selectValue(params['height'], normalParams['height'],
				that.height);
		// if scale parameter exists scale size, scale specifies in percents
		if (params['scale']) {
			w = Math.round(w * params['scale'] / 100);
			h = Math.round(h * params['scale'] / 100);
		}

		var offsetX = -Math.round(w / 2);
		var offsetY = -Math.round(h / 2);

		image.setOffset(offsetX, offsetY);
		if (params['background']) {
			image.applyBackground(params['background']);
		} else {
			image.setBackground(params['image'], w, h, 0, 0);
		}
		image.setSize(w, h);
		image.hide();

		var label;
		if (params['label']) {
			labelParams = labelParams ? labelParams : params['label'];
			// if scale parameter exists then scale size, scale specifies in
			// percents
			var scale = 1;
			if (typeof params['scale'] == "number") {
				scale = params['scale'] / 100;
			}

			w = selectValue(params['label']['width'], labelParams['width'],
					that.width)
					* scale;
			h = selectValue(params['label']['height'], labelParams['height'],
					that.height)
					* scale;

			fontSize = selectValue(params['label']['fontSize'],
					labelParams['fontSize'])
					* scale;

			offsetX = selectValue(params['label']['offsetX'],
					labelParams['offsetX'], -Math.round(w / 2));
			offsetY = selectValue(params['label']['offsetY'],
					labelParams['offsetY'], -Math.round(h / 2));

			w = Math.round(w);
			h = Math.round(h);

			label = guiFactory.createObject("GuiLabel",
					{
						parent : image,
						style : selectValue(params['label']['style'],
								labelParams['style']),
						width : w,
						height : h,
						text : selectValue(params['label']['text'],
								labelParams['text']),
						fontSize : fontSize,
						align : selectValue(params['label']['align'],
								labelParams['align'], "center"),
						verticalAlign : selectValue(params['label']['align'],
								labelParams['align'], "middle"),
						x : selectValue(params['label']['x'], labelParams['x'],
								"50%"),
						y : selectValue(params['label']['y'], labelParams['y'],
								"50%"),
						offsetX : params['label']['offsetX'] ? offsetX
								+ params['label']['offsetX'] : offsetX,
						offsetY : params['label']['offsetY'] ? offsetY
								+ params['label']['offsetY'] : offsetY
					});
			that.children.addGui(label);
			label.hide();
		}

		var callback = function() {
			// a bit hacky, but works
			// identify current state buy reference to its params object
			if (that.currentStateParams === params) {
				return;
			} else {
				that.currentStateParams = params;
			}

			var oldCurrentImage = that.currentImage;
			var oldCurrentLabel = that.currentLabel;

			that.currentImage = image;
			if (that.currentImage) {
				that.currentImage.show();
			}

			that.currentLabel = label;
			if (that.currentLabel) {
				that.currentLabel.show();
			}
			if (oldCurrentLabel) {
				oldCurrentLabel.hide();
			}
			if (oldCurrentImage) {
				oldCurrentImage.hide();
			}
		};
		return {
			image : image,
			label : label,
			callback : callback
		};
	};

	// normal state (unpressed button)
	if (params['normal']) {
		normalParams = params['normal'];
		var resultNormal = prepareButtonState(params['normal']);
		that.imageNormal = resultNormal.image;
		that.normalState = function() {
			resultNormal.callback.call(that);
			that.clickAllowed = false;
		};
		that.normalState.call(that);
	}

	// mouse over the button
	if (!Device.isTouch()) {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.imageHover = result.image;
			that.hoverState = result.callback;
		}
		// button pressed
		if (params['active']) {
			var result = prepareButtonState(params['active']);
			that.imageActive = result.image;
			that.activeState = result.callback;
		} else {
			if (params['hover']) {
				that.activeState = that.normalState;
			}
		}
	} else {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.imageActive = result.image;
			that.activeState = result.callback;
		}
	}
};

GuiButton.prototype.bind = function(pushFunction) {
	// simple onclick event without any effects for button
	if (!this.activeState) {
		GuiButton.parent.bind.call(this, pushFunction);
		return;
	}
	var that = this;

	this.backedToNormal = false;
	this.clickAllowed = false;
	this.unbind();
	if (this.hoverState && !Device.isTouch()) {
		this.jObject.bind("mouseenter.guiElementEvents", this.hoverState);
		this.jObject.bind("mouseleave.guiElementEvents", this.normalState);
	}

	if (pushFunction) {
		this.pushFunction = pushFunction;
	}
	var backToNormalCallback = this.hoverState ? this.hoverState
			: this.normalState;

	var callbackCaller = function(event) {
		if (that.isEnabled()) {
			if (that.clickAllowed) {
				if (that.pushFunction) {
					that.pushFunction(event);
				}
				that.clickAllowed = false;
			}
			backToNormalCallback.call(that);
		}
	};

	if (this.activeState) {
		if (!Device.isTouch()) {
			this.jObject.bind("mousedown", function() {
				that.activeState.call(that);
				that.clickAllowed = true;
			});
			this.jObject.bind("mouseup", callbackCaller);
		} else {
			this.jObject.bind("touchstart", function() {
				that.activeState.call(that);
				that.clickAllowed = true;
				that.backedToNormal = false;
			});
			this.jObject.bind("touchend", callbackCaller);
			this.jObject.bind("touchmove",
					function(e) {
						if (that.backedToNormal) {
							return;
						}

						e.preventDefault();
						var touch = e.originalEvent.touches[0]
								|| e.originalEvent.changedTouches[0];
						var obj = $(document.elementFromPoint(touch.pageX,
								touch.pageY));

						if (!that.isPointInsideReal(touch.pageX, touch.pageY)) {
							backToNormalCallback.call(that);
							that.backedToNormal = true;
						}
					});
		}

	}
};

// change background in all of button states
GuiButton.prototype.changeButtonBackgrounds = function(params, idx) {
	if (this.imageNormal) {
		this.imageNormal.setBackgroundFromParams(params, idx);
	}
	if (this.imageHover) {
		this.imageHover.setBackgroundFromParams(params, idx);
	}
	if (this.imageActive) {
		this.imageActive.setBackgroundFromParams(params, idx);
	}
};

// show or hides background
//changes background for highlighted
GuiButton.prototype.highlight = function(isOn) {
		if (this.params['highlight']) {
			if (isOn) {
			this.img = this.params['background']['image'];
			this.setBackground(this.params['highlight']['image']);
			this.backgroundShown = isOn;
			this.showBackground();
		} else {
			this.setBackground(this.img);
			this.showBackground();
		}
	}else{
		this.backgroundShown = isOn;
		if (this.backgroundShown) {
			this.showBackground();
		} else {
			this.hideBackground();
		}
	}
	
	
};

GuiButton.prototype.resize = function() {
	GuiButton.parent.resize.call(this);
};
/*
 * Label with text that can be aligned vertically and horizontally
 */

GuiLabel.prototype = new GuiElement();
GuiLabel.prototype.constructor = GuiLabel;

/**
 * @constructor
 */
function GuiLabel() {
	GuiLabel.parent.constructor.call(this);
}

GuiLabel.inheritsFrom(GuiElement);
GuiLabel.prototype.className = "GuiLabel";

GuiLabel.prototype.createInstance = function(params) {
	var entity = new GuiLabel();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiLabel);

GuiLabel.prototype.initialize = function(params) {
	GuiLabel.parent.initialize.call(this, params);

	this.fontSize = params['fontSize'] ? params['fontSize'] : 20;
	this.change(params['text']);
	if (params['align']) {
		this.align(params['align'], params['verticalAlign']);
	}
	if (params['color']) {
		this.setColor(params['color']);
	}
};

GuiLabel.prototype.generate = function(src) {
	var id = this.id;
	this.rowId = this.id + "_row";
	this.cellId = this.id + "_cell";
	return "<div id='" + this.id + "' class='" + this.style + " unselectable'>"
			+ "<div id='" + this.rowId + "' style='display:table-row;cursor: default; '>"
			+ "<div id='" + this.cellId + "' style='display:table-cell;cursor: default;'>"
			+ src + "</div></div></div>";
};

GuiLabel.prototype.create = function(src) {
	GuiDiv.parent.create.call(this, src);
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");

};

GuiLabel.prototype.change = function(src) {
	$("#" + this.cellId).text(src);
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
};

GuiLabel.prototype.append = function(src) {
	$("#" + this.cellId).append(src);
	this.resize();
};

GuiLabel.prototype.empty = function() {
	$("#" + this.cellId).empty();
	this.resize();
};

GuiLabel.prototype.setPosition = function(x, y) {
	GuiLabel.parent.setPosition.call(this, x, y);

};

GuiLabel.prototype.setRealSize = function(width, height) {
	GuiLabel.parent.setRealSize.call(this, width, height);

	var size = Screen.calcRealSize(width, height);
	$("#" + this.rowId)['css']("width", size.x);
	$("#" + this.rowId)['css']("height", size.y);
	$("#" + this.cellId)['css']("width", size.x);
	$("#" + this.cellId)['css']("height", size.y);

	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
	// cssTransform($("#" + this.cellId), null, null, Screen.widthRatio(),
	// Screen.heightRatio());

};

GuiLabel.prototype.resize = function() {
	GuiLabel.parent.resize.call(this);
};

GuiLabel.prototype.setColor = function(color) {
	this.jObject['css']("color", color);
};

GuiLabel.prototype.align = function(alignH, alignV) {
	if (alignH) {
		$("#" + this.cellId)['css']("text-align", alignH);
	}
	if (alignV) {
		$("#" + this.cellId)['css']("vertical-align", alignV);
	}
};
/*
 * Scrolling group of elements
 */

GuiScroll.prototype = new GuiElement();
GuiScroll.prototype.constructor = GuiScroll;

/**
 * @constructor
 */
function GuiScroll() {
	GuiScroll.parent.constructor.call(this);
}

GuiScroll.inheritsFrom(GuiElement);
GuiScroll.prototype.className = "GuiScroll";

GuiScroll.prototype.generate = function(src) {
	this.listId = this.id + "_list";
	this.scrollId = this.id + "_scroll";
	this.listId = this.scrollId;

	return "<div id='" + this.id + "' class='" + this.style
			+ " scrollerWrapper " + "unselectable'>" + "<div id='"
			+ this.scrollId + "' class='scrollerBackground'>"
			// + "<ul id=\"" + this.listId + "\"></ul>"
			+ "</div></div>";
};

GuiScroll.prototype.createInstance = function(params) {
	var entity = new GuiScroll(params['parent'], params['style'],
			params['width'], params['height']);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScroll);

GuiScroll.prototype.initialize = function(params) {
	GuiScroll.parent.initialize.call(this, params);
	this.createScroll();
};

GuiScroll.prototype.createScroll = function() {
	var thisGuiScroll = this;
	this.hScroll = (this.params['hScroll'] != null) ? this.params['hScroll']
			: true;
	this.vScroll = (this.params['vScroll'] != null) ? this.params['vScroll']
			: true;
	this.scroll = new iScroll(this.id, {
		'hScroll' : this.hScroll,
		'vScroll' : this.vScroll,
		'useTransform' : true,
		'onBeforeScrollStart' : function(e) {
			var target = e.target;
			while (target.nodeType != 1) {
				target = target.parentNode;
			}

			// if (target.tagName != 'SELECT' && target.tagName != 'INPUT' &&
			// target.tagName != 'TEXTAREA')
			e.preventDefault();

			// console.log("candidate " + target.id);
		},
		'onScrollStart' : function(e) {
			var target = e.target;
			thisGuiScroll.candidateToClick = null;

			while (true) {
				// a text element or element without id - skip it
				if (target.nodeType != 1 || target.id == '') {
					target = target.parentNode;
					continue;
				}

				// console.log("try to click " + target.id);
				var item = $("#" + target.id);
				if (item.length > 0) {
					var element = item['data']("guiElement");
					// console.log("element is " + element);

					// TODO listItemClickCallback and listItemMouseDownCallback
					// hacks
					// should be moved to GuiButton
					if (element) {
						if (element.listItemClickCallback) {
							thisGuiScroll.candidateToClick = element;
							break;
						} else if (element.listItemMouseDownCallback) {
							element.listItemMouseDownCallback(e);
							break;
						}
						// console.log("candidate " +
						// thisGuiScroll.candidateToClick.id);
					}
				}
				target = target.parentNode;

				// we have no parent or reached scroll element itself
				if (!target || target.id == thisGuiScroll.listId
						|| target.id == thisGuiScroll.scrollId
						|| target.id == thisGuiScroll.id)
					break;
			}
		},
		'onScrollMove' : function(e) {
			thisGuiScroll.candidateToClick = null;
		},
		'onBeforeScrollEnd' : function() {
			if (thisGuiScroll.candidateToClick) {
				thisGuiScroll.candidateToClick.listItemClickCallback();
				thisGuiScroll.candidateToClick = null;
			}
		}
	});
};

GuiScroll.prototype.refresh = function() {
	this.scroll['scrollTo'](0, 0, 0, false);
	this.scroll['refresh']();
};

GuiScroll.prototype.addListItem = function(item) {
	// var listItemId = this.listId + "_item" + uniqueId();
	// $("#" + this.listId).append("<li id='" + listItemId + "'></li>");
	// if (typeof item === "string") {
	// $("#" + listItemId).html(item);
	// } else {
	// item.setParent(listItemId);
	// }

	item.setParent("#" + this.listId);
	// allow events to propagate to reach the scroll
	item.unbind();
	this.children.addGui(item);

	this.resize();
};

GuiScroll.prototype.removeListItem = function(item) {
	this.children.removeGui(item);
	this.resize();
};

GuiScroll.prototype.clearList = function() {
	$("#" + this.listId).empty();
	this.children.clear();
};

GuiScroll.prototype.remove = function() {
	this.scroll['destroy']();
	delete this.scroll;
	GuiScroll.parent.remove.call(this);
};

GuiScroll.prototype.resizeScroll = function() {
	// a bit hacky. To enable horizontal scrolling
	// make sure that we will have enough width.
	if (this.hScroll && !this.vScroll) {
		var totalWidth = 0;
		for ( var i = 0; i < this.children.guiEntities.length; i++) {
			totalWidth += this.children.guiEntities[i].$()['outerWidth'](true);
		}
		$("#" + this.listId)['width'](totalWidth);
	}
};

GuiScroll.prototype.resize = function() {
	GuiScroll.parent.resize.call(this);
	this.resizeScroll();
	if (this.scroll) {
		this.scroll.refresh();
	}
};/*
 * GuiSprite - sprite of GuiScene
 */

var GUISPRITE_HACK_ON = false;

GuiSprite.prototype = new GuiDiv();
GuiSprite.prototype.constructor = GuiSprite;

/**
 * @constructor
 */
function GuiSprite() {
	GuiSprite.parent.constructor.call(this);
}

GuiSprite.inheritsFrom(GuiDiv);
GuiSprite.prototype.className = "GuiSprite";

GuiSprite.prototype.createInstance = function(params) {
	var entity = new GuiSprite();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiSprite);

GuiSprite.prototype.initialize = function(params) {
	GuiSprite.parent.initialize.call(this, params);

	//.hack temporary disable viewport for sprites at all
//	this.clampByViewport = this.clampByViewportSimple;

	this.totalWidth = params['totalImageWidth'];
	this.totalHeight = params['totalImageHeight'];

	this.totalSrc = params['totalImage'];
	// // .hack temporary for older games
	 if (GUISPRITE_HACK_ON) {
		 this.totalSrc = Resources.getImage(params['totalImage']);
	 }

	if (params['totalTile'] == null) {
		this.totalTile = {
			x : 0,
			y : 0
		};
	} else {
		this.totalTile = params['totalTile'];
	}
	this.flipped = false;

	this.setBackground(this.totalSrc);

	this.currentAnimation = null;
	this.animations = new Object();

	var that = this;
	if (params['spriteAnimations']) {
		$['each'](params['spriteAnimations'], function(name, value) {
			// console.log("Adding sprite animation " + name);
			that.addSpriteAnimation(name, value);
		});
	}

	this.jObject['css']("background-position", Math.floor(Screen.widthRatio()
			* this.totalTile.x * this.width)
			+ "px "
			+ Math.floor(Screen.heightRatio() * this.height * this.totalTile.y)
			+ "px");
};

GuiSprite.prototype.addSpriteAnimation = function(name, description) {
	this.animations[name] = {
		frames : description['frames'],
		row : description['row'],
		frameDuration : description['frameDuration']
	};
};

GuiSprite.prototype.addAnimation = function(animationName, frames, row,
		frameDuration) {
	this.animations[animationName] = {
		frames : frames,
		row : row,
		frameDuration : frameDuration
	};
};

GuiSprite.prototype.update = function(dt) {
	if (this.currentAnimation == null)
		return;

	var curTime = (new Date()).getTime();
	var dt = curTime - this.lastUpdateTime;
	this.lastUpdateTime = curTime;

	this.currentFrameTime += dt;

	while (this.currentFrameTime >= this.currentFrameLength) {
		this.updateAnimation();
		this.currentFrameTime -= this.currentFrameLength;
	}
};

GuiSprite.prototype.updateAnimation = function() {
	if (this.currentAnimation == null)
		return;
	if (this.currentFrame >= this.animations[this.currentAnimation].frames.length) {
		this.currentFrame = 0;
		if (!this.looped) {
			this.stopAnimation();
			return;
		}
	}
	
	// console.log("Frames " + this.currentFrame);
	var rowFramesLength = Math.round(this.totalWidth / this.width);
	var frame = this.animations[this.currentAnimation].frames[this.currentFrame];
	var remainder = frame % rowFramesLength;
	var q = (frame - remainder) / rowFramesLength;
	var row = this.animations[this.currentAnimation].row + q;
	frame = remainder;

	this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
			* frame * this.width)
			+ "px "
			+ Math.round(-Screen.heightRatio() * row * this.height)
			+ "px ");

	this.frame = frame;
	this.row = row;
	this.setRealBackgroundPosition();

	this.currentFrame++;
	

};

GuiSprite.prototype.stopAnimation = function(dontCallCallback) {
	this.jObject['stop']();
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
	this.currentAnimation = null;

	if (!dontCallCallback && this.animationEndCallback) {
		// trick with oldCallback is to allow to call setCallback
		// iside callback itself
		var oldCallback = this.animationEndCallback;
		this.animationEndCallback = null;
		oldCallback.call(this);
	}
};

GuiSprite.prototype.remove = function() {
	GuiSprite.parent.remove.call(this);
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
};

GuiSprite.prototype.setAnimationEndCallback = function(animationEndCallback) {
	this.animationEndCallback = animationEndCallback;
};

GuiSprite.prototype.playAnimation = function(animationName, duration, isLooped,
		independentUpdate) {
	var animation = this.animations[animationName];
	assert(animation, "No such animation: " + animationName);

	this.stopAnimation(true);

	this.currentAnimation = animationName;

	this.lastAnimation = animationName;

	var that = this;
	this.currentFrame = 0;
	this.currentFrameTime = 0;
	this.lastUpdateTime = (new Date()).getTime();

	//console.log(this.animations[this.currentAnimation].frameDuration);
	if (duration) {
		this.currentFrameLength = duration / animation.frames.length;
		// console.log("frame lenght " + this.currentFrameLength + ", " +
		// animation.frames.length);
	} else {
		this.currentFrameLength = this.animations[this.currentAnimation].frameDuration;
	}
	this.looped = isLooped;

	if (independentUpdate) {
		this.updateAnimationCallback = setInterval(function() {
			that.updateAnimation();
		}, this.currentFrameLength);
	}
	this.updateAnimation();
};

GuiSprite.prototype.isPlayingAnimation = function(animationName) {
	return this.currentAnimation == animationName;
};

GuiSprite.prototype.animate = function(moveVector, duration) {
	var that = this;
	this.jObject['animate']({
		left : moveVector.x * Screen.widthRatio() + 'px',
		top : moveVector.y * Screen.heightRatio() + 'px'
	}, {
		duration : duration,
		easing : "linear",
		complete : function() {
			that.stopAnimation();
			// that.x = $("#" + that.id)['css']("left");
		}
	// ,
	// step : function(now, fx) {
	// console.log($("#" + that.id)['css']("left"));
	// }
	});
};

GuiSprite.prototype.flip = function(needToBeFlipped) {
	this.flipped = needToBeFlipped;
	this.transform();
};

GuiSprite.prototype.transform = function(transfromations) {
	if (transfromations) {
		if (transfromations.matrix != null)
			this.matrix = transfromations.matrix;
		if (transfromations.angle != null)
			this.angle = transfromations.angle;
		if (transfromations.scale != null)
			this.scale = transfromations.scale;
		if (transfromations.translate != null)
			this.translate = transfromations.translate;
	}

	var scaleY = selectValue(this.scale, 1);
	var scaleX = scaleY;
	scaleX *= (this.flipped ? -1 : 1);
	cssTransform(this.jObject, this.matrix, this.angle, scaleX, scaleY,
			this.translate);
};

GuiSprite.prototype.rotate = function(angle) {
	this.angle = angle;
	this.transform();
};

GuiSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = transformOrigin;
	// console.log("Set transform origin to %s", transformOrigin);
	var obj = this.jObject;
	obj['css']("-webkit-transform-origin", transformOrigin);
	obj['css']("transform-origin", transformOrigin);
	obj['css']("-moz-transform-origin", transformOrigin);
	obj['css']("-o-transform-origin", transformOrigin);
	obj['css']("transform-origin", transformOrigin);
	obj['css']("msTransform-origin", transformOrigin);
};

GuiSprite.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

//	if (this.viewport) {
//		this.clampByViewport();
//	} else {
		this.setRealPosition(x, y);
//	}
};

GuiSprite.prototype.setRealPosition = function(x, y) {
	this.transform({
		translate : {
			x : Math.round(x * Screen.widthRatio()),
			y : Math.round(y * Screen.heightRatio())
		}
	});
};

GuiSprite.prototype.setTransform = function(matrix, angle) {
	this.angle = angle;
	this.matrix = matrix;
	this.transform();
};

GuiSprite.prototype.resize = function() {
	GuiSprite.parent.resize.call(this);
	this.setRealBackgroundPosition();
};

GuiSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	var frame = selectValue(this.frame, 0);
	var row = selectValue(this.row, 0);
	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
			* (-frame * this.width + offsetX))
			+ "px "
			+ Math.round(Screen.heightRatio() * (row * this.height + offsetY))
			+ "px ");
};

GuiSprite.prototype.resizeBackground = function() {
	var size = Screen.calcRealSize(this.totalWidth, this.totalHeight);
	this.jObject['css']("background-size", size.x + "px " + size.y + "px");
};
/**
 * Scene to operate Sprites
 */

GuiScene.prototype = new GuiDiv();
GuiScene.prototype.constructor = GuiScene;

/**
 * @constructor
 */
function GuiScene() {
	GuiScene.parent.constructor.call(this);
}

GuiScene.inheritsFrom(GuiDiv);
GuiScene.prototype.className = "GuiScene";

GuiScene.prototype.createInstance = function(params) {
	var entity = new GuiScene(params['parent'], params['style'], params['width'],
			params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScene);
/**
 * GuiDialog - modal dialog Has a mask full screen mask over the screen and
 * background image
 */

GuiDialog.prototype = new GuiDiv();
GuiDialog.prototype.constructor = GuiDialog;
/**
 * @constructor
 */
function GuiDialog() {
	GuiDialog.parent.constructor.call(this);
};

GuiDialog.inheritsFrom(GuiDiv);
GuiDialog.prototype.className = "GuiDialog";

GuiDialog.prototype.createInstance = function(params) {
	var entity = new GuiDialog(params['parent'], params['style'], params['width'], params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDialog);

GuiDialog.prototype.resize = function() {
	GuiDialog.parent.resize.call(this);
	this.children.resize();
};

GuiDialog.prototype.initialize = function(params) {
	GuiDialog.parent.initialize.call(this, params);
	
	this.maskDiv = null;
	this.visible = false;
	

	var that = this;

	// "x" : ((Screen.baseWidth() - this.width) / 2),
	// "y" : ((Screen.baseHeight() - this.height) / 2)

	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	this.maskDiv = guiFactory.createObject("GuiDiv", {
		"parent" : "body",
		// "image" :
		// "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=",
		"style" : "mask",
		"width" : "FULL_WIDTH",
		"height" : "FULL_HEIGHT",
		"x" : 0,
		"y" : 0
	});
	this.maskDiv.setBackground("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	this.maskDiv.bind(function(e) {
		e.preventDefault();
		return false;
	});
	this.children.addGui(this.maskDiv);

	this.maskDiv.setZ(130);
	this.setZ(131);
	this.maskDiv.hide();

	// if (this.backSrc) {
	// this.children.addGui(this.backImage =
	// factory.createGuiImage(this.dialogContainer, , "dialogButton",
	// this.width, this.height, 0, 0));
	// }
	this.resize();
};

GuiDialog.prototype.init = function() {
	GuiDialog.parent.init.call(this);
};

GuiDialog.prototype.show = function() {
	GuiDialog.parent.show.call(this);
	if (this.maskDiv) {
		this.maskDiv.show();
	}
	this.visible = true;
};

GuiDialog.prototype.hide = function() {
	GuiDialog.parent.hide.call(this);
	if (this.maskDiv) {
		this.maskDiv.hide();
	}
	this.visible = false;
};

GuiDialog.prototype.isVisible = function() {
	return this.visible;
};
