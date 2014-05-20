/**
 * Inventory
 */

/**
 * @constructor
 */
function Inventory() {
	Inventory.parent.constructor.call(this);
};

Inventory.inheritsFrom(Entity);

Inventory.prototype.className = "Inventory";
Inventory.prototype.createInstance = function(params) {
	var entity = new Inventory();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Inventory);

Inventory.prototype.init = function(params) {
	this.children = new Array();
	Inventory.parent.init.call(this, params);
	// this.add();
};
Inventory.prototype.clear = function() {
	this.params.itemList = null;
};
Inventory.prototype.addItem = function(item) {
	if (item instanceof Item) {
		Account.instance.commandToServer("changeParent", [ item['id'],this.id ],
				function(success) {
					if (success) {
						console.log("SUCCESS");
						console.log("ItemADDED");
					} else {
						console.log("FAIL");
					}
				});
	} 
};

Inventory.prototype.readUpdate = function(params) {
	Inventory.parent.readUpdate.call(this, params);
};
Inventory.prototype.writeUpdate = function(globalData, entityData) {
	Inventory.parent.writeUpdate.call(this, globalData, entityData);
};
