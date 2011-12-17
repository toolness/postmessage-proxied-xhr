from fabric.api import *

def minify():
    local("uglifyjs ppx.js > ppx.min.js")
    local("uglifyjs ppx.jquery.js > ppx.jquery.min.js")
