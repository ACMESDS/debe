module.exports = {
	keys: {
		Save: "json",
		a: "float comment 'a param' "
	},

	docs: {
		Save: `
here is some long winded comment
with a fancy eqn !$ \\alpha = 123 $ and get this ...
$$ \\beta = \\alpha + 1 $$ and a plot [plot;100;100](/data/energy.json;x=name;y=name) and a ref #{now} time.
the end. ` 
	},

	engine: `
def pydemo1(ctx,res):
print "welcome to python you lazy bird"
#print OS
ctx['Save'] = [ {'x':1, 'y':2, 'z':0}, {'x':3, 'y':4, 'z':10}]
res(ctx)
SQL0 = OS['SQL0']
SQL0.execute("SELECT * from app.Htest", () )
#SQL0.execute("SELECT 1 as x, 2 as y", () )
for (Rec) in SQL0:
	print Rec
`
};
