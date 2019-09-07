module.exports = {
	usecase: {
		New: "boolean",
		Starts: "datetime",
		Stay: "int(11)",
		Message: "mediumtext",
		Category: "varchar(64)",
		To: "varchar(16)"
	},

	engine: function news(ctx,res) {  
		var 
			sql = ctx.sql,
			parts = ctx.Message.split("@"),
			subj = parts[0],
			rhs = parts[1] || "",
			to = rhs.substr(0,rhs.indexOf(" ")),
			body = rhs.substr(to.length);

		Trace(`FEEDNEWS ${to}`, sql);

		switch (to) {
			case "conseq":

			case "wicwar":

			case "jira":
				break;

			case "":
				break;

			default:
				sendMail({
					to:  to,
					subject: subj,
					html: body.format( {
						today: new Date(),
						me: req.client
					}),
					alternatives: [{
						contentType: 'text/html; charset="ISO-8859-1"',
						contents: ""
					}]
				}, sql);
		}

		sql.query("SELECT ID,datediff(now(),Starts) AS Age, Stay FROM news HAVING Age>Stay")
		.on("result", function (news) {
			sql.query("DELETE FROM news WHERE ?",{ID:news.ID});
		});

		sql.query("UPDATE news SET age=datediff(now(),Starts)");

		sql.query("UPDATE news SET fuse=Stay-datediff(now(),Starts)");

		sql.query("SELECT * FROM news WHERE Category LIKE '%/%'")
		.on("result", function (news) {  
			var parts = news.Category.split("/"), name = parts[0], make = parts[1], client = "system";

			sql.query(
				  "SELECT intake.*, link(intake.Name,concat(?,intake.Name)) AS Link, "
				+ "link('dashboard',concat('/',lower(intake.Name),'.view')) AS Dashboard, "
				+ "sum(datediff(now(),queues.Arrived)) AS Age, min(queues.Arrived) AS Arrived, "
				//+ "link(concat(queues.sign0,queues.sign1,queues.sign2,queues.sign3,queues.sign4,queues.sign5,queues.sign6,queues.sign7),concat(?,intake.Name)) AS Waiting, "
				+ "link(states.Name,'/parms.view') AS State "
				+ "FROM intake "
				+ "LEFT JOIN queues ON (queues.Client=? and queues.State=intake.TRL and queues.Class='TRL' and queues.Job=intake.Name) "
				+ "LEFT JOIN states ON (states.Class='TRL' and states.State=intake.TRL) "
				+ "WHERE intake.?", ["/intake.view?name=","/queue.view?name=",client,{ Name:name }] ) 
			.on("error", function (err) {
				LOG(err);
			})
			.on("result", function (sys) {
				var msg = sys.Link+" "+make.format(sys);

				sql.query("UPDATE news SET ? WHERE ?", [
					{	Message: msg,
						New: msg != news.Message ? -1 : 0
					}, 
					{ID:news.ID}
				]);
			});
		});
	}

}