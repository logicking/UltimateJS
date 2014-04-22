/*
 * Defines main class: owner of Sessions, Accounts, allEntities, scheduler
 */

var CACHE_LIFETIME = 15 * 60 * 1000;

function Server() {
	var fileServer = null;
	this.client = null;
	var Accounts = null;
	var Sessions = null;
	var commands = null;
	// this.getSessions = function(){
	// return Sessions;
	// };
};

// sconf - конфиг сервера
// callback - async callback func
// droptable - start with clean DB (for test)
Server.prototype.init = function(sconf, callback, droptable) {
	var that = this;
	this.config = sconf;
	this.authCallbacks = [];
	try {// for test
		if (Sessions) {
			for ( var id in Sessions) {
				var session = Sessions[id];
				global.clearTimeout(session.timeoutId);
			}
		}
	} catch (e) {
	} finally {// for test

		if (this.cache) {
			for ( var id in this.cache) {
				var cached = this.cache[id];
				global.clearTimeout(cached.timeoutId);
			}
			if (this.entities) {
				for ( var id in this.entities) {
					this.entities[id].clearTimeouts();
				}
			}

		}
		
		// for connetion to DB (tutorial https://github.com/brianc/node-postgres)
		var conString = "tcp://" + sconf.username + ":" + sconf.userpasswd + "@" + sconf.dburl + "/" + sconf.dbname;

		
		Accounts = {};
		Sessions = {};
		
		this.entities = {};
		this.cache = {};
		commands = {};
		Server.instance = this;

		
		this.disableAuth = false;

		
		this.switchConditions = [];
		this.addCommand("switchState", function(args, session, callback) {
			// var et = Date.now();
			if(session.switchingState){
				console.log("Already called switchstate for user ", session.userId);
				console.log("SwitchState called with args: ", args);
				if(callback){
					callback({error_code: 678, error:"Already called switchstate"});
				}
				return;
			}
			// switchingState - flag, to disable switching state more than once 
			session.switchingState = true;
			var newCallback = function(){
				session.switchingState = false;
				return callback.apply(this, arguments);
			}
			// args[0] - id of current state, args[1] - new state's id
			// State - is an entity itself
			var curState = Server.instance.getEntity(session, args[0], null, true);
			if (!session) {
				console.err_log("No session on server.");
				newCallback({
					error : "No such session on server"
				});
				return;
			}
			if (!curState) {
				console.err_log("No Current state on server with id: %d", args[0]);
				console.err_log("SwitchState args: ", args);
				newCallback({
					error : "No such state on server"
				});
				return;
			}
			var parentId = getParentId(curState);
			console.log("CurrentState(id=%s) has parent with id=%s", curState.id, parentId);
			if (!parentId) {
				console.err_log("CurrentState(id=%s) has parent with id=%s", curState.id, parentId);
				console.err_log("Current state params: ", curState.params);
				
				newCallback({
					error : "Current state has no parent"
				});
				return;
			}
			
			Server.instance.getEntity(null, session.accountId, function(account) {
				if (args[0] == account.initialState) {
					account.recActivity("LE");
				}
				Server.instance.getEntity(session, args[1], function(entity) {

					var errorToSend = null;
					var walker = function(i, newCallback){
						if(i >= that.switchConditions.length){
							if(errorToSend){
								newCallback(errorToSend);	
							}else{
								newCallback();
							}
							return;
						}
						that.switchConditions[i](curState, entity, account, function(error){
							if(error){
								errorToSend = error;
								walker(that.switchConditions.length, newCallback);
								return;
							}
							walker(i+1, newCallback);
						});
						
					};
					
					walker(0, function(error){
						if(error){
							newCallback({error: error});
							return;
						}
						curState.setParent(null);
						entity.setParent(parentId);
						var changes = session.popChanges();
						newCallback(changes);
					});

					
				}, false, true);
			});
		});
	}
	
	
//	На случай если нет БД
//	if (callback) {
//		callback();
//	}
//	return;
	
	// that.client - клиент БД
	if (!that.client) {
		that.client = new pg.Client(conString);
		
		that.client.connect(function(){
			
			
			(new EntityManager()).init({
				entityClient : that.client
			});

			// тестовая очистка БД по droptable
			if ((!sconf.deploy) && droptable) {
				console.log("Deleting data from DB... ");
				var entity_table_delquery = that.client.query('DELETE FROM ' + that.config.entity_table + " WHERE id <> '-1'");
				entity_table_delquery.on("end", function() {
					var users_accounts_delquery = that.client.query('DELETE FROM ' + that.config.users_accounts_table);
					users_accounts_delquery.on("end", function() {
//						var scores_delquery = that.client.query('DELETE FROM ' + that.config.score_table);
//						scores_delquery.on("end", function() {
							console.log("Deleted data from DB. ");
							if (callback) {
								callback();
							}
//						});

					});
				});
			} else {
				if (callback) {
					callback();
				}
			}
		});
	}
};

Server.prototype.addSwitchStateCondition = function(func){
	this.switchConditions.push(func);
};

Server.prototype.initPgClient = function() {
	var conString = "tcp://" + sconf.username + ":" + sconf.userpasswd + "@" + sconf.dburl + "/" + sconf.dbname;

	if (!this.client) {
		this.client = new pg.Client(conString);
		this.client.connect();
	} else {
		this.client.end();
		this.client = new pg.Client(conString);
		this.client.connect();
	}
	return this.client;
};

// passed func should take 3 args - args array, session, callback(see below)
Server.prototype.addCommand = function(name, func) {
	commands[name] = func;
};

Server.prototype.getSessions = function() {
	return Sessions;
};

// callback receives only 1 arg - result of command execution
// and is defined in onCommand() function
Server.prototype.executeCommand = function(name, args, session, callback) {

	var command = commands[name];
	if (command) {

		// commented due to domain introduction.
		// try{
		command(args, session, callback);
		// } catch (err) {
		// var userId = null;
		// if(session){
		// if(session.userId){
		// userId = session.userId;
		// // Server.instance.collectUserData(session.userId, function(info){
		// console.err_log("Error on command execution: ", name);
		// console.err_log("Error: ", err, "\n");
		// console.err_log(err.stack);
		// // console.err_log("Collected User(%s) Data on error:\n",
		// session.userId, info);
		// callback({
		// error : err,
		// stack : err.stack
		// });
		// // });
		// }
		// return;
		// }else{
		// console.err_log("No session passed as argument to command handler.");
		// }
		// console.err_log("Error on command execution: ", name);
		// console.err_log("Error: ", err, "\n");
		// console.err_log(err.stack);
		// callback({
		// error : err,
		// stack : err.stack
		// });
		// }
		// return;
	} else {
		console.err_log("Unknow command: ", name);
	}
};

Server.prototype.addSession = function(session) {
	Sessions[session.userId] = session;
};

Server.prototype.getAccountByUserId = function(session, userId, callback) {
	var that = Server.instance;
	var rows = [];
	var query = that.client.query("SELECT * FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ userId ]);
	query.on("error", function(error) {
		error_flag = true;
		console.log("Get Account By User Id error\n", error);
		error_flag = false;
	});

	query.on('row', function(row) {
		rows.push(row);
	});

	query.on("end", function(result) {
		if ((result.rowCount == 0) || (rows.length == 0)) {
			callback(null);
			return;
		}
		Server.instance.getEntity(session, rows[0].account, function(account) {
			callback(account);
		}, false, false);
	});
};

Server.prototype.removeSession = function(session) {
	if (session instanceof Session) {
		delete Sessions[session.userId];
		return;
	}
	if (typeof session == "string") {
		delete Sessions[session];
	}
	// console.log("Sessions: ", Sessions);
};

Server.prototype.getSession = function(userId) {
	var session;
	if (!(session = Sessions[userId])) {
		return null;
	}
	session.reportActivity();
	return session;
};

Server.prototype.createEntity = function(id, session, callback) {
	EntityManager.instance.getEntity(id, function(entity) {
		Server.instance.addEntityInstance(entity, session);
		if (callback) {
			callback(entity);
		}
	});
};

Server.prototype.killCached = function(id, callback) {
	console.log("Starting to kill entity(id=%s)", id);
	var entity;
	if (!(entity = Server.instance.cache[id])) {
		return;
	}
	EntityManager.instance.backupEntity(entity, function() {
		if (entity.children) {
			var walker = function(list, index, callback) {
				console.log("Walker called with index: %s, list.length=%s", index, list.length);
				if (list.length <= index) {
					console.log("Walker finished. Calling callback.");
					if(callback){
						callback();
					}
					return;
				}
//				console.log("Killing cached with id: ", list[index].id);
				Server.instance.killCached(list[index].id, function(){
//					console.log("Killed cached: ", list[index].id);
					walker(list, index+1, callback);
				});
			};
			walker(entity.children, 0, function(){
				console.log("Called main callback. Exiting killCached.");
				delete Server.instance.cache[id];
				entity.destroy(false);
				if(callback){
					callback();
				}
			});
//			for ( var i = 0; i < entity.children.length; i++) {
//				Server.instance.killCached(entity.children[i].id);
//			}
		}else{
			console.log("Called main callback. Exiting killCached.");
			delete Server.instance.cache[id];
			entity.destroy(false);
			if(callback){
				callback();
			}
			
		}
		
	});
};

// adds single entity(without children)
Server.prototype.addToCache = function(entity) {
	var cache = Server.instance.cache, id = entity.id;
	entity.log(" adding to cache.");
	// entity.logChildren("on addToCache");1
	// case of overwriting(there is an old instance of entity in cache)
	if (cache[id])
		if (cache[id] != entity) {// case when we update existing cache(in
			// ideal world this never happens)
			console.log("Entity has equal ids on addToCache");
			if (cache[id].timeoutId) {
				global.clearTimeout(cache[id].timeoutId);
			}
			Server.instance.killCached(id);
		} else {
			console.log("Already have entity(id=%s) in server cache", id);
			return;
		}
	cache[id] = entity;
	entity.listeners = []; // adding to cache means "destroy" to client so
	// there is nothing to notify
	var parentId = getParentId(entity);

	// resets timeout to the top of the tree if entity was added to cache
	// after its parent was added
	Server.instance.resetCacheTimeout(entity);

	if (parentId && this.isInEntities(parentId)) {
		this.entities[parentId].removeChild(entity);
	}
	if(!parentId || !this.isInCache(parentId)){
//		console.log("PrimeCache========================: ", id);
		entity.primeCache = true;
	}
	if (this.entities[id] == entity) {
		delete this.entities[id];
	}

	// adding children to cache
	if (entity.children) {
		for ( var i = 0; i < entity.children.length; i++) {
			Server.instance.addToCache(entity.children[i]);
		}
	}
};

Server.prototype.resetCacheTimeout = function(entity) {

	var resetTimeout = function(entity) {
		if (entity.timeoutId) {
			global.clearTimeout(entity.timeoutId);
		}
		// console.log("Resetting timeout for entity with id=%s", entity.id);
		entity.timeoutId = global.setTimeout(function() {

			Server.instance.killCached(entity.id);
		}, CACHE_LIFETIME);
	};

	var resetParentTimeout = function(entity) {
		var parentId = getParentId(entity);
		if (Server.instance.isInCache(parentId)) {
			resetParentTimeout(Server.instance.cache[parentId]);
		} else {
			resetTimeout(entity);
		}
	};
	resetParentTimeout(entity);
};

Server.prototype.removeTimeout = function(entity) {
	var timeoutId;
	if (timeoutId = entity.timeoutId) {
		// entity.log("Removing timeout");
		global.clearTimeout(timeoutId);
		delete entity.timeoutId;
	}
};

Server.prototype.isInCache = function(id) {
	if (!id) {
		return false;
	}
	return this.cache[id] instanceof Entity;
};

Server.prototype.isInEntities = function(id) {
	if (!id) {
		return false;
	}
	return this.entities[id] instanceof Entity;
};

Server.prototype.getCache = function(id, listener) {

	if (!this.isInCache(id)) {
//		console.err_log("No such entity in cache");
		return null;
	}
	// console.log("Getting entity from cache id=%s", id);
	var entity = this.cache[id], cache = this.cache;
	var addedList = [];

	// trying to add instance with its children to working entities list
	var parentId = getParentId(entity);
	if (parentId && this.isInEntities(parentId)) {
		var parent = this.entities[parentId];
		// console.log("Adding child to entity on getCache to parent(id=%s)",
		// parentId);
		parent.addChild(entity);
	}

	var that = this;
	var addByParent = function(parent) {
		if (!Server.instance.isInEntities(getParentId(parent)) && !((parent instanceof Account) && (parent.userId))) {
			// parent.log("has no active parrent");
			return;
		}
		addedList.push(parent);
		Server.instance.addEntityInstance(parent, listener);
		parent.log(" setting as active");
		// parent.logChildren("on getCache byParent");
		delete cache[parent.id];
		if (parent.children) {
			for ( var i = 0; i < parent.children.length; i++) {
				addByParent(parent.children[i]);
			}
		}
	};
	addByParent(entity);

	// if succeed adding instance to working list of entities notify client
	// session about it
	if (this.isInEntities(id)) {
		Server.instance.removeTimeout(Server.instance.entities[id]);
		var notifydata = {};
		for ( var i = 0; i < addedList.length; i++) {
			addedList[i].writeUpdate(notifydata, {});
		}
		// console.log("Got entities description on getCache: ", notifydata);
		Server.instance.receiveData(notifydata, listener);
	} else {
		Server.instance.resetCacheTimeout(entity);
	}
	return entity;
};

Server.prototype.restoreFromCache = function(id, listener) {
	// console.log("Restoring id=%s", id);
	if (!this.isInCache(id)) {
		console.log("Can't restore. Id=%s is not in cache.", id);
		return;
	}
	var entity = this.getCache(id, listener);
	if (!this.isInEntities(getParentId(entity))) {
		console.log("Cant restore without parent in active entities");
		return;
	}
	return entity;
};

Server.prototype.clearCache = function(callback) {
	/*
	 * TODO: calls destroy of all entities
	 * 
	 */
	var firstId = null;
	for(var id in Server.instance.cache){
		firstId = id;
		break;
	}
	if(firstId){
		Server.instance.killCached(firstId, function(){
			Server.instance.clearCache(callback);
		});
		
	}else{
		if(callback){
			callback();
		}
	}
//	console.log("primeCache list: ", cacheList);
//	var walker = function(list, index, callback){
//		if(index >= list.length){
//			if(callback){
//				callback();
//			}
//			return;
//		}
//		console.log("Calling clearCache walker index=%s", index);
//		
//	};
//	
//	walker(cacheList, 0, callback);
	
};

Server.prototype.addEntityInstance = function(entity, listeners) {
	// console.log("Entity to add: ", entity);
	assert(entity instanceof Entity, "'entity' in not Entity instance.");
	if (!((entity instanceof Account) && (entity.userId != null)) && // entity
	// is
	// loaded
	// from
	// session.init();
	((entity.parent == null) || (typeof entity.parent == String) || Server.instance.isInCache(getParentId(entity)))) {
		// entity.log("is invalid. Cant be pushed to working.");
		Server.instance.addToCache(entity);
		return;
	}
	var id = entity.id;
	// console.log("Adding entity(id=%s) as active", id);
	if (Server.instance.entities[id]) {
		if (Server.instance.entities[id] == entity) {
			console.log("Trying to add the same entity. Id=", id);
			return;
		}
		// console.log("Server alredy has entity with id: ", id);
		// console.log("Replacing existing");
		var children = Server.instance.entities[id].children;
		if (children) {
			for ( var i = 0; i < children.length; i++) {
				children[i].setParent(entity);
			}
		}
		Server.instance.removeEntity();
	}
	Server.instance.entities[id] = entity;
	if (!listeners) {
		return;
	}
	entity.addListener(listeners);
};

Server.prototype.removeEntity = function(id, removeChildren) {
	if (!this.entities[id]) {
		console.log("Server has no entity with id=", id);
		return;
	}
	var entity = this.entities[id];

	// true when server.removeEntity called from previous Entity.destroy() call

	entity.notifyListeners("destroy", true);
	entity.notifyListeners("class", entity.constructor.name);
	if ((entity instanceof Account) && (entity.userId)) {
		delete entity.userId;
	}
	Server.instance.addToCache(entity);
	if (removeChildren) {
		var removeByParent = function(parent) {
			if (!parent.children) {
				return;
			}
			for ( var i = 0; i < parent.children; i++) {
				Server.instance.removeEntity(parent.children[i].id, true);
			}
		};
		removeByParent(entity);
	}
};

Server.prototype.collectUserData = function(userId, callback) {
	var session = this.getSession(userId);
	var info = {
		data : []
	};

	if (session) {
		session.reportState(info.data);
		info.sessionAlive = true;
	} else {
		info.sessionAlive = false;
	}

	// just for BubbleMeadow!!!
	EntityManager.instance.getAccountIdByUserId(userId, function(accountId) {
		Server.instance.getEntity(null, accountId, function(account) {
			account.reportState(info.data);
			for ( var id in account.allEntities) {
				var entity = account.allEntities[id];
				entity.reportState(info.data);
				if (entity instanceof MapState) {
					for ( var i = 0; i < entity.children.length; i++) {
						entity.children[i].reportState(info.data);
					}
					Server.instance.getEntity(null, entity.gamestate, function(gameState) {
						gameState.reportState(info.data);
						if (callback) {
							callback(info);
						}
					});
				}
				if (entity instanceof BallsGameState) {
					Server.instance.getEntity(null, entity.mapState, function(mapState) {
						gameState.reportState(info.data);
						if (callback) {
							callback(info);
						}
					}, false, true);
				}
			}
		}, false, true);
	});

};

Server.prototype.getEntity = function(session, id, callback, existingOnly, createChildren) {
	/*
	 * tries 3 times: 1) from working entities 2) from cache (tries to add to
	 * working ) 3) from DB
	 */
	var et = Date.now();
	var addedIdList = [];
	var notifydata = {};
	/* 1) */
	var entity = this.entities[id];
	if (entity) {
		if (createChildren && ((!entity.children) || (entity.children.length == 0))) {
			EntityManager.instance.collectByParent(id, function(data) {
				// console.log("Collected by parent: ", data);
				for ( var id in data) {
					addedIdList.push(id);
				}
				// console.log("addedIdList =", addedIdList);
				Server.instance.extendEntities(data, session);
				for ( var i in addedIdList) {
					Server.instance.getEntity(null, addedIdList[i], null, true).writeUpdate(notifydata, {});
				}
				Server.instance.receiveData(notifydata, null);
				if (callback) {
					// console.log("Get entity(%s) time: ", entity.id,
					// Date.now() - et);
					callback(entity);

				}

			});
			return null;
		}
		if (callback) {
			// console.log("Get entity(%s) time: ", entity.id, Date.now() - et);
			// process.nextTick(function(){
			callback(entity);
			// });
		}
		return entity;
	}

	/* 2) */
	if (entity = Server.instance.getCache(id, session)) {
		if (createChildren && ((!entity.children) || (entity.children.length == 0))) {
			EntityManager.instance.collectByParent(id, function(data) {
				// console.log("Collected by parent: ", data);
				for ( var id in data) {
					addedIdList.push(id);
				}
				// console.log("addedIdList =", addedIdList);
				Server.instance.extendEntities(data, session);
				for ( var i in addedIdList) {
					Server.instance.getEntity(null, addedIdList[i], null, true).writeUpdate(notifydata, {});
				}
				Server.instance.receiveData(notifydata, null);
				if (callback) {
					// console.log("Get entity(%s) time: ", entity.id,
					// Date.now() - et);
					callback(entity);
				}

			});
			return null;
		}
		if (callback) {
			// console.log("Get entity(%s) time: ", entity.id, Date.now() - et);
			callback(entity);
		}
		return entity;
	}
	if (existingOnly) {
		return null;
	}

	/* 3) */

	EntityManager.instance.getEntity(id, {}, function(entity) {
		if ((!entity) || (entity == null)) {
			console.log("Entity id \"%s\" does not exist.", id);
			// console.log("Get entity(%s) time: ", entity.id, Date.now() - et);
			callback(null);
			return;
		}
		// console.log("Entity with id=%s on EnityManager.getEntity",
		// entity.id);
		Server.instance.addEntityInstance(entity, session);
		// console.log("Created entity on server.getEntity with id=",
		// entity.id);

		if (!createChildren) {
			// console.log("Get entity(%s) time: ", entity.id, Date.now() - et);
			callback(entity);
			return;
		}
		EntityManager.instance.collectByParent(id, function(data) {
			// console.log("Collected by parent: ", data);
			for ( var id in data) {
				addedIdList.push(id);
			}
			// console.log("addedIdList =", addedIdList);
			Server.instance.extendEntities(data, session);
			for ( var i in addedIdList) {
				Server.instance.getEntity(null, addedIdList[i], null, true).writeUpdate(notifydata, {});
			}
			Server.instance.receiveData(notifydata, null);
			if (callback) {
				// console.log("Get entity(%s) time: ", entity.id, Date.now() -
				// et);
				callback(entity);
			}

		});
	});
};

Server.prototype.extendEntities = function(data, session) {
	// var et = Date.now();
	for ( var id in data) {
		if (data[id] instanceof Entity) {
			this.addEntityInstance(data[id], session ? [ session ] : null);
		} else {
			data[id]['id'] = id;
			 console.log("Creating with data: ", data[id]);
			var entity = EntityManager.instance.createEntity(data[id]);
			this.addEntityInstance(entity, session ? [ session ] : null);
			// entity.addListener(session);
			// this.addEntityInstance(entity, session?[session]:null);

		}

		// var writeData = {};
		// this.entities[id].writeUpdate(writeData, {});
		// this.receiveData(writeData, session);
	}
	// console.log("Extention time: ", Date.now() - et);
};

Server.prototype.addAccount = function(account) {
	// assert(Accounts[account.id], "Account with such ID is already on
	// server");
	if (!Accounts[account.id])
		Accounts[account.id] = account;
};

Server.prototype.removeAccount = function(account) {
	assert(Accounts[account.id], "No such account on server");
	delete Accounts[account.id];
};

Server.prototype.receiveData = function(data, session) {
	// console.log("Received data: ", data);
	var value = null;
	for ( var index in data) {
		value = data[index];
		if (this.entities[index]) {
			delete value.newEntity;
			for ( var prop in value) {
				this.entities[index].setProperty(prop, value[prop]);
			}
		}
	}
	;
};

Server.prototype.setAuthCallback = function(callback) {
	this.authCallbacks = [];
	this.authCallbacks.push(callback);
};

Server.prototype.addAuthCallback = function(callback) {
	this.authCallbacks.push(callback);
};

Server.prototype.setTransactionHandler = function(func) {
	this.transactionHandler = func;
};

Server.prototype.getTransactionHandler = function() {
	return this.trunsactionHandler;
};

Server.prototype.killSession = function(session, callback) {
	var that = this;
	if (session) {
		console.log("killing session: ", session.userId);
		var accId = session.accountId;
		global.clearTimeout(session.timeoutId);
		session.destroy(function(){
			that.killCached(accId, function() {
				if (callback) {
					callback();
				}
			});
		});
		
	} else {
		if (callback) {
			callback();
		}
	}

};

Server.prototype.killAllSessions = function(callback) {
	var that = this;
	Server.instance.disableAuth = true;
	var sessions = this.getSessions();
	// console.log("got sessions: ", sessions);
	var list = [];
	for ( var userId in sessions) {
		list.push(sessions[userId]);
		// this.killSession(sessions[userId]);
	}

	var walker = function(index) {
//		console.err_log("Killed sessions. Clearing cache...");
		if (index >= list.length) {
			Server.instance.clearCache(function(){
				console.err_log("Cleared cache. Calling main callback.");
				if(callback){
					callback(list.length);
				}
			});
			
			return;
		}
		that.killSession(list[index], function() {
			walker(index + 1);
		});
	}
	walker(0);
};

Server.prototype.getOnlineNum = function() {
	var sessions = this.getSessions();
	var counter = 0;
	for ( var userId in sessions) {
		counter++;
	}
	return counter;
};

Server.prototype.onAuth = function(req, res) {
	var entryTime = Date.now();
	// session.userId = req.body.userId;
	// if(!req.isAuthenticated()){
	// Server.instance.onIFrameAuth(req.data.);
	// }
//	 console.log("server.onAuth()");
	var friendsInfo = null;
	if(req.body.friendsInfo){
		friendsInfo = req.body.friendsInfo;
	}
//	console.log("Friends info defined: ", !(!friendsInfo));
//	console.log("Server.instance.disableAuth: ", Server.instance.disableAuth)
	if (Server.instance.disableAuth) {
		var obj = {
			error : "Auth disabled.",
			error_code : 2
		};
		res.end(JSON.stringify(obj));
		return;
	}
	var that = Server.instance;
	var userId = null;
//	if (req.session.iFrameAuth) {
		userId = req.session.userId;
//	} else {
		// if (req.user && req.user.provider) {
		// if (req.user.provider == "facebook") {
		// userId = req.user.id;
		// }
		// if (req.user.provider == "vkontakte") {
		// userId = req.user.uid;
		// }
		// }
//	}

//	console.log("AuthCallbacks length = ", that.authCallbacks.length);
		var obj = {
				error : "Undefined userId (wrong cookie)",
				error_code : 10
			};
	var authError = !userId;
	if (authError) {
		console.log("Undefined userId (wrong cookie).");
		res.end(JSON.stringify(obj));
		return;
	}
	authError = false;
	function runAuthCallbacks(session, cb) {
		var walker = function(index) {
			return function() {
				process.nextTick(function() {

					if (index < that.authCallbacks.length && !authError) {
						// console.log("Walker %s call.", index);
						that.authCallbacks[index](session, walker(index + 1), function(error) {
							
							console.log("setting error = true");
							authError = error?error:{ error: "Set error called on AUTH."};
							console.err_log("Authorization error: ", error)
						});
					} else {
						if (cb) {
							// console.log("Callback on walker.");
							cb();
						}
					}
				});
			};

		};
		walker(0)();
	}

	// console.log("111111111111111: ", Date.now() - et);
	// console.log("\nAuth request from user : ", userId);
	var session = Server.instance.getSession(userId);
	// console.log("22222222222222222: ", Date.now() - et);

	
	if (session) {
		if(friendsInfo){
			session.friendsInfo = friendsInfo;
		}
		 console.log("Found session for userId: ", userId);
		runAuthCallbacks(session, function() {
			if (authError) {
				var obj = authError;
			} else {
				var obj = {
					accountId : session.accountId,
					userId : userId,
					initUpdate : session.sendData(true)
				};
			}
			// console.log("callback on authCallbacks.");
				res.end(JSON.stringify(obj));
		});

		return;
	}
	var session = new Session();

	// console.log("that.client is defined onAuth: ",
	// !(!Server.instance.client));
	 console.log("New session init.");
	session.init({
		"userId" : userId,
		"authClient" : Server.instance.client,
		"session_key" : req.session.session_key,
		"session_secret_key" : req.session.session_secret_key,
		// "initData": req.session.initData,
		"callback" : (function() {
			
			if(friendsInfo){
				session.friendsInfo = friendsInfo;
			}
			console.log("Session init callback. Now authcallbacks shpuld be running.");
			runAuthCallbacks(session, function() {
				if (authError) {
					console.log("Error on auth!!!!");
					var obj = authError;
				} else {
					var obj = {
						accountId : session.accountId,
						userId : userId,
						initUpdate : session.sendData(true)
					};
				}
				// console.log("Auth Callback.");
				res.end(JSON.stringify(obj));
			});

		})
	});

};

Server.prototype.onCommunicate = function(req, res, next) {
	// console.log("\n\nReceived data on communicate: \n", req.body,"\n\n");
	// if()
	var userId;
	if (req.session.iFrameAuth) {
		userId = req.session.userId;
	} else {
		if (req.user) {
			if (req.user.provider == "facebook") {
				userId = req.user.id;
			}
			if (req.user.provider == "vkontakte") {
				userId = req.user.uid;
			}
		} else {
			error_flag = !error_flag;

			console.log("WRONG req.session: ", req.session);
			error_flag = !error_flag;
			res.json({
				error : {
					description : "Wrong cookie",
					code : 2
				}
			});
			return;
		}
	}
	var session = Server.instance.getSession(userId);
	if (!session) {
		res.json({
			error : {
				description : "Dead session",
				code : 0
			}
		});
		return;
	}
	var data = req.body;
	// console.log("Request to change smth from user : ", userId);
	// console.log("Change data: ", data);
	// Server.instance.receiveData(data, session);
	// EntityManager.instance.backupSession(session);
	// console.log("session.entities right before response.end: ",
	// session.entities);
	// console.log(session.entities);
	res.json(session.sendData(false));
	// next();
	// EntityManager.instance.backupAllEntities(Server.instance.entities,
	// function(){
	//
	// });
};

Server.prototype.onCommand = function(req, res, next) {
	var entryTime = Date.now();
	var userId;

	if (req.session.iFrameAuth) {
		userId = req.session.userId;
	} else {
		if (req.user) {
			if (req.user.provider == "facebook") {
				userId = req.user.id;
			}
			if (req.user.provider == "vkontakte") {
				userId = req.user.uid;
			}
		} else {
			res.json({
				error : {
					description : "Wrong cookie",
					code : 1
				}
			});
		}

	}

	var session = Server.instance.getSession(userId);

	if (!session) {
		res.json({
			error : {
				description : "Dead session",
				code : 0
			}
		});
		return;
	}
	if (!userId) {
		res.json({
			error : {
				description : "Wrong userId!!!",
				code : 4
			}
		});
		return;
	}

	var json = req.body;

	var command = json['command'], args = json['args'];
//	if (!session.panelValueCount) {
//		session.panelValueCount = 0;
//	}
//	if ((command == "getPanelValues") && (((session.panelValuesTime && (Date.now() - session.panelValuesTime < 1000))) && (session.panelValuesCount > 10))) {
//		console.err_log("Detected lot of getPanelValues calls. User: ", session.userId);
//		res.json({
//			error : "Too many requests.",
//			error_code : 5
//		});
//		return;
//	} else {
//		if (command == "getPanelValues") {
//			if ((Date.now() - session.panelValuesTime) < 1000) {
//				session.panelValuesCount++;
//			} else {
//				session.panelValuesTime = Date.now();
//				session.panelValuesCount = 1;
//			}
//		}
//	}
	Server.instance.executeCommand(command, args, session, function(result) {
		// EntityManager.instance.backupAllEntities(Server.instance.entities,
		// function(){
		//
		// });
		if(command != "getPanelValues"){
			console.log("Command executed=%s; user=%s; time=%s", command, userId, Date.now() - entryTime + "");	
		}
		res.json(result);
	});
};

Server.prototype.logEntities = function(msg) {
	console.log("Server Entities: ");
	for ( var id in this.entities) {
		this.entities[id].log(msg);
	}
};

Server.prototype.logCache = function(msg) {
	console.log("Server Cache: ");
	for ( var id in this.cache) {
		this.cache[id].log(msg);
	}
};

Server.prototype.cleanUp = function() {

};

Server.prototype.runTimeouts = function(callback) {
	var that = this;
	var query = that.client.query("SELECT data FROM " + sconf.entity_table + " WHERE parentid = 'timeout'");
	var rows = [];
	query.on("row", function(row) {
		rows.push(row);
	});

	query.on("end", function() {
		var walker = function(index) {
			if (rows.length <= index) {
				if (callback) {
					callback();
				}
				return;
			}
			var data = JSON.parse(rows[index].data);
			Server.instance.getEntity(null, data.id, function(account) {
				if(!account){
					walker(index + 1);
					return;
				};
				account.reRunLifesRefill(data.refPoint, function() {
					walker(index + 1);
				});
			}, false);
		};
		walker(0);
	});
};

Server.prototype.start = function(credentials, app, callback) {
	var that = this;
//	console.log("credentials: ", credentials);
	console.log("app is a function", (app instanceof Function));
//	console.log("callback is a func", (typeof(callback) == "function"));
	var flag = true && credentials;
	if(typeof(callback) != "function"){
		callback = app; 	
		app = credentials;
		flag = false;
	}
	
	function onClose() {
		that.client.end();
	}

	this.httpServer = http.createServer(app);
	this.httpServer.on('close', onClose);
	
	
	if(flag){
		this.httpsServer = https.createServer(credentials, app);
	}
	
	
	this.httpServer.listen(app.get("port"), function() {

		console.log("HTTP Server has started on " + app.get("port"));
		if(flag){
			that.httpsServer.listen(sconf.httpsPort, function() {
				console.log("HTTPS Server has started on " + sconf.httpsPort);
				if (callback) {
					callback();
				}
			});
		}else{
			if (callback) {
				callback();
			}
		}
	});
};

function getParentId(entity) {
	return entity.parent instanceof Entity ? entity.parent.id : entity.parent;
};
