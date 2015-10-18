from bottle import route, run, error, static_file
from bottle import request as req
import json
import mockDatabase

@route('/api/autocomplete')
def autocomplete():
    hint = req.query.hint.trim
    return json.dumps(mockDatabase.getMockData(hint))

@route('/')
def serveHTML():
    return static_file('app.html', root="./static/")

@route('/js/<file>')
def serveJS(file):
    return static_file(file, root="./static/js")

@route('/css/<file>')
def serveCSS(file):
    return static_file(file, root="./static/css")

@route('/font/<file>')
def serveCSS(file):
    return static_file(file, root="./static/font")

@error(404)
def err404(err):
    return "404 File Not Found"

# run(host='0.0.0.0', port=80, debug=False)
run(host='localhost', port=8080, debug=True)
