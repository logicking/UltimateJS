/**
 * Account - root entity that is parent to all active entities
 */

var GLOBAL_UPDATE_INTERVAL = 50;

/**
 * @constructor
 */
function Account(parent) {
	Account.parent.constructor.call(this);
};

Account.inheritsFrom(BaseState);

Account.prototype.init = function(params) {
	var that = this;
	params = params ? params : {};
	Account.parent.init.call(this, params);
	// associative array of all active entities
	this.allEntities = new Object();
	// entities that should be update on timely basis
	this.scheduledEntities = new Object();
	this.renderEntities = new Object();

	//GuiSprites that have separate from visual entities updates
	this.staticSprites = {};
	
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
	
	 this.debuggerInstance = turnOnOnScreenDebug();
//	 this.debuggerInstance.fps = {};
//	 this.debuggerInstance.fps.total = 0;
//	 this.debuggerInstance.fps.calls = 0;

	
	
	this.tapActive = true;
	$(window).blur(function(e) {
//		that.debuggerInstance.log("Blur");
	});
	$(window).focus(function(e) {
		that.debuggerInstance.log(" Focus");
//		that.tabActive = true;
		that.activateUpdateAndRender();
		that.debuggerInstance.log(" ++Done");

	});
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
 * restart for update and render with reqAnimFrame
 */
Account.prototype.activateUpdateAndRender = function() {
	var that = this;
	
	this.cancelUpdate = true;
	
	setTimeout(function() {
		that.cancelUpdate = false;
		that.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
			that.update(100);
		});
		that.globalRenderFrameHandle = window.requestAnimationFrame(function() {
			that.render();
		});
	}, 500);
};

//Account.prototype.activateUpdateAndRender = function() {
//	var that = this;
//
//	that.debuggerInstance.log(" activateUpdateAndRender");
//	clearTimeout(this.globalUpdateIntervalHandle);
//	clearTimeout(this.globalRenderFrameHandle);
//
//	that.debuggerInstance.log(" clear");
//	window.cancelAnimationFrame(this.globalUpdateIntervalHandle);
//	window.cancelAnimationFrame(this.globalRenderFrameHandle);
//
//	that.debuggerInstance.log(" cancel");
//	setTimeout(function() {
//		that.debuggerInstance.log(" timeout");
//		that.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
//			that.update(100);
//		});
//		that.globalRenderFrameHandle = window.requestAnimationFrame(function() {
//			that.render();
//		});
//	}, 500);
//};

/*
 * Scheduling for children entities
 */
Account.prototype.addScheduledEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	var dt = this.globalUpdateInterval;
	// if adding first object to scheduling queue start update interval
	if (!this.globalUpdateIntervalHandle) {
		that.prevUpdateTime = Date.now();
//		this.globalUpdateIntervalHandle = this.setInterval(function() {
//			that.update(dt);
//		}, dt);
		this.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
			that.update(dt);
		});

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
/*
 * Rendering for children entities
 */
var oldWindowRequestAnimationFrame = window.requestAnimationFrame;
window.requestAnimationFrame = (function() {
	return oldWindowRequestAnimationFrame || window.webkitRequestAnimationFrame
			|| window.mozRequestAnimationFrame || window.oRequestAnimationFrame
			|| window.msRequestAnimationFrame
			|| function( /* function */callback, /* DOMElement */element) {
				window.setTimeout(callback, 1000 / 50);
			};
})();

Account.prototype.addRenderEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	// if adding first object to rendering queue start update interval
	if (!this.globalRenderFrameHandle) {
		this.lastRenderTime = Date.now();
		this.globalRenderFrameHandle = window.requestAnimationFrame(function() {
			that.render();
		});
	}
	this.renderEntities[newEntity.id] = newEntity;
};

Account.prototype.removeRenderEntity = function(entity) {
	assert(typeof (entity.id) == "string", "Entity ID must be string");
	delete this.renderEntities[entity.id];
	// if nothing to schedule anymore stop interval either
	if (!this.globalRenderFrameHandle
			&& $['isEmptyObject'](this.renderEntities)) {
		this.clearInterval(this.globalRenderFrameHandle);
		this.globalRenderFrameHandle = null;
	}
};

// Regular render update for registered enities
Account.prototype.render = function() {
	var that = this;
//	var dt = Date.now() - this.lastRenderTime;
//	if(dt != 0){
	
	var canvas = null;
		$['each'](this.renderEntities, function(id, entity) {
			if (entity && entity.isVisible && entity.isVisible()) {
				if (!canvas)
					canvas = entity;
				entity.render();
			}
		});
//	}
//	var that = this;
//	this.lastRenderTime = Date.now();
		
	if (!this.cancelUpdate) {
		this.globalRenderFrameHandle = window.requestAnimationFrame(function() {
			that.render();
		}, canvas);
	}
};

// Regular scheduled update for registered enities
Account.prototype.update = function(dt) {
	var that = this;
	var date = Date.now();
	if(date - this.prevUpdateTime >= this.globalUpdateInterval){
		dt = date - this.prevUpdateTime;
//		if (this.debuggerInstance) {
//			this.debuggerInstance.fps.total += dt;
//			this.debuggerInstance.fps.calls++;
//			if (this.debuggerInstance.fps.total > 1000) {
//				this.debuggerInstance.log2(this.debuggerInstance.fps.calls);
//				
//				this.debuggerInstance.fps.total = 0;
//				this.debuggerInstance.fps.calls = 0;
//			}
//		}
//		dt = this.globalUpdateInterval;
		this.prevUpdateTime = Date.now();
		$['each'](this.scheduledEntities, function(id, entity) {
			if (entity && entity.isEnabled()) {
				entity.update(dt);
			}
		});
		
		$['each'](this.staticSprites, function(name, sprite) {
			sprite.update(dt);
		});
		
	}else{
		dt += date - this.prevUpdateTime;
	}
	
	if (!this.cancelUpdate) {
		this.globalUpdateIntervalHandle = window.requestAnimationFrame(function() {
			that.update(dt);
		});
	}
};
Account.prototype.setEnable = function(isTrue) {

};

// called from outside, to notify entities about
// screen resize
Account.prototype.resize = function() {
	if (this.backgroundState) {
		this.backgroundState.resize();
	}
	if (this.children == null)
		return;
	$['each'](this.children, function(idx, entity) {
		if (entity && entity.resize) {
			entity.resize();
		}
	});
};

/*
 * NETWORKING FUNCTIONS dealing with external server /* NETWORKING FUNCTIONS
 * dealing with external server
 */
// Creates/Updates/Destroy all active entities
Account.prototype.readGlobalUpdate = function(data) {
	var that = this;
	$['each'](data, function(id, element) {
		// console.log("readGlobalUpdate key is ", id, element);
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
