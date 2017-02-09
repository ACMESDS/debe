export SIGMA=~/sigma						# Production/development path
export PUBLIC=$SIGMA/public					# public path
export SHARES=$SIGMA/shares/				# static file area
export CERTS=$SIGMA/certs/lonestar/			# trusted auth certs
export THEMES=$SIGMA/themes/	# css themes
export ICONS=icons/							# path to icons
export JOBS=$PUBLIC/jobs/					# path to TAU simulator job files
export HTMLS=$PUBLIC/htmls/ 				# path to html index	
export STORES=$PUBLIC/stores/ 				# persistant scrape area
export UPLOADS=$PUBLIC/uploads/ 			# one-time scrape area
export DATA=$PUBLIC/data/ 					# json data area
export SKINS=$PUBLIC/jade/					# site skins 
export CHIPS=$PUBLIC/images/chips/			# image files
export TIPS=$PUBLIC/images/tips/			# image files
export POSITIVES=$PUBLIC/images/train/positives/	# image files
export NEGATIVES=$PUBLIC/images/train/negatives/	# image files
export DEFAULT=$SHARES

export SOCKETS=/socket.io/socket.io.js 		# Path to socket.io
export INDEX= #data/nlp.json  				# reader nlp indexing save path
export SCAN=$SIGMA/node_modules/reader/jquery-1.7.1.min.js 	# web site scanners

# MIME code file paths
export CODE_PY=$PUBLIC/py/
export CODE_JS=$PUBLIC/js/
export CODE_MAT=$PUBLIC/mat/
export CODE_JADE=$PUBLIC/jade/
export CODE_HTML=$PUBLIC/htmls/

# Helpers
export IVA=/rroc/data/giat/iva
export CONDA=/opt/anaconda
export NODE=/opt/node
export TAUIF=$SIGMA/node_modules/tauif
export PYTAU=$TAUIF/machines/python
export CVTAU=$TAUIF/machines/opencv
export LOCAL=/usr/local

# NodeJS env.  
export NODE_PATH=$SIGMA/node_modules	# where node looks for modules
export node_path=$NODE_PATH
export GYPOPTS=--nodedir=$NODE/install	# use "node-gyp ... $GYPTOPS" to distro to $NODE/install vs the inet
export LINK=g++ 						# fixes node-gyp flock issue when source files on NFS system
export LD_LIBRARY_PATH=$TAUIF/lib:$CONDA/lib 		# location of tau machine libs bound to nodejs

# To use python2.7 under anaconda
# Python2.6 SQL connector copied to: /opt/anaconda/lib/python2.7/site-packages/mysql/connector

export PYTHONPATH=$SIGMA/public/python
export PYTHONHOME=$CONDA
export PATH=/usr/lib/qt-3.3/bin:$CONDA/bin:$NODE/bin:$NODE/share/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin:$IVA/bin

# To use python2.6 for yum
#export PYTHONPATH=$SIGMA/python_modules
#export PATH=$NODE/bin:$NODE/share/node-gyp/bin:$LOCAL/bin:/usr/bin:/bin:$LOCAL/sbin:/usr/sbin:/sbin
#unset PYTHONHOME

# To use python2.6 for unoconv
#export PATH=/usr/lib/qt-3.3/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:/home/Admin/bin
#unset PYTHONHOME
#unset PYTHONPATH

# Secrets

export SECRETS_DB_USER="root"
export SECRETS_DB_PASS="NGA"
export SECRETS_DB_NAME="app1"
export SECRETS_SERVER_PASS=""
export SECRETS_VIEW_PASS="a password"

echo Use "admins/startup.sh" to start services
