#!/usr/bin/env python3
"""
Quick tester for the new vehicle API used by the app.

By default it queries the local Next.js endpoint:
  http://127.0.0.1:3000/api/vehicles?force=true

Examples:
  python test_new_api.py
  python test_new_api.py --url http://127.0.0.1:3000/api/vehicles?force=true
  python test_new_api.py --line 108
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from collections import Counter
from typing import Any


DEFAULT_URL = "http://127.0.0.1:3000/api/vehicles?force=true"


def fetch_json(url: str) -> list[dict[str, Any]]:
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "Cache-Control": "no-cache",
            "User-Agent": "pks-live-api-tester/1.0",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as response:
        raw = response.read().decode("utf-8")
        data = json.loads(raw)

    if isinstance(data, dict) and "vehicles" in data and isinstance(data["vehicles"], list):
        return data["vehicles"]
    if isinstance(data, list):
        return data
    raise ValueError(f"Unexpected response shape: {type(data).__name__}")


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def print_summary(vehicles: list[dict[str, Any]], focus_line: str) -> None:
    total = len(vehicles)
    route_counter = Counter(str(v.get("routeShortName") or "?") for v in vehicles)
    stale_90 = sum(1 for v in vehicles if safe_int(v.get("dataAgeSec")) > 90)
    moving = sum(1 for v in vehicles if safe_int(v.get("speed")) > 3)
    with_schedule = sum(1 for v in vehicles if isinstance(v.get("schedule"), list) and v["schedule"])

    print(f"Total vehicles: {total}")
    print(f"Moving vehicles (>3 km/h or source units): {moving}")
    print(f"Vehicles older than 90s: {stale_90}")
    print(f"Vehicles with schedule data: {with_schedule}")
    print()

    print("Top routes:")
    for route, count in route_counter.most_common(15):
        print(f"  {route}: {count}")
    print()

    focus = [v for v in vehicles if str(v.get("routeShortName") or "").strip() == focus_line]
    print(f"Vehicles on line {focus_line}: {len(focus)}")
    for vehicle in focus[:10]:
        print_vehicle(vehicle)
    if not focus:
        print("  No vehicles on this line in the current snapshot.")
    print()

    print("Sample vehicles:")
    for vehicle in vehicles[:10]:
        print_vehicle(vehicle)


def print_vehicle(vehicle: dict[str, Any]) -> None:
    schedule = vehicle.get("schedule")
    next_stop = ""
    if isinstance(schedule, list) and schedule:
      first = schedule[0]
      next_stop = f", nextStop={first.get('name')} ({first.get('id')})"

    print(
        "  "
        f"id={vehicle.get('id')}, "
        f"line={vehicle.get('routeShortName')}, "
        f"lat={vehicle.get('lat')}, lon={vehicle.get('lon')}, "
        f"speed={vehicle.get('speed')}, "
        f"age={vehicle.get('dataAgeSec')}s, "
        f"delay={vehicle.get('delay')}, "
        f"dir={vehicle.get('direction')}, "
        f"journeyId={vehicle.get('journeyId')}, "
        f"serviceId={vehicle.get('serviceId')}, "
        f"model={vehicle.get('model')}"
        f"{next_stop}"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test the new /api/vehicles endpoint.")
    parser.add_argument("--url", default=DEFAULT_URL, help="Full URL to query.")
    parser.add_argument("--line", default="108", help="Line number to highlight.")
    parser.add_argument("--dump-json", action="store_true", help="Print full JSON response.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        vehicles = fetch_json(args.url)
    except urllib.error.HTTPError as exc:
        print(f"HTTP error: {exc.code} {exc.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as exc:
        print(f"Connection error: {exc.reason}", file=sys.stderr)
        print("Make sure the app is running, for example with: npm run dev", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"Failed to fetch or parse response: {exc}", file=sys.stderr)
        return 1

    print(f"URL: {args.url}")
    print_summary(vehicles, args.line)

    if args.dump_json:
        print()
        print(json.dumps(vehicles, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
