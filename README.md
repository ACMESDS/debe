/**
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](https://github.com/acmesds/debe) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.west.nga.ic.gov/acmesds/debe)
	
# DEBE

DEBE provides full-featured web service for 
managing interfaces, requirements, project metrics, geoint products and workflows.

As documented in its [api](https://totem.west.ile.nga.ic.gov/api.view) and 
in its [skinguide](https://totem.west.ile.nga.ic.gov/skinguide.view), DEBE 
configures its [TOTEM base web service](https://github.com/acmesds/totem) to support
endpoints TYPEs that format datasets:

	db | xml | csv | txt | tab | view | tree | flat | delta | nav | kml | encap | html | json

render plugins:

	view | run | plugin | pivot | site | spivot | brief | gridbrief | pivbrief | runbrief

run stateless | stateful engines:

	exe | sim

or return plugin attributes:

	code | jade | classif | readability | client | size | risk
	
## Installation

Clone [DEBE web service](https://github.com/acmesds/debe) into your PROJECT/debe folder.  
Clone [FLEX database extender](https://github.com/acmesds/flex) into your PROJECT/flex folder.  
Clone [CHIPPER earth-focused data segmenter](https://github.com/acmesds/chipper) into your PROJECT/chipper folder.  
Clone [ATOMIC engine plugin](https://github.com/acmesds/engine) into your PROJECT/atomic folder.  
Clone [TOTEM base web service](https://github.com/acmesds/totem) into your PROJECT/totem folder.

You will typically want to redirect the following to your project

	ln -s PROJECT/totem/maint.sh maint.sh 		# test startup and maint scripts
	ln -s PROJECT/totem/certs certs					# truststore folder for name.pfx certs 
	ln -s PROJECT/JPGS captcha 	 				# folder for captcha digits

## Usage

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

where [its configuration keys](https://totem.west.ile.nga.ic.gov/shares/prm/debe/index.html) follow 
the [ENUM copy()](https://github.com/acmesds/enum) conventions.

The following examples are from DEBE's unit tester:

	node totem [D1 || D2 || ... ]
	
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
		
## Contributing

See our [issues](https://totem.west.ile.nga.ic.gov/issues.view), [milestones](https://totem.west.ile.nga.ic.gov/milestones.view), [s/w requirements](https://totem.west.ile.nga.ic.gov/swreqts.view),
and [h/w requirements](https://totem.west.ile.nga.ic.gov/hwreqts.view).

## License

[MIT](LICENSE)

*/