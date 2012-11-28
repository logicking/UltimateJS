/**
 * AbstractFactory
 */


function AbstractFactory() {
	var objectLibrary = new Object();

	this.addClass = function(clazz, createFunction) {
		
		var classId;
		if(typeof(clazz) == "function") {
			classId = clazz.prototype.className;
			createFunction = clazz.prototype.createInstance;
		} else {
			classId = clazz;
		}
		
		assert(typeof (classId) == "string", "Invalid classId: " + classId);
		assert(typeof (createFunction) == "function", "Invalid createInstance function for" + " classId " + classId);
		objectLibrary[classId] = createFunction;
//		console.log("Added class: ", classId, "     ", createFunction);
	};

	this.createObject = function(classId, args) {
		var createFunc = objectLibrary[classId];
		//assert(typeof (createFunc) == "function", "classId: " + classId + " was not properly registered.");
		if(typeof (createFunc) != "function"){
			console.log("classId: " + classId + " was not properly registered.");
			return args;
		}
		var obj = null;
		if (typeof (args) == "array") {
			obj = createFunc.apply(null, args);
		} else {
			obj = createFunc.call(null, args);
		}
		return obj;
	};
	
	this.isRegistered = function(clazz){
		return typeof (objectLibrary[classId]) == "function";
	};

	this.createObjectsFromJson = function(jsonData, preprocessParamsCallback, onCreateCallback) {
		var objects = new Object();
		var that = this;
		$['each'](jsonData, function(name, value) {
			var params = value["params"];
			assert(params, "Params field not specified in '" + name + "'");
			params['name'] = name;
			if (preprocessParamsCallback) {
				preprocessParamsCallback(name, params);
			}
			obj = that.createObject(value["class"], params);
			objects[name] = obj;
			if (onCreateCallback) {
				onCreateCallback(name, obj, params);
			}
		});

		return objects;
	};
};



/**
 * Entity Factory
 */

var entityFactory = new AbstractFactory();


entityFactory.createEntitiesFromJson = function(json) {
	this.createObjectsFromJson(json, function(name, params) {
		params['id'] = name;
	}, function(name, obj, params) {
		assert(Account);
		//Account.instance.addEntity(obj, name, params);
	});
};
