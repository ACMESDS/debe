/**
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](https://github.com/acmesds/debe) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.west.nga.ic.gov/acmesds/debe)
	
# DEBE

DEBE provides a [cloud computing service](https://totem.west.ile.nga.ic.gov/api.view) for producing geoint products using
its [base TOTEM endpoints](https://github.com/acmesds/totem):

	POST /NODE ?? NODE ...
	GET /NODE ?? NODE ...
	PUT /NODE ?? NODE ...
	DELETE /NODE ?? NODE ...

A NODE references a dataset, plugin, file or command:

	DATASET.TYPE ? QUERY
	PLUGIN.TYPE ? QUERY
	FILE.TYPE ? QUERY
	COMMAND.TYPE ? QUERY

where TYPE can [convert datasets](https://totem.west.ile.nga.ic.gov/api.view):

	db | xml | csv | txt | tab | view | tree | flat | delta | nav | kml | encap | html | json

[render plugins](https://totem.west.ile.nga.ic.gov/skinguide.view):

	view | run | plugin | pivot | site | spivot | brief | gridbrief | pivbrief | runbrief

[execute, extend and retract plugins](https://totem.west.ile.nga.ic.gov/api.view):

	exe | add | sub

[access plugin attributes](https://totem.west.ile.nga.ic.gov/api.view):

	tou | md | pub | status | suitors
	
[license plugin code](https://totem.west.ile.nga.ic.gov/api.view):

	js | py | m | me | jade | ...
	
or [return plugin ingests](https://totem.west.ile.nga.ic.gov/api.view):

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

	var DEBE = require("debe").config({
		key: value, 						// set key
		"key.key": value, 					// indexed set
		"key.key.": value					// indexed append
	}, function (err) {
		console.log( err ? "something evil is lurking" : "look mom - Im running!");
	});

where [its configuration keys](https://totem.west.ile.nga.ic.gov/shares/prm/debe/index.html) follow 
the [ENUM copy()](https://github.com/acmesds/enum) conventions.

### D1 - Encypted with a database

	var DEBE = require("../debe").config({
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

To contribute to this module, see our [issues](https://totem.west.ile.nga.ic.gov/issues.view)
and [milestones](https://totem.west.ile.nga.ic.gov/milestones.view).

## License

[MIT](LICENSE)

*/