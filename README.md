/**
@class debe [![Forked from SourceForge](https://sourceforge.net)]
# DEBE

DEBE integrates TOTEM, FLEX, CHIPPER and ENGINE into a web service for managing client interface, requirements, project 
metrics, geoint products and workflows.

Simply require DEBE and start it:

	var DEBE = require("debe").config(options, function (err) {
		// server callback on startup
	});
	
DEBE options use the [ENUM copy()](https://git.geointapps.org/acmesds/enum) conventions:

	options =  {
		key: value, 						// set 
		"key.key": value, 					// index and set
		"key.key.": value,					// index and append
		OBJECT: [ function (){}, ... ], 	// add prototypes
		Function: function () {} 			// add callback
		:
		:
	}

In addition to [TOTEM](https://git.geointapps.org/acmesds/totem) options, DEBE accepts:

	isSpawned: false, //< Enabled when this is child server spawned by a master server
	soapCRUD : {...},  //< action:route hash for XML-driven engines
	blindTesting: false, //< Enable for double-blind testing (make FLEX susceptible to sql injection attacks)
	statefulViews: {...}, //< Jade views that require  the stateful URL

but its default values suffice.

## Installation

Download the latest version with

	git clone https://git.geointapps.org/acmesds/debe
	
Typically, you will want to redirect the following to your project:

	ln -s ../myproject/test.js test.js 					# unit testing
	ln -s ../myproject/maint.sh maint.sh 			# test startup and maint scripts
	ln -s ../myproject/myCertsFolder certs		# contains name.pfx cert and truststore folder 

## Examples

Below sample are from the totem/test.js unit tester.  See Totem's [DEBE](https://git.geointapps.org/acmesds/debe) 
for a far more complex use-case.  You may  also find Totem's [DSVAR](https://git.geointapps.org/acmesds/dsvar) 
useful, if you wish to learn more about its database agnosticator.

### D1 - Encypted with a database

	var DEBE = require("../debe").config({
		name: ENV.SERVICE_NAME,
		encrypt: ENV.SERVICE_PASS,
		mysql: {
			host: ENV.MYSQL_HOST,
			user: ENV.MYSQL_USER,
			pass: ENV.MYSQL_PASS
		}
	}, function (err) {
		Trace( err || "Yowzers - An encrypted DEBE service with a database" );
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
		"reader.": {
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