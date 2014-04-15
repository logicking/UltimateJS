//Orders handler

function OrderManager(){

};

OrderManager.prototype.init = function(params){
	this.params = params;
//	this.desc = require(params["itemDescription"]);
	this.client = params["client"];
	this.handlers = {};
	this.apiQueue = [];
//	var _self = this;

//	OrderManager.instance = this;
};

OrderManager.prototype.getApiCallback = function(){
	var that = this;
	return function(req, res){
//		console.log("Order manager callback");
		var json = req.body;
		if( JSON.stringify(json) == "{}"){
			json = url.parse(req.url, true).query;
		}
//		console.log("body: ", req.body);
//		console.log("json: ", json);
		if(!that.isValid(json)){
			if(that.notValid){
				that.notValid(json, res);	
			}
			return;
		};
		var apiWalker = function(index){
			return function(){
				process.nextTick(function(){
					if(index < that.apiQueue.length){
						that.apiQueue[index](json, res, apiWalker(index+1));
					}
				});
			};
			
		};
		apiWalker(0)();
	};
};

OrderManager.prototype.onApiCallback = function(req, res){
	var that = OrderManager.instance;
	var json = req.body;
	if(!that.isValid(json)){
		if(that.notValid){
			that.notValid(json, res);	
		}
		return;
	};
	var apiWalker = function(index){
		return function(){
			process.nextTick(function(){
				if(index < that.apiQueue.length){
					that.apiQueue[index](json, res, apiWalker(index+1));
				}
			});
		};
		
	};
	apiWalker(0)();
};

OrderManager.prototype.setTemplate = function(template){
	this.isValid = template.isValid;
	this.notValid = template.notValid;
	this.apiQueue = [];
	this.apiQueue = this.apiQueue.concat(template.cbQueue);
	template.setOrderManager(this);
};




OrderManager.prototype.addApiCallback = function(func){
	this.apiQueue.push(func);
};

OrderManager.prototype.setValidCheckFunction = function(func, errorFunc){
	this.isValid = func;
	this.notValid = errorFunc;
};

OrderManager.prototype.newOrder = function(id, status, callback){
	var query = this.client.query("INSERT INTO " + sconf.ordersTable +  " (id, data) VALUES ($1, $2)", [id, JSON.stringify(status)]);
	query.on("end", function(result){
		if(callback){
//			console.log("New order record created.", status);
			callback(status);
		}
	});
};

OrderManager.prototype.getStatus = function(id, data, callback){
	var that = this;
	var status = null;
	
	var query = this.client.query("SELECT * FROM " + sconf.ordersTable +  " WHERE id = $1", [id]);
	
	query.on("row", function(row){
		status = row;
	});
	
	query.on("end", function(result){
		if(result.rowCount > 1){
			console.log("Multiple orders with equal ids");
		}
		if(result.rowCount == 1){
//			console.log("Got order(%s) status: ", status["id"], status);
			if(callback){
				// status == {id:--, data:--}
				callback(JSON.parse(status["data"]));
			}
			return;
		}
		if(result.rowCount == 0){
			if(callback){
				callback(null);
			}
		}
	});
};

OrderManager.prototype.statusChange = function(id, status, callback){
	//apply handlers
	
	var that = this;
	
	var query = this.client.query("UPDATE " + sconf.ordersTable +  " SET data = $1 WHERE id = $2", [JSON.stringify(status), id]);
	query.on("end", function(result){
		if(callback){
			callback(status);
		}
	});
};


OrderManager.prototype.addHandler = function(item_id, handler){
	if(this.handlers[item_id]){
		this.handlers[item_id].push(handler);
	}else{
		this.handlers[item_id] = [handler];
	}
};