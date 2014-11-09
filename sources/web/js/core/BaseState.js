/**
 * BaseState - abstract class - current state of the game.
 * Loads GUI preset and operate with GUI elements.
 * Preloads any required resources
 */

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

BaseState.prototype.refresh = function() {
	if (this.guiContainer)
		this.guiContainer.refresh();
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

BaseState.prototype.hide = function () {
	var mainGui = selectValue(this.getGui("enhancedScene"), this.guiContainer.guiEntities[0], null);
	if (mainGui)
		mainGui.hide();
    if (this.guiContainer.updateIntervalHandler != null)
    	this.guiContainer.resetUpdateInterval();
    if (this.isEnabled())
    	this.setEnable(false);
};

BaseState.prototype.show = function () {
    var mainGui = selectValue(this.getGui("enhancedScene"), this.guiContainer.guiEntities[0], null);
	if (mainGui)
		mainGui.show();
    if (this.guiContainer.updateIntervalHandler == null)
    	this.guiContainer.setUpdateInterval(GLOBAL_UPDATE_INTERVAL);
    if (!this.isEnabled()) 
    	this.setEnable(true);
};

BaseState.prototype.fadeTo = function (fadeValue, time, callback) {
	var that = this;
    var mainGui = selectValue(this.getGui("enhancedScene"), this.guiContainer.guiEntities[0], null);
	if (fadeValue > 0)
	    this.show();
	this.setEnable(false);
	if (mainGui)
			mainGui.fadeTo(fadeValue, time, function() {
	    	    if (fadeValue <= 0)
	    	        that.hide();
	    	    else
	    	        that.setEnable(true);
	    		if (typeof(callback) == "function")
	    			callback.call(that);
	    	});
    else {
    	console.error("nothing to fade, " + this.guiContainer.length);
    	if (fadeValue <= 0)
    	    that.hide();
    	else
    	    this.setEnable(true);
    	if (callback)
    		callback.call(this);
    }
};

// Preloading of static resources - resources that
// should be upload before the use of the state
BaseState.prototype.preload = function() {
	// Loading JSONs first
	var totalToLoad = 0;
	var remainToLoad = 0;
	var that = this;
	if (!this.resources) {
		this.preloadComplete();
		return;
	}
	if (Account.instance.loadingStates && Account.instance.loadingStates[that.id]) {
		if (this.resources.media) 
			Account.instance.loadingStates[that.id].totalMedia = countProperties(this.resources.media);
		if (this.resources.json)
			Account.instance.loadingStates[that.id].totalJsons = countProperties(this.resources.json);
	}
	
	if (this.resources.json) {
		totalToLoad = countProperties(that.resources.json);
		var remainToLoad = totalToLoad + 0;
		$['each'](this.resources.json, function(key, val) {
			$['getJSON'](key, function(data) {
				that.resources.json[key] = data;
			}).error(function() {
				assert(false, "error reading JSON " + key);
			}).complete(function() {
				remainToLoad--;
				if (Account.instance.loadingStates && Account.instance.loadingStates[that.id]) {
					Account.instance.loadingStates[that.id].jsons = Math.min(totalToLoad - remainToLoad, totalToLoad);
																	//(1 - remainToLoad/totalToLoad)* 100;
					Account.instance.updateLoadingState();
				}
				
				if (remainToLoad <= 0)
					that.jsonPreloadComplete();
				
			});
		});
	} else {
		this.jsonPreloadComplete();
	}
};

BaseState.prototype.jsonPreloadComplete = function() {
	var that = this;
	if (Account.instance.loadingStates && Account.instance.loadingStates[that.id])
		Account.instance.loadingStates[that.id].jsons = Account.instance.loadingStates[that.id].totalJsons;
	if (this.resources.media) {
		var startTime = new Date();
		Resources.loadMedia(this.resources.media, function() {
			//console.log("Media loaded for %d ms", (new Date() - startTime));
			that.preloadComplete();
			if (Account.instance.loadingStates && Account.instance.loadingStates[that.id])
				Account.instance.loadingStates[that.id].media = Account.instance.loadingStates[that.id].totalMedia;
			Account.instance.updateLoadingState();
		}, function(data) {
			if (Account.instance.loadingStates && Account.instance.loadingStates[that.id]) {
				Account.instance.loadingStates[that.id].media = data.loaded;//(data.loaded/data.total) * 100;
				Account.instance.updateLoadingState();
			} else
				that.preloadingCallback(data);

		});
	} else {
		this.preloadComplete();
	}
};

BaseState.prototype.preloadComplete = function() {
	// loading complete, make initializing
	this.init(this.params);
	if (this.params.onLoadComplete)
		this.params.onLoadComplete();
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
