module.exports = {
	usecase: {
		Save: "json",
		a: "float",
		b: "float"
	},

	engine: `
function rtn = mademo1(ctx)
	rtn = ctx.a + ctx.b;
end
`
}