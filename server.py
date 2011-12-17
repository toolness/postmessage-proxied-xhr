import os
import mimetypes
import traceback
from wsgiref.simple_server import make_server
from wsgiref.util import FileWrapper

ROOT = os.path.abspath(os.path.dirname(__file__))

mimetypes.add_type('application/x-font-woff', '.woff')

def simple_response(start, contents, code='200 OK', mimetype='text/plain'):
    start(code, [('Content-Type', mimetype),
                 ('Content-Length', str(len(contents)))])
    return [contents]

def handle_request(env, start, handlers):
    try:
        for handler in handlers:
            response = handler(env, start)
            if response is not None:
                return response
        return simple_response(start, "Not Found: %s" % env['PATH_INFO'],
                               code='404 Not Found')
    except Exception:
        msg = "500 INTERNAL SERVER ERROR\n\n%s" % traceback.format_exc()
        return simple_response(start, msg, code='500 Internal Server Error')

class BasicFileServer(object):
    def __init__(self, static_files_dir):
        self.ext_handlers = {}
        self.default_filenames = ['index.html']
        self.static_files_dir = static_files_dir

    def try_loading(self, filename, env, start):
        static_files_dir = self.static_files_dir
        fileparts = filename[1:].split('/')
        fullpath = os.path.join(static_files_dir, *fileparts)
        fullpath = os.path.normpath(fullpath)
        if (fullpath.startswith(static_files_dir) and
            not fullpath.startswith('.')):
            if os.path.isfile(fullpath):
                ext = os.path.splitext(fullpath)[1]
                handler = self.ext_handlers.get(ext)
                if handler:
                    mimetype, contents = handler(env, static_files_dir, fullpath)
                    return simple_response(start, contents, mimetype=mimetype)
                (mimetype, encoding) = mimetypes.guess_type(fullpath)
                if mimetype:
                    filesize = os.stat(fullpath).st_size
                    start('200 OK', [('Content-Type', mimetype),
                                     ('Content-Length', str(filesize))])
                    return FileWrapper(open(fullpath, 'rb'))
            elif os.path.isdir(fullpath) and not filename.endswith('/'):
                start('302 Found', [('Location', env['SCRIPT_NAME'] +
                                                 filename + '/')])
                return []
        return None

    def handle_request(self, env, start):
        filename = env['PATH_INFO']

        if filename.endswith('/'):
            for index in self.default_filenames:
                result = self.try_loading(filename + index, env, start)
                if result is not None:
                    return result
        return self.try_loading(filename, env, start)

def cors_handler(env, start):
    def response(contents):
        headers = [
            ('Content-Type', 'text/plain'),
            ('Content-Length', str(len(contents)))
        ]
        if 'HTTP_ORIGIN' in env:
            headers.extend([
                ('Access-Control-Allow-Origin', env['HTTP_ORIGIN']),
                ('Access-Control-Allow-Methods', 'GET, OPTIONS')
                ])
        start('200 OK', headers)
        return [contents]

    if env['PATH_INFO'] == '/cors/sample.txt':
        return response('hello there, I am sample text.')

    return None

def run_cors_server(port, static_files_dir):
    file_server = BasicFileServer(static_files_dir)
    handlers = [cors_handler, file_server.handle_request]
    
    def application(env, start):
        return handle_request(env, start, handlers=handlers)

    httpd = make_server('', port, application)
    httpd.serve_forever()

def run_server(port, static_files_dir):
    import threading

    s1 = threading.Thread(target=run_cors_server, args=(port+1, ROOT))
    s1.setDaemon(True)
    s1.start()

    file_server = BasicFileServer(static_files_dir)
    handlers = [file_server.handle_request]

    def application(env, start):
        return handle_request(env, start, handlers=handlers)

    httpd = make_server('', port, application)

    url = "http://127.0.0.1:%s/" % port
    print "development server started at %s" % url
    print "press CTRL-C to stop it"

    httpd.serve_forever()

if __name__ == '__main__':
    run_server(9000, ROOT)
