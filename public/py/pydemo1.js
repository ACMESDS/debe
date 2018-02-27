module.exports = {
	usecase: {
		Save: "json"
	},
	
	engine: `
def pydemo1(ctx,res):
	print "welcome to python you lazy bird"
	#print OS
	ctx['Save'] = [ {'x':1, 'y':2, 'z':0}, {'x':3, 'y':4, 'z':10}]
	res(ctx)
	if True:
		SQL0 = OS['SQL0']
		SQL0.execute("SELECT * from app.Htest", () )
		#SQL0.execute("SELECT 1 as x, 2 as y", () )
		for (Rec) in SQL0:
			print Rec
`
}