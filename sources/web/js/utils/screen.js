var MAX_WIDTH = 1280;
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

var DO_NOT_RESIZE = false;

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
	
	
	//if fixed
	var fixedWidth = null;
	var fixedHeight = null;

	var oldW = null;
	var oldH = null;
	var orientationFlag = null;

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
		if(DO_NOT_RESIZE){
			return;
		}
		if(fixedWidth){
			w = fixedWidth;
		}
		if(fixedHeight){
			h = fixedHeight;
		}
		
		oldW = null;
		oldH = null;
		orientationFlag = null;
		
		if (!Screen.isCorrectOrientation()) {
			if (!Loader.loadingMessageShowed()) {
				resizeRotateMsg(w, h);
				$("#rotateMsg")['css']("display", "block");
				$("#rotateMsg")['css']("z-index", 99999999);
				orientationFlag = true;
			}
		} else {
			// absorb nearly simultaneous calls to resize
			if (!orientationFlag || (oldW != w || oldH != h)) {
				oldW = w;
				oldH = h;
				
				clearTimeout(resizeTimeoutHandle);
				resizeTimeoutHandle = setTimeout(function() {actualResize(w, h); }, 100);
			}
			
			windowScrollDown();

			$("#rotateMsg")['css']("z-index", 0);
			$("#rotateMsg")['css']("display", "none");
			
			orientationFlag = false;
		}
			
		// A little hack for S3
		setTimeout(function() {
			if (!Screen.isCorrectOrientation()) {
				if (!Loader.loadingMessageShowed()) {
					resizeRotateMsg(w, h);
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
		}, 500);
		// alert("resize " + Screen.isCorrectOrientation());
		
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
			if(isLandscape === "fixed"){
				this.fixedSize = true;
				fixedWidth = params['width'];
				fixedHeight = params['height'];
//				console.log("FIXED");
//				BASE_WIDTH = selectValue(params['MAX_WIDTH'], BASE_WIDTH);
//				console.log("BASE_WIDTH", BASE_WIDTH);
//				BASE_HEIGHT = selectValue(params['MAX_HEIGHT'], BASE_HEIGHT);
//				console.log("BASE_HEIGHT", BASE_HEIGHT);
//				MAX_WIDTH = selectValue(params['MAX_WIDTH'], MAX_WIDTH);
//				MAX_HEIGHT = selectValue(params['MAX_HEIGHT'], MAX_HEIGHT);
//				ENHANCED_BASE_WIDTH = selectValue(params['MAX_WIDTH'],
//						ENHANCED_BASE_WIDTH);
//				ENHANCED_BASE_HEIGHT = selectValue(params['MAX_HEIGHT'],
//						ENHANCED_BASE_HEIGHT);
//				ENHANCED_BASE_MARGIN_WIDTH = 0;
//				ENHANCED_BASE_MARGIN_HEIGHT = 0;
				
				
			}else{
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
			}
			

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
			console.log("WH", w, h);
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
			if (this.fixedSize == true)
				return 1;
			return widthRatio;
		},
		heightRatio : function() {
			if (this.fixedSize == true)
				return 1;
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
})();


