"""
Command Center – Lokaler Server mit Home Assistant Proxy
Startet einen Webserver auf Port 8000 und leitet /ha-api/* an Home Assistant weiter.
So gibt es kein CORS-Problem im Browser.
"""
import http.server
import urllib.request
import os

HA_URL = "http://192.168.178.20:8123"
HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI0MzJlZmYxYzg0YTk0MjcwOGYwMjhiODU1ZjlhNTRjMiIsImlhdCI6MTc3NDI5ODQ0NiwiZXhwIjoyMDg5NjU4NDQ2fQ.BC4rOoXcrd-EjTQbfeaxVz0aunvOU2o42gFd1iyQjCg"
PORT = 8000
DIR = os.path.dirname(os.path.abspath(__file__))

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/ha-api/"):
            self._proxy_ha("GET")
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/ha-api/"):
            self._proxy_ha("POST")
        else:
            self.send_error(405)

    def _proxy_ha(self, method):
        ha_path = self.path.replace("/ha-api/", "/api/", 1)
        url = HA_URL + ha_path
        headers = {
            "Authorization": "Bearer " + HA_TOKEN,
            "Content-Type": "application/json",
        }
        body = None
        if method == "POST":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length > 0 else None

        try:
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(f'{{"error":"{e}"}}'.encode())

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

if __name__ == "__main__":
    os.chdir(DIR)
    with http.server.HTTPServer(("", PORT), ProxyHandler) as srv:
        print(f"\n  Command Center laeuft auf http://localhost:{PORT}/command-center.html")
        print(f"  Home Assistant Proxy aktiv -> {HA_URL}")
        print(f"  Dieses Fenster NICHT schliessen!\n")
        srv.serve_forever()
