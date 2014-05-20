/**
 *  Making actor purr when it's being stroked    
 */

/**
 * @constructor
 */
function ActionPurr() {
	ActionPurr.parent.constructor.call(this);
};

ActionPurr.inheritsFrom(Action);
ActionPurr.prototype.className = "ActionPurr";

ActionPurr.prototype.createInstance = function(params) {
	var action = new ActionPurr();
	action.init(params);
	return action;
};

Action.factory.addClass(ActionPurr);

ActionPurr.prototype.init = function(params) {
	this.time = 0;
	ActionPurr.parent.init.call(this, params);
	this.actor = params['actor'];
	this.actor.getVisual().setCurrentAnimation("purr");
};

ActionPurr.prototype.update = function(dt) {
	console.log("action update " + this.time);
	this.time += dt;
	if (this.time >= 2000){
		this.actor.getVisual().setCurrentAnimation("idle");
		this.terminate(Action.SUCCESS);
	}
};

ActionPurr.prototype.refresh = function(params) {
	
};