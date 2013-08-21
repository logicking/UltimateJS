//////////////////
/**
 * Resource Manager
 */

var cache = document.createElement("div");
cache.style.width = "1px";
cache.style.height = "720px";
cache.style.left = "0px";
cache.style.top = "0px";
cache.style.position = "fixed";
document.body.appendChild(cache);

var Resources = (function() {
	// private interface
	var assets = new Array();
	var assetsArray = new Array();

	var images = new Array();
	var resolutions = new Object();

	// enum of strings of current language
	var strings = new Object();
	
	var cacheMaskR = document.createElement("div");
	cacheMaskR.style.width = "1px";
	cacheMaskR.style.height = "720px";
	cacheMaskR.style.background = "#000000";
	cacheMaskR.style.left = "0px";
	cacheMaskR.style.top = "0px";
	cacheMaskR.style.zIndex = 9999999;
	cacheMaskR.style.position = "fixed";
	document.body.appendChild(cacheMaskR);
//	
//	var cacheMaskD = document.createElement("div");
//	cacheMaskD.style.width = "2560px";
//	cacheMaskD.style.height = "720px";
//	cacheMaskD.style.background = "#000000";
//	cacheMaskD.style.left = "0px";
//	cacheMaskD.style.top = "720px";
//	cacheMaskD.style.zIndex = 9999999;
//	cacheMaskD.style.position = "fixed";
//	cache.appendChild(cacheMaskD);

	var currentResolution = null;
	var defaultResolution = null;
	var loadTimer = 0;

	var loadImage = function(src, callback) {
		var image = new Image();
		image.src = src;
		image.onload = callback;
		return image;
	};

	return { // public interface

		init : function() {
		},

		isNotLoaded : function(time) {

			loadTimer += time;

//			log3("IsNotLoaded: " + assetsArray.length);

			for ( var i = 0; i < assetsArray.length; i++) {
				var obj = assetsArray[i];
				// log3("constructor : " + (obj.constructor == Image) + "loaded
				// : " + obj.loaded);
				if (obj.type == "image" && !obj.loaded) {
//					log3(obj.height + " = obj.height; " + obj.fileName + "; ");
				}
				if (obj.type == "image" && !obj.loaded
						&& obj.naturalWidth !== 0 && obj.naturalHeight !== 0) {
					obj.onload();
				}
			}
			if (loadTimer > 10000) {
//				log("Loading too long" + assetsArray.length);
				for ( var i = 0; i < assetsArray.length; i++) {
					var obj = assetsArray[i];
					if (obj.type == "image" && !obj.loaded) {
						obj.onload();
					}
				}
			}
		},

//		hideCache : function() {
//			var cacheMask = document.createElement("div");
//			cacheMask.style.width = "10px";
//			cacheMask.style.height = "720px";
//			cacheMask.style.background = "black";
//			cacheMask.style.left = "1279px";
//			cacheMask.style.top = "0px";
//			cacheMask.style.zIndex = 100000;
//			cache.appendChild(cacheMask);
//		},
		
		setResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName
					+ " not exists!");
			currentResolution = resolutionName;
		},
		// if there's no picture in current resolution
		// it will be looking in default
		setDefaultResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName
					+ " not exists!");
			defaultResolution = resolutionName;
		},

		addResolution : function(resolutionName, imagesFolder, isDefault) {
			assert(!resolutions[resolutionName], "Resolution " + resolutionName
					+ " already exists!");
			resolutions[resolutionName] = {
				folder : imagesFolder,
				images : new Object()
			};

			if (isDefault) {
				Resources.setResolution(resolutionName);
				Resources.setDefaultResolution(resolutionName);
			}
		},

		addImage : function(name, resolution) {
			var resArray;
			if (typeof (resolution) == "string") {
				resArray = new Array();
				resArray(resolution);
			} else if (typeof (resolution) == "array") {
				resArray = resolution;
			} else {
				// adding on available resolutions
				resArray = new Array();
				for ( var i in resolutions) {
					resArray.push(i);
				}
			}

			for ( var i = 0; i < resArray.length; i++) {
				var resolutionName = resArray[i];
				assert(resolutions[resolutionName], "Resolution "
						+ resolutionName + " not exists!");
				resolutions[resolutionName].images[name] = name;
			}
		},
		// returnes string
		getString : function(stringId, rand) {
			if (strings[stringId]) {
				var str = strings[stringId];
				if (strings[stringId] instanceof Array) {
					if (rand == false) {
						return strings[stringId];
					}
					var lbl = str[Math.floor(Math.random()
							* strings[stringId].length)];
					return lbl;
				}
				return strings[stringId];
			} else {
				// console.error(stringId + " Not Found");
				return stringId;
			}

		},
		// loads json with set language
		setLanguage : function(language, array) {
			if ((array == true) && (typeof language == "object")) {
				strings = language;
			} else {
				var fileName = "resources/localization/" + language + ".json";
				$['getJSON'](fileName, function(data) {
					strings = data;
				});
			}
		},
		// returns filename of an image for current resolution
		getImage : function(name, preload, preloadCallback) {
			var imageFilename = null;
			var image = null;
			
			if (name == "background_dialog_common.png" || 
					name == "background_dialog_profiles_small.png" ||
						name == "background_dialog_profiles_initial.png") {
				name = "background_dialog_profiles_large.png";
			}

			// we are not using resolutions
			if (!currentResolution) {
				if (preload) {
					image = loadImage(name, preloadCallback);
				}
				imageFilename = name;
			} else {
				if (resolutions[currentResolution].images[name]) {
					imageFilename = resolutions[currentResolution].folder
							+ resolutions[currentResolution].images[name];
				}

				if (!imageFilename && defaultResolution
						&& defaultResolution != currentResolution
						&& resolutions[defaultResolution].images[name]) {
					imageFilename = resolutions[defaultResolution].folder
							+ resolutions[defaultResolution].images[name];
				}

				// when we are lazy to add all images by the Resource.addImage
				// function
				// we simply add current resolution folder to the requesting
				// name
				// supposing that we have all images for this resolution
				// available
				if (!imageFilename && typeof name != "undefined" && name) {
					imageFilename = resolutions[currentResolution].folder
							+ name;
				} else {
					// HACK! 26.07.2013
					imageFilename = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
				}

				if (preload) {
					image = loadImage(name, preloadCallback);
				}
			}

			if (preloadCallback && image && image.complete) {
				preloadCallback();
			}

			if (assets[name]) {
				// console.log("IN ASS", assets[name].complete);
			}
			return imageFilename;
		},

		// return an array of registered images filenames,
		// used for preloading
		getUsedImages : function() {
			var images = new Array();

			// walking through default resolution for all images
			// looking for images in current resolution
			for ( var i in resolutions[defaultResolution].images[i]) {
				if (resolutions[currentResolution].images[i]) {
					images.push(Resources.getImage(i));
				}
			}
			return images;
		},

		// "preloading" font by creating and destroying item with all fonts
		// classes
		preloadFonts : function(fontClasses) {
			for ( var i = 0; i < fontClasses.length; ++i) {
				$("#root")['append']("<div id='fontsPreload" + i
						+ "' + style='opacity:0.1;font-size:1px'>.</div>");
				var testDiv = $("#fontsPreload" + i);
				testDiv['addClass'](fontClasses[i]);
				setTimeout(function() {
					testDiv.remove();
				}, 1000);
			}
		},

		// temporary borrowed from CraftyJS game engine
		// TODO rewrite
		loadMedia : function(data, oncomplete, onprogress, onerror) {
			var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
			var counter = -1;
			var times = Math.floor(l/5);
			var mediaInterval = setInterval(function() {
				counter++;
				i = 5*counter;
				var thisLength = 5*(counter+1);
				if (thisLength>l) {
					if (thisLength - l > 5) {
//						log(thisLength + " clear");
						clearInterval(mediaInterval);
						return;
					} else {
						thisLength = l;
					}
				} 
				
				for (; i < thisLength; ++i) {
//					if (i > 42)
//						log(i + " = i; thisLength = " + thisLength + " total = " + total);
					current = data[i];

//					log2(i + "/" + l + " 0");
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
						obj.loaded = false;
						obj.type = "image";
						obj.fileName = Resources.getImage(current);
						obj.src = obj.fileName;
						var image = document.createElement('div');
						var style = "position: fixed; top: 0; left: 0px; width: 1px; height: 1px;";
						style += "background-image: url('" + obj.fileName + "'); background-repeat: no-repeat;";
						style += "-webkit-background-size: 1px 1px;";
						style += "-o-background-size: 1px 1px;";
						style += "-moz-background-size: 1px 1px;";
						style += "-khtml-background-size: 1px 1px;";
						style += "-ms-background-size: 1px 1px;";
						style += "background-size: 1px 1px;";
//						image.src = obj.fileName;
						image.setAttribute('style', style);
						cache.appendChild(image);
						// log3(obj.fileName + "is requested, ");
					} else {
						total--;
						continue; // skip if not applicable
					}

					// add to global asset collection
					assets[current] = obj;
					assetsArray.push(obj);
//					log3(assetsArray.length + "; ");

					obj.onload = function() {
						if (this.loaded)
							return;
						++j;
						// if progress callback, give information of assets loaded,
						// total and percent
						this.loaded = true;
						if (onprogress) {
							onprogress.call(this, {
								loaded : j,
								total : total,
								percent : (j / total * 100)
							});
						}
						if (j === total) {
							// log3(this.fileName + "is ready, ");
//							log("oncomplete");
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
//							log("onerror oncomplete");
							if (j === total) {
								if (oncomplete)
									oncomplete();
							}
						}
					};
				}
			} ,500);

		}
	};
})();
