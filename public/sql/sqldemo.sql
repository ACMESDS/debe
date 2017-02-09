TAU.select = function (sql,recs,cb) {
	var q = sql.query("SELECT * FROM ?? WHERE ?",["intake",{TRL:2}])
	.on("result", function (rec) {
		rec.Cat = rec.Name + rec.Tech;
		recs.push(rec);
	})
	.on("end", function () {
		console.log("returning recs="+recs.length);
		cb(recs);
	});
	console.log("sql command="+q.sql);
}
