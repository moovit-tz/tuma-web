"""Make every static proxy_pass resolve per request, so one missing container can't stop nginx from starting."""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
lines = open(src).read().split("\n")
out, loc, changed = [], None, []
pp = re.compile(r"^(\s*)proxy_pass http://([a-z0-9-]+):(\d+)(/[^;]*)?;\s*$")
for i, line in enumerate(lines):
    m_loc = re.match(r"^\s*location\s+(=\s+)?(\S+)\s*\{", line)
    if m_loc:
        loc = m_loc.group(2)
    m = pp.match(line)
    if not m:
        out.append(line); continue
    ind, host, port, uri = m.group(1), m.group(2), m.group(3), m.group(4)
    var = "$up_" + host.replace("-", "_")
    block = [f"{ind}set {var} http://{host}:{port};"]
    if uri is None:
        pass  # no path on proxy_pass: the request path goes through unchanged, as before
    else:
        if not loc.endswith("/"):
            sys.exit(f"line {i+1}: location {loc} has no trailing slash; not converting automatically")
        target = uri if uri.endswith("/") else uri + "/"
        block.append(f"{ind}rewrite ^{re.escape(loc)}(.*)$ {target}$1 break;")
    block.append(f"{ind}proxy_pass {var};")
    out += block
    changed.append(f"{host}:{port}  location {loc}  path {uri or '(unchanged)'}")
text = "\n".join(out)
# One resolver for the whole http block (Docker's DNS); per-location resolvers already there stay as they are.
text = text.replace("http {\n", "http {\n    # Look containers up per request, not at startup: a stopped container then breaks only its own site.\n    resolver 127.0.0.11 valid=10s ipv6=off;\n", 1)
# Refuse to stack on a location that already rewrites.
for blk in re.findall(r"location[^{]*\{[^}]*\}", text):
    if blk.count("rewrite ") > 1:
        sys.exit("a location ends up with two rewrites; stopping:\n" + blk)
open(dst, "w").write(text)
print("\n".join(changed)); print(f"{len(changed)} converted")
