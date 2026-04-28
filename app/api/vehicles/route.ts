import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import * as protobuf from 'protobufjs';

export const dynamic = 'force-dynamic';

export interface BusLocation {
  id: string;
  routeId: string;
  name: string;
  routeShortName: string;
  lat: number;
  lon: number;
  speed?: number;
  direction?: string;
  delay?: number;
  dataAgeSec?: number;
  schedule?: { id: number; name: string; planned: string | null; real: string | null }[];
  routePath?: number[];
  model?: string;
  lastStopDistance?: number;
  lastStopId?: number;
  lastSignalTime?: string;
  journeyId?: string | number;
  serviceId?: string | number;
  tripId?: string | number;
  brigadeName?: string;
  status?: 'active' | 'break' | 'inactive' | 'technical' | 'cached';
  statusText?: string;
  statusUntil?: string;
  isHistorical?: boolean;
}

type JsonVehicle = {
  vehicle_id?: string | number;
  model?: string;
  delay?: number;
  trip_id?: string | number | null;
  journey?: any;
  position?: any;
  next_stop_points?: any[];
};

type GtfsVehicle = {
  entityId: string;
  vehicleCode: string;
  tripIdRaw: string;
  tripIdBase: string;
  lat: number;
  lon: number;
  speed: number;
  timestampMs: number;
  delay?: number;
};

type CacheEntry = { ts: number; data: BusLocation[] };
type CacheStore = Record<string, CacheEntry>;
type LastSeenEntry = { ts: number; vehicle: BusLocation };
type LastSeenStore = Record<string, LastSeenEntry>;

const globalCache =
  ((globalThis as any)._mksVehicleApiCache as CacheStore | undefined) ||
  { active: { ts: 0, data: [] }, inactive: { ts: 0, data: [] } };
(globalThis as any)._mksVehicleApiCache = globalCache;

const lastSeenHiddenCache =
  ((globalThis as any)._mksLastSeenHiddenCache as LastSeenStore | undefined) ||
  {};
(globalThis as any)._mksLastSeenHiddenCache = lastSeenHiddenCache;

let stopsDict: Record<string, string> = {};
try {
  const p = path.join(process.cwd(), 'app', 'api', 'vehicles', 'stops-dictionary.json');
  if (fs.existsSync(p)) {
    stopsDict = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
} catch {}

const GTFS_RT_PROTO = `
syntax = "proto2";
package transit_realtime;
message FeedMessage { required FeedHeader header = 1; repeated FeedEntity entity = 2; }
message FeedHeader { required string gtfs_realtime_version = 1; optional uint64 timestamp = 3; }
message FeedEntity { required string id = 1; optional bool is_deleted = 2 [default = false]; optional TripUpdate trip_update = 3; optional VehiclePosition vehicle = 4; }
message TripDescriptor { optional string trip_id = 1; optional string start_time = 2; optional string start_date = 3; optional uint32 schedule_relationship = 4; optional string route_id = 5; optional uint32 direction_id = 6; }
message VehicleDescriptor { optional string id = 1; optional string label = 2; optional string license_plate = 3; }
message Position { optional float latitude = 1; optional float longitude = 2; optional float bearing = 3; optional double odometer = 4; optional float speed = 5; }
message StopTimeEvent { optional int32 delay = 1; optional int64 time = 2; optional int32 uncertainty = 3; }
message StopTimeUpdate { optional uint32 stop_sequence = 1; optional StopTimeEvent arrival = 2; optional StopTimeEvent departure = 3; optional string stop_id = 4; }
message TripUpdate { required TripDescriptor trip = 1; repeated StopTimeUpdate stop_time_update = 2; optional VehicleDescriptor vehicle = 3; optional uint64 timestamp = 4; optional int32 delay = 5; }
message VehiclePosition { optional TripDescriptor trip = 1; optional Position position = 2; optional uint32 current_stop_sequence = 3; optional uint32 current_status = 4; optional uint64 timestamp = 5; optional string stop_id = 7; optional VehicleDescriptor vehicle = 8; }
`;

const gtfsRoot = protobuf.parse(GTFS_RT_PROTO).root;
const FeedMessage = gtfsRoot.lookupType('transit_realtime.FeedMessage');

function getTripBase(tripId: unknown): string {
  const raw = String(tripId || '').trim();
  if (!raw) return '';
  return raw.split('_')[0];
}

function formatStopName(rawName: string | undefined): string {
  if (!rawName) return 'Przystanek nieznany';
  return rawName.trim();
}

function buildSchedule(nextStopPoints: any[] | undefined) {
  return (nextStopPoints || []).map((sp: any) => ({
    id: Number(sp.stop_point_id),
    name: formatStopName(stopsDict[String(sp.stop_point_id)]),
    planned: sp.planned_departure_time ? String(sp.planned_departure_time).replace(' ', 'T') : null,
    real: sp.real_departure_time ? String(sp.real_departure_time).replace(' ', 'T') : null,
  }));
}

function formatClock(ts: number): string {
  if (!Number.isFinite(ts)) return '--:--';
  return new Date(ts).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function inferVehicleStatus(v: JsonVehicle, ageSec: number, speed: number, now: number, hasLine: boolean) {
  const nextStops = Array.isArray(v.next_stop_points) ? v.next_stop_points : [];
  const firstNext = nextStops[0];
  const plannedMs = firstNext?.planned_departure_time
    ? new Date(String(firstNext.planned_departure_time).replace(' ', 'T')).getTime()
    : NaN;
  const lastStopNumber = Number(v.position?.last_stop_point_number);
  const lastStopDistance = Number(v.position?.last_stop_point_distance);
  const isAtTripStart =
    lastStopNumber === 0 &&
    (lastStopDistance === 0 || Number.isNaN(lastStopDistance));
  const waitMs = plannedMs - now;

  if (!hasLine) {
    return {
      status: 'inactive' as const,
      statusText: ageSec > 90 ? 'Ukryty pojazd z ostatni\u0105 pozycj\u0105' : 'Ukryty pojazd bez linii',
    };
  }

  if (v.journey?.route?.is_technical) {
    return { status: 'technical' as const, statusText: 'Przejazd techniczny' };
  }

  if (isAtTripStart && Number.isFinite(waitMs) && waitMs > 120000 && speed <= 5) {
    return {
      status: 'break' as const,
      statusText: `Przerwa do ${formatClock(plannedMs)}`,
    };
  }

  if (speed <= 1 && nextStops.length === 0) {
    return { status: 'inactive' as const, statusText: 'Post\u00f3j po kursie' };
  }

  if (speed <= 1) {
    return { status: 'active' as const, statusText: 'Post\u00f3j na trasie' };
  }

  return { status: 'active' as const, statusText: 'W trasie' };
}

function getVehicleRetentionSeconds(v: JsonVehicle, includeInactive: boolean, hasLine: boolean) {
  if (!includeInactive) return 1800;
  if (!hasLine) return 21600;
  if (v.journey?.route?.is_technical) return 21600;
  return 21600;
}

function cloneHistoricalVehicle(vehicle: BusLocation, now: number): BusLocation | null {
  const lastSignalMs = vehicle.lastSignalTime ? new Date(vehicle.lastSignalTime).getTime() : NaN;
  const ageSec = Math.max(0, Math.floor((now - (Number.isNaN(lastSignalMs) ? now : lastSignalMs)) / 1000));
  if (ageSec > 21600) return null;

  return {
    ...vehicle,
    dataAgeSec: ageSec,
    isHistorical: true,
    status: 'cached',
    statusText: `Ostatnia pozycja z ${formatClock(Number.isNaN(lastSignalMs) ? now : lastSignalMs)}`,
    direction: vehicle.direction || 'Ostatnia zapisana pozycja',
  };
}

function updateLastSeenHiddenVehicles(vehicles: BusLocation[], now: number) {
  for (const vehicle of vehicles) {
    const isHiddenVehicle =
      !vehicle.routeShortName ||
      vehicle.routeShortName === '?' ||
      vehicle.status === 'inactive' ||
      vehicle.status === 'cached';

    if (!isHiddenVehicle) continue;
    lastSeenHiddenCache[vehicle.id] = { ts: now, vehicle: { ...vehicle, isHistorical: false } };
  }

  for (const [id, entry] of Object.entries(lastSeenHiddenCache)) {
    if (now - entry.ts > 21600_000) delete lastSeenHiddenCache[id];
  }
}

function appendHistoricalHiddenVehicles(vehicles: BusLocation[], now: number) {
  const seenIds = new Set(vehicles.map((vehicle) => vehicle.id));
  for (const entry of Object.values(lastSeenHiddenCache)) {
    if (seenIds.has(entry.vehicle.id)) continue;
    const cloned = cloneHistoricalVehicle(entry.vehicle, now);
    if (cloned) vehicles.push(cloned);
  }
}

function mapJsonVehicle(v: JsonVehicle, now: number, gtfsVehicle?: GtfsVehicle, includeInactive = false): BusLocation | null {
  if (!v.position || v.position.lat == null || v.position.long == null) return null;

  const jsonSignalRaw = v.position.position_date ? String(v.position.position_date).replace(' ', 'T') : '';
  const jsonSignalMs = jsonSignalRaw ? new Date(jsonSignalRaw).getTime() : now;
  const useGtfsPosition = !!gtfsVehicle && now - gtfsVehicle.timestampMs <= 180000;
  const signalMs = useGtfsPosition ? gtfsVehicle.timestampMs : (isNaN(jsonSignalMs) ? now : jsonSignalMs);
  const lineName = String(v.journey?.line?.line_name || v.journey?.line?.name || '').trim() || '---';
  const hasLine = lineName !== '---';
  const ageSec = Math.max(0, Math.floor((now - (isNaN(signalMs) ? now : signalMs)) / 1000));
  if (ageSec > getVehicleRetentionSeconds(v, includeInactive, hasLine)) return null;
  const isMoving = Number(v.position.speed || 0) > 3;
  let destination = v.journey?.route?.description || v.journey?.route?.name || (isMoving ? 'W trasie' : 'Post\u00f3j');
  if (ageSec > 90) destination = `[Brak sygna\u0142u] ${destination}`;
  const liveSpeed = useGtfsPosition ? gtfsVehicle.speed : Number(v.position.speed || 0);
  const vehicleStatus = inferVehicleStatus(v, ageSec, liveSpeed, now, hasLine);

  return {
    id: String(v.vehicle_id ?? `json-${getTripBase(v.trip_id) || now}`),
    routeId: lineName,
    name: `MKS ${lineName !== '---' ? lineName : String(v.vehicle_id ?? '?')}`,
    routeShortName: lineName !== '---' ? lineName : '?',
    lat: useGtfsPosition ? gtfsVehicle.lat : Number(v.position.lat),
    lon: useGtfsPosition ? gtfsVehicle.lon : Number(v.position.long),
    speed: liveSpeed,
    direction: destination,
    delay: typeof v.delay === 'number' ? v.delay : gtfsVehicle?.delay ?? 0,
    dataAgeSec: ageSec,
    schedule: buildSchedule(v.next_stop_points),
    routePath: Array.isArray(v.journey?.route?.stop_points)
      ? v.journey.route.stop_points.map((sp: any) => Number(sp.stop_point_id)).filter((n: number) => !isNaN(n))
      : [],
    model: v.model,
    lastStopDistance: typeof v.position.last_stop_point_distance === 'number' ? v.position.last_stop_point_distance : undefined,
    lastStopId: typeof v.position.last_stop_point_number === 'number' ? v.position.last_stop_point_number : undefined,
    lastSignalTime: useGtfsPosition ? new Date(gtfsVehicle.timestampMs).toISOString() : (jsonSignalRaw || undefined),
    journeyId: v.journey?.journey_id ?? v.trip_id ?? undefined,
    tripId: v.trip_id ?? undefined,
    serviceId:
      typeof v.journey?.service === 'object'
        ? v.journey.service.service_code || v.journey.service.service_id || String(v.journey.service.timetable_id || '')
        : v.journey?.service,
    brigadeName:
      typeof (v as any).brigade_name === 'string'
        ? (v as any).brigade_name
        : v.journey?.service?.service_code,
    status: vehicleStatus.status,
    statusText: vehicleStatus.statusText,
  };
}

async function fetchJsonVehicles(): Promise<JsonVehicle[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://www.mpkrzeszow.pl/pks/get_vehicles.php?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`JSON source returned ${res.status}`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : data?.items || data?.vehicles || [];
    return Array.isArray(items) ? items : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGtfsVehicles(): Promise<GtfsVehicle[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);
  try {
    const res = await fetch('https://www.mpkrzeszow.pl/gtfs-pks/rt/gtfsrt.pb', {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GTFS-RT source returned ${res.status}`);

    const buffer = new Uint8Array(await res.arrayBuffer());
    const decoded = FeedMessage.decode(buffer) as any;
    const entities = Array.isArray(decoded.entity) ? decoded.entity : [];

    const tripUpdates = new Map<string, any>();
    for (const entity of entities) {
      const tripUpdate = entity.tripUpdate;
      if (!tripUpdate) continue;
      const rawTripId = String(tripUpdate.trip?.tripId || '').trim();
      const tripBase = getTripBase(rawTripId);
      if (rawTripId) tripUpdates.set(rawTripId, tripUpdate);
      if (tripBase) tripUpdates.set(tripBase, tripUpdate);
    }

    const vehicles: GtfsVehicle[] = [];
    for (const entity of entities) {
      const vehicle = entity.vehicle;
      if (!vehicle?.position) continue;

      const tripIdRaw = String(vehicle.trip?.tripId || '').trim();
      const tripIdBase = getTripBase(tripIdRaw);
      const ts = Number(vehicle.timestamp || tripUpdates.get(tripIdRaw)?.timestamp || tripUpdates.get(tripIdBase)?.timestamp || 0);
      const timestampMs = ts > 0 ? ts * 1000 : Date.now();
      const update = tripUpdates.get(tripIdRaw) || tripUpdates.get(tripIdBase);

      vehicles.push({
        entityId: String(entity.id || ''),
        vehicleCode: String(vehicle.vehicle?.id || vehicle.vehicle?.label || entity.id || tripIdBase || ''),
        tripIdRaw,
        tripIdBase,
        lat: Number(vehicle.position.latitude),
        lon: Number(vehicle.position.longitude),
        speed: Number(vehicle.position.speed || 0),
        timestampMs,
        delay: typeof update?.delay === 'number' ? update.delay : undefined,
      });
    }

    return vehicles;
  } catch (error) {
    console.warn('GTFS-RT PKS unavailable, using JSON source only:', error);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildFromGtfsAndJson(gtfsVehicles: GtfsVehicle[], jsonVehicles: JsonVehicle[], inactive: boolean): BusLocation[] {
  const now = Date.now();
  const gtfsByTrip = new Map<string, GtfsVehicle>();
  const seenHiddenVehicleIds = new Set<string>();
  for (const v of gtfsVehicles) {
    if (!v.tripIdBase) continue;
    const existing = gtfsByTrip.get(v.tripIdBase);
    if (!existing || existing.timestampMs < v.timestampMs) {
      gtfsByTrip.set(v.tripIdBase, v);
    }
  }

  const mapped: BusLocation[] = [];
  for (const jsonVehicle of jsonVehicles) {
    const key = getTripBase(jsonVehicle.trip_id);
    const lineName = String(jsonVehicle?.journey?.line?.line_name || jsonVehicle?.journey?.line?.name || '').trim();
    if (!inactive && !lineName) continue;
    const mappedJson = mapJsonVehicle(jsonVehicle, now, key ? gtfsByTrip.get(key) : undefined, inactive);
    if (mappedJson) mapped.push(mappedJson);
  }

  if (inactive) {
    const seenTrips = new Set(
      jsonVehicles
        .map((vehicle) => getTripBase(vehicle.trip_id))
        .filter(Boolean)
    );

    for (const gtfsVehicle of gtfsVehicles) {
      const dedupeId = gtfsVehicle.vehicleCode || gtfsVehicle.entityId || gtfsVehicle.tripIdBase || gtfsVehicle.tripIdRaw;
      if (seenHiddenVehicleIds.has(dedupeId)) continue;
      if (gtfsVehicle.tripIdBase && seenTrips.has(gtfsVehicle.tripIdBase)) continue;
      const ageSec = Math.max(0, Math.floor((now - gtfsVehicle.timestampMs) / 1000));
      if (ageSec > 21600) continue;
      seenHiddenVehicleIds.add(dedupeId);
      mapped.push({
        id: gtfsVehicle.vehicleCode || gtfsVehicle.entityId || gtfsVehicle.tripIdBase || gtfsVehicle.tripIdRaw,
        routeId: '---',
        name: `MKS ${gtfsVehicle.vehicleCode || gtfsVehicle.entityId}`,
        routeShortName: '?',
        lat: gtfsVehicle.lat,
        lon: gtfsVehicle.lon,
        speed: gtfsVehicle.speed,
        direction: ageSec > 90 ? '[Brak sygna\u0142u] Nieustalony kurs' : 'Nieustalony kurs',
        delay: gtfsVehicle.delay,
        dataAgeSec: ageSec,
        schedule: [],
        routePath: [],
        lastSignalTime: new Date(gtfsVehicle.timestampMs).toISOString(),
        journeyId: gtfsVehicle.tripIdRaw,
        tripId: gtfsVehicle.tripIdBase || gtfsVehicle.tripIdRaw,
        status: 'inactive',
        statusText: ageSec > 90 ? 'Ukryty pojazd z ostatni\u0105 pozycj\u0105' : 'Ukryty pojazd bez linii',
      });
    }
  }

  return mapped;
}

function makeEtag(payload: string): string {
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    hash = Math.imul(31, hash) + payload.charCodeAt(i) | 0;
  }
  return `W/"${Math.abs(hash).toString(16)}"`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const inactive = searchParams.get('inactive') === 'true';
    const force = searchParams.get('force') === 'true';
    const now = Date.now();
    const cacheKey = inactive ? 'inactive' : 'active';
    const cacheEntry = globalCache[cacheKey] || { ts: 0, data: [] };

    if (!force && cacheEntry.data.length > 0 && now - cacheEntry.ts < 4000) {
      const cachedJson = JSON.stringify(cacheEntry.data);
      const cachedEtag = makeEtag(cachedJson);
      if (request.headers.get('if-none-match') === cachedEtag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: cachedEtag, 'Cache-Control': 'no-cache, must-revalidate' },
        });
      }

      return new NextResponse(cachedJson, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, must-revalidate',
          ETag: cachedEtag,
        },
      });
    }

    const jsonVehicles = await fetchJsonVehicles();
    const gtfsVehicles = await fetchGtfsVehicles();

    let vehicles: BusLocation[] = [];

    if (gtfsVehicles.length > 0) {
      vehicles = buildFromGtfsAndJson(gtfsVehicles, jsonVehicles, inactive);
    } else if (jsonVehicles.length > 0) {
      vehicles = jsonVehicles
        .map((vehicle) => mapJsonVehicle(vehicle, now, undefined, inactive))
        .filter((vehicle): vehicle is BusLocation => Boolean(vehicle));
      if (!inactive) {
        vehicles = vehicles.filter((vehicle) => vehicle.routeShortName && vehicle.routeShortName !== '?');
      }
    } else if (cacheEntry.data.length > 0) {
      vehicles = cacheEntry.data;
    } else {
      throw new Error('No vehicle source available');
    }

    updateLastSeenHiddenVehicles(vehicles, now);
    if (inactive) {
      appendHistoricalHiddenVehicles(vehicles, now);
    }

    globalCache[cacheKey] = { ts: now, data: vehicles };

    const resultJson = JSON.stringify(vehicles);
    const etag = makeEtag(resultJson);

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': 'no-cache, must-revalidate' },
      });
    }

    return new NextResponse(resultJson, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, must-revalidate',
        ETag: etag,
      },
    });
  } catch (error) {
    console.error('Error in vehicle API:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
