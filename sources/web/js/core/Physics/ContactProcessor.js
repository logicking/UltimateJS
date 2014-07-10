/**
 * Contact Processor - part of the Physics singleton to
 * handle and process cantact events
 */

function ContactProcessor() {
	this.beginCallbacks = {};
	this.endCallbacks = {};
	this.preSolveCallbacks = {};
	this.postSolveCAllbacks = {};
};

ContactProcessor.prototype.init = function() {
	if (Physics.getContactListener())
		return;
	var that = this;
	var contactListener = Physics.getContactListener();
	contactListener = new b2ContactListener;

    contactListener.BeginContact = function(contact) {
			that.processBegin(contact);	
    };
    contactListener.EndContact = function(contact) {
			that.processEnd(contact);	
    };
    contactListener.PreSolve = function(contact, impulse) {
	    		that.processPreSolve(contact, impulse);
    };
    contactListener.PostSolve = function(contact, oldManifold) {
	    	that.processPostSolve(contact, oldManifold);
    };
    var world = Physics.getWorld();
    world.SetContactListener(contactListener);
};


//
//	Adds pair to contact events dataset 
//
ContactProcessor.prototype.setContactBeginCalback = function(callback, param) {
	this.init();
	this.beginCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactBeginCalback = function(entity) {
	return this.beginCallbacks[entity.className];
};

ContactProcessor.prototype.setContactEndCalback = function(callback, param) {
	this.init();
	this.endCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactEndCallback = function(entity) {
	this.beginCallbacks[entity.className];
};

ContactProcessor.prototype.setContactPreSolveCalback = function(callback, param) {
    this.init();
    this.preSolveCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactPreSolveCalback = function(entity) {
    return this.preSolveCallbacks[entity.className];
};

ContactProcessor.prototype.setContactPostSolveCalback = function(callback, param) {
    this.init();
    this.postSolveCAllbacks[param] = callback;
};

ContactProcessor.prototype.getContactPostSolveCallback = function(entity) {
    this.postSolveCAllbacks[entity.className];
};


ContactProcessor.prototype.clearContactCallbacks = function(entity) {
	if (!entity) {
		this.beginCallbacks = {};
		this.endCallbacks = {};
	} else
		delete this.beginCallbacks[entity.className];
};

ContactProcessor.prototype.processBegin = function(contact) {
	var entityA = contact.GetFixtureA().GetBody().GetUserData();
	var entityB = contact.GetFixtureB().GetBody().GetUserData();
	var callback = entityA ? this.beginCallbacks[entityA.className] : false;
	if (callback && entityA.physics) 
		callback.call(entityA, contact, entityB);
	callback = entityB ? this.beginCallbacks[entityB.className] : false;
	if (callback && entityB.physics) 
		callback.call(entityB, contact, entityA);
};

ContactProcessor.prototype.processEnd = function(contact) {
	var entityA = contact.GetFixtureA().GetBody().GetUserData();
	var entityB = contact.GetFixtureB().GetBody().GetUserData();
	var callback = entityA ? this.endCallbacks[entityA.className] : false;
	if (callback && entityA.physics) 
		callback.call(entityA, contact, entityB);
	callback = entityB ? this.endCallbacks[entityB.className] : false;
	if (callback && entityB.physics) 
		callback.call(entityB, contact, entityA);
};

ContactProcessor.prototype.processPreSolve = function(contact) {
    var entityA = contact.GetFixtureA().GetBody().GetUserData();
    var entityB = contact.GetFixtureB().GetBody().GetUserData();
    var callback = entityA ? this.preSolveCallbacks[entityA.className] : false;
    if (callback && entityA.physics)
        callback.call(entityA, contact, entityB);
    callback = entityB ? this.preSolveCallbacks[entityB.className] : false;
    if (callback && entityB.physics)
        callback.call(entityB, contact, entityA);
};

ContactProcessor.prototype.processPostSolve = function(contact) {
    var entityA = contact.GetFixtureA().GetBody().GetUserData();
    var entityB = contact.GetFixtureB().GetBody().GetUserData();
    var callback = entityA ? this.postSolveCAllbacks[entityA.className] : false;
    if (callback && entityA.physics)
        callback.call(entityA, contact, entityB);
    callback = entityB ? this.postSolveCAllbacks[entityB.className] : false;
    if (callback && entityB.physics)
        callback.call(entityB, contact, entityA);
};

