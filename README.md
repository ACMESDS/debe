/**
@class debe [![Forked from SourceForge](https://sourceforge.net)]
# DEBE

DEBE integrates [TOTEM](https://github.com/acmesds/totem), [FLEX](https://github.com/acmesds/flex),
[CHIPPER](https://github.com/acmesds/chipper) and [ENGINE](https://github.com/acmesds/engine) into a 
web service for managing client interface, requirements, project metrics, geoint products and workflows.

Simply require DEBE and start it:

	var DEBE = require("debe").config(options, function (err) {
		// server callback on startup
	});
	
DEBE options use the [ENUM copy()](https://github.com/acmesds/enum) conventions:

	options =  {
		key: value, 						// set 
		"key.key": value, 					// index and set
		"key.key.": value,					// index and append
		OBJECT: [ function (){}, ... ], 	// add prototypes
		Function: function () {} 			// add callback
		:
		:
	}

DEBE's extends [TOTEM](https://github.com/acmesds/totem)'s DATASET.TYPE renders to include:

	+ data converters: kml, flat, txt, tab, tree, delta, encap, nav
	+ site rendering: view
	+ data chipping: exe
	+ file attributes: code, jade, classif, readability, client, size, risk
	
site context methods

	json, gridify, tag, get, hover
	
and request flags

	save, browse, view, blog, json

as described in its [skinguide](/skinguide.view) and its [api](/api.view).

In addition to [TOTEM](https://github.com/acmesds/totem) options, DEBE accepts:

	billingCycle: 0, //< Interval [ms] to job billings
	diagCycle: 0, //< Interval [ms] to run self diagnostics
	isSpawned: false, //< Enabled when this is child server spawned by a master server
	soapCRUD : {...},  //< action:route hash for XML-driven engines
	blindTesting: false, //< Enable for double-blind testing (make FLEX susceptible to sql injection attacks)
	statefulViews: {...}, //< Jade views that require  the stateful URL

but its default values suffice.  

## Installation

Download the latest version with

	git clone https://github.com/acmesds/debe
	
Typically, you will want to redirect the following to your project:

	ln -s PROJECT/totem/test.js test.js 			# unit testing
	ln -s PROJECT/totem/maint.sh maint.sh 		# test startup and maint scripts
	ln -s PROJECT/totem/certs certs					# truststore folder for name.pfx certs 
	ln -s PROJECT/JPGS captcha 	 				# folder for captcha digits

## Examples

Below sample are from the totem/test.js unit tester.  You may  also find Totem's [DSVAR](https://github.com/acmesds/dsvar) 
useful, if you wish to learn more about its database agnosticator.

### D1 - Encypted with a database

	var DEBE = require("../debe").config({
		name: ENV.SERVICE_NAME,
		encrypt: ENV.SERVICE_PASS,
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
		encrypt: ENV.SERVICE_PASS,
		riddles: 10,
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