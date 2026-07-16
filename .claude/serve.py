"""Static file server that disables caching, so edits always show up immediately
(no more stale cached HTML/CSS/JS/images during iteration).

Threaded on purpose: a portfolio page pulls CSS, JS, fonts and several images in
parallel, and a single-threaded server blocks on one connection at a time, which
shows up in the browser as intermittent "connection refused" / half-loaded pages.
ThreadingHTTPServer serves the requests concurrently so pages load reliably.
"""
import http.server
import socketserver
import sys

PORT = 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # keep-alive off: stops idle browser sockets from tying up worker threads
    protocol_version = "HTTP/1.0"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    try:
        with Server(("", PORT), NoCacheHandler) as httpd:
            print(f"No-cache threaded server running on http://localhost:{PORT}")
            httpd.serve_forever()
    except OSError as e:
        # port already held by a healthy instance -> nothing to do
        print(f"Could not bind :{PORT} ({e}). Is another server already running?")
        sys.exit(1)
