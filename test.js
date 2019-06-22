const {isObject,isArray,Log} = require("enum");

module.exports = function nodeify(store, path) {

	if ( isObject(store) ) // at an object node
		if ( path ) {
			var nodes = [];
			for (var key in store) {	// make nodes
				var 
					nodePath = path + ((key.charAt(0) == "_") ? key : "."+key),
					node = {
						name: key,
						doc: nodePath,
						size: 20,
						children: nodeify( store[key] || 0,  nodePath )
					};
				nodes.push(node);					
			}

			return nodes;
		}
	
		else {
			var subs = {};
			for ( var key in store ) {
				var 
					ref = subs, 
					rec = store[key], 
					groups = key.split("_"), 
					depth = groups.length-1;
				
				groups.forEach( (group,idx) => {
					var _key = "_" + group;
					
					if ( !ref[_key] ) ref[_key] = (idx<depth) ? {} : rec;
					
					ref = ref[_key];
				});
			}
			return nodeify( subs, "root" );
		}
			
	else	// at an array node
	if ( isArray(store) ) {
		var 
			key = "[0]",
			nodePath = (path || "") + key,
			node = { 
				name: key,
				size: 50,
				doc: nodePath,
				children: nodeify( store[0] || 0, nodePath )
			};
		return node;
	}

	else	// at a leaf node
		return null;

}
