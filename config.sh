#!/bin/bash
# UNCLASSIFIED when IP addresses and passwords are undefined

export BASE=/local
export HERE=`pwd`

# specific geonode client
export PUBLIC=./public					# public path
export ADMIN=$HERE/admins 				# admin stuff, checkpoints
export TEMP=$HERE/tmp/					# temp files
export DB=$PUBLIC/dbs/					# training images
export DETS=$PUBLIC/dets/ 				# trained detectors
export PROOFS=$PUBLIC/cars/ver0/ 			# unmodulated/unrotated images for testing
export DEFAULT=$HERE
export SCRIPTS=$HERE/clients/extjs/packages/ext-locale/build/ext-locale-
export THEMES=$HERE/clients/themes
#export DEBUG=http://localhost:8080

# Python
export PYTHONPATH=$PYTHONPATH:$HERE/public/py

# Helpers
#export IVA=/rroc/data/giat/iva			# IDOP conversion utilities
#export CONDA=$BASE/anaconda				# anaconda suite
#export SOCKETS=/socket.io/socket.io.js 	# Path to socket.io
export INDEX= #data/nlp.json  			# reader nlp indexing save path
export SCAN=$HERE/node_modules/reader/jquery-1.7.1.min.js 	# web site scanners
#export SWAG=$HERE/node_modules/swag 	# machine learners

#export CERTS=$HERE/certs/lonestar/		# trusted auth certs

#export ENGINES=./public
#export TEMPS=./tmp
#export AREAS=.
# MIME code file paths
#export CODE_PY=$PUBLIC/py/
#export CODE_JS=$PUBLIC/js/
#export CODE_MAT=$PUBLIC/mat/
#export CODE_JADE=$PUBLIC/jade/
#export CODE_HTML=$PUBLIC/htmls/

export XLATE=$HERE/node_modules/i18n-abide/examples/express3/i18n	# I18N translation folder
export PATH=$PATH:$NODE/bin

# Jade views
export VIEW_PASS="a password"

# MYSQL
#export MYSQL=$BASE/mysql
#export PATH=$PATH:$MYSQL/bin

export PATH=/opt/cmake:$PATH 			# latest cmake
export PATH=$BASE/oxygen/bin:$PATH    # doxygen code documenter

# UNCLASSIFIED when IP addresses and passwords are undefined
