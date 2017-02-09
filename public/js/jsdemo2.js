var Name = query.Name;
var scope = {X:X, y:y};
var N = X.length;

MATH.eval("a = inv(X' * X) * X' * y",scope);
CON.log(scope.a);

var b = {Name:Name,Tests:N,Computed:new Date()}, a=scope.a;
for (var n=0,N=a.length;n<N;n++) b[n] = a[n];

CON.log(b);
