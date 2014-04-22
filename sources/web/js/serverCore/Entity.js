/*
 *  Entity is a main logic item of simulation. 
 *  Entities are a mirroring of server object on client. 
 */

/**
 * @constructor
 */

function Entity() {
};

Entity.prototype.init = function(params) {
	this.params = params;
	this.id = params['id'];
//	console.log("ENTITY PARAMS", this.id, this.params);
	this.listeners = selectValue(params["listeners"], []);
//	console.log("Listeners: ",this.listeners);
	if(params["accountId"]){
		this.account = Server.instance.getEntity(null, params["accountId"], null, true);
		if(!this.account){
			console.err_log("[CRITICAL ERROR]: No Account found for accountId=%s", params["accountId"]);
			console.err_log("Entity Initializing: ", params);
			console.err_log("ACCOUNT isInEntities: ", Server.instance.isInEntities(params["accountId"]));
			console.err_log("ACCOUNT isInCache: ", Server.instance.isInCache(params["accountId"]));
		}
		
	}else{
		if(this instanceof Account){
			this.account = this;
		}
	}
	// Variables values for synchronizing with server
	this.properties = {};
	this.parent = selectValue(params["parent"],null);
//	console.log("Init with ID: %s; parent=%s", this.id, this.parent);
	if (this.parent) {
		// find parent among entities on server
		if (typeof this.parent == "string") {
//			console.log("NEW PARENT1", this.parent);
			this.parent = Server.instance.getEntity(null, this.parent, null, true);
//			console.log("NEW PARENT2", this.parent);
			if( (this.parent)instanceof Entity ){
				this.parent.addChild(this);
			}else{
				console.log("No parent instance found on server for entity with id='" + this.id + "'");
			}
		
		}
		
	} else {
		console.log(" No parent provided for entity with id='" + this.id + "'");
	}

	var enabled = selectValue(params['enabled'], true);
	//this.setEnable(enabled);

	// this.readUpdate(params);
	this.timeouts = [];
	this.intervals = null;
};

Entity.prototype.assert = function(cond, msg) {
	assert(cond, msg + " for entity id='" + this.id + "'");
};

Entity.prototype.log = function(msg) {
	console.log("Entity id='" + this.id + "', " + msg);
};

Entity.prototype.logChildren = function(msg){
	var ids = [];
	if(this.children){
		for(var i=0;i<this.children.length; i++){
			ids.push(this.children[i].id);
		}
	}
	this.log(" children=" + JSON.stringify(ids) +", "+msg);
};

Entity.prototype.destroy = function(destroyChildren) {

	var child;
	if(this.parent instanceof Entity){
		this.parent.removeChild(this);
		this.parent = null;
	}
	this.destroyed = true;
	if (this.children) {
		for ( var i = 0; i < this.children.length; i++) {
			child = this.children[i];
			this.removeChild(child);
			if(destroyChildren){
				child.destroy(true);
			}
			i--;
		}
	}
//	Server.instance.removeEntity(this.id);
};

Entity.prototype.addChild = function(child) {
//	console.log("child: ", child);
	this.children = this.children ? this.children : new Array();
	this.assert(child != this, "Can't be parent for itself");
//	this.assert(child.parent == null, "Can't assign as child id='" + child.id
//			+ "' since there's parent id='"
//			+ (child.parent instanceof Entity ? child.parent.id : child.parent) + "' ");
	child.parent = this;
	var addListenersToChildren = function(child, listener){
		var children;
		child.addListener(listener);
		if(children = child.children){
			for(var i=0; i<children.length; i++){
				addListenersToChildren(children[i], listener);
			}
		}
	};
	
	addListenersToChildren(child, this.listeners);

	this.children.push(child);
	this.logChildren("Entity.addChild " + child.id);
};

Entity.prototype.removeChild = function(child) {
	assert(this.children, "no children have been assigned");
	popElementFromArray(child, this.children);
	this.logChildren("Entity.removedChild " + child.id);

};

Entity.prototype.initChildren = function(params) {
	if (params && params['children']) {
		this.account.readGlobalUpdate(params['children']);
	}
};

// scheduled update
Entity.prototype.update = null;

Entity.prototype.isEnabled = function() {
	return this.enabled;
};

Entity.prototype.setEntityTimeout = function(func, time) {
//	console.log(this);
	var that = this;
	var entityId = that.id;
	var id = global.setTimeout(function() {
		Server.instance.getEntity(null, entityId, function(entity){	
			func(entity);
		});
	}, time);	
	this.timeouts.push(id);
	return id;
};


Entity.prototype.clearTimeouts = function(){
	for(var i=0;i<this.timeouts.length;i++){
		global.clearTimeout(this.timeouts[i]);
	}
	this.timeouts = [];
};

Entity.prototype.setEnable = function(isTrue) {
	this.enabled = isTrue;
	if (typeof (this.update) == "function") {
		if (isTrue) {
			this.account.addScheduledEntity(this);
		} else {
			this.account.removeScheduledEntity(this);
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
	var parentId = (this.parent instanceof Entity) ? this.parent.id : this.parent;
	
	 if( (data['parent'])&(data['parent'] != parentId) ) {
		this.setParent(data['parent']);		 
	 }
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
//	CONSOLE.LOG("GLOBALDATA: ", GLOBALDATA);
//	CONSOLE.LOG("ENTITYDATA: ", ENTITYDATA);
	globalData[this.id] = entityData;
	entityData['class'] = this.params['class'];
	entityData['parent'] = (this.parent instanceof Entity)?this['parent']['id']:this['parent'];
	entityData['accountId'] = this.params['accountId'];
//	entityData['id'] = this.params['id'];
	if (this.children) {
		for(var index in this.children){
			this.children[index].writeUpdate(globalData, new Object());
		}
	}
};

// Timing of entity
//
//Entity.prototype.setTimeout = function(func, time) {
//	EntityManager.instance.getEntity(this.id, function(element){
//		var entity = EntityManager.instance.createEntity(element);
//		global.setTimeout(func(entity), time);
//	});
//};


Entity.prototype.addListener = function(listener){
	if(listener instanceof Array){
		for(var i=0; i<listener.length;i++){
			this.addListener(listener[i]);
		}
		return;
	}
	if(this.listeners.indexOf(listener) < 0){
		this.listeners.push(listener);
	}
	
};

//Notifies Listeners about certain property change 
// name - prop name , value = value

Entity.prototype.notifyExistance = function(){
	var data = {};
	this.writeUpdate(data, {});
	for(var index in this.listeners){
		this.listeners[index].pushData(data);
	}
};

Entity.prototype.notifyListeners = function(name, value){
	for(var index in this.listeners){
		this.listeners[index].pushProperty(this.id, name, value);
	}
};

Entity.prototype.setProperty = function(name, value){
	this[name] = value;
	this.notifyListeners(name, value);
};

Entity.prototype.setParent = function(parent){

	var parentId =  (parent instanceof Entity)?parent.id:parent;
	if(this.parent instanceof Entity){
		this.parent.removeChild(this);
		this.parent = parentId;
	}else{
		var curParentId = getParentId(this);
//		console.log("CUrParentID on setParent: ", curParentId);
		if(curParent = Server.instance.getEntity(null, curParentId, null, true)){
			curParent.removeChild(this);
		}
	}
	this.notifyListeners("parent", (parent instanceof Entity)?parent.id:parent);
	if(parent === null){
		this.parent = null;
		if(Server.instance.isInEntities(this.id)){
			Server.instance.removeEntity(this.id, true);	
		}
		return;
	}
	var newParent;
	if(newParent = (parent instanceof Entity)?parent:Server.instance.getEntity(null, parentId, null, true)){
		assert(newParent != null, "No parent with id=%s on server", parentId);
		if(Server.instance.isInCache(this.id)){	
			this.parent = newParent;
			Server.instance.restoreFromCache(this.id, null);
		}else{
			console.log("Adding child to entity on setParent to parent(id=%s)", newParent.id);
			newParent.addChild(this);
		}
	}
};



Entity.prototype.reportState = function(collector){
	if(collector instanceof Array){
		var info = JSON.stringify(this);
		collector.push(info + "\n");
	}else{
		console.log("Wrong collector on entity(id=%s) report state.", this.id);
	}
};