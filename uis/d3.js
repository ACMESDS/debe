Array.prototype.each = function ( cb ) {
	for (var n=0,N=this.length; n<N; n++) cb( n, this[n] );
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
			try {
				rec[key] = JSON.parse(rec[key]);
			}
			catch (err) {
			}
	}

	function loader(r, ctx) {
		for (var key in {x:1,y:1,ys:1}) {
			//alert( `index: ctx.${key} = ${ctx[key]}` );
			eval( `ctx.${key} = ${ctx[key]}` );
		}
	}

	//alert( `source: /${opts.ds}?ID=${opts.ID}` );

	if (opts.debug)  alert( JSON.stringify(opts) ); 

	d3.json( `/${opts.ds}?ID=${opts.ID}`, function (recs) {
		//alert("recs="+recs.length);

		if ( rec = recs[0] ) {
			jsonize( rec );
			loader( rec, opts );
			cb( opts );
		}
	}); 
}
