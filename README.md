/**
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](https://github.com/acmesds/debe.git) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.weat.nga.ic.gov/acmesds/debe.git)
	
# DEBE

DEBE extends [TOTEM simple web service](https://github.com/acmesds/totem) with
the [FLEX database extender](https://github.com/acmesds/flex), 
[CHIPPER earth imaging](https://github.com/acmesds/chipper),
and [ENGINE compute](https://github.com/acmesds/engine) modules to provide a web service 
that manages its content, interfaces, requirements, project metrics, geoint products and workflows.  

As documented in its api, DEBE provides ENDPOINTs:

	(select) GET 	 /NODE $$ NODE ...
	(update) PUT 	 /NODE $$ NODE ...
	(insert) POST 	 /NODE $$ NODE ...
	(delete) DELETE /NODE $$ NODE ...

 to access a NODE:

	DATASET.TYPE ? QUERY ? QUERY ...
	ENGINE.TYPE ? QUERY ? QUERY ...
	FILEPATH.TYPE ? QUERY ? QUERY ...
	COMMAND.TYPE ? QUERY ? QUERY ...

using an optional QUERY:

	KEY=VALUE & EXPRESSION ...

DEBE provides default TYPEs to format data:

	db | xml | csv | txt | tab | tree | flat | kml | encap | html | json | geojson

render a view/skin:

	view | pivot | site | spivot | brief | gridbrief | pivbrief | run | plugin | runbrief

run an engine:

	exe

provide attributes:

	delta | nav | stat
	
or generate office files:

	pdf | xdoc | xppt | xxls ...

By default, DEBE provides the following COMMAND endpoints:

	help | stop | alert | codes | ping | bit | config

If DEBE was configured for antibot protect, DEBE will also provide a *riddle* endpoint for clients to validate themselves.

## Installation

Clone from one of the repos.  You will typically want to redirect the following to your project

	ln -s PROJECT/totem/test.js test.js 			# unit testing
	ln -s PROJECT/totem/maint.sh maint.sh 		# test startup and maint scripts
	ln -s PROJECT/totem/certs certs					# truststore folder for name.pfx certs 
	ln -s PROJECT/JPGS captcha 	 				# folder for captcha digits

## Databases

* openv.apps  Reads on start() to derive command line parms  
* app.X Table X read for job parameters in a .exe route

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
		console.log( err ? "something evil is lurking" : "look mom - Im running!");
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