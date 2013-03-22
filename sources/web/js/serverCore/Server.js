/*
 * Defines main class: owner of Sessions, Accounts, allEntities, scheduler
 */

var CACHE_LIFETIME = 2 * 60 * 1000;

function Server() {
	var fileServer = null;
	this.client = null;
	var Accounts = null;
	var Sessions = null;
	var commands = null;
};

Server.prototype.init = function(sconf, callback) {
	var that = this;
	this.config = sconf;

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
		var conString = "tcp://" + sconf.username + ":" + sconf.userpasswd + "@" + sconf.dburl + "/" + sconf.dbname;

		if (!that.client) {
//			console.log("INITING CLIENT FOR THE FIRST TIME\n------\n------\n------\n------\n------\n------\n------\n------\n------\n------");
			that.client = new pg.Client(conString);
			that.client.connect();
		}
		console.log("that.client is defined server init: ", !(!that.client));
		Accounts = {};
		Sessions = {};
		(new EntityManager()).init({
			entityClient : that.client
		});
		this.entities = {};
		this.cache = {};
		commands = {};
		Server.instance = this;

		// that.client.on('error', function(error){
		// console.log(error);
		// });
		//
		// that.client.on('notice', function(msg) {
		// console.log("-----------------");
		// console.log("notice: %j", msg);
		// console.log("-----------------");
		// });
		var entity_table_delquery = that.client.query('DELETE FROM ' + that.config.entity_table);
		entity_table_delquery.on("end", function() {
			var users_accounts_delquery = that.client.query('DELETE FROM ' + that.config.users_accounts_table);
			users_accounts_delquery.on("end", function() {
				if (callback) {
					callback();
				}
			});
		});

		// client.query( 'DROP TABLE IF EXISTS account_data');
		// authClient.query( 'DROP TABLE IF EXISTS users_accounts');
		// client.query( 'CREATE TABLE account_data(account varchar(30), data
		// text )' );
		// client.query( 'CREATE TABLE entity_data(id varchar(30), data text,
		// parentid varchar(30) )' );
		// authClient.query( 'CREATE TABLE users_accounts(userid varchar(30),
		// account varchar(30) )' );

		// console.log('(Re)Created Tables entity_data and users_accounts');

		this.addCommand("switchState", function(args, session, callback) {
			var et = Date.now();
			var curState = Server.instance.getEntity(session, args[0], null, true);
			console.log("Get CUrrent state time: ____________", Date.now() - et);
			// parentId;
			if (!session) {
				callback({
					error : "No such session on server"
				});
				return;
			}
			if (!curState) {
				callback({
					error : "No such state on server"
				});
				return;
			}
			var parentId = getParentId(curState);
			console.log("CurrentState(id=%s) has parent with id=%s", curState.id, parentId);
			if (!parentId) {
				console.log("Current state has no parent");
				callback({
					error : "Current state has no parent"
				});
				return;
			}
			et = Date.now();
			curState.setParent(null);
			console.log("Current state setPArent(null) time: ____________", Date.now() - et);
			// console.log("CurrentState(id=%s) has parent with id=%s",
			// curState.id, parentId);
			// curState.setParent(null);
			// Server.instance.removeEntity(curState.id, true);
			et = Date.now();
			Server.instance.getEntity(session, args[1], function(entity) {
				console.log("Get new State Time: _____________", Date.now() - et);
				entity.setParent(parentId);
				// console.log("NewState's parent: ", getParentId(entity));
				// console.log("OldState's parent: ", getParentId(curState));
				// Server.instance.getEntity(session, entity.id);
				// EntityManager.instance.backupAllEntities(Server.instance.entities,
				// function(){
				// EntityManager.instance.backupAllEntities(Server.instance.cache,
				// function(){4
				et = Date.now();
				var changes = session.popChanges();
				console.log("Pop changes time: _____________", Date.now() - et);
				// Server.instance.logEntities("after switchState");
				// Server.instance.logCache("after switchState");
				callback(changes);
				// });
				// });

			}, false, true);
		});
	}
};

// passed func should take 3 args - args array, session, callback(see below)
Server.prototype.addCommand = function(name, func) {
	commands[name] = func;
};

// callback receives only 1 arg - result of command execution
// and is defined in onCommand() function
Server.prototype.executeCommand = function(name, args, session, callback) {
	var command = commands[name];
	if (command) {
		try {
			command(args, session, callback);
		} catch (err) {
			console.log("Error on command execution:");
			console.log("Error: ", err, "\n");
			console.log(err.stack);
			callback({
				error : err,
				stack : err.stack
			});
		}
		return;
	} else {
		console.log("Unknow command: ", name);
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
		console.log("Get Account By User Id error\n", error);
	});

	query.on('row', function(row) {
		rows.push(row);
	});

	query.on("end", function(result) {
		if (result.rowCount == 0) {
			callback(null);
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

Server.prototype.killCached = function(id) {
	var entity;
	if (!(entity = Server.instance.cache[id])) {
		return;
	}
	EntityManager.instance.backupEntity(entity, function() {
		if (entity.children) {
			for ( var i = 0; i < entity.children.length; i++) {
				Server.instance.killCached(entity.children[i].id);
			}
		}
		delete Server.instance.cache[id];
		entity.destroy(false);
	});
};

// adds single entity(without children)
Server.prototype.addToCache = function(entity) {
	var cache = Server.instance.cache, id = entity.id;
	// entity.log(" adding to cache.");
	// entity.logChildren("on addToCache");
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
			// console.log("\nKilling entity(id=%s)", entity.id);
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
		console.log(console.log("No such entity in cache"));
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
		// parent.log("setting as active");
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

Server.prototype.clearCache = function() {
	/*
	 * TODO: calls destroy of all entities
	 * 
	 */

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
					process.nextTick(function() {
						callback(entity);
					});

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
					process.nextTick(function() {
						callback(entity);
					});
				}

			});
			return null;
		}
		if (callback) {
			// console.log("Get entity(%s) time: ", entity.id, Date.now() - et);
			process.nextTick(function() {
				callback(entity);
			});
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
			process.nextTick(function() {
				callback(null);
			});
			return;
		}
		// console.log("Entity with id=%s on EnityManager.getEntity",
		// entity.id);
		Server.instance.addEntityInstance(entity, session);
		// console.log("Created entity on server.getEntity with id=",
		// entity.id);

		if (!createChildren) {
			// console.log("Get entity(%s) time: ", entity.id, Date.now() - et);
			process.nextTick(function() {
				callback(entity);
			});
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
				process.nextTick(function() {
					callback(entity);
				});
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
			// console.log("Creating with data: ", data[id]);
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
	this.authCallback = callback;
};

Server.prototype.setTransactionHandler = function(func) {
	this.transactionHandler = func;
};

Server.prototype.getTransactionHandler = function() {
	return this.trunsactionHandler;
};

Server.prototype.onAuth = function(req, res) {
	var entryTime = Date.now();
	// session.userId = req.body.userId;
	// if(!req.isAuthenticated()){
	// Server.instance.onIFrameAuth(req.data.);
	// }
	var userId;
	var et = Date.now();
	if (req.session.iFrameAuth) {
		userId = req.session.userId;
	} else {
		if (req.user && req.user.provider) {
			if (req.user.provider == "facebook") {
				userId = req.user.id;
			}
			if (req.user.provider == "vkontakte") {
				userId = req.user.uid;
			}
		}
	}
	console.log("111111111111111: ", Date.now() - et);
	// console.log("\nAuth request from user : ", userId);
	et = Date.now();
	var session = Server.instance.getSession(userId);
	console.log("22222222222222222: ", Date.now() - et);
	if (session) {
		// console.log("Found previous session with userId: ", userId);
		if (Server.instance.authCallback) {
			process.nextTick(function() {
				Server.instance.authCallback(session, function() {
					var obj = {
						accountId : session.accountId,
						userId : userId,
						initUpdate : session.sendData(true)
					};
					res.end(JSON.stringify(obj));
					console.log("Auth time:", Date.now() - entryTime);
				});
			});
		} else {
			process.nextTick(function() {
				var obj = {
					accountId : session.accountId,
					userId : userId,
					initUpdate : session.sendData(true)
				};
				et = Date.now();
				res.end(JSON.stringify(obj));
				console.log("Res end time: ", Date.now() - et);
				console.log("Auth time:", Date.now() - entryTime);
			});
		}

		return;
	}
	et = Date.now();
	var session = new Session();
	console.log("33333333333333333333: ", Date.now() - et);

	et = Date.now();
	console.log("that.client is defined onAuth: ", !(!Server.instance.client));
	session.init({
		"userId" : userId,
		"authClient" : Server.instance.client,
		// "initData": req.session.initData,
		"callback" : (function() {
			process.nextTick(function() {
				console.log("444444444444444444: ", Date.now() - et);
				var et2 = Date.now();
				// res.writeContinue();
				console.log("Created Account with ID: ", session.accountId);
				console.log("Auth complete!");

				// Server.instance.logEntities("On auth");
				// Server.instance.logCache("On auth");
				if (Server.instance.authCallback) {
					process.nextTick(function() {

						Server.instance.authCallback(session, function() {
							var obj = {
								accountId : session.accountId,
								userId : userId,
								initUpdate : session.sendData(true)
							};
							et = Date.now();
							res.end(JSON.stringify(obj));
							console.log("AAAAAAAAAAAAAAAAA: ", Date.now() - et);
							console.log("Auth time:", Date.now() - entryTime);
							console.log("555555555555555555555 ", Date.now() - et2);
						});
					});
				} else {
					process.nextTick(function() {

						var obj = {
							accountId : session.accountId,
							userId : userId,
							initUpdate : session.sendData(true)
						};

						res.end(JSON.stringify(obj));
						console.log("AAAAAAAAAAAAAAAAA: ", Date.now() - et);
						console.log("Auth time:", Date.now() - entryTime);
						console.log("555555555555555555555 ", Date.now() - et2);
					});
				}

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
		if (req.user.provider == "facebook") {
			userId = req.user.id;
		}
		if (req.user.provider == "vkontakte") {
			userId = req.user.uid;
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
//	Server.instance.receiveData(data, session);
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
		if (req.user.provider == "facebook") {
			userId = req.user.id;
		}
		if (req.user.provider == "vkontakte") {
			userId = req.user.uid;
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

	var json = req.body;
	var command = json['command'], args = json['args'];
	console.log("Command: %s: ", command, "; from user: ", userId);
	Server.instance.executeCommand(command, args, session, function(result) {
		// EntityManager.instance.backupAllEntities(Server.instance.entities,
		// function(){
		//
		// });
		console.log("Command execution time: ", Date.now() - entryTime);
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

Server.prototype.start = function(app, callback) {
	var that = this;

	function onClose() {
		that.client.end();
	}
	;

	this.httpServer = http.createServer(app);
	this.httpServer.on('close', onClose);
	this.httpServer.listen(app.get("port"), function() {

		console.log("Server has started on " + app.get("port"));
		if (callback) {
			callback();
		}
	});
};

function getParentId(entity) {
	return entity.parent instanceof Entity ? entity.parent.id : entity.parent;
};
