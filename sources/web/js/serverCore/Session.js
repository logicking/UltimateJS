
/* 
 * Session - authorization, account manager 
 */
var SESSION_LIFETIME = 5*60*1000;

function Session(){
	var propertyQueue = null;
};

Session.prototype.init = function(params){
	this.userId = params["userId"];
	this.setInitData(params["initData"]);
	this.accountId = "default";
	var callback = params["callback"];
	var that = this;
	var rows = [];
	propertyQueue = [];
	console.log("Session init on userId: ", this.userId);
	var query = authClient.query( "SELECT * FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ this.userId ] );
	query.on( "error", function(error){
		console.log("Session INIT Error on Request FROM DB\n", error);
	});
	
	query.on('row', function(row){
		rows.push(row);
	});
	
	query.on("end", function(result){
		if(result.rowCount == 0){
			that.accountId = uniqueId().toString();
//			account = new BasicAccount();
//			account.init( { "id" : that.accountId } );
//			console.log("Initialized Account: ", that.account );
			authClient.query("INSERT INTO " + sconf.users_accounts_table + "(userId, account) VALUES ($1, $2)", [ that.userId, that.accountId ] );
			Server.instance.extendEntities(EntityManager.instance.getAccountDefaultUpdate(that.accountId), that );
//			EntityManager.instance.createSessionRecord(that);
			EntityManager.instance.backupAllEntities(Server.instance.entities, function(){
//				Server.instance.addAccount(account);
				Server.instance.addSession(that);
				that.reportActivity();
				if(callback){
					callback();
				}
			});
			return;
		}
		console.log("Account ID: ", that.accountId);
		that.accountId = rows[0].account;
////		that.account = new BasicAccount();
		Server.instance.getEntity(that, that.accountId, function(account){
			Server.instance.addSession(that);
			that.reportActivity();
			if(callback){
				callback();
			}
		}, false, true);
		
//		EntityManager.instance.getEntity(that.accountId, function(entity){ 
////			console.log(that.account);
//			that.accountId = entity.id;
//			Server.instance.addEntityInstance(entity);
//			EntityManager.instance.collectByParent(entity.id, function(data){
//				Server.instance.extendEntities(data, that);
////				console.log("Loaded Account: ", that.account );
////				console.log("Server entities loaded: ", Server.instance.entities);
////				Server.instance.addAccount(that.account);
//				
//				
//			});
//		});
	});
};

Session.prototype.setInitData = function(initData){
	if(!initData){
		return;
	}
	this.initData = initData;
	this.vk = vkApi(this.initData.access_token);
}

Session.prototype.sendData = function(initUpdate){
	var entities = Server.instance.entities;
	var data =  this.popChanges();
	var entity;
	if(initUpdate){
		//preparation for sending entities info on server to client
		var addByParent = function(globalData, parentId) {
			if(!parentId){
				return;
			}
			for(var id in entities){
				entity = entities[id];
//				console.log("Entity.id: %s; parentId: %s", entity.id, parentId);
				if ( ((entity.parent instanceof Entity) ? (entity.parent.id==parentId) : (entity.parent == parentId)) ) {
					entity.writeUpdate(globalData, {});
					console.log("Entity: %s; wrote update", entity.id);
					addByParent(globalData, entity.id);
				}
			}
		};
//		console.log("entities on server: \n", entities, '\n\n\n');
//		console.log(entities[this.accountId] instanceof Entity);
		entities[this.accountId].writeUpdate(data, {});
		addByParent(data, this.accountId);
		
		for(var id in entities){
			entity = entities[id];
			if ( (entity['parent'] === null)&(entity["destroy"]) ) {
				console.log((entity['parent'] === null)&(entity["destroy"]));
				console.log("Adding destroy to sendData on entity: ", entity);
				entity.writeUpdate(data, {"destroy": true});
				delete entity["destroy"];
			}
		}
		console.log("Data on init: ", data);
		//this.updateAccount(data);
	}else{
		data = this.popChanges();
	}
//	console.log("sendData data: ", data);
	return data;
};

Session.prototype.updateAccount = function(data){
	this.account.readGlobalUpdate(data);
	return this.account;
};


Session.prototype.pushProperty = function(id, name, value){
	var prop = {}, data = {};
	prop[name] = value;
	data[id] = prop;
//	console.log("Changed: ", data);
	propertyQueue.push(data);
};

Session.receiveData = function(data){
	
};


Session.prototype.popChanges = function(){
	var data = {};
	var entity;
	while(propertyQueue.length > 0){
		var prop = propertyQueue.shift();
		extend(data, prop);
	}
	return data;
};

Session.prototype.getPropertyQueue = function(){
	return propertyQueue;
};

Session.prototype.reportActivity = function(){
	this.lastActivity = Date.now();
	global.clearTimeout(this.timeoutId);
	var that = this;
	that.timeoutId = global.setTimeout(	function(){
		that.destroy();
	}, SESSION_LIFETIME);
};

Session.prototype.destroy = function(){
	var session = this;
	Server.instance.removeSession(session.userId);
	console.log("Killing session (", session.userId, ")");
	Server.instance.removeEntity(session.accountId, true);
	Server.instance.logEntities("After session destroy");
	Server.instance.logCache("After session destroy");
	//session.suicide();
};
