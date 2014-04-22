

function OrderManagerTemplate(valid, notValid){
	
};

OrderManagerTemplate.prototype.init = function(params){
	this.cbQueue = [];
	this.isValid = params["valid"];
	this.notValid = params["invalid"];
};

OrderManagerTemplate.prototype.addApiCallback = function(func){
	this.cbQueue.push(func);
};

OrderManagerTemplate.prototype.setOrderManager = function(manager){
	this.orderManager = manager;
	this.orderManager.template = this;
};

