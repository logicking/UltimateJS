/*
 * Provides write\read to\from DB Entities(Accounts)
*/

var serverSnapshot = require(path.join(__dirname, "../resources/gameServerSnapshot.json"));


function EntityManager(){
	EntityManager.instance = this;
	var commands = null;
};

EntityManager.prototype.init = function(params){
	this.eClient = params["entityClient"];
	commands = new Object();
};

EntityManager.prototype.getAccountDefaultUpdate = function(accountID, replacedNames){
//	console.log("template", template);
	var template = JSON.parse(JSON.stringify(serverSnapshot));
	var object = {};
	var names = {};
	var id;
	for(var name in template){
//		if(global[template[name]["class"]] instanceof Account){
//			console.log("We found account")
//		}
		if(template[name]["root"] == true) id = accountID; 
		else id = uniqueId().toString();
		names[name] = id;
		object[id] = template[name];
	}
//	console.log("names: ",names);
//	console.log("obj: ", object);
	for(var id in object){
		var curJSON = object[id];
//		console.log("Current JSON:", curJSON);
		for(var propName in curJSON){
			var rememberedName;
			if(rememberedName = names[curJSON[propName]]){
				curJSON[propName] = rememberedName;
			}
		}
	}	
//	console.log("Created Entities record with unique IDs: ", object);
	//account.readGlobalUpdate(obj);
	//console.log("Account After Reading default global update: ", account);
	return object;
};

//
//EntityManager.prototype.backupSession = function(session){
//	assert(session || session instanceof Session, "Bad session arg on backup");
//	this.eClient.query("UPDATE account_data SET data = $1 WHERE account = $2",
//	[ JSON.stringify(session.sendData()), session.accountID ]).on("error", function(error){
//		console.log(error);
//	});
//};

EntityManager.prototype.getAccountEntities = function(accountID, callback){
	assert(Server.instance.entities[accountID], "No such Account in Entities with accID ", accountID);
	var query = this.eClient.query("SELECT * FROM account_data WHERE account = $1 LIMIT 1", [accountID]);
	query.on("error", function(error){
		console.log(error);
	});
	query.on("row", function(row){
		if(callback){
			callback(JSON.parse(row.data));
		}
	});
};
//
//EntityManager.prototype.createSessionRecord = function(session){
//	assert(session || session instanceof Session, "Bad session arg on createRecord");
//	console.log("Creating Record");
//	var query = this.eClient.query("INSERT INTO " + s + "(account, data) VALUES  ($1, $2)", [  session.accountID, JSON.stringify( session.sendData() ) ]);
//	query.on("error", function(error){
//		console.log(error);
//	});
//	query.on("end", function(){
//		console.log("Created Record for userID: %s with accID: %s", session.userId, session.accountID );
//	});
//};


EntityManager.prototype.backupEntity = function(entity, callback){
	var that = this;
	var data = {};
	var id = entity.id;
//	console.log("Entity passed to backup\n", entity, "\n");
	entity.writeUpdate(data, new Object());
	var entityData = data[id];
//	console.log("EntityData on backup: ", entityData);
	var query = this.eClient.query( "SELECT * FROM " + sconf.entity_table + " WHERE id = $1" , [id] );
	query.on("end", function(result){
		var innerQuery;
		if(result.rowCount > 0)	{
//			console.log("Updating entity: ", entity);
			innerQuery = that.eClient.query("UPDATE " + sconf.entity_table + " SET data = $2, parentid = $3  WHERE id = $1",
					[ id, JSON.stringify( entityData ), (getParentId(entity)?getParentId(entity):"")]);

		}else{
//			console.log("Inserting entityData: ", entityData );
			innerQuery = that.eClient.query("INSERT INTO " + sconf.entity_table + "(id, data, parentid) VALUES  ($1, $2, $3) ",	
					[ id, JSON.stringify( entityData ), (getParentId(entity)?getParentId(entity):"")]);

		}
		innerQuery.on("end", function(){
//			console.log("BackupEntity callback");
			if(callback){
				callback();
			}
		});
		
	});
};

EntityManager.prototype.getEntity = function(id, addParams, callback){
	var callbacked = false;
	if((typeof addParams == Function )&&(!callback)){
		callback = addParams;
		addParams = {};
	}
	var query = this.eClient.query("SELECT * FROM " + sconf.entity_table + " WHERE id = $1 LIMIT 1", [ id ]);
	query.on("error", function(error){
		console.log(error);
	});
	query.on("row", function(row){
		var data = {};
		var obj = JSON.parse(row.data);
		obj['id'] = id;
		extend(obj, addParams);
		data[id] = obj;
		var entity = EntityManager.instance.createEntity(data[id]);
//		console.log("NEW ENTITY", entity);
		if(callback){
//			entity.log("on Manager getEntity callback");
			callback(entity);
			callbacked = true;
		}
	});
	
	query.on("end", function(result){
		if(!callbacked && (result.rowCount == 0)){
			if(callback){
				callback(null);
			}
		}
	});
};

//field ID should be specified in JSON
EntityManager.prototype.createEntity = function(json){
//	console.log("trying to create from: ", json);
	return entityFactory.createObject(json["class"], json);
};

EntityManager.prototype.collectByParent = function(parentID, callback){
	var finaldata = {};
	var getSize = function(obj) {
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
	    return size;
	};
	var size = 0, counter = 0;
	var recurciveCollect = function(finaldata, data, reccallback){
		//extend(true, finaldata, data);
		extend(finaldata, data);
//		size = size + calcSize(data);
		if((getSize(data) == 0)&&(counter == size)){
			reccallback(finaldata);
		}
		for(var id in data){
			size = size + 1;
//			console.log("counter: ", counter);
			EntityManager.instance.getEntityByParent(id, function(data){
				recurciveCollect(finaldata, data, reccallback);
				counter = counter + 1;
//				console.log("counter: ", counter);
				if(counter == size){
					reccallback(finaldata);
				}
			});
		}
	};
	
	EntityManager.instance.getEntityByParent(parentID, function(data){
		recurciveCollect(finaldata, data, callback);
	});
//	
//	EntityManager.instance.getEntityByParent(parentID, function(fdata){
//		utils.extend(true, data, fdata);
//		for(var id in fdata){
//			loopCounter = loopCounter + 1;
////			console.log("loopCounter: ", loopCounter);
//			EntityManager.instance.getEntityByParent(id, function(ndata){
//				callbackCounter = callbackCounter + 1;
////				console.log("callbackCounter: ", callbackCounter);
//				utils.extend(true, data, ndata);
//				callbacked = true;
//				if(callback && (callbackCounter == loopCounter) ){
//					console.log("Collected by parent: ", data);
//					callback(data);
//				}
//			});	
//		}
//		if(!callbacked && callback){
//			console.log("Collected by parent: ", data);
//			callback(data);
//		}
//	});
};

EntityManager.prototype.getEntityByParent = function(parentID, callback){
	var data = {};
//	console.log("getEntityByParentCall");
	var query = this.eClient.query("SELECT * FROM " + sconf.entity_table + " WHERE parentid = $1", [parentID]);
	query.on("row", function(row){
		data[row.id] = JSON.parse( row.data );
	});
	query.on("end", function(result){
		if(callback){
//			console.log("Got entities by parentID: %s; data = ", parentID, data);
			callback(data);
		}
	});
};

EntityManager.prototype.backupAllEntities = function(entities, callback){
	var loopCounter = 0, callbackCounter = 0;
	for(var id in entities){
		loopCounter = loopCounter + 1;
//		console.log("loopCounter ", loopCounter );
		EntityManager.instance.backupEntity(entities[id], function(){
			callbackCounter = callbackCounter + 1;
//			console.log("callbackCounter ", callbackCounter );
			if(callback && (callbackCounter == loopCounter)){
				callback();
			}	
		});
	}
	if(loopCounter == 0){
		if(callback){
			callback();
		}
	}
};


EntityManager.prototype.classIsRegistered = function(className){
	return entityFactory.isRegistered(className);
};

EntityManager.prototype.stringify = function(data, forbiddenKeys){
	var replacer = function(key, value){
		for(var i in forbiddenKeys){
			if(key == forbiddenKeys[i]){
				return undefined;
			}
		}
	};
	return JSON.stringify(data, replacer);
};

EntityManager.prototype.getAccIdByUserId = function(userId, callback){
	var rows = [];
//	console.log(this);
	var query = this.eClient.query( "SELECT * FROM " + sconf.users_accounts_table + " WHERE userId = $1", [ userId ] );
	query.on( "error", function(error){
		console.log("Session INIT Error on Request FROM DB\n", error);
	});
	
	query.on('row', function(row){
		rows.push(row);
	});
	
	query.on("end", function(result){
		if(result.rowCount == 0){
			callback(null);
			return;
		}
		callback(rows[0].account);
	});
};


EntityManager.prototype.getAccountIdsByUserIds = function(ids, callback){
	var that = this;
	var rows = [];
	if(ids.length == 0){
		callback(rows);
		return;
	}
	if(ids.length > 50){
//		console.log("ids length before: ", ids.length);
		var ids50 = ids.splice(0, 50);
//		console.log("ids length after: ", ids.length);
		that.getAccountIdsByUserIds(ids50, function(srows){
			if(srows){
				rows = rows.concat(srows);
			}
			that.getAccountIdsByUserIds(ids, function(srows){
				if(srows){
					rows = rows.concat(srows);
				}
				callback(rows);
			});
		});
		return;
	}
	var queryString = "SELECT * FROM " + sconf.users_accounts_table + " WHERE ";
	for(var i=0;i<ids.length;i++){
		queryString += "userId = $" + (i+1).toString() + " ";
		if(i<ids.length-1){
			queryString += "OR ";
		}
	}
//	console.log("QueryString: ", queryString);
	var query = this.eClient.query(queryString, ids);
	query.on("error", function(error){
		console.log(error);
		if(callback){
			callback(null);
		}
	
	});
	
	query.on("row", function(row){
		rows.push(row);
	});
	
	query.on("end", function(result){
		process.nextTick(function(){
			if(!result){
				if(callback){
					callback(null);
				}
				return;
			}
			if(result.rowCount == 0){
				callback(null);
				return;
			}
			callback(rows);
		});
		
	});
};


function extend(data, addData){
	for(var index in addData){
		if(!data[index]){
			data[index] = addData[index];
		}else{
			if( (data[index] instanceof Object)&(addData[index] instanceof Object) ){
				extend(data[index], addData[index]);
			}else{
				data[index] = addData[index];
			}
		}
	}
}
