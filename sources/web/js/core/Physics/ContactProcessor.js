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
ContactProcessor.prototype.addPair = function(type1, type2, event, action) {
	if (type1 in this.pairs) {
		if (this.pairs[type1][type2])
			this.pairs[type1][type2][event] = action;
		else {
			this.pairs[type1][type2] = {};
			this.pairs[type1][type2][event] = action;
		}
	} else if (type2 in this.pairs) {
		if (this.pairs[type2][type1])
			this.pairs[type2][type1][event] = action;
		else {
			this.pairs[type2][type1] = {};
			this.pairs[type2][type1][event] = action;
		}
	} else {
		this.pairs[type1] = {};
		this.pairs[type1][type2] = {};
		this.pairs[type1][type2][event] = action;
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
ContactProcessor.prototype.processBegin = function(type1, type2, contact) {
	if ((type1 in this.pairs)&&(type2 in this.pairs[type1])&&(this.pairs[type1][type2])["beginContact"])
		this.pairs[type1][type2]["beginContact"](contact); else
	if ((type2 in this.pairs)&&(type1 in this.pairs[type2])&&(this.pairs[type2][type1])["beginContact"])
		this.pairs[type2][type1]["beginContact"](contact); else
			this.defaultBegin(contact);
};

//
//	Predefined EndContact processor
//
ContactProcessor.prototype.processEnd = function(type1, type2, contact) {
	if ((type1 in this.pairs)&&(type2 in this.pairs[type1])&&(this.pairs[type1][type2]["endContact"]))
		this.pairs[type1][type2]["endContact"](contact); else
	if ((type2 in this.pairs)&&(type1 in this.pairs[type2])&&(this.pairs[type2][type1]["endContact"]))
		this.pairs[type2][type1]["endContact"](contact); else
			this.defaultEnd(contact);
};