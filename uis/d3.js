const { Ajax, Log, Copy, Each, isString, isArray, isFunction, typeOf } = BASE;

function Fetch(opts, cb) {
/**
@method BASE.Fetch
Callback cb(recs, svg) with a d3 svg dom target, and the records recs = [rec, ...] that
were loaded from the source path that, for example, contains $KEYs:

	opts.ds = "/src ? Name=$KEY & x:=STORE$.x[$KEY] & y:=STORE$.y[$KEY] ..." 

as updated by optional KEY dom-inputs:

	opts.KEY = [ ARG, ... ] || { RTN: SELECT, ... } || { min: VAL, max: VAL, step: VAL} || callback

where the callback() returns a value.

@param {Object} opts source loading options {ds: "/path", ... }
@param {Function} cb callback(recs)
*/

	function fetchData( path, opts ) {
		/* 
		There are problems with d3.json: 
			(1) d3 became version dependent as  v4+ uses (sometime flakey) promise structure
			(2) d3.json() fails when loading on a https thread
		Thus we use ajax instead.
		*/
		if (false) 	{ // use d3 to fetch
			if ( d3.version.startsWith("3.") )	// older v3
				d3.json( path, (err, recs) => {
					if (err) 
						alert( err+"" );

					else {					
						if (opts.debug>1) alert("recs"+JSON.stringify(recs));

						if ( recs ) cb( isArray(recs) ? recs : [recs] , opts.svg );
					}
				});

			else // newer v4+
				d3.json( path ).then( recs => {
					if (opts.debug>1) alert("recs"+JSON.stringify(recs));

					if ( recs ) cb( isArray(recs) ? recs : [recs] , opts.svg );
				});
		}

		else 
			Ajax("GET", true, path, data => {
				if (opts.debug>1) alert("data"+data);

				if ( data = JSON.parse(data) ) cb( data , opts.svg );
						//cb( isArray(recs) ? recs : [recs] , opts.svg );
			});
	}

	if ( isString(opts) ) 
		fetchData( opts, {} );

	else {
		if (opts.debug) alert( "opts: "+JSON.stringify(opts) ); 

		d3.select("svg").remove();

		var 
			body = d3.select("body"),
			dims = opts.dims || { margin: null },
			margin = dims.margin || {top: 20, right: 90, bottom: 30, left: 90},
			svg = opts.svg = body.append("svg") 
							.attr('width', (dims.width || 1200) - margin.left - margin.right )
							.attr('height', (dims.height || 500) - margin.top - margin.bottom ),
							//.append("g")
							//	.attr("transform", dims.transform ? dims.transform.parseEMAC(dims) : ""),

							//.append("g")
							//.attr("transform", "translate(" + opts.dims.margin.left + "," + opts.dims.margin.top + ")"),

			widgets = opts.widgets || {},
			inputs = {};

		var 
			body = d3.select("body"),
			url = opts.url || "",
			family = (opts.family || "").split(",");

		url.replace( /\/(.*).view[\?]?(.*)/, (str,view,query) => {
			family.forEach( (fam,n) => family[n] = fam.tag( `/${fam}.view?${query}` ) );
		});

		"p".d3add(body,	{ html: family.join(" || ")	} );

		opts.ds.replace(/\$(\w+)/g, (str,key) => {
			
			function onChange() {
				var path = opts.ds;
				Each(widgets, (key,widget) => {	// scan thru all defined widgets
					if ( input = inputs[key] ) {	// process only used widgets
						var 
							el = input._groups[0][0], //  d3v3 uses input[0][0] because dom is a major kludge!
							value = el.value,
							id = el.id,
							key = id.substr(1),
							reg = new RegExp( `\\$${key}` , "g" );

						path = path.replace( reg, isFunction(widget) ? widget("update", value) : value );
					}
				});

				Log(`ds => ${path}`);
				fetchData( path, opts );
			}
			
			var 
				id = "_"+key,
				widget = widgets[key],
				input = inputs[key];

			if ( widget ) 
				if ( !input ) {
					switch ( typeOf(widget) ) {
						case "Function":
							input = "input".d3add(body, {type: "button", value: "key", id:id} ).on("click", widget);
							break;

						case "Array":
							input = "input".d3add(body, {type: "text", value: widget[0], id:id} ).on("change", onChange);
							break;

						case "Object":
							if ( "min" in widget)
								input = "input".d3add(body, {type: "number", min: widget.min, max: widget.max, step: widget.step, value: widget.min, id:id} ).on("change", onChange);

							else {
								input = "select".d3add(body, { value: "", id:id} ).on("change", onChange);

								for ( var key in widget ) 
									input.insert("option").attr( "value", key ).text( widget[key] );
							}
							break;

						case "Number":
							input = "input".d3add(body, {type: "number", value: widget, id:id} ).on("change", onChange);
							break;

						case "String":
							input = "input".d3add(body, {type: "text", value: widget, id:id} ).on("change", onChange);
							break;

					}

					inputs[key] = input;
					//Log( `make widget ${key} id = ${id}` );
				}
		});

		if ( save = widgets.save )
		"input".d3add(body, {type: "button", value: "save", id: "_save"} ).on("click", save);
		
		fetchData( opts.ds.replace(/\$\w+/g, "0"), opts );
	}
}

[
	function d3add (d3el, attrs ) {
		var el = d3el.append(this);

		for (key in attrs) {
			//alert("tag "+key+" " + attrs[key]);
			switch (key) {
				case "text":
				case "html":
					el[key]( attrs[key] ); 
					break;
				case "xstyle":  // seems to crash so x-ed out
					el.style( attrs[key]); 
					break;
				default:
					el.attr(key, attrs[key]);
			}
		}

		return el;
	}
].Extend(String);
