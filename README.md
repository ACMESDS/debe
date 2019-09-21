/**
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](https://github.com/acmesds/debe) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.west.nga.ic.gov/acmesds/debe)
	
# DEBE

DEBE provides a [cloud computing service](https://totem.west.ile.nga.ic.gov/api.view) for producing geoint products.
DEBE uses [TOTEM endpoints](https://github.com/acmesds/totem):

	POST /NODE ?? NODE ...
	GET /NODE ?? NODE ...
	PUT /NODE ?? NODE ...
	DELETE /NODE ?? NODE ...

to access its NODEs.  A NODE references a dataset, plugin, file or command:

	DATASET.TYPE ? QUERY
	PLUGIN.TYPE ? QUERY
	FILE.TYPE ? QUERY
	COMMAND.TYPE ? QUERY

where (see [API](https://totem.west.ile.nga.ic.gov/api.view) and 
[skinning guide](https://totem.west.ile.nga.ic.gov/skinguide.view)) TYPE 
will convert DATASET:

	db | xml | csv | txt | flat | kml | html | json

inspect DATASET:

	tree | schema | nav | stat | delta

render PLUGIN:
 
	view | run | plugin | pivot | site | spivot | brief | gridbrief | pivbrief | runbrief

execute, extend or retract PLUGIN:

	exe | add | sub

probe PLUGIN attributes:

	tou | md | pub | status | suitors
	
license PLUGIN code:

	js | py | m | me | jade | ...
	
or return PLUGIN events:

	CASENAME
	
DEBE provides the following COMMANDs:

	agent | alert | ingest | riddle | task | ping
	
for distributing jobs, alerting clients, inngesting data, validating sessions, sharding tasks, and 
testing connections.  In addition, DEBE esablishes FILE areas: 

	stores | uploads | shares

for uploading, storing and serving files.

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

### Manage 

	npm run [ edit || start ]			# Configure environment
	npm test [ ? || D1 || D2 || ... ]		# Unit test
	npm run [ prmprep || prmload ]		# Revise PRM

## Usage

Simply require, configure and start DEBE:

	var DEBE = require("debe");
	
	DEBE.config({
		key: value, 						// set key
		"key.key": value, 					// indexed set
		"key.key.": value					// indexed append
	}, function (err) {
		console.log( err ? "something evil is lurking" : "look mom - Im running!");
	});

where [its configuration keys](https://totem.west.ile.nga.ic.gov/shares/prm/debe/index.html) follow 
the [ENUM copy()](https://github.com/acmesds/enum) conventions.

### D1 - Encypted with a database

	DEBE.config({
		name: ENV.SERVICE_NAME,
		mysql: {
			host: ENV.MYSQL_HOST,
			user: ENV.MYSQL_USER,
			pass: ENV.MYSQL_PASS
		},
		watch: {
			"./uploads/": function (file) {
			}
		}

	}, function (err) {
		Trace( err || "Yowzers - An encrypted DEBE service with a database watching files in uploads area" );
	});

### D2 - D1 plus an endpoint

	DEBE.config({
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

To contribute to this module, see our [issues](https://totem.west.ile.nga.ic.gov/issues.view)
and [milestones](https://totem.west.ile.nga.ic.gov/milestones.view).

## License

[MIT](LICENSE)

*/