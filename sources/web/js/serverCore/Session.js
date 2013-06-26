
/* 
 * Session - authorization, account manager 
 */
var SESSION_LIFETIME = 30 * 60 * 1000;

function Session(){
	var propertyQueue = null;
};

Session.prototype.init = function(params){
	var that = this;
	this.userId = params["userId"];
	this.accountId = "default";
	var callback = params["callback"];
	var that = this;
	var rows = [];
	propertyQueue = [];
	that.authClient = params["authClient"];
//	console.log("that.authClient is defined on session init: ", !(!that.authClient));
	error_flag = true;
	console.log("Session init on userId: ", this.userId);
	error_flag = false;
	var et = Date.now(); 
	var query = that.authClient.query( "SELECT * FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ that.userId ] );
	query.on( "error", function(error){
		error_flag = true;
		console.log("Session INIT Error on Request to DB\n", error);
		error_flag = false;
	});
	
	query.on('row', function(row){
		rows.push(row);
	});
	
	query.on("end", function(result){
		error_flag = true;
		console.log("end of query on session init.");
		error_flag = false;
//		console.log("Auth account request time: ", Date.now() - et);
		if((result.rowCount == 0)&&(rows.length == 0)){
			error_flag = true;
			console.log("rowCount == 0 (New user).");
			error_flag = false;
			EntityManager.instance.getUniqueId(function(unique){
				that.accountId = unique;
				that.authClient.query("INSERT INTO " + sconf.users_accounts_table + "(userId, account) VALUES ($1, $2)", [ that.userId, that.accountId ] );
//				et = Date.now();
				EntityManager.instance.getAccountDefaultUpdate(that.accountId, null, function(defaultUpdate){4
					error_flag = true;
					console.log("Got default update.");
					error_flag = false;
					var num = defaultUpdate.count;
					defaultUpdate = defaultUpdate.update;
					var counter = 0;

					var nextPart = function(){
						var scores = defaultUpdate[that.accountId].scores;
						ScoreTable.instance.setDefaultScore(that.userId, scores, function(){
							Server.instance.extendEntities(defaultUpdate, that );
//							console.log("=======Extended entites=======");
//							console.log("Extention time: ", Date.now() - et);
//							et = Date.now();
							Server.instance.getEntity(that, that.accountId, function(account){

//								console.log("get Account entity time: ", Date.now() - et);
								Server.instance.addSession(that);
								account.userId = that.userId;
								account.userLogin = true;
								account.recActivity("SI");// for stat
//								console.log("Set userId to account on session init");
//								et = Date.now();
								Server.instance.restoreFromCache(account.id, that);
//								console.log("Restore from cache time: ", Date.now() - et);
								that.reportActivity();
								if(callback){
									callback();
								}
							}, false, true);
						});
					};

					for(var id in defaultUpdate){
						var entity = defaultUpdate[id];
						entity["id"] = id;
						EntityManager.instance.backupEntity(entity, function(){
							counter++;
							if(counter >= num){
								nextPart();
							}
						});
					}
				}); 

			});
			error_flag = false;
//			EntityManager.instance.backupAllEntities(Server.instance.entities, function(){

//			});
			return;
		}

		that.accountId = rows[0].account;
		error_flag = true;
		console.log("Found previous record.");
		error_flag = false;
////		that.account = new BasicAccount();
		et = Date.now();
		Server.instance.getEntity(that, that.accountId, function(account){
//			console.log("get Account entity time: ", Date.now() - et);
//			if(!account){
//			Server.instance.extendEntities(EntityManager.instance.getAccountDefaultUpdate(that.accountId), that );
//			EntityManager.instance.backupAllEntities(Server.instance.entities, function(){
//			Server.instance.getEntity(that, that.accountId, function(account){
//			Server.instance.addSession(that);
//			account.userId = that.userId;
//			console.log("Set userId to account on session init");
//			Server.instance.restoreFromCache(account.id, that);
//			that.reportActivity();
//			if(callback){
//			callback();
//			}
//			}, false, true);
//			});

//			}
			if(!account){
				error_flag = true;
				console.log("Record found but Account not FOUND!");
				error_flag = false;
				var query = that.authClient.query( "DELETE FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ that.userId ] );
				query.on( "error", function(error){
					error_flag = true;
					console.log("Session INIT Error on Request to DB\n", error);
					error_flag = false;
				});

				query.on("end", function(){
					that.init(params);
				});

				return;
			}
			Server.instance.addSession(that);
			account.userId = that.userId;
			account.userLogin = true;
			et = Date.now();
			Server.instance.restoreFromCache(account.id, that);
			that.reportActivity();
			error_flag = true;
			console.log("Restored from cache.");
			error_flag = false;
			if(callback){
				callback();
			}
		}, false, true);
	});
};

Session.prototype.setInitData = function(initData){
	if(!initData){
		return;
	}
	this.initData = initData;
	this.vk = vkApi(this.initData.access_token);
};

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
//					console.log("Entity: %s; wrote update", entity.id);
					addByParent(globalData, entity.id);
				}
			}
		};
//		console.log("entities on server: \n", entities, '\n\n\n');
//		console.log(entities[this.accountId] instanceof Entity);
//		Server.instance.logEntities("on init update");
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
//		console.log("Data on init: ", data);
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

Session.prototype.pushData = function(data){
	propertyQueue.push(data);
};

Session.receiveData = function(data){
	
};


Session.prototype.popChanges = function(){
	var data = {};
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
//	console.log("Killing session (", session.userId, ")");
	Server.instance.getEntity(null, session.accountId, function(account){
		account.recActivity("SD");// for stat
	});
	Server.instance.removeEntity(session.accountId, true);
	
//	Server.instance.logEntities("After session destroy");
//	Server.instance.logCache("After session destroy");
	//session.suicide();
};
