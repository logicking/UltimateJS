/*
 *  Moving actor to target position with predefined velocity
 */

/**
 * @constructor
 */

var KITTY_RUN_DIST = 500;
var ACTION_MOVE_PRECISION = 3;

function ActionMove() {
	ActionMove.parent.constructor.call(this);
};

ActionMove.inheritsFrom(Action);
ActionMove.prototype.className = "ActionMove";

ActionMove.prototype.createInstance = function(params) {
	var action = new ActionMove();
	action.init(params);
	return action;
};

Action.factory.addClass(ActionMove);

ActionMove.prototype.init = function(params) {
	ActionMove.parent.init.call(this, params);
	this.type = "move";
	this.actor = params['actor'];
	this.target = params.target;
	this.velocity = params.velocity;
	this.dir = {x : 0, y : 0};
	this.dir.x = ((this.target.x > this.actor.x) > 0) ? 1 : -1;
	
	this.actor.getVisual().flip(this.dir.x > 0);
	
	if(Math.abs(this.target.x - this.actor.x) < KITTY_RUN_DIST){
		this.actor.getVisual().setCurrentAnimation("walk");
	}else{
		this.actor.getVisual().setCurrentAnimation("run");
		this.velocity.x *= 2;
	}

};

ActionMove.prototype.update = function(dt) {
	//console.log("action update " + this.id);
	
	var delta = Math.abs(this.actor.x + this.actor.width / 2 - this.target.x);// + this.actor.width/2 - this.target.x);// * this.dir.x;
	if(delta > 5) {
		this.actor.move(this.dir.x * this.velocity.x, 0);
	} else {
		//this.actor.setPosition(this.target.x, this.actor.y);
		this.actor.getVisual().setCurrentAnimation("idle");
		this.terminate(Action.SUCCESS);
	}
};

ActionMove.prototype.refresh = function(params) {
	console.log("Action Move REFRESH");
	this.target = params.target;
	this.dir = {x : 0, y : 0};
	this.dir.x = ((this.target.x > this.actor.x) > 0) ? 1 : -1;
	if(this.dir.x > 0){
		this.actor.getVisual().flip(true);
	}else{
		this.actor.getVisual().flip(false);
	}
	if(Math.abs(this.target.x - this.actor.x) > 500){
		if(this.run == false){
			this.velocity.x *= 2;
			this.actor.getVisual().setCurrentAnimation("run");
		}
			this.run = true;
	}else{
		if(this.run == true){
			this.actor.getVisual().setCurrentAnimation("walk");
			this.velocity.x /= 2;
		}
		this.run = false;
	}
};

ActionMove.prototype.stop = function(result){
	this.actor.getVisual().setCurrentAnimation("idle");
	this.terminate(result);	
}