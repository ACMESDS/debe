/**
@class DEBE.blogs
*/

var		// 3rd party
	JAX = require("mathjax-node");   //< servde side mathjax parser

var		// totem
	TOTEM = require("totem"),
	FLEX = require("flex"),	
	ENUM = require("enum");

const { Log, Copy } = ENUM;
const { getSite } = TOTEM;

module.exports = {
	d: docify,
	doc: docify,

	digits: 2,  // precision to show values in [JSON || #DOC || TEX] OP= [JSON || #DOC || TEX] expansions

	":=" : (lhs,rhs,ctx) => ctx.toEqn( "", lhs, rhs, ctx), 		// inline TeX

	/*
	"|=" : (lhs,rhs,ctx) => ctx.toEqn("a", lhs,rhs,ctx),		// Ascii Match
	";=" : (lhs,rhs,ctx) => ctx.toEqn("n", lhs,rhs,ctx),		// break TeX
	">=": (lhs,rhs,ctx) => ctx.toTag(lhs,rhs,ctx),			// [post](url) 
	"<=": (lhs,rhs,ctx) => {												// add context value or generator

		if ( rhs.split(",").length > 1) {
			eval(`
try {
ctx[lhs] = (lhs,rhs,ctx) => ctx.toTag( ${rhs} );
}
catch (err) {
} `);
		}

		else
			ctx[lhs] = rhs.parseEMAC( ctx );

		return ""; 
	},  */

	toEqn: (pre,lhs,rhs,ctx) => {		// expand [JSON || #DOC || TEX] OP= [JSON || #DOC || TEX] 

		function toTeX(val)  {
			var digits = ctx.digits;

			if (val)
				switch (val.constructor.name) {
					case "Number": return val.toFixed(digits);

					case "String": 
						//Log("tex str", val);
						return val;	

					case "Array": 
						var tex = []; 
						val.forEach( function (rec) {
							if (rec)
								if (rec.forEach) {
									rec.forEach( function (val,idx) {
										rec[idx] = toTeX(val);
									});
									tex.push( rec.join(" & ") );
								}
								else
									tex.push( toTeX(rec) );
							else
								tex.push( (rec == 0) ? "0" : "\\emptyset" );
						});	
						//Log("tex list", tex);
						return  "\\left[ \\begin{matrix} " + tex.join("\\\\") + " \\end{matrix} \\right]";

					case "Date": return val+"";

					case "Object": 
						var rtns = [];
						for (var key in val) 
							rtns.push( "{" + toTeX(val[key]) + "}_{" + key + "}" );

						return rtns.join(" , ");

					default: 
						return JSON.stringify(val);
				}

			else 
				return (val == 0) ? "0" : "\\emptyset";
		}

		function toDoc (arg) {
			switch ( arg.charAt(0) ) {
				case "#":
					return ("${doc(" + arg.substr(1) + ")}" ).parseEMAC(ctx).parseJSON( "?" );

				case "[":
				case "{":
					return arg.parseJSON({});

				default:
					var keys = arg.split(",");
					return (keys.length>1) ? keys : arg;
			}
		}

		return pre + "$$ " + toTeX( lhs.parseJSON(toDoc) ) + " = " + toTeX( rhs.parseJSON(toDoc) ) + " $$";
	},

	toTag: (lhs,rhs,ctx) => {
		var
			lKeys = lhs.split(","),
			rKeys = rhs.split(","),
			base = lKeys[0] + "$.",
			skin = rKeys[0],
			args = (rKeys[3] || "").replace(/;/g,","),
			opts = {
				w: rKeys[1],
				h: rKeys[2],
				x: lKeys[1] ? base + lKeys[1] : "",
				y: lKeys[2] ? base + lKeys[2] : "",
				r: lKeys[3] ? base + lKeys[3] : ""
			};

		for (var key in opts) if ( !opts[key] ) delete opts[key];

		//Log( base, view, "[post](/" + (skin+".view").tag("?",opts)+args + ")" );
		return "[post](/" + `${skin}.view`.tag("?",opts)+args + ")";
	}
};

[  // string prototypes
	
	// string serializers 
	function Xblog(req, ds, cache, ctx, rec, viaBrowser, cb) {
	/**
	@member String
	Expands markdown of the form:
		
		[ TEXT ] ( PATH.TYPE ? w=WIDTH & h=HEIGHT & x=KEY$INDEX & y=KEY$INDEX ... )  
		[ TEXT ] ( COLOR )  
		[ TOPIC ] ( ? starts=DATE & ends=DATE )  
		$$ inline TeX $$  ||  n$$ break TeX $$ || a$$ AsciiMath $$ || m$$ MathML $$  
		[JS || #JS || TeX] OP= [JS || #JS || TeX]  
		$ { KEY } || $ { JS } || $ {doc( JS , "INDEX" )}  
		KEY,X,Y >= SKIN,WIDTH,HEIGHT,OPTS  
		KEY <= VALUE || OP <= EXPR(lhs),EXPR(rhs)  
		
	using the supplifed cache to get/put KEY values, as well as block-escaping:
				
		HEADER:

			BLOCK

	and markdown scripting:

		MARKDOWN
		script:
		MATLAB EMULATION SCRIPT
		
	@param {Object} req Totem request
	@param {String} ds default dataset in [post](URL) markdown
	@param {Object} cache hash for cacheing markdown variables
	@param {Object} ctx hash holding markdown variables
	@param {Obect} rec record hash for markdown variables
	@param {Boolean} viaBrowser true to render markdown to browser
	@param {Function} cb callback(markdown html)
	*/
		
		for (var key in rec)  { // parse json stores
			try { 
				ctx[key] = JSON.parse( rec[key] ); 
			} 
			catch (err) { 
				ctx[key] = rec[key]; 
			}
		}
	
		var 
			blockidx = 0;
		
		Copy(TOTEM.blogContext, ctx);
		
		this.Xescape( [], (blocks,html) => // escape code blocks
		html.Xbreaks( html => // force new lines
		html.Xsection( html => // expand section headers
		html.Xscript( ctx, (ctx,html) => // expand scripts 
		html.Xkeys( ctx, html => // expand js keys
		html.Xgen(ctx, html => // expand generators
		html.Xtex( html => // expand TeX
		html.Xlink( req, ds, viaBrowser, html => { // expand links

			if ( viaBrowser )
				html = 	html.replace(/href=(.*?)\>/g, (str,ref) => { // smart links to follow <a href=REF>A</a> links
					var q = (ref.startsWith( "'" )) ? '"' : "'";
					return `href=${q}javascript:navigator.follow(${ref},BASE.user.client,BASE.user.source)${q}>`;
				});

			cb( html.replace(/@block/g, str => {  // backsub escaped blocks
					//Log(`unblock[${blockidx}]`, blocks[ blockidx].tag("code",{}) );
					return blocks[ blockidx++ ].tag("code",{}).tag("pre",{});
				}) );
			
		}))))))));
	},
	
	function Xbreaks( cb ) {
		cb( this.replace( /  \n/g, "<br>" ) );
	},
	
	function Xescape( blocks, cb ) { // escapes code blocks then callsback cb(blocks, html)
		var 
			key = "@esc",
			html = this,
			fetchBlock = function ( rec, cb ) {	// callsback cb with block placeholder
				//Log(`block[${blocks.length}] `, rec.arg1 );
				blocks.push( rec.arg2 );
				cb( rec.arg1 + ":" + "@block");
			},
			pattern = /(.*)\:\n\n((\t.*\n)+)\n/gm ;
		
		html.serialize( fetchBlock, pattern, key, (html, fails) => {  
			cb( blocks, html);
		}); 		
	},
	
	function Xdummy(cb) {  // for debugging with callback(this)
		cb(this);
	},
	
	function Xlink( req, ds, viaBrowser, cb ) {  // expands [LINK](URL) tags then callsback cb( final html )
		/*
		req = http request or null to disable smart hash tags (content tracking)
		ds = dataset?query default url path
		viaBrowser = true to enable produce html compatible with browser
		*/
		var 
			key = "@tag",
			html = this,
			//getSite = TOTEM.getSite,
			fetchTrack = function ( rec, cb) {  // callback cb with expanded [TOPIC]() markdown
				var 
					secret = "",
					topic = rec.topic,
					product = topic+".html";

				if (req)		// content tracking enabled
					if ( licenseCode = FLEX.licenseCode )
						licenseCode( req.sql, html, {  // register this html with the client
							_Partner: req.client,
							_EndService: "",  // leave empty so lincersor wont validate by connecting to service
							_Published: new Date(),
							_Product: product,
							Path: "/tag/"+product
						}, (pub, sql) => {
							if (pub) {
								cb( `${rec.topic}=>${req.client}`.tag( "/tags.view" ) );
								sql.query("INSERT INTO app.tags SET ? ON DUPLICATE KEY UPDATE Views=Views+1", {
									Viewed: pub._Published,
									Target: pub._Partner,
									Topic: topic,
									License: pub._License,
									Message: "get view".tag( "/decode.html".tag("?",{Target:pub._Partner,License:pub._License,Topic:topic}))
								});
							}
						});
				
					else
						Trace( "NO CODE LICENSOR" );
				
				else	// content tracking disabled
					cb( "" );
			},
			
			fetchSite = function ( rec, cb ) {  // callback cb with expanded [](URL) markdown
				//Log("solicit", rec, viaBrowser);
				if (viaBrowser) 
					cb( "".tag("iframe", {src:rec.arg3}) );
				
				else
					getSite( rec.arg3, null, cb );
			},
			
			fetchLink = function ( rec, cb ) {  // expand [LINK](URL) markdown
				
				var
					op = rec.arg1,
					opt = rec.arg2,
					url = rec.arg3;

				if (op) 	// OP [ LABEL] (URL )
					cb( `${op}[${opt}](${url})` );
				
				else
				if (opt)	//	[ LABEL ] ( URL )
					cb( opt.tag( url ) );

				else {	// [ ] ( URL )
					var
						colors = {
							r: "red", 
							b: "blue",
							g: "green",
							y: "yellow",
							o: "orange",
							k: "black",
							red: "red",
							blue: "blue",
							green: "green",
							yellow: "yellow",
							orange: "orange",
							black: "black"
						},						
						keys = {},
						dsPath = ds.parseURL(keys,{},{},{}),
						urlPath = url.parseURL(keys,{},{},{}),
						
						w = keys.w || 200,
						h = keys.h || 200,
						
						now = new Date(),

						x = urlPath.replace(/(.*)\.(.*)/, (str,L,R) => {
							urlName = L;
							urlType = R;
							return "#";
						}),
						
						srcPath = urlPath.tag( "?", Copy({src:dsPath}, keys) );

					
					// Log("link", [dsPath, srcPath, urlPath], keys, [opt, url]);

					switch (urlType) {  //  [](PATH.TYPE?w=W&h=H)
						case "jpg":  
						case "png":
							cb( "".tag("img", { src:`${url}?killcache=${new Date()}`, width:w, height:h }) );
							break;

						case "view": 
							if ( viaBrowser ) 
								cb( "".tag("iframe", { src: srcPath, width:w, height:h }) );
							
							else
								cb( urlPath.tag( url ) );
							
							break;

						default: 
							if ( viaBrowser )
								cb( "".tag("iframe", { src:srcPath, width:w, height:h }) );

							else
								fetchSite(rec, cb);

							/*
							if ( color = colors[urlPath.toLowerCase()] )		// [ TEXT ]( COLOR )
								cb( opt.tag("font",{color:color}) );
							*/
							/*
							else		// [ TEXT ]( URL )
							if ( (keys.starts ? now>=new Date(keys.starts) : true) && 
								 (keys.ends ? now<=new Date(keys.ends) : true) ) {
								rec.topic = opt;
								fetchTrack( rec, cb );
							}

							else
								cb( opt.tag( "/tags.view" ) );
							*/
							
							break;
					}
				}
			},
			
			pattern = /(\!?)\[([^\[\]]*)\]\(([^\)]*)\)/g ;
		
		html.serialize( fetchLink, pattern, key, html => {    
			cb(html);
		}); 
	},
	
	function Xinclude( cb ) {  // expands [LINK](URL) tags then callsback cb( final html )
		/*
		*/
		var 
			key = "@tag",
			html = this,
			
			fetchSite = function ( rec, cb ) {  // callback cb with expanded [](URL) markdown
				Log("include", rec.arg1.replace(/\&amp;/g,"&"));
				getSite( rec.arg1.replace(/\&amp;/g,"&"), null, cb );
			},
			
			pattern =/\$\[([^>]*)\]/g;
		
		html.serialize( fetchSite, pattern, key, html => {    
			cb(html);
		}); 
	},
	
	function Xscript( ctx, cb ) {  // expands scripting tags then callsback cb(vmctx, final markdown)
		var 
			script = "",
			pattern = /script:\n((.|\n)*)/g,  // defines MARKDOWN\nscript:\SCRIPT tag pattern
			run = this.replace( pattern , (str, xscript) => {
				script = xscript;
				return "";
			});
		
		if ( script )
			try {
				$( script, ctx, (vmctx) => {
					cb( vmctx , run);
				});
			}
			catch (err) {
				cb( ctx, err+"");
			}
		
		else 
			cb(ctx, run);
	},
		
	function Xkeys( ctx, cb ) {  // expand js keys ${script} || ${keys}
		cb( this.parseEMAC(ctx) );
	},
	
	function Xgen( ctx, cb ) {  // expands LHS OP= RHS tags

		var 
			pattern = /(\S*) := (\S*)/g;  // defines LHS OP= RHS tag
		
		cb( this.replace(pattern, (str,lhs,rhs) => {
			//Log([":=", lhs, rhs]);
			if ( blogOp = ctx[":="] ) 
				return blogOp(lhs,rhs,ctx);
			else
				return `undefined := blog`;
		}) );
	},
	
	function Xtex( cb ) {  // expands X$$ MATH $$ tags then callbacks cb( final html )
		var 
			key = "@tex",
			html = this,
			getSite = JAX.typeset,
			fetchTeX = function ( rec, cb ) {	// callsback cb with expanded TeX tag
				//Log("math",rec);
				switch (rec.arg1) {
					case "n":
						getSite({
							math: rec.arg2,
							format: "TeX",  
							//html: true,
							mml: true
						}, d => cb( d.mml || "" ) );
						break;
					case "a":
						getSite({
							math: rec.arg2,
							format: "AsciiMath",
							//html: true,
							mml: true
						}, d => cb( d.mml || "" ) );
						break;
					case "m":
						getSite({
							math: rec.arg2,
							format: "MathML", 
							//html: true,
							mml: true
						}, d => cb( d.mml || "" ) );
						break;
					case " ":
					default:
						getSite({
							math: rec.arg2,
							format: "inline-TeX",  
							//html: true,
							mml: true
						}, d => cb( " " + d.mml || "" ) );
				}
			},
			pattern = /(.?)\$\$([^\$]*)\$\$/g;
			
		html.serialize( fetchTeX, pattern, key, (html,fails) => { 
			cb(html);
		}); 
	},
	
	function Xparms(goto, cb) {		// expands <!---parms KEY=VAL&...---> tags then callbacks cb( final input-scripted html )
		var
			pattern = /<!---parms ([^>]*)?--->/g;
		
		cb( this.replace(pattern, (str, parms) => {
					
			//Log(">>>Xparms", parms);
			
			var 
				inputs = [],
				keys = [];

			parms.split("&").forEach( (parm) => {  // each collect parm (key=value) needs an input
				parm.replace(/([^=]*)?=(.*)?/, (str, key, val) => {		// key=value
					inputs.push( `${key}: <input id="parms.${key}" type="text" value="${val}" autofocus >` );
					keys.push( '"' + key + '"' );
					return "";
				});
				return "";
			});

			// this litle marvel submits all inputs to the goto service
			return `
<script>
	String.prototype.tag = ${"".tag}
	function submitForm() {
		var parms = {};
		[${keys}].forEach( (key) => parms[key] = document.getElementById("parms."+key).value );

		window.open( "/${goto}".tag("?", parms) );
	}
</script>
<form onsubmit="submitForm()">
	${inputs.join("")}
	<button id="parms.submit" type="submit" value="submit">submit</button>
</form>` ;

		}) );
	},
	
	function Xfetch( cb ) {  // expands <!---fetch URL---> tags then callsback cb( final url-fetched html )
		var 
			key = "@fetch",
			//getSite = TOTEM.getSite,
			fetchSite = function ( rec, cb ) {  // callsback cb with expanded fetch-tag 
				//Log(">>>>Xfetch", rec.arg1);
				getSite( rec.arg1, null, cb );
			},
			pattern = /<!---fetch ([^>]*)?--->/g;
			
		this.serialize( fetchSite, pattern, key, (html,fails) => cb(html) );
	},

	function Xsection( cb ) { // expand "##.... header" 
		var
			key = "@sec",
			fetchSection = function (rec, cb) {
				//Log(">>>header", rec.ID, rec.arg1, rec.arg0.length-rec.arg1.length-2 );
				cb( rec.arg1.tag( "h"+(rec.arg0.length-rec.arg1.length-2), {} ) );
			},
			pattern = /^\#* (.*)\n/gm;
		
		this.serialize( fetchSection, pattern, key, (html,fails) => cb(html) );
	}
	
	/*
	function Xskin( ctx, proxy, cb ) { // return a skin via a proxy site

		var 
			url = URL.parse(proxy || ""),
			host = proxy ? url.host.split(".")[0] : null,
			md = this, 
			header = proxy 
				? `img(src="/shares/images/${host}.jpg", width="100%", height="15%")`
				: "p",
			jade = ":markdown\n\t" + md.replace(/^\n* /,"").replace(/\n/g,"\n\t");

		ctx.filename = TOTEM.paths.jadeRef;
		
		try {
			cb( JADE.compile(jade, ctx) (ctx) );
		}
		catch (err) {
			// Log(err);
			cb( err+"" );
		}
	} */
	// //proxy ? this : this.replace(/\ * \ *Owner\ * \ */g,`**Owner** (${req.client})`),
].Extend(String);

function docify( obj , idx ) {
	var doc = {};

	if ( keys = idx ? idx.split(",") : null ) 
		keys.forEach( key => { 
			if ( key in obj ) doc[key] = obj[key];
		});

	else
		doc = obj;

	return (JSON.stringify(doc) || "").replace(/ /g,"").replace(/_/g,"").replace(/^/g,"");
}
		
JAX.config({		// for blogging
	MathJax: {
		tex2jax: {
			//displayMath: [["$$","$$"]]
		}
	}
});
JAX.start();			
