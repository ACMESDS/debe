/**
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](https://github.com/acmesds/debe.git) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.weat.nga.ic.gov/acmesds/debe.git)
	
# DEBE

DEBE stacks the [FLEX database extender](https://github.com/acmesds/flex), the
[CHIPPER earth-focused data segmenter and workflow manager](https://github.com/acmesds/chipper) ,
and the [ENGINE language agnostic computer](https://github.com/acmesds/engine) above 
the [TOTEM base web service](https://github.com/acmesds/totem) to provide a web service for 
managing interfaces, requirements, project metrics, geoint products and workflows.  

As documented in its [api](/api.view), DEBE extends [TOTEM](https://github.com/acmesds/totem)'s 
/DATASET.TYPE?QUERY endpoints with various TYPE convertors:

	kml, flat, txt, tab, tree, delta, encap, nav
	
page skinners:

	view | run | plugni | pivot | site | spivot | brief | gridbrief | pivbrief | runbrief

an engine / workflow starter:

	exe
	
and file attribute getters:

	code, jade, classif, readability, client, size, risk
	
As documented in its [api](/api.view), DEBE also extends  [TOTEM](https://github.com/acmesds/totem)'s  
QUERY flags with:

	_save, _browse, _view, _blog, _json

DEBE provides its page skinners a context of useful parameters and methods, as described in 
its [skinguide](/skinguide.view).

## Installation

Clone from one of the repos.  You will typically want to redirect the following to your project

	ln -s PROJECT/totem/test.js test.js 			# unit testing
	ln -s PROJECT/totem/maint.sh maint.sh 		# test startup and maint scripts
	ln -s PROJECT/totem/certs certs					# truststore folder for name.pfx certs 
	ln -s PROJECT/JPGS captcha 	 				# folder for captcha digits

## Databases

openv.apps  Reads on start() to derive command line parms
app.X Table X read for job parameters in a .exe route

## Use

Simply require, configure and start DEBE:

	var DEBE = require("debe").config({
		key: value, 						// set key
		"key.key": value, 					// indexed set
		"key.key.": value,					// indexed append
		OBJECT: [ function (){}, ... ], 	// add OBJECT prototypes 
		Function: function () {} 			// add chained initializer callback
		:
		:
	}, function (err) {
		console.log( err ? "something evil happended" : "Im running");
	});

where its configuration keys follow [ENUM copy()](https://github.com/acmesds/enum) conventions and
are described in its [PRM](/shares/prm/debe/index.html).

The following examples are from TOTEM's test.js unit tester.  You may also find 
Totem's [DSVAR](https://github.com/acmesds/dsvar) useful, if you wish to learn more about its 
database agnosticator.

### D1 - Encypted with a database

	var DEBE = require("../debe").config({
		name: ENV.SERVICE_NAME,
		mysql: {
			host: ENV.MYSQL_HOST,
			user: ENV.MYSQL_USER,
			pass: ENV.MYSQL_PASS
		},
		watch: {
			"./uploads": function (file) {
			}
		}

	}, function (err) {
		Trace( err || "Yowzers - An encrypted DEBE service with a database watching files in uploads area" );
	});

### D2 - D1 plus an endpoint

	var DEBE = require("../debe").config({
		mysql: {
			host: ENV.MYSQL_HOST,
			user: ENV.MYSQL_USER,
			pass: ENV.MYSQL_PASS
		},
		"worker.": {
			wfs: function (req,res) {
				res("here i go again");

				TOTEM.fetchers.http(ENV.WFS_TEST, function (data) {
					console.log(data);
				});
			}

		}
	}, function (err) {
		Trace( "This bad boy in an encrypted service with a database and has an /wfs endpoint" );
	});
		
		
## License

[MIT](LICENSE)

*/