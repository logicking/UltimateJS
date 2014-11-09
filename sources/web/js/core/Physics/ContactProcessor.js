/**
 * Contact Processor - part of the Physics singleton to
 * handle and process cantact events
 */

function ContactProcessor() {
    this.beginCallbacks = {};
    this.endCallbacks = {};
	this.preSolveCallbacks = {};
	this.postSolveCallbacks = {};
};

ContactProcessor.prototype.init = function () {
    if (Physics.getContactListener())
        return;
    var that = this;
    var contactListener = Physics.getContactListener();
    contactListener = new b2ContactListener;

    contactListener.BeginContact = function (contact) {
        that.processBegin(contact);
    };
    contactListener.EndContact = function (contact) {
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
ContactProcessor.prototype.setContactBeginCalback = function (callback, param) {
    this.init();
    this.beginCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactBeginCalback = function (entity) {
    return this.beginCallbacks[entity.id];
};

ContactProcessor.prototype.setContactEndCalback = function (callback, param) {
    this.init();
    this.endCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactEndCallback = function (entity) {
    return this.beginCallbacks[entity.id];
};

ContactProcessor.prototype.setContactPreSolveCalback = function(callback, param) {
    this.init();
    this.preSolveCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactPreSolveCalback = function(entity) {
    return this.preSolveCallbacks[entity.id];
};

ContactProcessor.prototype.setContactPostSolveCalback = function(callback, param) {
    this.init();
    this.postSolveCallbacks[param] = callback;
};

ContactProcessor.prototype.getContactPostSolveCallback = function(entity) {
	return this.postSolveCallbacks[entity.id];
};

ContactProcessor.prototype.clearContactCallbacks = function (entity) {
    if (!entity) {
        this.beginCallbacks = {};
        this.endCallbacks = {};
        this.beginCallbacks = {};
        this.endCallbacks = {};
    } else {
        delete this.beginCallbacks[entity.id];
        delete this.endCallbacks[entity.id];
        delete this.preSolveCallbacks[entity.id];
        delete this.postSolveCallbacks[entity.id];
    }
};

ContactProcessor.prototype.processBegin = function (contact) {
    if (!contact.GetFixtureA() || !contact.GetFixtureB())
        return;
    var entityA = contact.GetFixtureA().GetBody().GetUserData();
    var entityB = contact.GetFixtureB().GetBody().GetUserData();
    var callback = entityA ? this.beginCallbacks[entityA.id] : false;
    if (callback && entityA.physics)
        callback.call(entityA, contact, entityB, contact.GetFixtureB());
    callback = entityB ? this.beginCallbacks[entityB.id] : false;
    if (callback && entityB.physics)
        callback.call(entityB, contact, entityA, contact.GetFixtureA());
};

ContactProcessor.prototype.processEnd = function (contact) {
    var entityA = contact.GetFixtureA().GetBody().GetUserData();
    var entityB = contact.GetFixtureB().GetBody().GetUserData();
    var callback = entityA ? this.endCallbacks[entityA.id] : false;
    if (callback && entityA.physics)
        callback.call(entityA, contact, entityB, contact.GetFixtureB());
    callback = entityB ? this.endCallbacks[entityB.id] : false;
    if (callback && entityB.physics)
        callback.call(entityB, contact, entityA, contact.GetFixtureA());
};

ContactProcessor.prototype.processPreSolve = function(contact) {
    var entityA = contact.GetFixtureA().GetBody().GetUserData();
    var entityB = contact.GetFixtureB().GetBody().GetUserData();
    var callback = entityA ? this.preSolveCallbacks[entityA.id] : false;
    if (callback && entityA.physics)
        callback.call(entityA, contact, entityB, contact.GetFixtureB());
    callback = entityB ? this.preSolveCallbacks[entityB.id] : false;
    if (callback && entityB.physics)
        callback.call(entityB, contact, entityA, contact.GetFixtureA());
};

ContactProcessor.prototype.processPostSolve = function(contact) {
    var entityA = contact.GetFixtureA().GetBody().GetUserData();
    var entityB = contact.GetFixtureB().GetBody().GetUserData();
    var callback = entityA ? this.postSolveCallbacks[entityA.id] : false;
    if (callback && entityA.physics)
        callback.call(entityA, contact, entityB, contact.GetFixtureB());
    callback = entityB ? this.postSolveCallbacks[entityB.id] : false;
    if (callback && entityB.physics)
        callback.call(entityB, contact, entityA, contact.GetFixtureA());
};