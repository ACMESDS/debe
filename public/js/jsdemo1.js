module.exports = {
	usecase: {
		Save: "json",
		M: "int(11)",
		Pipe: "json",
		Share: "boolean",
		Description: "mediumtext"
	},
	
	engine: function jsdemo1(ctx, res) {
		Log("jsdemo1 ctx", ctx);
		var debug = false;
		
		if (debug) {
			Log("A="+ctx.A.length+" by "+ctx.A[0].length);
			Log("B="+ctx.B.length+" by "+ctx.B[0].length);
		}

		ctx.Save = [ {u: ctx.M}, {u:ctx.M+1}, {u:ctx.M+2} ];
		res(ctx);

		if (debug)
			STEP( ctx, function (evs,sink) {
				Log(evs);
			});
		
		if (debug)
			ME.exec(ctx, "D=A*A'; E=D+D*3; disp(entry); ", (vmctx) => {
				Log( "D=", vmctx.D, "E=", vmctx.E);
			});
	}
}