Ext.data.JsonP.ENGINE({"tagname":"class","name":"ENGINE","autodetected":{},"files":[{"filename":"engine.js","href":"engine.html#ENGINE"},{"filename":"engine.md","href":"engine.md.html#ENGINE"}],"requires":["child_process","crypto","digitalsignals","engineIF","enum","fs","graceful-lwip","mathjs"],"members":[{"name":"config","tagname":"cfg","owner":"ENGINE","id":"cfg-config","meta":{}},{"name":"cores","tagname":"cfg","owner":"ENGINE","id":"cfg-cores","meta":{}},{"name":"errors","tagname":"cfg","owner":"ENGINE","id":"cfg-errors","meta":{"private":true}},{"name":"nextcore","tagname":"cfg","owner":"ENGINE","id":"cfg-nextcore","meta":{"private":true}},{"name":"paths","tagname":"cfg","owner":"ENGINE","id":"cfg-paths","meta":{"private":true}},{"name":"plugins","tagname":"cfg","owner":"ENGINE","id":"cfg-plugins","meta":{}},{"name":"thread","tagname":"cfg","owner":"ENGINE","id":"cfg-thread","meta":{"private":true}},{"name":"allocate","tagname":"method","owner":"ENGINE","id":"method-allocate","meta":{}},{"name":"execute","tagname":"method","owner":"ENGINE","id":"method-execute","meta":{}},{"name":"insert","tagname":"method","owner":"ENGINE","id":"method-insert","meta":{}},{"name":"prime","tagname":"method","owner":"ENGINE","id":"method-prime","meta":{}},{"name":"returns","tagname":"method","owner":"ENGINE","id":"method-returns","meta":{}},{"name":"save","tagname":"method","owner":"ENGINE","id":"method-save","meta":{}}],"alternateClassNames":[],"aliases":{},"id":"class-ENGINE","extends":null,"singleton":null,"private":null,"mixins":[],"uses":[],"short_doc":"SourceForge\n    github\n    geointapps\n    gitlab\n\nENGINE\n\nENGINE implements hyperthreaded workflows to both stateless...","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"parentMixins":[],"html":"<div><pre class=\"hierarchy\"><h4>Requires</h4><div class='dependency'>child_process</div><div class='dependency'>crypto</div><div class='dependency'>digitalsignals</div><div class='dependency'>engineIF</div><div class='dependency'>enum</div><div class='dependency'>fs</div><div class='dependency'>graceful-lwip</div><div class='dependency'>mathjs</div><h4>Files</h4><div class='dependency'><a href='source/engine.html#ENGINE' target='_blank'>engine.js</a></div><div class='dependency'><a href='source/engine.md.html#ENGINE' target='_blank'>engine.md</a></div></pre><div class='doc-contents'><p><a href=\"https://sourceforge.net\">SourceForge</a>\n    <a href=\"https://github.com/acmesds/engine.git\">github</a>\n    <a href=\"https://git.geointapps.org/acmesds/engine\">geointapps</a>\n    <a href=\"https://gitlab.weat.nga.ic.gov/acmesds/engine.git\">gitlab</a></p>\n\n<h1>ENGINE</h1>\n\n<p>ENGINE implements hyperthreaded workflows to both <a href=\"/api.view\">stateless and stateful engines</a> of TYPE</p>\n\n<pre><code>py | js | sh | opencv | mat | csh | r | octave\n</code></pre>\n\n<p>at ENGINE[TYPE].  Engines are controlled via the following methods (restful http endpoints):</p>\n\n<pre><code>POST advance/setp/insert a stateful engine\nPUT compile/init/update a stateful engine\nDELETE deallocate/kill/delete a stateful engine\nGET execute/read/select a stateless engines\n</code></pre>\n\n<p>Stateful engines are supported by the step, init and kill methods, and are passed TAU event tokens:</p>\n\n<pre><code>TAU.i = [{tau}, ...] = events arriving to engine's input port\nTAU.o = [{tau}, ...] = events departing from engine's output port\nTAU.p = {port1: {...}, ... port2: {...}, ... sql: {...} }\nTAU.port = engine's in/out port to step\nTAU.thread = engine's 0-base thread counter\n</code></pre>\n\n<p>where input/output port parameters and engine code are taken from\nthe Vars and Code engine context at workflow initialization, and\nwhere sql is a mysql database connector.</p>\n\n<p>Each event token contains the following default fields (they can\nbe freely interpretted and extended by the engine):</p>\n\n<pre><code>job = \"\"    = Current job thread N.N...\nwork = 0    = Anticipated/delivered data volume (dims bits etc)\ndisem = \"\"  = Disemination channel for this event\nclassif = \"\"    = Classification of this event\ncost = \"\"   = Billing center\npolicy = \"\" = Data retention policy\nstatus = 0  = Status code\nvalue = 0   = Flow calculation\n</code></pre>\n\n<p>Stateless engines are supported by the read method, and are passed\nthe following parameters:</p>\n\n<pre><code>TAU.i = {tau} = input event sinked to an engine\nTAU.o = {tau} = output event sourced from an engine\nTAU.p = {sql: {...}, query: {...} }\n</code></pre>\n\n<p>where the query hash will contain the url parameters.</p>\n\n<p>In addition to geoClient config paramaters, geoEngine accepts\nthe config parameters:</p>\n\n<pre><code>jobspath path to prefix to a tau.job\napp{...} crud interface to virtual tables\n</code></pre>\n\n<h2>Installation</h2>\n\n<p>Clone from one of the repos.</p>\n\n<h2>Use</h2>\n\n<p>ENGINE is configured and started like this:</p>\n\n<pre><code>var TOTEM = require(\"../dsvar\").config({\n        key: value,                         // set key\n        \"key.key\": value,                   // indexed set\n        \"key.key.\": value,                  // indexed append\n        OBJECT: [ function (){}, ... ],     // add OBJECT prototypes \n        Function: function () {}            // add chained initializer callback\n        :\n        :\n    }, function (err) {\n    console.log( err ? \"something evil happended\" : \"Im running\");\n});\n</code></pre>\n\n<p>where its configuration keys follow the <a href=\"https://github.com/acmesds/enum\">ENUM copy()</a> conventions and\nare described in its <a href=\"/shares/prm/engine/index.html\">PRM</a>.</p>\n\n<p>The examples below are provided in TOTEM's test.js unit tester.</p>\n\n<h3>E1 - Totem and Engine interfaces</h3>\n\n<pre><code>var ENGINE = require(\"../engine\");\nvar TOTEM = require(\"../totem\");\n\nTrace( \"A Totem+Engine client has been created\", {\n    a_tau_template: ENGINE.tau(\"somejob.pdf\"),\n    engine_errors: ENGINE.error,\n    get_endpts: TOTEM.reader,\n    my_paths: TOTEM.paths\n});\n</code></pre>\n\n<h3>E2 - Totem being powered up and down</h3>\n\n<pre><code>var TOTEM = require(\"../totem\");\n\nTOTEM.config({}, function (err) {\n    Trace( err || \"Started but I will now power down\" );\n    TOTEM.stop();\n});\n\nvar ENGINE = require(\"../engine\").config({\n    thread: TOTEM.thread\n});\n</code></pre>\n\n<h3>E3 - Totem service with a chipper engine endpoint and a database</h3>\n\n<pre><code>var TOTEM = require(\"../totem\").config({\n    \"byType.\": {\n        chipper: function Chipper(req,res) {                \n            res( 123 );\n        }\n    },\n\n    mysql: {\n        host: ENV.MYSQL_HOST,\n        user: ENV.MYSQL_USER,\n        pass: ENV.MYSQL_PASS\n    }\n\n});\n\nvar ENGINE = require(\"../engine\").config({\n    thread: TOTEM.thread\n});\n</code></pre>\n\n<h3>E4 - Totem with a complete engine test endpoint</h3>\n\n<pre><code>    var TOTEM = require(\"../totem\").config({\n        \"byType.\": {\n            test: function Chipper(req,res) {\n\n                var itau = [ENGINE.tau()];\n                var otau = [ENGINE.tau()];\n\n                switch (req.query.config) {\n                    case \"cv\": // program and step haar opencv machine \n                        parm =  {\n                            tau: [], \n                            ports: {\n                                frame:   {},\n                                helipads: {scale:0.05,dim:100,delta:0.1,hits:10,cascade:[\"c1/cascade\"]},\n                                faces:   {scale:0.05,dim:100,delta:0.1,hits:10,cascade:[\"haarcascade_frontalface_alt\",\"haarcascade_eye_tree_eyeglasses\"]}\n                        }};\n\n                        itau[0].job = \"test.jpg\";\n                        console.log(parm);\n\n                        for (var n=0,N=1;n&lt;N;n++)  // program N&gt;1 to test reprogram\n                            console.log(`INIT[${n}] = `, ENGINE.opencv(\"opencv.Me.Thread1\",\"setup\",parm));\n\n                        for (var n=0,N=5;n&lt;N;n++) // step N&gt;1 to test multistep\n                            console.log(`STEP[${n}] = `, ENGINE.opencv(\"opencv.Me.Thread1\",\"frame\",itau));\n\n                        // returns badStep if the cascades were undefined at the program step\n                        console.log(\"STEP = \", ENGINE.opencv(\"opencv.Me.Thread1\",\"helipads\",otau));\n                        console.log(otau);\n                        break;\n\n                    // python machines fail with \"cant find forkpty\" if \"import cv2\" attempted\n\n                    case \"py1\": // program python machine\n                        parm =  { \n                            tau:    [{job:\"redefine on run\"}],\n                            ports: {    \n                        }};\n                        pgm = `\n                            print 'Look mom - Im running python!'\n                            print tau\n                            tau = [{'x':[11,12],'y':[21,22]}]\n                            `;\n\n                        // By default python attempts to connect to mysql.  \n                        // So, if mysql service not running or mysql.connector module not found, this will not run.\n                        console.log({py:pgm, ctx: parm});\n                        console.log(\"INIT = \", ENGINE.python(\"py1.thread\",pgm,parm));\n                        console.log(parm.tau);\n                        break;\n\n                    case \"py2\": // program and step python machine \n                        parm =  { \n                            tau:    [{job:\"redefine on run\"}],\n                            ports: {    \n                                frame:   {},\n                                helipads:{scale:1.01,dim:100,delta:0.1,hits:10,cascade:[\"c1/cascade\"]},\n                                faces:   {scale:1.01,dim:100,delta:0.1,hits:10,cascade:[\"haarcascade_frontalface_alt\",\"haarcascade_eye_tree_eyeglasses\"]}\n                        }};\n\n                        itau[0].job = \"test.jpg\";\n                        pgm = `\n                            print 'Look mom - Im running python!'\n                            def frame(tau,parms):\n                                print parms\n                                return -101\n                            def helipads(tau,parms):\n                                print parms\n                                return -102\n                            def faces(tau,parms):\n                                print parms\n                                return -103\n                            `;      \n                        console.log({py:pgm, ctx: parm});\n                        console.log(\"INIT = \", ENGINE.python(\"py2.Me.Thread1\",pgm,parm));\n                        // reprogramming ignored\n                        //console.log(\"INIT = \", ENGINE.python(\"py2.Me.Thread1\",pgm,parm));\n\n                        for (var n=0,N=1; n&lt;N; n++)\n                            console.log(`STEP[${n}] = `, ENGINE.python(\"py2.Me.Thread1\",\"frame\",itau));\n\n                        console.log(\"STEP = \", ENGINE.python(\"py2.Me.Thread1\",\"helipads\",otau));\n                        break;\n\n                    case \"py3\": // program and step python machine string with reinit along the way\n                        parm =  { \n                            tau:    [{job:\"redefine on run\"}],\n                            ports: {    \n                                frame:   {},\n                                helipads:{scale:1.01,dim:100,delta:0.1,hits:10,cascade:[\"c1/cascade\"]},\n                                faces:   {scale:1.01,dim:100,delta:0.1,hits:10,cascade:[\"haarcascade_frontalface_alt\",\"haarcascade_eye_tree_eyeglasses\"]}\n                        }};\n\n                        itau[0].job = \"test.jpg\";\n                        pgm = `\n                            print 'Look mom - Im running python!'\n                            def frame(tau,parms):\n                                print parms\n                                return -101\n                            def helipads(tau,parms):\n                                print parms\n                                return -102\n                            def faces(tau,parms):\n                                print parms\n                                return -103\n                            `;\n\n                        console.log({py:pgm, ctx: parm});\n                        console.log(\"INIT = \", ENGINE.python(\"py3\",pgm,parm));\n                        console.log(\"STEP = \", ENGINE.python(\"py3\",\"frame\",itau));\n                        // reprogramming ignored\n                        //console.log(\"REINIT = \", ENGINE.python(\"py3\",pgm,parm));\n                        //console.log(\"STEP = \", ENGINE.python(\"py3\",\"frame\",itau));\n                        console.log(otau);\n                        break;\n\n                    case \"js\": // program and step a js machine string\n                        parm =  { \n                            ports: {    \n                                frame:   {},\n                                helipads:{scale:1.01,dim:100,delta:0.1,hits:10,cascade:[\"c1/cascade\"]},\n                                faces:   {scale:1.01,dim:100,delta:0.1,hits:10,cascade:[\"haarcascade_frontalface_alt\",\"haarcascade_eye_tree_eyeglasses\"]}\n                        }};\n\n                        itau[0].job = \"test.jpg\";\n                        pgm = `\n                            CON.log('Look mom - Im running javascript!');\n                            function frame(tau,parms) { \n                                CON.log(\"here I come to save the day\");\n                                tau[0].xyz=123; \n                                return 0; \n                            }\n                            function helipads(tau,parms) { \n                                tau[0].results=666; \n                                return 101; \n                            }\n                            function faces(tau,parms) { return 102; }\n                            `;\n\n                        console.log({py:pgm, ctx: parm});\n                        console.log(\"INIT = \", ENGINE.js(\"mytest\",pgm,parm));\n                        // frame should return a 0 = null noerror\n                        console.log(\"STEP = \", ENGINE.js(\"mytest\",\"frame\",itau));\n                        console.log(itau);\n                        // helipads should return a 101 = badload error\n                        console.log(\"STEP = \", ENGINE.js(\"mytest\",\"helipads\",otau));\n                        console.log(otau);\n                        break;  \n                }\n\n                res( \"thanks!\" );\n            }\n        },\n\n        mysql: {\n            host: ENV.MYSQL_HOST,\n            user: ENV.MYSQL_USER,\n            pass: ENV.MYSQL_PASS\n        }\n\n    }, function (err) {\n        Trace( \"Unit test my engines with /test?config=cv | py1 | py2 | py3 | js\" );\n    });\n\n    var ENGINE = require(\"../engine\").config({\n        thread: TOTEM.thread\n    });\n</code></pre>\n\n<h2>License</h2>\n\n<p><a href=\"LICENSE\">MIT</a></p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-cfg'>Config options</h3><div class='subsection'><div id='cfg-config' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-config' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-config' class='name expandable'>config</a> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><span class=\"signature\"></span></div><div class='description'><div class='short'><p>Configure are start the engine interface, estblish worker core connections</p>\n</div><div class='long'><p>Configure are start the engine interface, estblish worker core connections</p>\n</div></div></div><div id='cfg-cores' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-cores' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-cores' class='name expandable'>cores</a> : <a href=\"#!/api/Number\" rel=\"Number\" class=\"docClass\">Number</a><span class=\"signature\"></span></div><div class='description'><div class='short'>Number of worker cores (aka threads) to provide in the cluster. ...</div><div class='long'><p>Number of worker cores (aka threads) to provide in the cluster.  0 cores provides only the master.</p>\n<p>Defaults to: <code>0</code></p></div></div></div><div id='cfg-errors' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-errors' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-errors' class='name expandable'>errors</a> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>Error messages</p>\n</div><div class='long'><p>Error messages</p>\n</div></div></div><div id='cfg-nextcore' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-nextcore' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-nextcore' class='name expandable'>nextcore</a> : <a href=\"#!/api/Number\" rel=\"Number\" class=\"docClass\">Number</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Next available core ...</div><div class='long'><p>Next available core</p>\n<p>Defaults to: <code>0</code></p></div></div></div><div id='cfg-paths' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-paths' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-paths' class='name expandable'>paths</a> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'>Paths to various things. ...</div><div class='long'><p>Paths to various things.</p>\n<p>Defaults to: <code>{jobs: &quot;./jobs/&quot;}</code></p></div></div></div><div id='cfg-plugins' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-plugins' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-plugins' class='name expandable'>plugins</a> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><span class=\"signature\"></span></div><div class='description'><div class='short'><p>Modules to share accross all js-engines</p>\n</div><div class='long'><p>Modules to share accross all js-engines</p>\n</div></div></div><div id='cfg-thread' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-cfg-thread' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-cfg-thread' class='name expandable'>thread</a> : <a href=\"#!/api/Function\" rel=\"Function\" class=\"docClass\">Function</a><span class=\"signature\"><span class='private' >private</span></span></div><div class='description'><div class='short'><p>Start a sql thread</p>\n</div><div class='long'><p>Start a sql thread</p>\n</div></div></div></div></div><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-allocate' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-method-allocate' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-method-allocate' class='name expandable'>allocate</a>( <span class='pre'>req, args, cb</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Allocate the supplied callback cb(core) with the engine core that is/was allocated to a Client.Engine.Type.Instance\nt...</div><div class='long'><p>Allocate the supplied callback cb(core) with the engine core that is/was allocated to a Client.Engine.Type.Instance\nthread as defined by this request (in the req.body and req.log).  If a workflow Instance is\nprovided, then the engine is assumed to be in a workflow (thus the returned core will remain\non the same compile-step thread); otherwise, the engine is assumed to be standalone (thus forcing\nthe engine to re-compile each time it is stepped).</p>\n\n<p>As used here (and elsewhere) the terms \"process\", \"engine core\", \"safety core\", and \"worker\" are\nequivalent, and should not be confused with a physical \"cpu core\".  Because heavyweight\n(spawned) workers run in their own V8 instance, these workers can tollerate all faults (even\ncore-dump exceptions). The lightweight (cluster) workers used here, however, share the same V8\ninstance.  Heavyweight workers thus provide greater safety for bound executables (like opencv and\npython) at the expense of greater cpu overhead.</p>\n\n<p>The goal of hyperthreading is to balance threads across cpu cores.  The workerless (master only)\nconfiguration will intrinsically utilize only one of its underlying cpu cores (the OS remains,\nhowever, free to bounce between cpu cores via SMP).  A worker cluster, however, tends to\nbalance threads across all cpu cores, especially when the number of allocated workers exceeds\nthe number of physical cpu cores.</p>\n\n<p>Only the cluster master can see its workers; thus workers can not send work to other workers, only\nthe master can send work to workers.  Thus hyperthreading to <em>stateful</em> engines can be supported\nonly when master and workers are listening on different ports (workers are all listening on\nsame ports to provide <em>stateless</em> engines).  So typically place master on port N+1 (to server\nstateful engines) and its workers on port N (to serve stateless engines).</p>\n\n<p>This method will callback cb(core) with the requested engine core; null if the core could not\nbe located or allocated.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>req</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>args</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>cb</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li></ul></div></div></div><div id='method-execute' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-method-execute' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-method-execute' class='name expandable'>execute</a>( <span class='pre'></span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Execute engine cb(context) in its primed context. ...</div><div class='long'><p>Execute engine cb(context) in its primed context.</p>\n</div></div></div><div id='method-insert' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-method-insert' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-method-insert' class='name expandable'>insert</a>( <span class='pre'>req, res</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>(step)\n(kill)\n(read)\n(init)\n\nProvide methods to step/insert/POST, compile/update/PUT, run/select/GET, and free/delete...</div><div class='long'><p>(step)\n(kill)\n(read)\n(init)</p>\n\n<p>Provide methods to step/insert/POST, compile/update/PUT, run/select/GET, and free/delete/DELETE and engine.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>req</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>res</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li></ul></div></div></div><div id='method-prime' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-method-prime' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-method-prime' class='name expandable'>prime</a>( <span class='pre'></span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Callback engine cb(ctx) with its ctx primed with vars from its ctx.entry, then export its\nctx vars specified by its c...</div><div class='long'><p>Callback engine cb(ctx) with its ctx primed with vars from its ctx.entry, then export its\nctx vars specified by its ctx.exit.\nThe ctx.sqls = {var:\"query...\", ...} || \"query...\" enumerates the engine's ctx.entry (to import\nvars into its ctx before the engine is run), and enumerates the engine's ctx.exit (to export\nvars from its ctx after the engine is run).  If an sqls entry/exit exists, this will cause the\nctx.vars = [var, ...] list to be built to synchronously import/export the vars into/from the\nengine's context.</p>\n</div></div></div><div id='method-returns' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-method-returns' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-method-returns' class='name expandable'>returns</a>( <span class='pre'>context</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Return tau parameters in matrix format ...</div><div class='long'><p>Return tau parameters in matrix format</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>context</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li></ul></div></div></div><div id='method-save' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='ENGINE'>ENGINE</span><br/><a href='source/engine.html#ENGINE-method-save' target='_blank' class='view-source'>view source</a></div><a href='#!/api/ENGINE-method-save' class='name expandable'>save</a>( <span class='pre'>sql, taus, port, engine, saves</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Save tau job files. ...</div><div class='long'><p>Save tau job files.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>sql</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>taus</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>port</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>engine</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li><li><span class='pre'>saves</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'></div></li></ul></div></div></div></div></div></div></div>","meta":{}});