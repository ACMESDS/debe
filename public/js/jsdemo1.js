module.exports = {
	usecase: {
		Save: "json",
		M: "int(11)",
		Pipe: "json",
		Share: "boolean"
	},
	
	engine: function jsdemo1(ctx, res) {
		Log("jsdemo1 ctx", ctx);
		//Log("A="+ctx.A.length+" by "+ctx.A[0].length);
		//Log("B="+ctx.B.length+" by "+ctx.B[0].length);

		ctx.Save = [ {u: ctx.M}, {u:ctx.M+1}, {u:ctx.M+2} ];
		res(ctx);

		/*STEP( ctx, function (evs) {
			Log(evs);
		});*/
		//ME.exec(ctx, "D=A*A'; E=D+D*3; disp(entry); ");
		//Log( "D=", ctx.D, "E=", ctx.E);
	}
}