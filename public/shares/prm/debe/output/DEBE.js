Ext.data.JsonP.DEBE({"tagname":"class","name":"DEBE","autodetected":{},"files":[{"filename":"debe.md","href":"debe.md.html#DEBE"},{"filename":"debe.js","href":"debe.html#DEBE"}],"members":[{"name":"blindTesting","tagname":"cfg","owner":"DEBE","id":"cfg-blindTesting","meta":{}},{"name":"bySOAP","tagname":"cfg","owner":"DEBE","id":"cfg-bySOAP","meta":{"private":true}},{"name":"isSpawned","tagname":"cfg","owner":"DEBE","id":"cfg-isSpawned","meta":{}},{"name":"probono","tagname":"cfg","owner":"DEBE","id":"cfg-probono","meta":{}},{"name":"Initialize","tagname":"method","owner":"DEBE","id":"method-Initialize","meta":{}},{"name":"SOAPsession","tagname":"method","owner":"DEBE","id":"method-SOAPsession","meta":{"private":true}},{"name":"genDoc","tagname":"method","owner":"DEBE","id":"method-genDoc","meta":{}},{"name":"initENV","tagname":"method","owner":"DEBE","id":"method-initENV","meta":{"private":true}},{"name":"initSES","tagname":"method","owner":"DEBE","id":"method-initSES","meta":{"private":true}},{"name":"initSQL","tagname":"method","owner":"DEBE","id":"method-initSQL","meta":{"private":true}},{"name":"loader","tagname":"method","owner":"DEBE","id":"method-loader","meta":{"private":true}},{"name":"merge","tagname":"method","owner":"DEBE","id":"method-merge","meta":{}},{"name":"render","tagname":"method","owner":"DEBE","id":"method-render","meta":{"private":true}},{"name":"renderSkin","tagname":"method","owner":"DEBE","id":"method-renderSkin","meta":{}},{"name":"treeify","tagname":"method","owner":"DEBE","id":"method-treeify","meta":{}}],"alternateClassNames":[],"aliases":{},"id":"class-DEBE","extends":null,"singleton":null,"private":null,"mixins":[],"requires":["atomic","child-process","child_process","cluster","flex","fs","geohack","i18n-abide","jade","jade-filters","jslab","markdown","mathjax-node","optimist","socket.io","socket.io-clusterhub","stream","tokml","totem"],"uses":[],"short_doc":"SourceForge\n    github\n    geointapps\n    gitlab\n\nDEBE\n\nDEBE extends TOTEM simple web service with\nthe FLEX database ...","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"parentMixins":[],"html":"<div><pre class=\"hierarchy\"><h4>Requires</h4><div class='dependency'>atomic</div><div class='dependency'>child-process</div><div class='dependency'>child_process</div><div class='dependency'>cluster</div><div class='dependency'>flex</div><div class='dependency'>fs</div><div class='dependency'>geohack</div><div class='dependency'>i18n-abide</div><div class='dependency'>jade</div><div class='dependency'>jade-filters</div><div class='dependency'>jslab</div><div class='dependency'>markdown</div><div class='dependency'>mathjax-node</div><div class='dependency'>optimist</div><div class='dependency'>socket.io</div><div class='dependency'>socket.io-clusterhub</div><div class='dependency'>stream</div><div class='dependency'>tokml</div><div class='dependency'>totem</div><h4>Files</h4><div class='dependency'><a href='source/debe.md.html#DEBE' target='_blank'>debe.md</a></div><div class='dependency'><a href='source/debe.html#DEBE' target='_blank'>debe.js</a></div></pre><div class='doc-contents'><p><a href=\"https://sourceforge.net\">SourceForge</a>\n    <a href=\"https://github.com/acmesds/debe.git\">github</a>\n    <a href=\"https://git.geointapps.org/acmesds/debe\">geointapps</a>\n    <a href=\"https://gitlab.west.nga.ic.gov/acmesds/debe.git\">gitlab</a></p>\n\n<h1>DEBE</h1>\n\n<p>DEBE extends <a href=\"https://github.com/acmesds/totem\">TOTEM simple web service</a> with\nthe <a href=\"https://github.com/acmesds/flex\">FLEX database extender</a>,\n<a href=\"https://github.com/acmesds/geohack\">GEOHACK earth event segmenter</a>,\nand <a href=\"https://github.com/acmesds/atomic\">ATOMIC cloud compute</a> modules to provide a web service\nthat manages its content, interfaces, requirements, project metrics, geoint products and workflows.</p>\n\n<p>As documented in its api, DEBE provides ENDPOINTs:</p>\n\n<pre><code>(select) GET     /NODE $$ NODE ...\n(update) PUT     /NODE $$ NODE ...\n(insert) POST    /NODE $$ NODE ...\n(delete) DELETE /NODE $$ NODE ...\n</code></pre>\n\n<p> to access a NODE:</p>\n\n<pre><code>DATASET.TYPE ? QUERY ? QUERY ...\nENGINE.TYPE ? QUERY ? QUERY ...\nFILEPATH.TYPE ? QUERY ? QUERY ...\nCOMMAND.TYPE ? QUERY ? QUERY ...\n</code></pre>\n\n<p>using an optional QUERY:</p>\n\n<pre><code>KEY=VALUE &amp; EXPRESSION ...\n</code></pre>\n\n<p>DEBE provides default TYPEs to format data:</p>\n\n<pre><code>db | xml | csv | txt | tab | tree | flat | kml | encap | html | json | geojson\n</code></pre>\n\n<p>render a view/skin:</p>\n\n<pre><code>view | pivot | site | spivot | brief | gridbrief | pivbrief | run | plugin | runbrief\n</code></pre>\n\n<p>run an engine or return its usecase events:</p>\n\n<pre><code>exe | USECASE\n</code></pre>\n\n<p>provide attributes:</p>\n\n<pre><code>delta | nav | stat\n</code></pre>\n\n<p>or generate office files:</p>\n\n<pre><code>pdf | xdoc | xppt | xxls ...\n</code></pre>\n\n<p>By default, DEBE provides the following COMMAND endpoints:</p>\n\n<pre><code>help | stop | alert | codes | ping | bit | config\n</code></pre>\n\n<p>If DEBE was configured for antibot protect, DEBE will also provide a <em>riddle</em> endpoint for clients to validate themselves.</p>\n\n<h2>Installation</h2>\n\n<p>Clone from one of the repos.  You will typically want to redirect the following to your project</p>\n\n<pre><code>ln -s PROJECT/totem/test.js test.js             # unit testing\nln -s PROJECT/totem/maint.sh maint.sh       # test startup and maint scripts\nln -s PROJECT/totem/certs certs                 # truststore folder for name.pfx certs \nln -s PROJECT/JPGS captcha                  # folder for captcha digits\n</code></pre>\n\n<h2>Databases</h2>\n\n<p>openv.apps  Reads on start() to derive command line parms<br/>\napp.X Table X read for job parameters in a .exe route</p>\n\n<h2>Use</h2>\n\n<p>Simply require, configure and start DEBE:</p>\n\n<pre><code>var DEBE = require(\"debe\").config({\n    key: value,                         // set key\n    \"key.key\": value,                   // indexed set\n    \"key.key.\": value,                  // indexed append\n    OBJECT: [ function (){}, ... ],     // add OBJECT prototypes \n    Function: function () {}            // add chained initializer callback\n    :\n    :\n}, function (err) {\n    console.log( err ? \"something evil is lurking\" : \"look mom - Im running!\");\n});\n</code></pre>\n\n<p>where its configuration keys follow <a href=\"https://github.com/acmesds/enum\">ENUM copy()</a> conventions\ndescribed in its <a href=\"/shares/prm/debe/index.html\">PRM</a>.</p>\n\n<p>The following examples are from TOTEM's test.js unit tester.  You may also find\nTotem's <a href=\"https://github.com/acmesds/dsvar\">DSVAR</a> useful, if you wish to learn more about its\ndatabase agnosticator.</p>\n\n<h3>D1 - Encypted with a database</h3>\n\n<pre><code>var DEBE = require(\"../debe\").config({\n    name: ENV.SERVICE_NAME,\n    mysql: {\n        host: ENV.MYSQL_HOST,\n        user: ENV.MYSQL_USER,\n        pass: ENV.MYSQL_PASS\n    },\n    watch: {\n        \"./uploads\": function (file) {\n        }\n    }\n\n}, function (err) {\n    Trace( err || \"Yowzers - An encrypted DEBE service with a database watching files in uploads area\" );\n});\n</code></pre>\n\n<h3>D2 - D1 plus an endpoint</h3>\n\n<pre><code>var DEBE = require(\"../debe\").config({\n    mysql: {\n        host: ENV.MYSQL_HOST,\n        user: ENV.MYSQL_USER,\n        pass: ENV.MYSQL_PASS\n    },\n    \"worker.\": {\n        wfs: function (req,res) {\n            res(\"here i go again\");\n\n            TOTEM.fetchers.http(ENV.WFS_TEST, function (data) {\n                console.log(data);\n            });\n        }\n\n    }\n}, function (err) {\n    Trace( \"This bad boy in an encrypted service with a database and has an /wfs endpoint\" );\n});\n</code></pre>\n\n<h2>License</h2>\n\n<p><a href=\"LICENSE\">MIT</a></p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-cfg'>Config options</h3><div class='subsection'><div id='cfg-blindTesting' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-cfg-blindTesting' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-cfg-blindTesting' class='name expandable'>blindTesting</a> : Boolean<span class=\"signature\"></span></div><div class='description'><div class='short'>Enable for double-blind testing ...</div><div class='long'><p>Enable for double-blind testing</p>\n<p>Defaults to: <code>false</code></p></div></div></div><div id='cfg-bySOAP' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-cfg-bySOAP' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-cfg-bySOAP' class='name expandable'>bySOAP</a> : Object<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>reserved for soap interfaces ...</div><div class='long'><p>reserved for soap interfaces</p>\n<p>Defaults to: <code>{get: &quot;&quot;, put: &quot;&quot;, delete: &quot;&quot;, post: &quot;/service/algorithm/:proxy&quot;}</code></p></div></div></div><div id='cfg-isSpawned' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-cfg-isSpawned' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-cfg-isSpawned' class='name expandable'>isSpawned</a> : Boolean<span class=\"signature\"></span></div><div class='description'><div class='short'>Enabled when this is child server spawned by a master server ...</div><div class='long'><p>Enabled when this is child server spawned by a master server</p>\n<p>Defaults to: <code>false</code></p></div></div></div><div id='cfg-probono' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-cfg-probono' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-cfg-probono' class='name expandable'>probono</a> : Boolean<span class=\"signature\"></span></div><div class='description'><div class='short'>Enable to give-away plugin services ...</div><div class='long'><p>Enable to give-away plugin services</p>\n<p>Defaults to: <code>false</code></p></div></div></div></div></div><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-Initialize' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-Initialize' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-Initialize' class='name expandable'>Initialize</a>( <span class='pre'></span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Initialize DEBE on startup. ...</div><div class='long'><p>Initialize DEBE on startup.</p>\n</div></div></div><div id='method-SOAPsession' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-SOAPsession' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-SOAPsession' class='name expandable'>SOAPsession</a>( <span class='pre'>req, res, proxy</span> )<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Process an bySOAP session peer-to-peer request. ...</div><div class='long'><p>Process an bySOAP session peer-to-peer request.  Currently customized for Hydra-peer and\ncould/should be revised to support more generic peer-to-peer bySOAP interfaces.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>req</span> : Object<div class='sub-desc'><p>HTTP request</p>\n</div></li><li><span class='pre'>res</span> : Object<div class='sub-desc'><p>HTTP response</p>\n</div></li><li><span class='pre'>proxy</span> : Function<div class='sub-desc'><p>Name of APP proxy function to handle this session.</p>\n</div></li></ul></div></div></div><div id='method-genDoc' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-genDoc' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-genDoc' class='name expandable'>genDoc</a>( <span class='pre'>recs, req, res</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Convert recods to requested req.type office file. ...</div><div class='long'><p>Convert recods to requested req.type office file.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>recs</span> : Array<div class='sub-desc'><p>list of records to be converted</p>\n</div></li><li><span class='pre'>req</span> : Object<div class='sub-desc'><p>Totem request</p>\n</div></li><li><span class='pre'>res</span> : Function<div class='sub-desc'><p>Totem response</p>\n</div></li></ul></div></div></div><div id='method-initENV' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-initENV' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-initENV' class='name expandable'>initENV</a>( <span class='pre'></span> )<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Initialize the runtime environment ...</div><div class='long'><p>Initialize the runtime environment</p>\n</div></div></div><div id='method-initSES' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-initSES' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-initSES' class='name expandable'>initSES</a>( <span class='pre'></span> )<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Initialize the session environment ...</div><div class='long'><p>Initialize the session environment</p>\n</div></div></div><div id='method-initSQL' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-initSQL' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-initSQL' class='name expandable'>initSQL</a>( <span class='pre'></span> )<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Initialize the FLEX and ATOM interfaces ...</div><div class='long'><p>Initialize the FLEX and ATOM interfaces</p>\n</div></div></div><div id='method-loader' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-loader' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-loader' class='name expandable'>loader</a>( <span class='pre'>url, met, req, res</span> )<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'> ...</div><div class='long'>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>url</span> : String<div class='sub-desc'><p>path to source</p>\n</div></li><li><span class='pre'>met</span> : String<div class='sub-desc'><p>method GET/POST/... to use</p>\n</div></li><li><span class='pre'>req</span> : Object<div class='sub-desc'><p>http request</p>\n</div></li><li><span class='pre'>res</span> : Function<div class='sub-desc'><p>Totom response callback</p>\n</div></li></ul></div></div></div><div id='method-merge' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-merge' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-merge' class='name expandable'>merge</a>( <span class='pre'></span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Merge changes when doing table deltas from their baseline versions. ...</div><div class='long'><p>Merge changes when doing table deltas from their baseline versions.</p>\n</div></div></div><div id='method-render' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-render' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-render' class='name expandable'>render</a>( <span class='pre'></span> )<span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Render Jade file at path this to res( err || html ) in a new context created for this request. ...</div><div class='long'><p>Render Jade file at path this to res( err || html ) in a new context created for this request.</p>\n</div></div></div><div id='method-renderSkin' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-renderSkin' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-renderSkin' class='name expandable'>renderSkin</a>( <span class='pre'>req, res</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Totem(req,res) endpoint to render jade code requested by .table jade engine. ...</div><div class='long'><p>Totem(req,res) endpoint to render jade code requested by .table jade engine.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>req</span> : Object<div class='sub-desc'><p>Totem request</p>\n</div></li><li><span class='pre'>res</span> : Function<div class='sub-desc'><p>Totem response</p>\n</div></li></ul></div></div></div><div id='method-treeify' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='DEBE'>DEBE</span><br/><a href='source/debe.html#DEBE-method-treeify' target='_blank' class='view-source'>view source</a></div><a href='#!/api/DEBE-method-treeify' class='name expandable'>treeify</a>( <span class='pre'></span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Return a tree = {name,weight,children: tree} from records having been sorted on keys=[key,...] ...</div><div class='long'><p>Return a tree = {name,weight,children: tree} from records having been sorted on keys=[key,...]</p>\n</div></div></div></div></div></div></div>","meta":{}});