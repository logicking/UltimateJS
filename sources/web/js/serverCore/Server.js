/*
 * Defines main class: owner of Sessions, Accounts, allEntities, scheduler
 */

var CACHE_LIFETIME = 2*60*1000;

function Server(){
	var fileServer = null;
	var client = null;
	var authClient = null;
	var Accounts = null;
	var Sessions = null;
	var commands = null;
};

Server.prototype.init = function(sconf){
	this.config = sconf;
	var conString = "tcp://"+ sconf.username +":"+ sconf.userpasswd +"@"+ sconf.dburl +"/"+ sconf.dbname ;

	client = new pg.Client(conString);
	authClient = new pg.Client(conString);
	Accounts = {};
	Sessions = {};
	(new EntityManager()).init({
		entityClient: client,
		authClient: authClient
	});
	this.entities = {};
	this.cache = {};
	commands = {};
	Server.instance = this;
	client.connect();
	authClient.connect();
	
	client.on('error', function(error){
		console.log(error);
	});
	
	client.on('notice', function(msg) {
		console.log("-----------------");
		console.log("notice: %j", msg);
		console.log("-----------------");
	});
	
//	client.query( 'DROP TABLE IF EXISTS account_data');
	client.query( 'DELETE FROM ' + sconf.entity_table);
	client.query( 'DELETE FROM ' + sconf.users_accounts_table);
	
//	authClient.query( 'DROP TABLE IF EXISTS users_accounts');
//	client.query( 'CREATE TABLE account_data(account varchar(30), data text )' );
//	client.query( 'CREATE TABLE entity_data(id varchar(30), data text, parentid varchar(30) )' );
//	authClient.query( 'CREATE TABLE users_accounts(userid varchar(30), account varchar(30) )' );
	
//	console.log('(Re)Created Tables entity_data and users_accounts');
	
	this.addCommand("switchState", function(args, session, callback){

		var curState = Server.instance.getEntity(session, args[0], null, true);
//		parentId;
		if(!session){
			callback( {error:"No such session on server"} );
		}
		if(!curState){
			callback( {error:"No such state on server"} );
		}
		var parentId = getParentId(curState);
		console.log("CurrentState(id=%s) has parent with id=%s", curState.id, parentId);
		if(!parentId){
			console.log("Current state has no parent");
			return;
		}
		curState.setParent(null);
//		console.log("CurrentState(id=%s) has parent with id=%s", curState.id, parentId);
//		curState.setParent(null);
//		Server.instance.removeEntity(curState.id, true);
		Server.instance.getEntity(session, args[1], function(entity){
		
			entity.setParent(parentId);
			console.log("NewState's parent: ", getParentId(entity));
			console.log("OldState's parent: ", getParentId(curState));
//			Server.instance.getEntity(session, entity.id);
			EntityManager.instance.backupAllEntities(Server.instance.entities, function(){
				EntityManager.instance.backupAllEntities(Server.instance.cache, function(){
					var changes = session.popChanges();
					Server.instance.logEntities("after switchState");
					Server.instance.logCache("after switchState");
					callback(changes);
				});
			});
			
		}, false, true);
	});
};

//passed func should take 3 args - args array, session, callback(see below)
Server.prototype.addCommand = function(name, func){
	commands[name] = func;
};




//callback receives only 1 arg - result of command execution
//and is defined in onCommand() function
Server.prototype.executeCommand = function(name, args, session, callback) {
	var command = commands[name];
	if (command) {
		try{
			command(args, session, callback);
		}catch(err){
			callback({
				error : err
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

Server.prototype.getAccountByUserId = function(session, userId, callback){
	var rows = [];
	var query = authClient.query( "SELECT * FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ userId ] );
	query.on( "error", function(error){
		console.log("Get Account By User Id error\n", error);
	});
	
	query.on('row', function(row){
		rows.push(row);
	});
	
	query.on("end", function(result){
		if(result.rowCount == 0){
			callback(null);
		}
		Server.instance.getEntity(session, rows[0].account, function(account){
			callback(account);
		}, false, false);
	});
};

Server.prototype.removeSession = function(session){
	if(session instanceof Session){
		delete Sessions[session.userId];
		return;
	}
	if(typeof session == "string" ){
		delete Sessions[session];
	}
	console.log("Sessions: ", Sessions);
};

Server.prototype.getSession = function(userId){
	var session ;
	if(!(session = Sessions[userId])){
		return null;
	}
	session.reportActivity();
	return session;
};


Server.prototype.createEntity = function(id, session, callback){
	EntityManager.instance.getEntity(id, function(entity){
		Server.instance.addEntityInstance(entity, session);
		if(callback){
			callback(entity);
		}
	});
};

Server.prototype.killCached = function(id){
	var entity;
	if(!(entity = Server.instance.cache[id])){
		return;
	}
	EntityManager.instance.backupEntity(entity, function(){
		if(entity.children){
			for(var i=0; i<entity.children.length; i++){
				Server.instance.killCached(entity.children[i].id);			
			}
		}
		delete Server.instance.cache[id];
		entity.destroy(false);
	});
};

//adds single entity(without children)
Server.prototype.addToCache = function(entity){
	var cache = Server.instance.cache,
		id = entity.id;
	entity.log("adding to cache");
//	entity.logChildren("on addToCache");
	//case of overwriting(there is an old instance of entity in cache)
	if(cache[id])
		if(cache[id] != entity){//case when we update existing cache(in ideal world this never happens)
			if(cache[id].timeoutId){
				global.clearTimeout(cache[id].timeoutId);
			}
			Server.instance.killCached(id);
		}else{
			console.log("Already have entity(id=%s) in server cache", id);
			return;
		}
	cache[id] = entity;
	entity.listeners = []; //adding to cache means "destroy" to client so there is nothing to notify 
	var parentId = getParentId(entity);

	//resets timeout to the top of the tree if entity was added to cache
	//after its parent was added
	Server.instance.resetCacheTimeout(entity);

	
	if(parentId && this.isInEntities(parentId)){
		this.entities[parentId].removeChild(entity);
	}
	if(this.entities[id] == entity){
		delete this.entities[id];	
	}

	//adding children to cache
	if(entity.children){
		for(var i=0; i<entity.children.length; i++){
			Server.instance.addToCache(entity.children[i]);
		}
	}
};

Server.prototype.resetCacheTimeout = function(entity){

	var resetTimeout = function(entity){
		if(entity.timeoutId){
			global.clearTimeout(entity.timeoutId);
		}
		console.log("Resetting timeout for entity with id=%s", entity.id);
		entity.timeoutId = global.setTimeout(function(){
			console.log("\nKilling entity(id=%s)", entity.id);
			Server.instance.killCached(entity.id);
		}, CACHE_LIFETIME);
	};
	
	var resetParentTimeout = function(entity){
		var parentId = getParentId(entity);
		if(Server.instance.isInCache(parentId)){
			resetParentTimeout(Server.instance.cache[parentId]);
		}else{
			resetTimeout(entity);
		}
	};
	resetParentTimeout(entity);
};

Server.prototype.removeTimeout = function(entity){
	var timeoutId;
	if(timeoutId = entity.timeoutId ){
//		entity.log("Removing timeout");
		global.clearTimeout(timeoutId);
		delete entity.timeoutId;
	}
};

Server.prototype.isInCache = function(id){
	if(!id){
		return false;
	}
	return this.cache[id] instanceof Entity;
};

Server.prototype.isInEntities = function(id){
	if(!id){
		return false;
	}
	return this.entities[id] instanceof Entity;
};

Server.prototype.getCache = function(id, listener){

	if(!this.isInCache(id)){
		console.log(console.log("No such entity in cache"));
		return null;
	}
	console.log("Getting entity from cache id=%s", id);
	var entity = this.cache[id],
		cache = this.cache;
	var addedList = [];
	
	//trying to add instance with its children to working entities list
	var parentId = getParentId(entity);
	if(parentId && this.isInEntities(parentId)){
		var parent = this.entities[parentId];
		console.log("Adding child to entity on getCache to parent(id=%s)", parentId);
		parent.addChild(entity);
	}
	
	var that = this;
	var addByParent = function(parent){
		if( !Server.instance.isInEntities(getParentId(parent)) && !(parent instanceof Account) ){
			parent.log("has no active parrent");
			return;
		}
		addedList.push(parent);
		Server.instance.addEntityInstance(parent, listener);
		parent.log("setting as active");
//		parent.logChildren("on getCache byParent");
		delete cache[parent.id];
		if(parent.children){
			for(var i=0; i<parent.children.length; i++){
				addByParent(parent.children[i]);
			}
		}
	};	
	addByParent(entity);
	
	//if succeed adding instance to working list of entities notify client session about it
	if(this.isInEntities(id)){
		Server.instance.removeTimeout(Server.instance.entities[id]);
		var notifydata = {}; 
		for(var i = 0; i<addedList.length; i++){
			addedList[i].writeUpdate(notifydata, {});
		}
//		console.log("Got entities description on getCache: ", notifydata);
		Server.instance.receiveData(notifydata, listener);
	}else{
		Server.instance.resetCacheTimeout(entity);
	}
	return entity;
};

Server.prototype.restoreFromCache = function(id, listener){
	console.log("Restoring id=%s", id);
	if(!this.isInCache(id)){
		console.log("Can't restore. Id=%s is not in cache.", id);
		return;
	}
	var entity = this.getCache(id, listener);
	if(!this.isInEntities(getParentId(entity))){
		console.log("Cant restore without parent in active entities");
		return;
	}
	return entity;
};

Server.prototype.clearCache = function(){
	/*
	 * TODO: calls destroy of all entities
	 * 
	 */
	
};

Server.prototype.addEntityInstance = function(entity, listeners){
//	console.log("Entity to add: ", entity);
	assert(entity instanceof Entity, "'entity' in not Entity instance.");
	if (	!(entity instanceof Account)&&
			(	(entity.parent == null) || 
				(typeof entity.parent == String) ||
				Server.instance.isInCache(getParentId(entity))  ) ) {
		entity.log("does not satisfy all conditions to be added as working");
		Server.instance.addToCache(entity);
		return;
	}
	var id = entity.id;
//	console.log("Adding entity(id=%s) as active", id);
	if(Server.instance.entities[id]){
		if(Server.instance.entities[id] == entity){
			console.log("Trying to add the same entity. Id=", id);
			return;
		}
		console.log("Server alredy has entity with id: ", id);
		console.log("Replacing existing");
		var children = Server.instance.entities[id].children;
		if(children){
			for(var i=0; i<children.length; i++){
				children[i].setParent(entity);
			}
		}
		Server.instance.removeEntity();
	}
	Server.instance.entities[id] = entity;
	if(!listeners){
		return;
	}
	entity.addListener(listeners);
};

Server.prototype.removeEntity = function(id, removeChildren){
	if(!this.entities[id]){
		console.log("Server has no entity with id=", id);
		return;
	}
	var entity = this.entities[id];
	//true when sever.removeEntity called from previous Entity.destroy() call
	entity.notifyListeners("destroy", true);
	
	Server.instance.addToCache(entity);
	if(removeChildren){
		var removeByParent = function(parent){
			if(!parent.children){
				return;
			}
			for(var i = 0; i<parent.children; i++){
				Server.instance.removeEntity(parent.children[i].id, true);
			}
		};
		removeByParent(entity);
	}
};

Server.prototype.getEntity = function(session, id, callback, existingOnly, createChildren){
	/*
	 *	tries 3 times:
	 * 	1) from working entities
	 * 	2) from cache (tries to add to working )
	 * 	3) from DB
	 */
	
/* 1) */
	var entity = this.entities[id];
	if(entity){
		if(callback){
			callback(entity);
		}
		return entity;
	}
	
/* 2) */
	if(entity = Server.instance.getCache(id, session)){
		if(callback){
			callback(entity);
		}
		return entity;
	}
	if(existingOnly){
		return null;
	}
	
/* 3) */
	var addedIdList = [];
	var notifydata = {};
	EntityManager.instance.getEntity(id, {}, function(entity){
		
//		console.log("Entity with id=%s on EnityManager.getEntity", entity.id);
		Server.instance.addEntityInstance(entity, session);
		console.log("Created entity on server.getEntity with id=", entity.id);
	
		if(!createChildren){
			callback(entity);
			return;
		}
		EntityManager.instance.collectByParent(id, function(data){
//			console.log("Collected by parent: ", data);
			for(var id in data){
				addedIdList.push(id);
			}
//			console.log("addedIdList =", addedIdList);
			Server.instance.extendEntities(data, session);
			for(var i in addedIdList){
				Server.instance.getEntity(null, addedIdList[i], null, true).writeUpdate(notifydata, {});
			}
			Server.instance.receiveData(notifydata, null);
			callback(entity);
		});
	});	
};

Server.prototype.extendEntities = function(data, session) {
	
	for ( var id in data) {
		if (data[id] instanceof Entity) {
			this.addEntityInstance(data[id], session?[session]:null);
		} else {
			data[id]['id'] = id;
//			console.log("Creating with data: ", data[id]);
			var entity = EntityManager.instance.createEntity(data[id]);
			this.addEntityInstance(entity, session?[session]:null);
//			entity.addListener(session);
//			this.addEntityInstance(entity, session?[session]:null);

		}
//		var writeData = {};
//		this.entities[id].writeUpdate(writeData, {});
//		this.receiveData(writeData, session);
	}
};


Server.prototype.addAccount = function(account){
//	assert(Accounts[account.id], "Account with such ID is already on server");
	if(!Accounts[account.id])
	Accounts[account.id] = account;
};

Server.prototype.removeAccount = function(account){
	assert(Accounts[account.id], "No such account on server");
	delete Accounts[account.id];
};


Server.prototype.receiveData = function(data, session){
	console.log("Received data: ", data);
	var value = null; 
	for(var index in data){
		value = data[index];
		if(this.entities[index]){
			delete value.newEntity;
			for(var prop in value){
				this.entities[index].setProperty(prop, value[prop]);
			}
		}
	};
};


Server.prototype.setAuthCallback = function(callback){
	this.authCallback = callback;
};

Server.prototype.onAuth = function(req, res){
	
//	session.userId = req.body.userId;
//	if(!req.isAuthenticated()){
//		Server.instance.onIFrameAuth(req.data.);
//	}
	var userId;
	if(req.session.iFrameAuth){
		userId = req.session.userId;
	}else{
		if(req.user.provider == "facebook"){
			userId = req.user.id;
		}
		if(req.user.provider == "vkontakte"){
			userId = req.user.uid;
		}
	}
	console.log("\nAuth request from user : ", userId);
	var session = Server.instance.getSession(userId);
	if(session){
		console.log("Found previous session with userId: ", userId);
		if(Server.instance.authCallback){
			Server.instance.authCallback(session, function(){
				var obj = {
						accountId : session.accountId,
						userId : userId,
						initUpdate:session.sendData(true)
				};
				res.end(JSON.stringify(obj));
			});
		}else{
			var obj = {
					accountId : session.accountId,
					userId : userId,
					initUpdate:session.sendData(true)
			};
			res.end(JSON.stringify(obj));
		}
		return;
	}
	var session = new Session();
	session.init({
		"userId" : userId,
		"initData": req.session.initData,
		"callback": (function(){
//			res.writeContinue();
			console.log("Created Account with ID: ", session.accountId);
			console.log("Auth complete!");
			
			Server.instance.logEntities("On auth");
			Server.instance.logCache("On auth");
			if(Server.instance.authCallback){
				Server.instance.authCallback(session, function(){
					console.log("next() on auth callback entry point");
					var obj = {
							accountId : session.accountId,
							userId : userId,
							initUpdate:session.sendData(true)
					};
					res.end(JSON.stringify(obj));
				});
			}else{
				var obj = {
						accountId : session.accountId,
						userId : userId,
						initUpdate:session.sendData(true)
				};
				res.end(JSON.stringify(obj));
			}
		})
	});
	
	
};

Server.prototype.onCommunicate = function(req, res, next){
//	console.log("\n\nReceived data on communicate: \n", req.body,"\n\n");
//	if()
	var userId;
	if(req.session.iFrameAuth){
		userId = req.session.userId;
	}else{
		if(req.user.provider == "facebook"){
			userId = req.user.id;
		}
		if(req.user.provider == "vkontakte"){
			userId = req.user.uid;
		}
	}
	var	session = Server.instance.getSession(userId);
	if(!session){
		res.json({error: {description: "Dead session", code: 0}});
		return;
	}
	var	data = req.body;
	console.log("Request to change smth from user : ", userId);
//	console.log("Change data: ", data);
	Server.instance.receiveData(data, session);
//	EntityManager.instance.backupSession(session);	
//	console.log("session.entities right before response.end: ", session.entities);
	//console.log(session.entities);
	res.json(session.sendData(false));
//	next();
//	EntityManager.instance.backupAllEntities(Server.instance.entities, function(){
//
//	});
};

Server.prototype.onCommand = function(req, res, next){
	var entryTime = Date.now();
	var userId;
	if(req.session.iFrameAuth){
		userId = req.session.userId;
	}else{
		if(req.user.provider == "facebook"){
			userId = req.user.id;
		}
		if(req.user.provider == "vkontakte"){
			userId = req.user.uid;
		}
	}
	
	var	session = Server.instance.getSession(userId);
	if(!session){
		res.json({error: {description: "Dead session", code: 0}});
		return;
	}
	
	var json = req.body;
	var command = json['command'],
		args = json['args'];
	console.log("received command: %s;\nwith args: ", command, args, "\nfrom user: ", userId );
	Server.instance.executeCommand(command, args, session,function(result){
//		EntityManager.instance.backupAllEntities(Server.instance.entities, function(){
//
//		});
		console.log("Command execution time: ", Date.now() - entryTime);
		res.json(result);
	});
};

Server.prototype.logEntities = function(msg){
	console.log("Server Entities: ");
	for(var id in this.entities){
		this.entities[id].log(msg);
	}
};

Server.prototype.logCache = function(msg){
	console.log("Server Cache: ");
	for(var id in this.cache){
		this.cache[id].log(msg);
	}
};

Server.prototype.cleanUp = function(){
	
};


Server.prototype.start = function(app){
	
	
	function onClose(){
		 client.end();
		 authClient.end();
	};

	this.httpServer = http.createServer(app);	
	this.httpServer.on('close', onClose);
	this.httpServer.listen(app.get("port"), function(){
		console.log("Server has started on "+ app.get("port"));
	});
};

function getParentId(entity){
	return entity.parent instanceof Entity?entity.parent.id:entity.parent;
};
