
/* 
 * Session - authorization, account manager 
 */
var SESSION_LIFETIME = 15 * 60 * 1000;

function Session(){
	var propertyQueue = null;
};

Session.prototype.init = function(params){
	var that = this;
	this.userId = params["userId"];
	this.accountId = "default";
	this.session_key = params["session_key"]
	this.session_secret_key = params["session_secret_key"];
	var callback = params["callback"];
	var that = this;
	var rows = [];
	propertyQueue = [];
	
	that.authClient = params["authClient"];
	error_flag = true;
//	console.err_log("Session init call with userId=%s.", this.userId);
	EntityManager.instance.getAccountIdByUserId(that.userId, function(accId){
//		console.log("got Account ID", accId);
		if(!accId){
//			console.log("No AccId found. New User!");
			
			EntityManager.instance.getUniqueId(function(unique){
				that.accountId = unique;
//				console.log("accountId=%s, userId=%s", that.accountId, that.userId);
				that.authClient.query("INSERT INTO " + sconf.users_accounts_table + "(userId, account) VALUES ($1, $2)", [ that.userId, that.accountId ] );
//				et = Date.now();
				EntityManager.instance.getAccountDefaultUpdate(that.accountId, null, function(defaultUpdate){
					console.err_log("Got default update.", defaultUpdate);
					var num = defaultUpdate.count;
					defaultUpdate = defaultUpdate.update;
					
					EntityManager.instance.backupAllEntities(defaultUpdate, function(){
//						console.err_log("Got default update.", defaultUpdate);
						var counter = 0;

//						var nextPart = function(){
//							console.log("accountId: ", that.accountId);
//							var scores = defaultUpdate[that.accountId].scores;     // частный случай для шариков!!!!!
//							console.log("SCORES OF DEFAULT:", scores);
//							ScoreTable.instance.setDefaultScore(that.userId, scores, function(){ // частный случай для шариков!!!!!
								Server.instance.extendEntities(defaultUpdate, that );
//								console.log("=======Extended entites=======");
//								console.log("Extention time: ", Date.now() - et);
//								et = Date.now();
								
								
								Server.instance.logCache();
								Server.instance.logEntities();
								
								console.log("that.accountId", that.accountId);
								Server.instance.getEntity(that, that.accountId, function(account){
									account.setAlive(true);
									
									console.log("Account id: ", account.id);
//									account.recActivity("login_time=" + Date.now());
//									console.log("get Account entity time: ", Date.now() - et);
									Server.instance.addSession(that);
									
									account.userId = that.userId;
									account.userLogin = true;
//									account.recActivity("SI");// for stat
//									console.log("Set userId to account on session init");
//									et = Date.now();
									
									Server.instance.restoreFromCache(account.id, that);
//									console.log("Restore from cache time: ", Date.now() - et);
									that.reportActivity();
//									console.err_trace("End of new User's session init trace.");
									if(callback){
										callback();
									}
								}, false, true);
//							});
					}); 

				});
					});
//					
//			EntityManager.instance.backupAllEntities(Server.instance.entities, function(){

//			});
			return;
		}
		that.accountId = accId;
		console.log("Found previous record with accId=%s.", accId);
		Server.instance.getEntity(that, that.accountId, function(account){
			
			if(!account){
				console.err_log("Record found but Account not FOUND!", that.userId);
				
				var query = that.authClient.query( "DELETE FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ that.userId ] );
				query.on( "error", function(error){
					console.err_log("Session INIT Error on Request to DB\n", error);
				});

				query.on("end", function(){
					console.err_log("Deleted Wrong record. Initing again.");
					that.init(params);
				});

				return;
			}
			account.setAlive(true);
			Server.instance.addSession(that);
			account.userId = that.userId;
			account.userLogin = true;
			account.recActivity("login_time=" + Date.now());
			Server.instance.restoreFromCache(account.id, that);
			that.reportActivity();
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
		//console.log("Data on init: ", data);
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

Session.prototype.destroy = function(callback){
	var session = this;
	Server.instance.removeSession(session.userId);
//	console.log("Killing session (", session.userId, ")");
	Server.instance.getEntity(null, session.accountId, function(account){
		account.setAlive(false);
		if (account.userLogin) {
			account.recActivity("logout_time="+Date.now());
			
			delete account.userLogin;
		}
		StatCollector.instance.addRecord(account, function(){
			console.log("killed account. Added record to stat table");
			Server.instance.removeEntity(session.accountId, true);
			if(callback){
				callback();
			}
		});
		
	});

	
//	Server.instance.logEntities("After session destroy");
//	Server.instance.logCache("After session destroy");
	//session.suicide();
};

Session.prototype.reportState = function(collector){
	
	if(collector instanceof Array){
		var info = JSON.stringify(this, function(key, value){
			console.err_log("key == ", key );
			if((key == "timeoutId" )||(key == "authClient") ){
				return "";  
			}else{
				return value;
			}
		});
		collector.push(info + "\n");
	}else{
		console.log("Wrong collector.");
	}
};
