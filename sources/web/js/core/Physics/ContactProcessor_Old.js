/**
 * Contact Processor - part of the Physics singleton to
 * handle and process cantact events
 */

function ContactProcessor() {
	this.pairs = {};
	this.defaultBegin = function() {};
	this.defaultEnd = function() {};
};

//
//	Adds pair to contact events dataset 
//
ContactProcessor.prototype.addPair = function(materialA, materialB, event, action) {
	var that = this;
	/// New contact listener version
    if (!Physics.getContactListener())
	{
    	var contactListener = Physics.getContactListener();
    	contactListener = new Box2D.Dynamics.b2ContactListener;

	    contactListener.BeginContact = function(contact) {
	    	if (that) {
				var materialA = contact.GetFixtureA().GetBody().GetUserData().material;
				var materialB = contact.GetFixtureB().GetBody().GetUserData().material;
				that.processBegin(materialA, materialB, contact);	
	    	}
	    };
	    contactListener.EndContact = function(contact) {
	    	if (that) {
				var materialA = contact.GetFixtureA().GetBody().GetUserData().material;
				var materialB = contact.GetFixtureB().GetBody().GetUserData().material;
				that.processEnd(materialA, materialB, contact);	
	    	}
			
	    };
//	    contactListener.PreSolve = function(contact, impulse) {
//	    	
//	    };
//	    contactListener.PostSolve = function(contact, oldManifold) {
//	    	
//	    };
	    var world = Physics.getWorld();
	    world.SetContactListener(contactListener);
	}
	
	
	if (materialA in this.pairs) {
		if (this.pairs[materialA][materialB])
			this.pairs[materialA][materialB][event] = action;
		else {
			this.pairs[materialA][materialB] = {};
			this.pairs[materialA][materialB][event] = action;
		}
	} else if (materialB in this.pairs) {
		if (this.pairs[materialB][materialA])
			this.pairs[materialB][materialA][event] = action;
		else {
			this.pairs[materialB][materialA] = {};
			this.pairs[materialB][materialA][event] = action;
		}
	} else {
		this.pairs[materialA] = {};
		this.pairs[materialA][materialB] = {};
		this.pairs[materialA][materialB][event] = action;
	}
};

ContactProcessor.prototype.setDefaultBeginContact = function(begin) {
	this.defaultBegin = begin;
};

ContactProcessor.prototype.setDefaultEndContact = function(end) {
	this.defaultEnd = end;
};

//
//	Predefined BeginContact processor
//
ContactProcessor.prototype.processBegin = function(materialA, materialB, contact) {
	if ((materialA in this.pairs)&&(materialB in this.pairs[materialA])&&(this.pairs[materialA][materialB])["beginContact"])
		this.pairs[materialA][materialB]["beginContact"](contact); else
	if ((materialB in this.pairs)&&(materialA in this.pairs[materialB])&&(this.pairs[materialB][materialA])["beginContact"])
		this.pairs[materialB][materialA]["beginContact"](contact); else
			this.defaultBegin(contact);
};

//
//	Predefined EndContact processor
//
ContactProcessor.prototype.processEnd = function(materialA, materialB, contact) {
	if ((materialA in this.pairs)&&(materialB in this.pairs[materialA])&&(this.pairs[materialA][materialB]["endContact"]))
		this.pairs[materialA][materialB]["endContact"](contact); else
	if ((materialB in this.pairs)&&(materialA in this.pairs[materialB])&&(this.pairs[materialB][materialA]["endContact"]))
		this.pairs[materialB][materialA]["endContact"](contact); else
			this.defaultEnd(contact);
};