Array.prototype.each = function ( cb ) {
	for (var n=0,N=this.length; n<N; n++) cb( n, this[n] );
}

Array.prototype.forEach = function ( cb ) {
	for (var n=0,N=this.length; n<N; n++) cb( this[n] );
}

String.prototype.tag = function (el,at) {
	var rtn = "<"+el+" ";

	if (at)  
		for (var n in at) rtn += n + "='" + at[n] + "' ";

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

	function loader(r, ctx) {
		for (var key in {x:1,y:1,ys:1}) {
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

	if (opts.debug)  alert( JSON.stringify(opts) ); 

	d3.json( opts.ds, function (recs) {
		//alert( recs ? "got data" : "no data" );
		//alert(JSON.stringify(recs));
		
		if ( opts.data = recs)
			if ( recs.constructor == Array)
				if ( rec = recs[0] ) {
					jsonize( rec );
					loader( rec, opts );
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
