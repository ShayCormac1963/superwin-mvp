#!/usr/bin/env python3
"""Scrape superwin323.com (OpenCart) catalog for the demo storefront.

Output:
  data/catalog.js            -> window.CATALOG = {...}
  assets/img/products/*.jpg  -> resized product images (600px)
Research/demo use only; replace with the merchant's own export before production.
"""
import concurrent.futures as cf
import html
import json
import os
import re
import subprocess
import time
import urllib.parse
import urllib.request

BASE = "https://superwin323.com/index.php?route="
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, "assets", "img", "products")
PER_CAT = int(os.environ.get("PER_CAT", "16"))
PER_SUB = int(os.environ.get("PER_SUB", "8"))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"


def get(url, binary=False, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                return data if binary else data.decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                print("FAIL", url, e)
                return None
            time.sleep(1.5 * (i + 1))


def clean(t):
    return re.sub(r"\s+", " ", html.unescape(t or "")).strip()


def parse_nav(home):
    nav = home[home.find("navbar-nav"):]
    nav = nav[: nav.find("</nav>")] if "</nav>" in nav else nav
    cats = []
    # top-level <li> items: dropdown or plain
    for m in re.finditer(r'<li(?: class="dropdown")?><a href="[^"]*path=(\d+)"[^>]*>([^<]+)</a>', nav):
        cid, name = m.group(1), clean(m.group(2))
        if any(c["id"] == cid for c in cats):
            continue
        subs = []
        # subcategories path=cid_xxx
        for sm in re.finditer(r'path=%s_(\d+)"[^>]*>([^<]+)<' % cid, nav):
            subs.append({"id": sm.group(1), "name": clean(sm.group(2))})
        cats.append({"id": cid, "name": name, "subs": subs})
    return cats


def parse_products(page):
    out = []
    for block in page.split('class="product-thumb"')[1:]:
        pid = re.search(r"product_id=(\d+)", block)
        img = re.search(r'<img src="([^"]+)"', block)
        name = re.search(r"<h4><a[^>]*>([^<]+)</a>", block)
        pm = re.search(r'<p class="price">(.*?)</p>', block, re.S)
        if not (pid and name and pm):
            continue
        price_html = pm.group(1)
        new = re.search(r'price-new">\s*\$([\d.,]+)', price_html)
        old = re.search(r'price-old">\s*\$([\d.,]+)', price_html)
        plain = re.findall(r"\$([\d.,]+)", price_html)
        price = float((new.group(1) if new else plain[0]).replace(",", "")) if (new or plain) else 0
        raw = clean(name.group(1))
        sku = re.search(r"#\s*([A-Za-z0-9][\w\-./ ]*)$", raw)
        out.append({
            "id": pid.group(1),
            "name": raw,
            "title": clean(re.sub(r"#.*$", "", raw)).title(),
            "sku": sku.group(1).strip() if sku else "",
            "price": price,
            "compare": float(old.group(1).replace(",", "")) if old else None,
            "src": html.unescape(img.group(1)) if img else "",
        })
    return out


def fetch_img(p):
    if not p["src"]:
        return p, False
    dest = os.path.join(IMG_DIR, f'{p["id"]}.jpg')
    if os.path.exists(dest):
        return p, True
    data = get(urllib.parse.quote(p["src"], safe=":/%?&=+~#@"), binary=True)
    if not data:
        return p, False
    tmp = dest + ".src"
    with open(tmp, "wb") as f:
        f.write(data)
    # resize to 600px JPEG q72 via macOS sips (no extra deps)
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", "72", "-Z", "600", tmp, "--out", dest],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(tmp)
    return p, os.path.exists(dest)


def main():
    os.makedirs(IMG_DIR, exist_ok=True)
    home = get(BASE.replace("index.php?route=", ""))
    cats = parse_nav(home)
    print("categories:", len(cats))

    products, seen = {}, set()
    latest = [p["id"] for p in parse_products(home)]
    for p in parse_products(home):
        products[p["id"]] = {**p, "cats": [], "subs": []}

    def add(items, cid, sid=None):
        for p in items:
            rec = products.setdefault(p["id"], {**p, "cats": [], "subs": []})
            rec.setdefault("subs", [])
            if cid not in rec["cats"]:
                rec["cats"].append(cid)
            if sid and sid not in rec["subs"]:
                rec["subs"].append(sid)

    sort = "&sort=p.date_added&order=DESC"
    for c in cats:
        page = get(f'{BASE}product/category&path={c["id"]}&limit={PER_CAT}{sort}') or ""
        items = parse_products(page)
        add(items, c["id"])
        n_sub = 0
        live_subs = []
        for s in c["subs"]:
            sp = get(f'{BASE}product/category&path={c["id"]}_{s["id"]}&limit={PER_SUB}{sort}') or ""
            si = parse_products(sp)
            if si:
                live_subs.append(s)
            add(si, c["id"], s["id"])
            n_sub += len(si)
            time.sleep(0.15)
        c["subs"] = live_subs
        print(f'  {c["name"]:<40} parent={len(items)} subs={len(live_subs)} subItems={n_sub}')
        time.sleep(0.2)

    plist = list(products.values())
    with cf.ThreadPoolExecutor(6) as ex:
        ok = [p for p, good in ex.map(fetch_img, plist) if good]
    for p in ok:
        p["img"] = f'assets/img/products/{p["id"]}.jpg'
        p.pop("src", None)
    catalog = {
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "source": "superwin323.com",
        "categories": [{k: v for k, v in c.items() if k != "count_hint"} for c in cats],
        "latest": [i for i in latest if any(p["id"] == i for p in ok)],
        "products": ok,
    }
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    with open(os.path.join(ROOT, "data", "catalog.js"), "w", encoding="utf-8") as f:
        f.write("window.CATALOG = " + json.dumps(catalog, ensure_ascii=False) + ";\n")
    print("products with images:", len(ok), "/", len(plist))


if __name__ == "__main__":
    main()
