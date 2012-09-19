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
//	entityData['parent'] = this.params['parent'];
	this.writeUpdateProperty(entityData,"parent", this.params['parent']);
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
