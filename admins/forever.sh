#!/bin/bash
export SIGMA=/home/Admin/sigma					# Production path
export DATA=$SIGMA/apps/public			# data, uploads, stores, json etc 
export IVA=/rroc/data/giat/iva			# iva file conversion utilities 
export CONDA=/opt/anaconda				# anaconda suite 
export NODE=/opt/node					# the nodejs
export APPS=$SIGMA/apps 				# nodejs services
export SHARE=$SIGMA/apps/share			# static content
export TAUIF=$SIGMA/node_modules/tauif	# tauif workflow system
export PYTAU=$TAUIF/machines/python		# tauif python machines
export CVTAU=$TAUIF/machines/opencv		# tauif opencv machines
export LOCAL=/usr/local					# local stuff
export CERTS=$APPS/certs/lonestar 		# certs for trusted authorities
export NODE_PATH=$SIGMA/node_modules	# node looks here for its requires
export GYPOPTS=--nodedir=$NODE/install	# use "node-gyp ... $GYPTOPS" to distro to $NODE/install vs the inet
export LINK=g++ 						# fixes node-gyp flock issue when source files on NFS system
export LD_LIBRARY_PATH=$TAUIF/lib:$CONDA/lib 		# location of tau machine libs bound to nodejs
export PYTHONPATH=$APPS/public/py		# To use python2.7 under anaconda
export PYTHONHOME=$CONDA				# To use python2.7 under anaconda

export PATH=/usr/lib/qt-3.3/bin:$CONDA/bin:$NODE/bin:$NODE/share/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin:$IVA/bin

# To use python2.6 for yum
#export PYTHONPATH=$SIGMA/python_modules
#export PATH=$NODE/bin:$NODE/share/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin
#unset PYTHONHOME

# To use python2.6 for unoconv
#export PATH=/usr/lib/qt-3.3/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/home/Admin/bin
#unset PYTHONHOME
#unset PYTHONPATH

NAME="SIGMA"
NODE_BIN_DIR="$NODE/bin"
APPLICATION_PATH="$SIGMA/sigma.js"
PIDFILE="/var/run/sigma.pid"
LOGFILE="/var/log/sigma.log"
MIN_UPTIME="5000"
SPIN_SLEEP="2000"

start() {
	echo "Starting $NAME"

	$NODE_PATH/forever/bin/forever \
	 --pidFile $PIDFILE \
	 -a \
	 -l $LOGFILE \
	 --minUptime $MIN_UPTIME \
	 --spinSleepTIME $SPIN_SLEEP_TIME \
	 start $APPLICATION_PATH 2>&1 > /dev/null &
	RETVAL=$?
}

stop() {
	if [ -f $PIDFILE ]; then
		echo "Shutting down $NAME"
		$NODE_PATH/forver/bin/forever stop $APPLICATION_PATH 2>&1 > /dev/null
		rm -f $PIDFILE
		RETVAL=$?
	else
		echo "$NAME is not running"
		RETVAL=0
	fi
}

restart() {
	stop
	start
}

status() {
	echo `$NODE_PATH/forever/bin/forever list` | grep -q "$APPLICATION_PATH"
	if [ "$?" -eq "0" ]; then
		echo "$NAME is running"
		RETVAL=0
	else
		echo "$NAME is not running"
		RETVAL=3
	fi
}

case "$1" in
	start)
		start
		;;
	stop)
		stop
		;;
	status)
		status
		;;
	restart)
		restart
		;;
	*)
		echo "Usage: {start|stop|status|restart"
		exit 1
		;;		
esac

exit $RETVAL

