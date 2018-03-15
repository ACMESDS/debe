Array.prototype.each = function ( cb ) {
	for (var n=0,N=this.length; n<N; n++) cb( n, this[n] );
}


Array.prototype.forEach = function ( cb ) {
	for (var n=0,N=this.length; n<N; n++) cb( this[n] );
} 

Array.prototype.get = function(idx, key) {
	var keys = key.split(","), K = keys.length, rtns = [], recs = this, at = Object.keys(idx)[0], match = idx[at];

	if ( keys[0] && at )
		for (var n=0, N=recs.length; n<N; n++) {
			var rec = recs[n], rtn = {};

			if ( rec[at] == match )  {
				for (var k=0; k<K; k++) {
					var key = keys[k];
					rtn[key] = rec[key];
				}
				rtns.push(rtn);
			}
		}
}

String.prototype.tag = function tag(el,at) {
/**
@method tag
Tag url (el=?|&), list (el=;|,), or tag html using specified attributes.
@param {String} el tag element
@param {String} at tag attributes
@return {String} tagged results
*/

	if ( "?&;,".indexOf(el) >= 0 ) {  // tag a url or list
		var rtn = this+el;

		if (at) for (var n in at) {
				rtn += n + "=";
				switch ( (at[n] || 0).constructor ) {
					//case Array: rtn += at[n].join(",");	break;
					case Array:
					case Date:
					case Object: rtn += JSON.stringify(at[n]); break;
					default: rtn += at[n];
				}
				rtn += "&";
			}

		return rtn;				
	}

	else {  // tag html
		var rtn = "<"+el+" ";

		if (at) for (var n in at) rtn += n + "='" + at[n] + "' ";

		switch (el) {
			case "embed":
			case "img":
			case "link":
			case "input":
				return rtn+">" + this;
			default:
				return rtn+">" + this + "</"+el+">";
		}
	}
}

function parse(x,def) {
	try {
		return x ? JSON.parse("[" + x + "]") : def;
	}
	catch (err) {
		return x ? x.split(",") : def;
	}
}

function source(opts, cb) {
	function jsonize(rec) {
		for (var key in rec) 
			if ( val = rec[key] )
				if (val.constructor == String)
					try {
						rec[key] = JSON.parse(val);
					}
					catch (err) {
						rec[key] = {};
					}
	}

	function loader(ds, ctx) {
		for (var key in {x:1,y:1}) {
			//alert( `index: ctx.${key} = ${ctx[key]}` );
			try {
				eval( `ctx.${key} = ${ctx[key]}` );
			}
			catch (err) {
				ctx[key] = 0;
			}
		}
	}

	//alert( "source: "+opts.ds );

	if (opts.debug || true)  alert( JSON.stringify(opts) ); 

	d3.json( opts.ds.tag("?", {x:opts.x, y:opts.y}) , function (recs) {
		alert( recs ? "got data" : "no data" );
		//alert(JSON.stringify(recs));
		
		if ( opts.data = recs)
			if ( recs.constructor == Array)
				if ( rec = recs[0] ) {
					//jsonize( rec );
					//loader( rec, opts );
					cb( opts );
				}
				else {
				}
			
			else
				cb( opts );
			
	}); 

	/*
	else
	if ( opts.pivots )
		d3.json( `/${opts.ds}?_pivot=${opts.pivots}`, function (recs) {
			if ( opts.data = recs )
				cb( opts );
		});
		
	else
		d3.json( `/${opts.ds}`, function (recs) {
			if ( opts.data = recs )
				cb( opts );
		});*/
			
}
