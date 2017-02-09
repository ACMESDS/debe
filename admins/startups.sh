# if starting mysql produces a "The server quit without updating PID file (/var/lib/mysql/localhost.localdomain.pid)" 
# error, the problem lies with goofy selinux, and we must disable selinux (or somehow fix its rules).
# as root: 
# echo 0 > /selinux/enforce

# start sigma service
node $SIGMA/sigma --start node0 &

# start cesium service
node $NODE/node_modules/cesiumjs/server --port 8083 --public &

# start node red service
node $NODE/node_modules/node-red/red &

# start mysql server if not already started
# service mysql start
# mysqld_safe --defaults-file=$SIGMA/my.cnf
