/*
 *  Action is a object with member functions:
 *  init
 *  update
 *  terminate
 */


/**
 * @constructor
 */
function Action() {
};

// special abstract factory for actions
Action.factory = new AbstractFactory();

// constants
Action.SUCCESS = 1;
Action.INTERRUPTED = 2;
Action.FAIL = -1;
Action.IN_PROGRESS = 0;

Action.prototype.init = function(params) {
	this.id = this.className + uniqueId();
};

Action.prototype.update = function(dt) {
};

Action.prototype.terminate = function(status) {
	this.actor.terminateAction(this, status);
};