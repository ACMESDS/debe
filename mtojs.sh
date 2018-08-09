#!/bin/bash
# UNCLASSIFIED

python mtopy.py smop $1 -o temps/pub/$1.py
python giphy.py temps/pub/$1.py -o $2

# UNCLASSIFIED
