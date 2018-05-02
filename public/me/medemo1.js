module.exports = {
	usecase: {
		Save: "json",
		a: "float",
		b: "json"
	},

	engine: `
Save = a * (b + a);
disp(Save);
`
}