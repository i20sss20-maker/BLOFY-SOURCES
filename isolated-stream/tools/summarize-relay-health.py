#!/usr/bin/env python3
"""Offline evidence summary of relay-health-capture.py JSONL.
No network, source credentials or service changes. Missing metrics remain unknown.
"""
import json
import sys

def valid_number(x):
    return type(x) is int and x >= 0

def summarize(rows):
    if not rows:
        raise ValueError("empty_capture")
    out = {"samples": len(rows), "twoOrMoreFeedsSamples": 0,
           "sourceEofEvents": 0, "sourceIdleTimeoutEvents": 0,
           "localStaleRetirements": 0, "localQueueFullEvents": 0,
           "sourceLimitRejections": 0, "capacityRejections": 0,
           "channelsWithSourceStalls": [], "channelsWithDeliveryLag": [],
           "observedMetrics": [], "classification": []}
    seen = set()
    stalls, lag = set(), set()
    fields = (("failureDelta", "fanout_upstream_ended", "sourceEofEvents"),
              ("failureDelta", "fanout_read_idle_timeout", "sourceIdleTimeoutEvents"),
              ("delta", "ingressStaleRetirements", "localStaleRetirements"),
              ("delta", "ingressQueueFullCount", "localQueueFullEvents"),
              ("delta", "sourceLimitRejections", "sourceLimitRejections"),
              ("delta", "capacityRejections", "capacityRejections"))
    for row in rows:
        if valid_number(row.get("activeFeeds")) and row["activeFeeds"] >= 2:
            out["twoOrMoreFeedsSamples"] += 1
        for group, key, target in fields:
            n = row.get(group, {}).get(key)
            if valid_number(n):
                seen.add(target)
                out[target] += n
        for channel in row.get("channels", []):
            cid = channel.get("channel")
            if not valid_number(cid) or not valid_number(channel.get("viewers")) or not channel["viewers"]:
                continue
            source, delivered = channel.get("lastSourceReadAgeMs"), channel.get("lastMediaAgeMs")
            if valid_number(source) and source >= 2000:
                stalls.add(cid)
            if valid_number(source) and valid_number(delivered) and source <= 1000 and delivered >= 2000:
                lag.add(cid)
    for _, _, target in fields:
        if target not in seen:
            out[target] = None
    out["observedMetrics"] = sorted(seen)
    out["channelsWithSourceStalls"] = sorted(stalls)
    out["channelsWithDeliveryLag"] = sorted(lag)
    if (out["sourceEofEvents"] or 0) > 0 or (out["sourceIdleTimeoutEvents"] or 0) > 0 or stalls:
        out["classification"].append("upstream_read_interruption_observed")
    if (out["localStaleRetirements"] or 0) > 0 or (out["localQueueFullEvents"] or 0) > 0 or lag:
        out["classification"].append("local_delivery_pressure_observed")
    if (out["sourceLimitRejections"] or 0) > 0 or (out["capacityRejections"] or 0) > 0:
        out["classification"].append("admission_rejection_observed")
    if not out["classification"]:
        out["classification"].append("insufficient_evidence_to_attribute")
    out["providerCauseProven"] = False
    out["decodedPlaybackVerified"] = False
    return out

def main():
    rows = []
    for line in sys.stdin:
        if len(line) > 131072 or len(rows) >= 1200:
            raise ValueError("capture_limit")
        if line.strip():
            rows.append(json.loads(line))
    print(json.dumps(summarize(rows), indent=2))
if __name__ == "__main__":
    try:
        main()
    except Exception:
        raise SystemExit("invalid_health_capture")
