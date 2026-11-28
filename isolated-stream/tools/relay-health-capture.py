#!/usr/bin/env python3
"""One-shot, read-only relay health capture. Run on the media host.
No source requests, service changes, credentials or customer data in output.
"""
import argparse
import http.client
import json
import subprocess
import time

def token():
    pid = subprocess.check_output(["systemctl", "show", "blofy-relay-migration.service",
                                   "-p", "MainPID", "--value"], text=True).strip()
    if not pid.isdigit() or int(pid) <= 1:
        raise RuntimeError("relay_service_not_running")
    with open("/proc/" + pid + "/environ", "rb") as handle:
        env = dict(x.split(b"=", 1) for x in handle.read().split(b"\0") if b"=" in x)
    return env[b"BLOFY_STREAM_RELAY_SHARED_TOKEN"].decode()

COUNTERS = ("upstreamReconnects", "sourceEofWhileViewing", "sourceLimitRejections",
            "capacityRejections", "sourceReleaseStalls", "downstreamPaceMs",
            "sourceReadBytes", "ingressQueueFullCount", "ingressStaleRetirements")
CHANNELS = ("channel", "state", "viewers", "sourceStarts", "reconnects", "sourceEofs",
            "lastSourceReadAgeMs", "lastMediaAgeMs", "downstreamPaceMs",
            "ingressMaxObservedDeliveryAgeMs")
REASONS = ("fanout_upstream_ended", "fanout_read_idle_timeout",
           "fanout_ingress_delivery_stale", "provider_denied", "provider_unavailable")
def number(x):
    return x if type(x) is int and x >= 0 else None

def sample(secret):
    c = http.client.HTTPConnection("127.0.0.1", 19300, timeout=3)
    try:
        c.request("GET", "/internal/relay-health", headers={"Authorization": "Bearer " + secret})
        r = c.getresponse()
        if r.status != 200:
            raise RuntimeError("relay_health_unavailable")
        raw = r.read(131073)
        if len(raw) > 131072:
            raise RuntimeError("relay_health_too_large")
        f = json.loads(raw).get("fanout", {})
    finally:
        c.close()
    channels = []
    for row in f.get("channels", [])[:64]:
        if not isinstance(row, dict):
            continue
        item = {k: number(row.get(k)) for k in CHANNELS if k != "state"}
        item["state"] = row.get("state") if row.get("state") in ("ready","starting","reconnecting","closed","idle") else "unknown"
        channels.append(item)
    return {"activeFeeds": number(f.get("activeFeeds")), "viewers": number(f.get("viewers")),
            "channels": channels, "counters": {k: number(f.get(k)) for k in COUNTERS},
            "failureReasons": {k: number(f.get("failureReasons", {}).get(k)) for k in REASONS}}

def delta(before, after):
    return {k: after[k] - before[k] if before[k] is not None and after[k] is not None
            and after[k] >= before[k] else None for k in before}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--seconds", type=int, default=45, choices=range(10, 121))
    args = parser.parse_args()
    secret = token()
    start = time.monotonic()
    previous = None
    while time.monotonic() - start < args.seconds:
        current = sample(secret)
        output = {"elapsedSeconds": round(time.monotonic()-start, 1),
                  "activeFeeds": current["activeFeeds"], "viewers": current["viewers"],
                  "channels": current["channels"]}
        if previous is not None:
            output["delta"] = delta(previous["counters"], current["counters"])
            output["failureDelta"] = delta(previous["failureReasons"], current["failureReasons"])
        print(json.dumps(output, separators=(",", ":")), flush=True)
        previous = current
        time.sleep(1)
if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Never output exceptions which could include sensitive data.
        raise SystemExit("relay_health_capture_failed")
