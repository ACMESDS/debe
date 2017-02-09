#export BASE=/usr/local
export BASE=/base
export SIGMA=$BASE/sigma			# Production/development path
export PUBLIC=$SIGMA/public				# public path
export SHARES=$SIGMA/shares/				# static file area
export CERTS=$SIGMA/certs/lonestar/			# trusted auth certs
export TEMP=$SIGMA/tmp/					# temp files
export ICONS=icons/					# relative path to icons from $SIGMA
export JOBS=$PUBLIC/jobs/				# path to TAU simulator job files
export STORES=$PUBLIC/stores/ 				# persistant scrape area
export UPLOADS=$PUBLIC/uploads/ 			# one-time scrape area
export DATA=$PUBLIC/data/ 				# json data area
export SKINS=$PUBLIC/jade/				# site skins 
export CHIPS=$PUBLIC/images/chips/			# chipped files
export TIPS=$PUBLIC/images/tips/			# tipped files
export DB=$PUBLIC/dbs/cars/				# training and detector files
export PROOFS=$DB/db0/ 					# unmodulated training pos/neg files
export DEFAULT=$SHARES
export SCRIPTS=$SIGMA/clients/extjs/packages/ext-locale/build/ext-locale-

# Helpers
export IVA=/rroc/data/giat/iva
export CONDA=$BASE/anaconda-1.9
export LOCAL=/usr/local
export SOCKETS=/socket.io/socket.io.js 			# Path to socket.io
export INDEX= #data/nlp.json  				# reader nlp indexing save path
export SCAN=$SIGMA/node_modules/reader/jquery-1.7.1.min.js 	# web site scanners

# MIME code file paths
export CODE_PY=$PUBLIC/py/
export CODE_JS=$PUBLIC/js/
export CODE_MAT=$PUBLIC/mat/
export CODE_JADE=$PUBLIC/jade/
export CODE_HTML=$PUBLIC/htmls/

# reset paths 
export PATH=
export LD_LIBRARY_PATH=

# OpenCV
export CV=$BASE/opencv-3.0
export PATH=$PATH:$CV/include
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CV/lib

# NodeJS  
export NODE=$BASE/nodejs-5.5
export NODE_PATH=$SIGMA/node_modules	# where node looks for modules
export node_path=$NODE_PATH
export XLATE=$NODE_PATH/i18n-abide/tests/locale/	# I18N translation folder
export PATH=$PATH:$NODE/bin:$NODE/node_modules/node-gyp/bin

# MYSQL
export MYSQL=$BASE/mysql-7.4
export PATH=$PATH:$MYSQL/bin
export SECRETS_DB_USER="root"
export SECRETS_DB_PASS="NGA"
export SECRETS_DB_NAME="app1"
export SECRETS_SERVER_PASS=""
export SECRETS_VIEW_PASS="a password"


# TAU machines
export TAUIF=$SIGMA/node_modules/tauif
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$TAUIF/python/build/Release:$TAUIF/opencv/build/Release:$TAUIF/mac/build/Release
export PATH=$PATH:/usr/lib/qt-3.3/bin:$CV/bin
#export GYPOPTS=--nodedir=$NODE/install	# use "node-gyp ... $GYPTOPS" to distro to $NODE/install vs the inet
#export LINK=g++ 			# fixes node-gyp flock issue when source files on NFS system

# boost 
export PATH=$PATH:/usr/include
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/lib64

# atlas blas
export ATLAS=$BASE/atlas-3.10
export PATH=$PATH:$ATLAS/include

# cuda-caffe
export CUDA=/usr/local/cuda-7.5
export DNN=$BASE/cuDNN-3.0/cuda
export PATH=$PATH:$CUDA/bin:$DNN/include
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CUDA/lib64:$DNN/lib64

# docker
export GPU="--device /dev/nvidia0:/dev/nvidia0 --device /dev/nvidiactl:/dev/nvidiactl --device /dev/nvidia-uvm:/dev/nvidia-uvm"
export VOL="--volume /usr/local:/base --volume /home/jamesdb/installs:/installs"
export NET="--net=host"
export RUN="run -it $GPU $VOL $NET "

#export PATH=/usr/lib/qt-3.3/bin:$CV/bin:$CONDA/bin:$NODE/bin:$NODE/node_modules/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin:$IVA/bin:$MYSQL/bin:$SIGMA/cvutils
#export XLATE=$NODE_PATH/i18n-abide/examples/express3/i18n/	# I18N translation folder

# To use python2.7 under anaconda
# Python2.6 SQL connector copied to: /opt/anaconda/lib/python2.7/site-packages/mysql/connector

export PYTHONPATH=$SIGMA/public/python:$BASE/caffe-master/python
export PYTHONHOME=$CONDA
export PATH=$PATH:$CONDA/bin
export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$CONDA/lib

#export PATH=/usr/lib/qt-3.3/bin:$CV/bin:$CONDA/bin:$NODE/bin:$NODE/node_modules/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin:$IVA/bin:$MYSQL/bin:$SIGMA/cvutils

# To use python2.6 for yum
#export PYTHONPATH=$SIGMA/python_modules
#export PATH=$NODE/bin:$NODE/share/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin
#unset PYTHONHOME

# To use python2.6 for unoconv
#export PATH=/usr/lib/qt-3.3/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/home/Admin/bin
#unset PYTHONHOME
#unset PYTHONPATH

#echo Use '"./admins/startups.sh"' to start all services
#echo Use '"node sigma --start node0 &"' to start the sigma service

export PATH=$PATH:/usr/local/bin:/usr/bin:/usr/local/sbin:/usr/sbin:/home/jamesdb/.local/bin:/home/jamesdb/bin


