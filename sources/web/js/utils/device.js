/**
 * Device Properties
 */

var USE_NATIVE_RENDER = true;
var Device = (function() {
	// private interface

	var storageSupported = null;

	var reserveStorage = {};
	
	var userAgentParsed = null;
	var androidOsVersion = null;
	var isAppleMobileOs = null;
	var isIpod = null;
	var isIeBrowser = null;
	var isWebkitBrowser = null;
    var isAndroidStockBrower = null;

	var userAgent = null;
    var isSupportsToDataURL;

	// result of a benchmark test
	// currently set as percentage of IPhone 4
	var benchmarkTest = 9999;

	var touchStartX, touchStartY, touchEndX, touchEndY;

	var nativeRender = (USE_NATIVE_RENDER && window.NativeRender) ? window.NativeRender
			: null;

	var isNative = typeof(Native) != 'undefined' && Native.Screen ;
	
	function parseUserAgent() {
		if (userAgentParsed)
			return;
		userAgent = navigator.userAgent.toLowerCase();

		// check apple iOs
		isAppleMobileOs = (/iphone|ipod|ipad/gi).test(navigator.platform);
		isIpod = (/iphone|ipod/gi).test(navigator.platform);

		isWebkitBrowser = userAgent.indexOf("webkit") > -1;

        var nua = navigator.userAgent;
        isAndroidStockBrower = (nua.indexOf('Mozilla/5.0') > -1 && nua.indexOf('Android ') > -1 && nua.indexOf('AppleWebKit') > -1);

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

            /**
             *
             * @return {boolean} support context.GetImageData()
             */
            function supportsToDataURL() {
            	if (isAndroidStockBrower || Device.isNative()) {
            		console.log("supportsToDataURL is not implemented")
            		return false;
            	}
                var c = document.createElement("canvas");
                var data = c.toDataURL("image/png");
                return (data.indexOf("data:image/png") == 0);
            }

            isSupportsToDataURL = supportsToDataURL();
		},
		setStorageItem : function(key, val) {
			if (Device.isNative()) {
				if (typeof(val) == "undefined" || typeof(val) == "function")
	        		return;
	        	switch(typeof(val)) {
	        		case "string":
	        			break;
	        		case "number":
	        			break;
	        		case "object":
	        			val = JSON.stringify(val);
	        			break;
	        	};
				Native.Storage.SaveToIsolatedStorage(key, val);
				return;
			}
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				storage.setItem(key, val);
			} else {
				reserveStorage[key] = val;
			}
		},
		getStorageItem : function(key, defaultVal) {
			if (Device.isNative()){
	        	var answer = Native.Storage.GetFromIsolatedStorage(key);
	        	if (answer == null || answer == "" || answer == "null")
	        		answer = defaultVal;
	        	else if (!isNaN(answer))
	        		answer *= 1;
	        	else if (answer == "true")
	        		answer = true;
	        	else if (answer == "false")
	        		answer = false;
//	        	else if (answer.indexOf("{") == 0)
//	        		answer = JSON.parse(answer);
				return answer;
			}
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				var val = storage.getItem(key);
				return (val != null) ? val : defaultVal;
			} else {
				if (reserveStorage[key])
					return reserveStorage[key];
				return defaultVal;
			}
		},

		removeStorageItem : function(key) {
			if (Device.isNative()) {
				///TODO Implement Storage item removal for native
				return;
			}
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				storage.removeItem(key);
			} else {
				if (reserveStorage[key])
					delete reserveStorage[key];
			}
		},

		is : function(deviceName) {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return (userAgent.indexOf(deviceName) > -1);
		},
		isAndroid : function() {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return androidOsVersion != null;
		},

		androidVersion : function() {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return androidOsVersion;
		},

		isWebkit : function() {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return isWebkitBrowser;
		},

		isAppleMobile : function() {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return isAppleMobileOs;
		},

		isIpodDevice : function() {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return isIpod;
		},
		
		isMobile : function() {
			if (Device.isNative()) {
				///TODO Implement
				return "Not implemented";
			}
			return Device.isTouch();
		},
		
		isNative : function() {
			return isNative;
		},

		supports3dTransfrom : function() {
			return false;//Modernizr.csstransforms3d;
		},
		nativeRender : function() {
			if (Device.isNative()) {
				///TODO Not implemented
				return null;
			}
			return nativeRender;
		},

		/*
		 * Touch events
		 * 
		 */

		isTouch : function() {
			if (Device.isNative()) {
				///TODO Not implemented
				return false;
			}
			return 'ontouchstart' in document.documentElement;
		},
		getPositionFromEvent : function(e) {
			if (e['originalEvent'] && e['originalEvent'].touches && e['originalEvent'].touches[0]) {
				// alert(" touch " + e.touches[0].pageX);
				return {
					x : e['originalEvent']['touches'][0].pageX,
					y : e['originalEvent']['touches'][0].pageY
				};
			}
			if (e['originalEvent'] && !e['originalEvent'].touches) {
				if (e['originalEvent'].pageX) {
					return {
						x : e['originalEvent'].pageX,
						y : e['originalEvent'].pageY
					};
				}
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
		isWindowsPhone: function () {
		    var regExp = new RegExp("Windows Phone", "i");
		    return navigator.userAgent.match(regExp);
		},

		// becnmark test for slow devices
		isSlow : function() {
			if (Device.isNative() || Device.isWindowsPhone()) {
//				 alert("I'm native, or windows");
				return false;
			}
			if (Device.isIpodDevice()) {
//				 alert("I'm ipod");
				return true;
			}
			if ((Device.isAndroid() && Device.androidVersion() < 2.3)
					|| benchmarkTest < 80) {
//				 alert("Yes, we are slow = " + benchmarkTest);
				return true;
			} else {
//				 alert("We are fast = " + benchmarkTest);
				return false;
			}
		},

        isSupportsToDataURL: function () {
            return isSupportsToDataURL;
        },

        isAndroidStockBrowser: function() {
            return isAndroidStockBrower;
        },

		/*
		 * Miscellaneous functions
		 */

		// shows apple 'Add to home' pop-up
		addToHomeOpenPopup : function() {
			window['addToHomeOpen']();
		}
	};
})();