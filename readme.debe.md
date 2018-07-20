/****
@class DEBE
	[SourceForge](https://sourceforge.net) 
	[github](https://github.com/acmesds/debe.git) 
	[geointapps](https://git.geointapps.org/acmesds/debe)
	[gitlab](https://gitlab.west.nga.ic.gov/acmesds/debe.git)
	
# DEBE

DEBE provide a web service to manage content, interfaces, requirements, project metrics, 
geoint data providers and workflows.  

DEBE provides [CRUD-compliant endpoints](/api.view):

	POST		/NODE ?? NODE ...
	GET			/NODE ?? NODE ...
	PUT			/NODE ?? NODE ...
	DELETE 	/NODE ?? NODE ...

to access its datasets, engines, files and commands at a NODE:

	DATASET.TYPE ? QUERY ? QUERY ...
	ENGINE.TYPE ? QUERY ? QUERY ...
	FILEPATH.TYPE ? QUERY ? QUERY ...
	COMMAND.TYPE ? QUERY ? QUERY ...

DEBE's default TYPEs format data:

	db | xml | csv | txt | tab | tree | flat | kml | encap | html | json | geojson

renders a [skin](/skinguide.view):

	view | pivot | site | spivot | brief | gridbrief | pivbrief | run | plugin | runbrief

executes an [engine](/api.view), returns ingested results, or code:

	exe | USECASE | js | py | ...

provides dataset attributes:

	delta | nav | stat
	
or generates an office file:

	pdf | xdoc | xppt | xxls ...

DEBE's default COMMAND endpoints include:

	help | alert | ping | ingest | config | riddle | task

## Installing

Clone from one of the repos into your PROJECT/debe, then:

	cd PROJECT/debe
	ln -s PROJECT/totem/test.js test.js 			# unit testing
	ln -s PROJECT/totem/maint.sh maint.sh 		# test startup and maint scripts
	ln -s PROJECT/totem/certs certs					# truststore folder for name.pfx certs 
	ln -s PROJECT/JPGS captcha 	 				# folder for captcha digits

Dependencies:

* [ENUM basic enumerators](https://github.com/acmesds/enum)
* [TOTEM simple web service](https://github.com/acmesds/totem)
* [FLEX database extender](https://github.com/acmesds/flex)
* [GEOHACK earth event segmenter](https://github.com/acmesds/geohack)
* [ATOMIC cloud compute](https://github.com/acmesds/atomic) 
* [JSLAB plugin interface](https://github.com/acmesds/jslab)
* openv.apps  Reads on start() to derive command line parms  
* app.X Reads for plugin usecase in a X.exe route

## Using

To start DEBE, simply run the desired test.js configuration:
	
	. maint.sh [D1 | D2 | ...]
	
Each configuration follow the 
[ENUM deep copy() conventions](https://github.com/acmesds/enum):

	var DEBE = require("debe").config({
		key: value, 						// set key
		"key.key": value, 					// indexed set
		"key.key.": value					// indexed append
	}, function (err) {
		console.log( err ? "something evil is lurking" : "look mom - Im running!");
	});

where its [key:value options](/shares/prm/debe/index.html) override the defaults
primed from [nick:"NAME"](/apps.view).

### D1 - With a database and file watcher

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

### D2 - With a database, a custom endpoint and antibot protection

	var 
		DEBE = require("../debe").config({

		name: ENV.SERVICE_NAME,
		riddles: 10,
		mysql: {
			host: ENV.MYSQL_HOST,
			user: ENV.MYSQL_USER,
			pass: ENV.MYSQL_PASS
		},
		"byTable.": {
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

## Contributing

See our [issues](/issues.view), [milestones](/milestones.view), [s/w requirements](/swreqts.view),
and [h/w requirements](/hwreqts.view).

*/
