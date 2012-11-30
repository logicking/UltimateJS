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
	this.id = selectValue(params['id'], "Account01");
	// associative array of all active entities
	this.allEntities = new Object();
	// entities that should be update on timely basis
	this.scheduledEntities = new Object();

	// time interval for scheduled synchronization with server
	this.syncWithServerInterval = params['syncWithServerInterval'];
	// adding itself to allEntities for reading updates
	// in automatic mode
	
	this.globalUpdateInterval = selectValue(params['globalUpdateInterval'],
			GLOBAL_UPDATE_INTERVAL);
	this.addEntity(this);
	// permanent GUI element
	Accounts[this.id] = this;
	
};

Account.prototype.addEntity = function(newEntity) {
	assert((typeof (newEntity.id) == 'string'), "Entity ID must be string");
	assert(this.allEntities[newEntity.id] == null, "Entity with ID '"
			+ newEntity.id + "' already exists");
	for(var index in this.listeners){
		newEntity.addListener(this.listeners[index]);
	}
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
		if (entity !== Accounts[accountID]) {
			this.removeEntity(id, false);
		}
	});
};

/*
 * Scheduling for children entities
 */
Account.prototype.addScheduledEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	console.log("adding sheduled entity", newEntity);
	var dt = this.globalUpdateInterval;
	// if adding first object to scheduling queue start update interval
	if (!this.globalUpdateIntervalHandle) {
		 this.globalUpdateIntervalHandle = setInterval(function() {
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
			&& isEmptyObject(this.scheduledEntities)) {
		this.clearInterval(this.globalUpdateIntervalHandle);
		this.globalUpdateIntervalHandle = null;
	}
};

// Regular scheduled update for registered enities
Account.prototype.update = function(dt) {
	for(var id in this.sheduledEntities){
		if (this.sheduledEntities[id] && this.sheduledEntities[id].isEnabled()) {
			this.sheduledEntities[id].update(dt);
		}
	}
	
//	$['each'](this.scheduledEntities, function(id, entity) {
//		if (entity && entity.isEnabled()) {
//			entity.update(dt);
//		}
//	});
};
Account.prototype.setEnable = function(isTrue) {

};

/*
 * NETWORKING FUNCTIONS dealing with external server 
 */
// Creates/Updates/Destroy all active entities
Account.prototype.readGlobalUpdate = function(data) {
	var that = this;
	for(var id in data){
		var element = data[id];
		 //console.log("Element ID: ", id);
		var entity = this.getEntity(id);
		// entity already exists
		if (entity) {
			console.log("updating existing: ", id);
			if (element["destroy"]) {
				
				//remove from actual entity list
				that.removeEntity(id);
				
				// remove entity from received on callback Data
				//delete data[id];
			} else {
				// updating the entity
				entity.readUpdate(element);
			}
//			return;
		} else { // the case when entity in received callback data does not exists in entity list
			//console.log("Element.Parent", element["parent"]);
			var parentEntity = this.getEntity(element['parent']);
			if (parentEntity) {
				// create new entity
				element["id"] = id;
				element["accountID"] = this.id;
				entity = entityFactory.createObject(element["class"], element);
				// viking test
				// entity.parent = element.parent;
				that.addEntity(entity);
//				 console.log("New entity '" + entity.id + "' of class "
//				 + element["class"] + " with parent '"
//				 + (entity.parent ? entity.parent.id : "no parent") + "'");
			}
		}
	}
	
};

// Serialize all entities to JSON
Account.prototype.writeGlobalUpdate = function() {
	var data = {};
	this.writeUpdate(data, new Object());
	return data;
};


