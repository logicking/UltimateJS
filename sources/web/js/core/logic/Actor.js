/**
 * Actor - is VisualEntity that can act on its own.
 * Actor can be described by:
 * - current state (number of parameters)
 * - set of actuators (effectors)
 * 
 * Actions can be assigned on one or several actuators. Actor manages that more prioritized
 * actions get access to actuators while terminating current actions if they executing.  
 * 
 * ActionAlternative - select and execute child action based on external evaluator.
 * ActionQueue - executes actions one by one
 * ActionUseItem = ActionQueue(ActionMove(itemPos), ActionAnimateUsage(item));
 * ActionRoot = ActionAlternative({ActionMove, hasMovePoint}, {ActionUseItem, hasItemToUse}, {ActionIdle, nothingToDo})
 * hasMovePoint, hasItemToUse, nothingToDo - function, evaluated priority of the action
 */

/**
 * @constructor
 */
function Actor() {
	Actor.parent.constructor.call(this);
};

Actor.inheritsFrom(VisualEntity);
Actor.prototype.className = "Actor";

Actor.prototype.createInstance = function(params) {
	var entity = new Actor();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Actor);

Actor.prototype.init = function(params) {
	Actor.parent.init.call(this, params);
};

Actor.prototype.createVisual = function() {
	var params = this.params;
	var visual = guiFactory.createObject("GuiSkeleton", {
		parent : this.guiParent,
		style : "sprite",
		x : params['x'],
		y : params['y'],
		width : params['width'],
		height : params['height']
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	this.addVisual(null, visualInfo);
};

Actor.prototype.update = function(dt) {
	if(this.rootAction) {
		this.rootAction.update(dt);
	}
};


Actor.prototype.setAction = function(actionName,  params) {
	params.actor = this;
	
	//if(action) {
		if(this.rootAction) {
			if(this.rootAction.className == actionName){
				this.rootAction.refresh(params);
			}else{
				this.rootAction.terminate(Action.INTERRUPTED);
				this.rootAction = action;
			}
		}else{
			var action = Action.factory.createObject(actionName, params);
			this.rootAction = action;
		}
	//}
	
};

Actor.prototype.terminateAction = function(action, status) {
	this.rootAction = null;
	//Account.instance.removeEntity(action.id);
}