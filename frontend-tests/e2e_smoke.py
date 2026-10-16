"""NEXORA end-to-end smoke test (headless Chromium via Playwright).

Starts the real Flask backend and serves the static frontend under a /NEXORA/ sub-path
(like GitHub Pages), then drives the real UI. Uses temporary directories only.
Run:  python3 frontend-tests/e2e_smoke.py [--shots DIR]
"""
import argparse, os, shutil, subprocess, sys, tempfile, threading, time, wave, struct, math, http.server, socketserver, functools
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "mobile-server"))
from werkzeug.serving import make_server
from config import Config
from app import create_app
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser(); ap.add_argument("--shots", default=None); args = ap.parse_args()
results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail)); print(("PASS " if cond else "FAIL ") + name + ((" — " + str(detail)) if detail and not cond else ""))

base = tempfile.mkdtemp(prefix="nexora-e2e-")
media = os.path.join(base, "media"); os.makedirs(media + "/Music"); os.makedirs(media + "/Movies"); os.makedirs(media + "/Photos")
with wave.open(media + "/Music/tone.wav", "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(8000)
    w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(i / 8))) for i in range(8000 * 20)))
subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=duration=20:size=320x180:rate=15", "-f", "lavfi", "-i", "sine=duration=20", "-c:v", "libvpx", "-b:v", "200k", "-c:a", "libvorbis", media + "/Movies/clip.webm", "-y"], check=True)
from PIL import Image
Image.new("RGB", (640, 400), (200, 90, 40)).save(media + "/Photos/sunset.png"); Image.new("RGB", (300, 300), (20, 90, 200)).save(media + "/Photos/blue.png")
open(media + "/notes.txt", "w").write("hello")
sub = "WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nHello subtitles\n"
open(media + "/Movies/clip.vtt", "w").write(sub)

BACK, FRONT = 8765, 8099
cfg = Config(data_dir=base + "/data", media_roots=[{"name": "lib", "path": media}], dev_origins=["http://127.0.0.1:%d" % FRONT], password_iterations=2000, min_rescan_seconds=0)
app = create_app(cfg); setup_code = app.config["SETUP_CODE"]
srv = make_server("127.0.0.1", BACK, app, threaded=True); threading.Thread(target=srv.serve_forever, daemon=True).start()
site = os.path.join(base, "site"); os.makedirs(site); os.symlink(ROOT, os.path.join(site, "NEXORA"))
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class TS(socketserver.ThreadingTCPServer): allow_reuse_address = True; daemon_threads = True
fs = TS(("127.0.0.1", FRONT), functools.partial(H, directory=site)); threading.Thread(target=fs.serve_forever, daemon=True).start()
URL = "http://127.0.0.1:%d/NEXORA/" % FRONT; API = "http://127.0.0.1:%d" % BACK
shots = args.shots; shots and os.makedirs(shots, exist_ok=True)

range_log, console_errors, failed = [], [], []
OFFLINE = {"on": False}
def hook(page):
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append("PAGEERROR " + str(e)))
    page.on("requestfailed", lambda r: failed.append(r.url + " " + str(r.failure)) if not OFFLINE["on"] and "ERR_ABORTED" not in str(r.failure) else None)
    page.on("response", lambda r: range_log.append((r.status, r.url, r.request.headers.get("range"))) if "/stream/" in r.url else None)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 390, "height": 800}, accept_downloads=True, has_touch=True)
    page = ctx.new_page(); hook(page)
    page.goto(URL); page.wait_for_selector(".intro")
    check("intro plays on full load", page.locator(".intro").count() == 1)
    page.wait_for_timeout(1500)
    if shots: page.screenshot(path=shots + "/01-intro.png")
    page.click(".intro"); page.wait_for_selector(".intro", state="detached", timeout=4000)
    check("intro dismissed by tap", True)
    page.wait_for_selector("h1:has-text('Server connection')")
    check("no backend -> connect screen (subpath routing)", "/NEXORA/" in page.url and page.url.endswith("#/connect"), page.url)
    page.fill("#backend", API); page.click("text=Save and test")
    page.wait_for_selector("h1:has-text('Set up'), h1:has-text('Set up your server')", timeout=8000)
    check("saved URL, reachable, first-run setup shown", True)
    check("backend URL stored in localStorage, no secrets", page.evaluate("localStorage.getItem('nexora.backendUrl')") == API)
    page.fill("#username", "owner"); page.fill("#password", "correct-horse-battery"); page.fill("#setup_code", "BAD-CODE-0000"); page.click("button:has-text('Create owner account')")
    page.wait_for_selector(".field-error:has-text('setup code')")
    check("wrong setup code rejected in UI", True)
    page.fill("#setup_code", setup_code); page.click("button:has-text('Create owner account')")
    page.wait_for_selector("h1:has-text('owner')", timeout=8000)
    check("owner created, dashboard shown", True)
    tok = page.evaluate("sessionStorage.getItem('nexora.session')")
    check("token only in sessionStorage", bool(tok) and not page.evaluate("Object.values(localStorage).join('|')").count(tok))
    check("password not stored anywhere", "correct-horse" not in page.evaluate("JSON.stringify(localStorage)+JSON.stringify(sessionStorage)"))
    if shots: page.screenshot(path=shots + "/02-dashboard-empty.png")

    # scan
    page.goto(URL + "#/storage"); page.wait_for_selector("button:has-text('Scan now')"); page.click("button:has-text('Scan now')")
    page.wait_for_selector("text=Last scan completed", timeout=10000)
    check("scanner via UI indexes library", True)
    page.goto(URL + "#/library"); page.wait_for_selector(".media-card"); n = page.locator(".media-card").count()
    check("library lists items", n == 6, n)
    page.fill("#view input[type=search]", "tone"); page.wait_for_timeout(700)
    check("search filters in UI", page.locator(".media-card").count() == 1)
    page.fill("#view input[type=search]", ""); page.wait_for_timeout(600)
    page.click("button:has-text('Images')"); page.wait_for_timeout(600)
    check("type filter works", page.locator(".media-card").count() == 2)
    page.click("button:has-text('All')")
    if shots: page.screenshot(path=shots + "/03-library-mobile.png")

    # video playback + seek + subtitles + progress
    page.goto(URL + "#/library"); page.wait_for_selector(".media-card"); page.click(".media-card:has-text('clip.webm') >> nth=0")
    page.wait_for_selector("video"); page.wait_for_function("document.querySelector('video').readyState >= 2", timeout=10000)
    check("video loads through ticket stream", True)
    page.evaluate("document.querySelector('video').currentTime = 12"); page.wait_for_function("Math.abs(document.querySelector('video').currentTime - 12) < 1.5")
    check("video seek works", True)
    check("browser sent Range requests, server answered 206", any(s == 206 and r for s, u, r in range_log), [(s, r) for s, u, r in range_log][:6])
    page.wait_for_selector("button:has-text('CC')", state="visible", timeout=6000)
    check("sibling .vtt subtitle detected (CC button)", True)
    page.evaluate("document.querySelector('video').currentTime = 7; document.querySelector('video').play()"); page.wait_for_timeout(2500)  # pause forces a progress save
    page.evaluate("document.querySelector('video').pause()"); page.wait_for_timeout(800)
    check("video controls visible while paused", page.evaluate("getComputedStyle(document.querySelector('.ctl')).opacity") == "1" and not page.evaluate("document.querySelector('.stage').classList.contains('idle')"))
    if shots: page.screenshot(path=shots + "/04-video.png")
    page.goto(URL + "#/library"); page.wait_for_selector(".media-card")
    page.goto(URL + "#/"); page.wait_for_selector("h1:has-text('owner')"); page.wait_for_selector("section:has-text('Continue watching')", timeout=8000)
    check("progress saved and 'Continue watching' shown", True)
    page.goto(URL + "#/library"); page.click(".media-card:has-text('clip.webm') >> nth=0"); page.wait_for_selector("video")
    page.wait_for_function("document.querySelector('video').currentTime > 5", timeout=10000)
    check("resume restores saved position", True)

    # audio + mini player
    page.goto(URL + "#/library"); page.wait_for_selector(".media-card"); page.click(".media-card:has-text('tone.wav') >> nth=0")
    page.wait_for_selector(".audio-art"); page.wait_for_timeout(1500)
    check("audio plays", page.evaluate("document.querySelectorAll('audio').length") >= 0 and page.locator("button[aria-label='Pause']").count() >= 1)
    page.goto(URL + "#/library"); page.wait_for_selector(".miniplayer:not([hidden])", timeout=4000)
    check("mini player persists audio across navigation", True)

    # image viewer + next
    page.goto(URL + "#/library"); page.click(".media-card:has-text('blue.png') >> nth=0"); page.wait_for_selector(".viewer img")
    page.wait_for_function("document.querySelector('.viewer img').naturalWidth > 0")
    check("image viewer loads", True)
    page.click("button:has-text('Next')"); page.wait_for_selector("h1:has-text('sunset.png')")
    check("image next navigation", True)

    # favorites / watchlist persistence in UI
    page.goto(URL + "#/library"); page.wait_for_selector(".media-card")
    page.click("button[aria-label='Favorite notes.txt']"); page.wait_for_timeout(400)
    page.goto(URL + "#/favorites"); page.wait_for_selector(".media-card:has-text('notes.txt')")
    check("favorite persists and appears in Favorites", True)

    # files: folder, upload, rename, delete
    page.goto(URL + "#/files"); page.wait_for_selector("button:has-text('New folder')")
    page.click("button:has-text('New folder')"); page.fill("input[name=name]", "Docs"); page.click("button:has-text('Create folder')"); page.wait_for_selector(".list-row:has-text('Docs')")
    check("create folder via UI", os.path.isdir(media + "/Docs"))
    page.set_input_files("input[type=file]", {"name": "up.txt", "mimeType": "text/plain", "buffer": b"uploaded content"}); page.wait_for_selector(".list-row:has-text('up.txt')", timeout=8000)
    check("upload via UI saves file", open(media + "/up.txt").read() == "uploaded content")
    page.click("button[aria-label='Actions for up.txt']"); page.click("button[role=menuitem]:has-text('Rename')"); page.fill("input[name=name]", "renamed.txt"); page.click("button:has-text('Rename'):not([role])")
    page.wait_for_selector(".list-row:has-text('renamed.txt')"); check("rename via UI", os.path.exists(media + "/renamed.txt"))
    page.click("button[aria-label='Actions for renamed.txt']"); page.click("button[role=menuitem]:has-text('Delete')")
    check("delete asks for confirmation first", page.locator("[role=dialog]:has-text('Delete')").count() == 1 and os.path.exists(media + "/renamed.txt"))
    page.click("button:has-text('Delete permanently')"); page.wait_for_function("!document.body.innerText.includes('renamed.txt')", timeout=6000)
    check("delete via UI removes file", not os.path.exists(media + "/renamed.txt"))
    if shots: page.screenshot(path=shots + "/05-files.png")

    # share + public recipient
    page.goto(URL + "#/library"); page.wait_for_selector(".media-card"); page.click("button[aria-label='More actions for notes.txt']"); page.click("button[role=menuitem]:has-text('Share')")
    page.click("button:has-text('Create link')"); page.wait_for_selector("input[aria-label='Share link']")
    link = page.input_value("input[aria-label='Share link']"); page.click("button:has-text('Done')")
    check("share link built for GitHub Pages subpath", link.startswith(URL + "#/s/nx_") and "b=" in link, link)
    rctx = b.new_context(accept_downloads=True); rp = rctx.new_page(); hook(rp); rp.goto(link)
    rp.wait_for_selector("h2:has-text('notes.txt')", timeout=8000); check("recipient sees shared file without account", True)
    check("recipient has no stored session/backend", rp.evaluate("sessionStorage.length") == 0 and rp.evaluate("localStorage.getItem('nexora.backendUrl')") is None)
    with rp.expect_download() as dl: rp.click("button:has-text('Download')")
    check("recipient download works", open(dl.value.path()).read() == "hello")
    page.goto(URL + "#/shares"); page.wait_for_selector("text=Active"); page.click("button:has-text('Revoke')"); page.click("button:has-text('Revoke link')"); page.wait_for_selector("text=Revoked")
    rp.reload(); rp.wait_for_selector("text=revoked", timeout=8000); check("revoked share shows clear message to recipient", True)
    rctx.close()

    # settings: theme + reduced motion; persists server side
    page.goto(URL + "#/settings"); page.wait_for_selector("button:has-text('Daylight')"); page.click("button:has-text('Daylight')"); page.wait_for_timeout(500)
    check("theme applies", page.evaluate("document.documentElement.dataset.theme") == "daylight")
    page.click("button:has-text('Reduced')"); page.wait_for_timeout(400); check("reduced motion applies", page.evaluate("document.documentElement.dataset.motion") == "reduced")
    if shots: page.screenshot(path=shots + "/06-settings-daylight.png")
    page.reload(); page.wait_for_selector("h1:has-text('Settings')"); page.wait_for_timeout(800)
    check("refresh keeps route and theme (subpath deep link)", page.url.endswith("#/settings") and page.evaluate("document.documentElement.dataset.theme") == "daylight")
    page.click("button:has-text('Aurora')"); page.wait_for_timeout(300)

    # diagnostics + security
    page.goto(URL + "#/diagnostics"); page.wait_for_selector("h2:has-text('Media folders')"); check("diagnostics renders real data", page.locator("text=Integrity").count() >= 1)
    page.goto(URL + "#/security"); page.wait_for_selector("text=Devices signed in"); check("security screen renders", True)

    # game
    page.goto(URL + "#/game"); page.wait_for_selector("#dino"); page.keyboard.press("Space"); page.wait_for_timeout(1800)
    sc = page.inner_text("text=/Score \\d+/"); check("game runs and scores", sc != "Score 0", sc)
    page.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true}); document.dispatchEvent(new Event('visibilitychange'))"); page.wait_for_timeout(200)
    check("game pauses when tab hidden", page.locator("button:has-text('Resume')").count() == 1)
    if shots: page.screenshot(path=shots + "/07-game.png")

    # logout/login + unauthorized
    page.goto(URL + "#/more"); page.click("button:has-text('Sign out')"); page.wait_for_selector("h1:has-text('Sign in')")
    check("sign out returns to sign-in", page.evaluate("sessionStorage.getItem('nexora.session')") is None)
    page.goto(URL + "#/library"); page.wait_for_selector("h1:has-text('Sign in')"); check("protected route redirects to sign-in", True)
    page.fill("#username", "owner"); page.fill("#password", "wrong-wrong-wrong"); page.click("button:has-text('Sign in')"); page.wait_for_selector(".field-error:has-text('Incorrect')")
    check("wrong password shows generic error", True)
    page.fill("#password", "correct-horse-battery"); page.click("button:has-text('Sign in')"); page.wait_for_selector("h1:has-text('owner')"); check("login works", True)

    # offline shell via service worker
    page.goto(URL + "#/game"); page.wait_for_timeout(1500)
    page.evaluate("navigator.serviceWorker.ready.then(()=>1)"); page.wait_for_timeout(500)
    OFFLINE["on"] = True; ctx.set_offline(True); page.reload(); page.wait_for_selector("#dino", timeout=8000)
    check("app shell + game load offline (service worker)", True); ctx.set_offline(False); OFFLINE["on"] = False

    # desktop layout
    dctx = b.new_context(viewport={"width": 1280, "height": 800}); dp = dctx.new_page(); hook(dp)
    dp.goto(URL); dp.wait_for_selector(".intro"); dp.click(".intro"); dp.wait_for_selector("h1:has-text('Server connection')"); dp.fill("#backend", API); dp.click("text=Save and test"); dp.wait_for_selector("h1:has-text('Sign in')", timeout=8000)
    dp.fill("#username", "owner"); dp.fill("#password", "correct-horse-battery"); dp.click("button:has-text('Sign in')"); dp.wait_for_selector("h1:has-text('owner')")
    check("desktop shows sidebar, hides tab bar", dp.locator(".sidebar").is_visible() and not dp.locator(".tabbar").is_visible())
    if shots: dp.goto(URL + "#/library"); dp.wait_for_selector(".media-card"); dp.screenshot(path=shots + "/08-library-desktop.png")
    # horizontal overflow check on mobile for several screens
    for route in ["/", "/library", "/files", "/settings", "/diagnostics", "/storage", "/shares", "/history", "/connect"]:
        page.goto(URL + "#" + route); page.wait_for_timeout(700)
        ov = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check("no horizontal scroll on 390px: " + route, ov <= 1, ov)
    b.close()

bad = [e for e in console_errors if "Failed to load resource" not in e]
check("no JavaScript errors in the console", not bad, bad[:5])
check("no failed network requests (aborted media/downloads and the deliberate offline step excluded)", not failed, failed[:5])
srv.shutdown(); fs.shutdown(); shutil.rmtree(base, ignore_errors=True)
passed = sum(1 for _, ok, _ in results if ok); print("\n%d/%d checks passed" % (passed, len(results)))
sys.exit(0 if passed == len(results) else 1)
