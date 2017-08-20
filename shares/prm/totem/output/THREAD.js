Ext.data.JsonP.THREAD({"tagname":"class","name":"THREAD","autodetected":{},"files":[{"filename":"totem.js","href":"totem.html#THREAD"}],"members":[{"name":"con","tagname":"method","owner":"THREAD","id":"method-con","meta":{}},{"name":"resThread","tagname":"method","owner":"THREAD","id":"method-resThread","meta":{}},{"name":"sesThread","tagname":"method","owner":"THREAD","id":"method-sesThread","meta":{}},{"name":"sqlThread","tagname":"method","owner":"THREAD","id":"method-sqlThread","meta":{}}],"alternateClassNames":[],"aliases":{},"id":"class-THREAD","component":false,"superclasses":[],"subclasses":[],"mixedInto":[],"mixins":[],"parentMixins":[],"requires":[],"uses":[],"html":"<div><pre class=\"hierarchy\"><h4>Files</h4><div class='dependency'><a href='source/totem.html#THREAD' target='_blank'>totem.js</a></div></pre><div class='doc-contents'><p>processing</p>\n</div><div class='members'><div class='members-section'><div class='definedBy'>Defined By</div><h3 class='members-title icon-method'>Methods</h3><div class='subsection'><div id='method-con' class='member first-child not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='THREAD'>THREAD</span><br/><a href='source/totem.html#THREAD-method-con' target='_blank' class='view-source'>view source</a></div><a href='#!/api/THREAD-method-con' class='name expandable'>con</a>( <span class='pre'>req, res</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'>Start a connection thread cb(err) containing a Req.req.sql connector,\na validated Req.req.cert certificate, and set a...</div><div class='long'><p>Start a connection thread cb(err) containing a Req.req.sql connector,\na validated Req.req.cert certificate, and set appropriate Res headers.</p>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>req</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'><p>request</p>\n</div></li><li><span class='pre'>res</span> : <a href=\"#!/api/Function\" rel=\"Function\" class=\"docClass\">Function</a><div class='sub-desc'><p>response</p>\n\n<p>on-input req = {action, socketio, query, body, flags, joins}\non-output req =  adds {log, cert, client, org, serverip, session, group, profile, journal,\njoined, email and STATICS}</p>\n</div></li></ul></div></div></div><div id='method-resThread' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='THREAD'>THREAD</span><br/><a href='source/totem.html#THREAD-method-resThread' target='_blank' class='view-source'>view source</a></div><a href='#!/api/THREAD-method-resThread' class='name expandable'>resThread</a>( <span class='pre'>req, cb</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'> ...</div><div class='long'>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>req</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'><p>Totem request</p>\n</div></li><li><span class='pre'>cb</span> : <a href=\"#!/api/Function\" rel=\"Function\" class=\"docClass\">Function</a><div class='sub-desc'><p>sql connector callback(sql)</p>\n\n<p>Callback with request set to sql conector</p>\n</div></li></ul></div></div></div><div id='method-sesThread' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='THREAD'>THREAD</span><br/><a href='source/totem.html#THREAD-method-sesThread' target='_blank' class='view-source'>view source</a></div><a href='#!/api/THREAD-method-sesThread' class='name expandable'>sesThread</a>( <span class='pre'>Req, Res</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'> ...</div><div class='long'>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>Req</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'><p>http/https request</p>\n</div></li><li><span class='pre'>Res</span> : <a href=\"#!/api/Object\" rel=\"Object\" class=\"docClass\">Object</a><div class='sub-desc'><p>http/https response</p>\n\n<p>Holds a HTTP/HTTPS request-repsonse session thread.</p>\n</div></li></ul></div></div></div><div id='method-sqlThread' class='member  not-inherited'><a href='#' class='side expandable'><span>&nbsp;</span></a><div class='title'><div class='meta'><span class='defined-in' rel='THREAD'>THREAD</span><br/><a href='source/totem.html#THREAD-method-sqlThread' target='_blank' class='view-source'>view source</a></div><a href='#!/api/THREAD-method-sqlThread' class='name expandable'>sqlThread</a>( <span class='pre'>cb</span> )<span class=\"signature\"></span></div><div class='description'><div class='short'> ...</div><div class='long'>\n<h3 class=\"pa\">Parameters</h3><ul><li><span class='pre'>cb</span> : <a href=\"#!/api/Function\" rel=\"Function\" class=\"docClass\">Function</a><div class='sub-desc'><p>sql connector callback(sql)</p>\n\n<p>Callback with sql connector</p>\n</div></li></ul></div></div></div></div></div></div></div>","meta":{}});