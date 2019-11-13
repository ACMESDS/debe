/**
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](http://sc.appdev.proj.coe/acmesds/debe) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.west.nga.ic.gov/acmesds/debe)
	
# DEBE

[DEBE](https://totem.west.ile.nga.ic.gov/api.view) provides a scalable service 
for producing and evaluating geoint products.  DEBE extends [TOTEM endpoints](http://sc.appdev.proj.coe/acmesds/totem):

	POST / NODE ?? NODE ...
	GET / NODE ?? NODE ...
	PUT / NODE ?? NODE ...
	DELETE / NODE ?? NODE ...

to access dataset, notebook, file, and command NODEs:

	DATASET.TYPE ? QUERY
	NOTEBOOK.TYPE ? QUERY
	AREA/PATH/FILE.TYPE ? QUERY
	COMMAND.TYPE ? QUERY

where (see [API](https://totem.west.ile.nga.ic.gov/api.view) and 
[skinning guide](https://totem.west.ile.nga.ic.gov/skinguide.view)) TYPE 
will either convert DATASET:

	db | xml | csv | txt | flat | kml | html | json

inspect DATASET:

	tree | schema | nav | delta

render NOTEBOOK:
 
	view | run | plugin | pivot | site | spivot | brief | gridbrief | pivbrief | runbrief

probe NOTEBOOK:

	exe | tou | md | status | suitors | usage | reset | EVENTS

manage NOTEBOOK:

	import | export | publish | addkey | subkey

license NOTEBOOK:

	js | py | m | me | jade | ...

DEBE also provides the following COMMAND endpoints:

	agent | alert | ingest | riddle | task | ping
	
to distribute jobs, alert clients, ingest data, validate sessions, spread tasks, and 
test connections.  In addition, DEBE establishes several file AREAs: 

	stores | uploads | shares | west | east | jades

for supervised/unsupervised FILE sharing.

## Installation

Clone [DEBE web service](http://sc.appdev.proj.coe/acmesds/debe) into your PROJECT/debe folder.  
Clone [FLEX database extender](http://sc.appdev.proj.coe/acmesds/flex) into your PROJECT/flex folder.  
Clone [CHIPPER earth-focused data segmenter](http://sc.appdev.proj.coe/acmesds/chipper) into your PROJECT/chipper folder.  
Clone [ATOMIC engine plugin](http://sc.appdev.proj.coe/acmesds/engine) into your PROJECT/atomic folder.  
Clone [TOTEM base web service](http://sc.appdev.proj.coe/acmesds/totem) into your PROJECT/totem folder.

You will typically want to redirect the following to your project

	ln -s PROJECT/totem/maint.sh maint.sh 		# test startup and maint scripts
	ln -s PROJECT/totem/certs certs					# truststore folder for name.pfx certs 
	ln -s PROJECT/JPGS captcha 	 				# folder for captcha digits

### Start 

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
	}, err =>  {
		console.log( err ? "something evil is lurking" : "look mom - Im running!");
	});

where [its configuration keys](https://totem.west.ile.nga.ic.gov/shares/prm/debe/index.html) follow 
the [ENUM deep copy conventions](http://sc.appdev.proj.coe/acmesds/enum).

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

	}, err =>  {
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
	}, err =>  {
		Trace( "This bad boy in an encrypted service with a database and has an /wfs endpoint" );
	});
		
## Contributing

To contribute to this module, see our [issues](https://totem.west.ile.nga.ic.gov/issues.view)
and [milestones](https://totem.west.ile.nga.ic.gov/milestones.view).

## License

[MIT](LICENSE)

*/