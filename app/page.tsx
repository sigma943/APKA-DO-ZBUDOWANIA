'use client';

import { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import dynamic from 'next/dynamic';
import { Bus, Search, RefreshCw, AlertCircle, X, Clock, Navigation, MapPin, List, Map as MapIcon, Settings, ChevronRight, Eye, Palette, ArrowLeft, Star, Monitor, Sun, Moon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Vehicle } from '@/components/BusMap';

const BusMap = dynamic(() => import('@/components/BusMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="font-medium tracking-tight">Trwa wczytywanie mapy...</p>
      </div>
    </div>
  ),
});

const normalizeVehicleText = (value?: string | null) =>
  String(value || '')
    .replace(/\[Brak sygna\?u\]/g, '[Brak sygna\u0142u]')
    .replace(/\[Brak sygna\u0142u\]/g, '[Brak sygna\u0142u]')
    .replace(/Post\?j/g, 'Post\u00f3j')
    .replace(/Post\u00f3j/g, 'Post\u00f3j')
    .replace(/ostatni\? pozycj\?/gi, 'ostatni\u0105 pozycj\u0119');

export default function Home() {
  const lastVehiclesRef = useRef<string>('');
  const lastVehiclesEtagRef = useRef<string>('');

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRoute, setFilterRoute] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<Vehicle | null>(null);
  const [isBusPanelExpanded, setIsBusPanelExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Customization States
  const [themeColor, setThemeColor] = useState('#00A3A2');
  const [showInactive, setShowInactive] = useState(false);
  const [appTheme, setAppTheme] = useState<'system'|'light'|'light-warm'|'dark'|'dark-oled'|'dark-aurora'>('system');
  const [systemIsDark, setSystemIsDark] = useState<boolean>(false);
  const [transparentUI, setTransparentUI] = useState(true);

  // Stops States
  const [activeTab, setActiveTab] = useState<'map' | 'stops'>('map');
  const [stopsList, setStopsList] = useState<{id: string, name: string, areaId?: string, code?: string, lat?: number, lon?: number}[]>([]);
  const [stopsFilter, setStopsFilter] = useState('');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isStopPanelExpanded, setIsStopPanelExpanded] = useState(true);
  const [stopDepartures, setStopDepartures] = useState<any[]>([]);
  const [isFetchingDepartures, setIsFetchingDepartures] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [favsState, setFavsState] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [departuresLineFilter, setDeparturesLineFilter] = useState('');

  const formatScheduleStopName = useCallback((name?: string | null) => {
    const raw = String(name || '').trim();
    if (!raw) return 'Przystanek nieznany';
    return raw.replace(/^Rzeszów D\.A\.\s+st\.\s*\d+$/i, 'Rzeszów D.A.');
  }, []);

  // Handle hardware back button to prevent accidental app exits when viewing a panel
  useEffect(() => {
     if (selectedBus || selectedStopId) {
        window.history.pushState({ panelOpen: true }, '');
     }
  }, [selectedBus, selectedStopId]);

  useEffect(() => {
     const handlePopState = (e: PopStateEvent) => {
        if (selectedBus || selectedStopId) {
           setSelectedBus(null);
           setSelectedStopId(null);
        }
     };
     window.addEventListener('popstate', handlePopState);
     return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedBus, selectedStopId]);

  const toggleFavoriteStop = (stopId: string, e: React.MouseEvent) => {
     e.stopPropagation();
     const next = favsState.includes(stopId) ? favsState.filter(s => s !== stopId) : [...favsState, stopId];
     setFavsState(next);
     localStorage.setItem('mks_fav_stops', JSON.stringify(next));
  };

  const [now, setNow] = useState(0);
  useEffect(() => {
    const initTimer = setTimeout(() => setNow(Date.now()), 0);
    const tickMs = selectedBus?.status === 'break' ? 1000 : 5000;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => {
       clearTimeout(initTimer);
       clearInterval(id);
    };
  }, [selectedBus?.status]);

  const processedDepartures = useMemo(() => {
    if (!stopDepartures || stopDepartures.length === 0) return [];
    
    const results = Object.values(stopDepartures.reduce((acc: any, journey: any) => {
        const d = new Date((journey.timetable_time || '').replace(' ', 'T'));
        const journeyPlannedMs = d.getTime();
        let actualTimeStr = isNaN(journeyPlannedMs) ? '--:--' : d.toTimeString().substring(0, 5);
        let diffMin = isNaN(journeyPlannedMs) ? 0 : Math.floor((journeyPlannedMs - now) / 60000);
        let isRealtime = false;
        let vehicleNum = '';
        let isDelayed = false;
        
        const normLine = (s: any) => String(s || '').trim().toUpperCase().replace(/^MKS\s+/, '');
        const journeyLineNorm = normLine(journey.line_name);
        
        let liveMatch: any = null;
        let stopInfo: any = null;
        let minDiff = Infinity;
        
        vehicles.forEach(v => {
            if (normLine(v.routeShortName) === journeyLineNorm) {
                const s = v.schedule?.find((x: any) => String(x.id) === String(selectedStopId));
                if (s && s.planned) {
                    const diff = Math.abs(new Date(s.planned).getTime() - journeyPlannedMs);
                    if (diff < 600000 && diff < minDiff) { 
                        minDiff = diff;
                        liveMatch = v;
                        stopInfo = s;
                    }
                }
            }
        });

        if (liveMatch && stopInfo) {
            const realT = stopInfo.real ? new Date((stopInfo.real || '').replace(' ', 'T')) : (stopInfo.planned && liveMatch.delay ? new Date(new Date(stopInfo.planned).getTime() + liveMatch.delay * 1000) : null);
            
            if (realT && !isNaN(realT.getTime())) {
                isRealtime = true;
                isDelayed = !!(liveMatch.delay && Math.abs(liveMatch.delay) > 60);
                vehicleNum = liveMatch.id;
                diffMin = Math.floor((realT.getTime() - now) / 60000);
                actualTimeStr = realT.toTimeString().substring(0, 5);
            }
        } else if (journey.deviation !== null && journey.deviation !== undefined) {
            isRealtime = true;
            isDelayed = !!(Math.abs(journey.deviation) > 1);
            if (!isNaN(journeyPlannedMs)) {
               const realD = new Date(journeyPlannedMs + journey.deviation * 60000);
               diffMin = Math.floor((realD.getTime() - now) / 60000);
            }
        }

        if (!vehicleNum && (journey.vehicle_id || journey.veh_id || journey.vehicle_number)) {
           vehicleNum = journey.vehicle_id || journey.veh_id || journey.vehicle_number;
        }

        const uniqKey = `${journey.line_name}_${journey.timetable_time}_${journey.route_description}`;
        
        const depDate = new Date(d.getTime());
        const todayDate = new Date(now);
        const isTomorrow = depDate.getDate() !== todayDate.getDate() || 
                          depDate.getMonth() !== todayDate.getMonth() || 
                          depDate.getFullYear() !== todayDate.getFullYear();
        const dateStr = `${depDate.getDate()}.${(depDate.getMonth() + 1).toString().padStart(2, '0')}`;

        if(!acc[uniqKey]) {
           acc[uniqKey] = {
               bus: {
                   routeShortName: journey.line_name,
                   direction: journey.route_description,
                    id: isRealtime ? 'LIVE' : 'ROZKŁAD',
                   model: liveMatch ? liveMatch.model : null
               },
                vehicleNum,
               actualTimeStr,
               diffMin,
               isRealtime,
               isTomorrow,
               dateStr,
               isDelayed,
               depTimeMs: d.getTime()
           };
        } else if (liveMatch) {
           acc[uniqKey].isRealtime = true;
           acc[uniqKey].isDelayed = isDelayed;
           acc[uniqKey].actualTimeStr = actualTimeStr;
           acc[uniqKey].diffMin = diffMin;
           acc[uniqKey].isTomorrow = isTomorrow;
           acc[uniqKey].dateStr = dateStr;
           acc[uniqKey].vehicleNum = vehicleNum;
           acc[uniqKey].bus.model = liveMatch.model;
           acc[uniqKey].bus.id = 'LIVE';
        }
        return acc;
    }, {})).filter((a: any) => a.diffMin >= -5 && a.diffMin <= 1440).sort((a: any, b: any) => a.diffMin - b.diffMin);

    return results;
  }, [stopDepartures, vehicles, selectedStopId, now]);

  useEffect(() => {
    if (selectedStopId) {
      setTimeout(() => {
         setIsFetchingDepartures(true);
         setStopDepartures([]);
         setDeparturesLineFilter('');
      }, 0);
      const stopInfo = stopsList.find(s => s.id === selectedStopId);
      const areaParam = stopInfo && stopInfo.areaId ? `&areaId=${stopInfo.areaId}&code=${stopInfo.code || ''}` : '';
      fetch(`/api/departures?stopId=${selectedStopId}${areaParam}`)
        .then(res => {
          if (!res.ok) throw new Error('Błąd odjazdów');
          return res.json();
        })
        .then(data => {
            if (data && data.journeys) {
               setStopDepartures(data.journeys);
            } else {
               setStopDepartures([]);
            }
            setIsFetchingDepartures(false);
        })
        .catch(err => {
            console.error('Fetch departures error:', err);
            setStopDepartures([]);
            setIsFetchingDepartures(false);
        });
    } else {
      setTimeout(() => setStopDepartures([]), 0);
    }
  }, [selectedStopId, stopsList]);

  useEffect(() => {
    const sTheme = localStorage.getItem('mks_theme');
    if (sTheme && sTheme !== themeColor) setTimeout(() => setThemeColor(sTheme), 0);
    const sInactive = localStorage.getItem('mks_show_inactive');
    if (sInactive !== null) setTimeout(() => setShowInactive(sInactive === 'true'), 0);
    const sAppTheme = localStorage.getItem('mks_app_theme') as any;
    if (sAppTheme) setTimeout(() => setAppTheme(sAppTheme), 0);
    const sTrans = localStorage.getItem('mks_transparent');
    if (sTrans !== null) setTimeout(() => setTransparentUI(sTrans === 'true'), 0);
    const favs = localStorage.getItem('mks_fav_stops');
    if (favs) setTimeout(() => setFavsState(JSON.parse(favs)), 0);
    
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTimeout(() => setSystemIsDark(mediaQuery.matches), 0);
    
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveThemeColor = (hex: string) => { setThemeColor(hex); localStorage.setItem('mks_theme', hex); };
  const saveInactive = (val: boolean) => { setShowInactive(val); localStorage.setItem('mks_show_inactive', String(val)); fetchVehicles(val); };
  const saveAppTheme = (val: any) => { setAppTheme(val); localStorage.setItem('mks_app_theme', val); };
  const saveTransparentUI = (val: boolean) => { setTransparentUI(val); localStorage.setItem('mks_transparent', String(val)); };

  const deferredFilterRoute = useDeferredValue(filterRoute);
  const deferredStopsFilter = useDeferredValue(stopsFilter);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    // eslint-disable-next-line react-hooks/purity
    const start = Date.now();
    try {
      await fetchVehicles(showInactive, true);
    } catch {
      // Ignored
    } finally {
      const elapsed = Date.now() - start;
      const finish = () => {
        setIsManualRefreshing(false);
      };
      if (elapsed < 800) {
        setTimeout(finish, 800 - elapsed);
      } else {
        finish();
      }
    }
  };

  const fetchVehicles = async (inactive = showInactive, force = false) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const headers: HeadersInit = {};
      if (!force && lastVehiclesEtagRef.current) {
        headers['If-None-Match'] = lastVehiclesEtagRef.current;
      }
      const res = await fetch(`/api/vehicles?inactive=${inactive}${force ? '&force=true&t=' + Date.now() : ''}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers,
      });
      clearTimeout(timeoutId);
      if (res.status === 304) {
        setError(null);
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Błąd serwera');
      }
      const nextEtag = res.headers.get('etag');
      if (nextEtag) {
        lastVehiclesEtagRef.current = nextEtag;
      }
      const data = await res.json();
      const newDataStr = JSON.stringify(data);
      if (newDataStr !== lastVehiclesRef.current) {
        setVehicles(Array.isArray(data) ? data : (data.vehicles || []));
        lastVehiclesRef.current = newDataStr;
      }
      setError(null);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('Fetch vehicles aborted (timeout or navigation)');
        return;
      }
      console.error('Fetch vehicles error:', err);
      if (vehicles.length === 0 || force) {
        if (err.message === 'Failed to fetch') {
          setError('Brak połączenia z internetem lub serwerem');
        } else {
          setError(err.message || 'Wystąpił nieoczekiwany błąd');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const tick = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        await fetchVehicles();
      }
      timer = setTimeout(tick, refreshInterval);
    };

    timer = setTimeout(tick, refreshInterval);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchVehicles(showInactive, true);
      }
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval, showInactive]);

  useEffect(() => {
    fetch('/api/stops')
      .then(r => {
        if (!r.ok) throw new Error('Nie udało się pobrać przystanków');
        return r.json();
      })
      .then(d => {
        if (d.error) throw new Error(d.error);
        setStopsList(Object.entries(d).map(([id, val]: any) => ({ 
           id, 
           name: val.n, 
           areaId: val.areaId, 
           code: val.code,
           lat: val.lat,
           lon: val.lon
        })).sort((a,b) => a.name.localeCompare(b.name)));
      })
      .catch(e => {
        console.error('Fetch stops fail:', e);
        // We don't block the UI for stops, it just won't show the list
      });
  }, []);

  useEffect(() => {
    if (selectedBus) {
      const updated = vehicles.find(v => v.id === selectedBus.id);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (updated && updated !== selectedBus) setSelectedBus(updated);
    }
  }, [vehicles, selectedBus?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredVehicles = useMemo(() => {
    if (!deferredFilterRoute) return vehicles;
    const f = deferredFilterRoute.toLowerCase();
    return vehicles.filter(v => 
      (v.routeShortName || '').toLowerCase().includes(f) || 
      (v.id || '').toLowerCase().includes(f)
    );
  }, [vehicles, deferredFilterRoute]);

  const filteredStopsList = useMemo(() => {
    const normalizedFilter = deferredStopsFilter.trim().toLowerCase();
    const filtered = stopsList.filter((stop) =>
      normalizedFilter ? stop.name.toLowerCase().includes(normalizedFilter) : true,
    );

    const uniqueMap = new Map();
    filtered.forEach((stop) => {
      const key = `${stop.name}_${stop.code || ''}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, stop);
      }
    });

    return Array.from(uniqueMap.values());
  }, [stopsList, deferredStopsFilter]);

  const stopsDataMap = useMemo(() => {
    const map: Record<string, any> = {};
    stopsList.forEach(s => {
      if (s.lat !== undefined && s.lon !== undefined) {
         map[String(s.id)] = { n: s.name, lat: s.lat, lon: s.lon };
      }
    });
    return map;
  }, [stopsList]);

  // Dynamic Refresh Interval Adjuster based on visible vehicles
  useEffect(() => {
    const count = filteredVehicles.length;
    let nextInt = 5000;
    if (count > 0 && count <= 8) nextInt = 1500;      // Super fast for focused lines
    else if (count > 8 && count <= 25) nextInt = 3000; // Fast
    else if (count > 40) nextInt = 8000;              // Conservative for heavy load
    
    if (nextInt !== refreshInterval) {
       const val = nextInt;
       setTimeout(() => setRefreshInterval(val), 0);
    }
  }, [filteredVehicles.length, refreshInterval]);

  const incomingToStop = (stopId: string) => {
    const now = new Date().getTime();
    const incoming: any[] = [];
    for (const v of vehicles) {
       if (!v.schedule) continue;
       const stopInfo = v.schedule.find((s: any) => String(s.id) === String(stopId));
       if (stopInfo) {
          const timeStr = stopInfo.real || stopInfo.planned;
          if (!timeStr) continue;
          const d = new Date(timeStr.replace(' ', 'T'));
          if (!isNaN(d.getTime())) {
             const diffMin = Math.floor((d.getTime() - now) / 60000);
             if (diffMin >= -2 && diffMin <= 1440) { // Check up to 24 hours
                 incoming.push({ bus: v, timeStr, diffMin, depTimeMs: d.getTime(), actualTimeStr: timeStr.substring(11, 16) });
             }
          }
       }
    }
    return incoming.sort((a,b) => a.depTimeMs - b.depTimeMs);
  };

  // Theme Helpers
  const actualTheme = appTheme === 'system' ? (systemIsDark ? 'dark' : 'light') : appTheme;
  const isDark = actualTheme.startsWith('dark');
  const isOled = actualTheme === 'dark-oled';
  const isAurora = actualTheme === 'dark-aurora';
  const isWarm = actualTheme === 'light-warm';

  const bgMain = isDark ? (isOled ? 'bg-black' : isAurora ? 'bg-[#120f24]' : 'bg-slate-900') : (isWarm ? 'bg-[#f8f5f0]' : 'bg-slate-50');
  const bgCard = transparentUI 
     ? (isDark ? (isOled ? 'bg-black/80 backdrop-blur-xl border-slate-800/50' : isAurora ? 'bg-[#1a1430]/84 backdrop-blur-xl border-fuchsia-400/20' : 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50') : 'bg-white/90 backdrop-blur-md border-slate-100/50')
     : (isDark ? (isOled ? 'bg-[#0a0a0a] border-slate-800' : isAurora ? 'bg-[#1f1736] border-fuchsia-400/20' : 'bg-slate-900 border-slate-700') : 'bg-white border-slate-200');
  const textMain = isDark ? 'text-white' : 'text-slate-900';
  const textSub = isDark ? (isAurora ? 'text-violet-200/70' : 'text-slate-400') : 'text-slate-500';
  const selectedBusBreakUntil =
    selectedBus?.status === 'break'
      ? (selectedBus.schedule?.[0]?.planned ? new Date(selectedBus.schedule[0].planned).getTime() : NaN)
      : NaN;
  const breakCountdown =
    Number.isFinite(selectedBusBreakUntil)
      ? Math.max(0, Math.floor((selectedBusBreakUntil - now) / 1000))
      : null;
  const breakCountdownLabel = breakCountdown === null
    ? null
    : `${Math.floor(breakCountdown / 60)}:${String(breakCountdown % 60).padStart(2, '0')}`;
  const selectedBusStatusLabel =
    selectedBus?.status === 'break'
      ? 'Przerwa'
      : selectedBus?.status === 'cached'
        ? 'Ostatnia pozycja'
        : selectedBus?.statusText || null;
  const selectedBusHeaderStyle = {
    backgroundColor: themeColor,
  } as React.CSSProperties;
  
  // We force Google map Style, but we will apply a CSS invert filter for dark mode in the JSX if isDark

  return (
    <div className={`fixed inset-0 w-full ${bgMain} ${textMain} font-sans overflow-hidden flex flex-col transition-colors duration-500 ${isOled ? 'theme-oled' : ''} ${isWarm ? 'theme-warm' : ''} ${isAurora ? 'theme-aurora' : ''}`}>
      <style>{`
        .dark-mode-map .leaflet-layer,
        .dark-mode-map .leaflet-control-zoom-in,
        .dark-mode-map .leaflet-control-zoom-out,
        .dark-mode-map .leaflet-control-attribution {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        
        /* OLED Theme Overrides */
        .theme-oled .bg-slate-900:not(.mks-bus-marker *) { background-color: #000000 !important; }
        .theme-oled .bg-slate-800:not(.mks-bus-marker *) { background-color: #050505 !important; }
        .theme-oled .bg-slate-700:not(.mks-bus-marker *) { background-color: #0a0a0a !important; }
        .theme-oled .border-slate-800:not(.mks-bus-marker *) { border-color: transparent !important; }
        .theme-oled .border-slate-700:not(.mks-bus-marker *) { border-color: transparent !important; }
        .theme-oled .border-slate-700\\/50 { border-color: transparent !important; }
        .theme-oled .border-b { border-bottom-color: transparent !important; }
        .theme-oled .border-t { border-top-color: transparent !important; }
        .theme-oled .bg-slate-900\\/60:not(.mks-bus-marker *) { background-color: rgba(0,0,0,0.6) !important; }
        .theme-oled .bg-slate-900\\/80:not(.mks-bus-marker *) { background-color: rgba(0,0,0,0.8) !important; }
        .theme-oled .bg-slate-900\\/85:not(.mks-bus-marker *) { background-color: rgba(0,0,0,0.85) !important; }
        .theme-oled .bg-slate-800\\/40:not(.mks-bus-marker *) { background-color: rgba(5,5,5,0.4) !important; }

        /* Aurora Theme Overrides */
        .theme-aurora .bg-slate-900:not(.mks-bus-marker *) { background-color: #120f24 !important; }
        .theme-aurora .bg-slate-800:not(.mks-bus-marker *) { background-color: #1b1630 !important; }
        .theme-aurora .bg-slate-700:not(.mks-bus-marker *) { background-color: #2a2146 !important; }
        .theme-aurora .bg-slate-900\\/80:not(.mks-bus-marker *) { background-color: rgba(26,20,48,0.84) !important; }
        .theme-aurora .bg-slate-900\\/85:not(.mks-bus-marker *) { background-color: rgba(26,20,48,0.9) !important; }
        .theme-aurora .bg-slate-800\\/40:not(.mks-bus-marker *) { background-color: rgba(31,23,54,0.48) !important; }
        .theme-aurora .border-slate-700\\/50 { border-color: rgba(232,121,249,0.18) !important; }
        .theme-aurora .border-slate-700:not(.mks-bus-marker *) { border-color: rgba(167,139,250,0.26) !important; }
        .theme-aurora .text-slate-400:not(.mks-bus-marker *) { color: #c4b5fd !important; }

        /* Warm (Piaskowy) Theme Overrides */
        .theme-warm .bg-slate-50:not(.mks-bus-marker *) { background-color: #f2ede1 !important; }
        .theme-warm .bg-white:not(.mks-bus-marker *) { background-color: #faf7ef !important; }
        .theme-warm .bg-slate-100:not(.mks-bus-marker *) { background-color: #e6e0cc !important; }
        .theme-warm .bg-slate-200:not(.mks-bus-marker *) { background-color: #dad4b6 !important; }
        .theme-warm .bg-slate-900:not(.mks-bus-marker *) { background-color: #f2ede1 !important; }
        .theme-warm .border-slate-50:not(.mks-bus-marker *) { border-color: #f2ede1 !important; }
        .theme-warm .border-slate-100:not(.mks-bus-marker *) { border-color: #dcd6ba !important; }
        .theme-warm .border-slate-200:not(.mks-bus-marker *) { border-color: #cfc89f !important; }
        .theme-warm .bg-white\\/90:not(.mks-bus-marker *) { background-color: rgba(250,247,239,0.9) !important; }
        .theme-warm .bg-white\\/85:not(.mks-bus-marker *) { background-color: rgba(250,247,239,0.85) !important; }
        .theme-warm .bg-white\\/80:not(.mks-bus-marker *) { background-color: rgba(250,247,239,0.8) !important; }
        .theme-warm .bg-white\\/50:not(.mks-bus-marker *) { background-color: rgba(250,247,239,0.5) !important; }
        .theme-warm .bg-slate-900\\/80:not(.mks-bus-marker *) { background-color: rgba(242,237,225,0.8) !important; }
        .theme-warm .bg-slate-900\\/60:not(.mks-bus-marker *) { background-color: rgba(242,237,225,0.6) !important; }
        .theme-warm .text-slate-900:not(.mks-bus-marker *) { color: #3d3a2e !important; }
        .theme-warm .text-slate-500:not(.mks-bus-marker *) { color: #736e56 !important; }
        .theme-warm .bg-slate-200\\/60:not(.mks-bus-marker *) { background-color: rgba(218,212,182,0.6) !important; }
        .theme-warm .bg-slate-100\\/50:not(.mks-bus-marker *) { background-color: rgba(230,224,204,0.5) !important; }
        .theme-warm *:not(.text-rose-500):not(.text-emerald-500):not(.text-amber-500):not(.mks-bus-marker *) > .text-slate-900 { color: #3d3a2e !important; }
        .theme-warm *:not(.text-rose-500):not(.text-emerald-500):not(.text-amber-500):not(.mks-bus-marker *) > .text-slate-500 { color: #736e56 !important; }
        .theme-warm *:not(.text-rose-500):not(.text-emerald-500):not(.text-amber-500):not(.mks-bus-marker *) > .text-slate-400 { color: #918b74 !important; }
        .theme-warm .border-slate-800:not(.mks-bus-marker *) { border-color: #cfc89f !important; }
        .theme-warm .bg-slate-800:not(.mks-bus-marker *) { background-color: #dad4b6 !important; }
        .theme-warm .bg-slate-800\\/80:not(.mks-bus-marker *) { background-color: rgba(218,212,182,0.8) !important; }
        .theme-warm .bg-slate-800\\/50:not(.mks-bus-marker *) { background-color: rgba(218,212,182,0.5) !important; }
        .theme-warm .bg-slate-800\\/40:not(.mks-bus-marker *) { background-color: rgba(218,212,182,0.4) !important; }
      `}</style>
      {/* Main Content Area */}
      <div className={`flex-1 relative overflow-hidden ${isDark ? 'dark-mode-map' : ''}`}>
         
         {/* ============== MAP VIEW ============== */}
         <div className="absolute inset-0 z-0">
            <BusMap 
               vehicles={filteredVehicles} 
               onVehicleClick={(v: any) => {
                  if (v) {
                     setSelectedBus(v);
                     setIsBusPanelExpanded(true);
                     setIsSettingsOpen(false);
                  }
               }}
               selectedVehicleId={selectedBus?.id}
               stopsData={stopsDataMap}
               themeColor={themeColor}
               refreshInterval={refreshInterval}
               forcedCenter={mapCenter}
               onCenterComplete={() => setMapCenter(null)}
               highlightedStopId={selectedStopId}
               onStopClick={(stopId) => {
                  setSelectedStopId(stopId);
                  setIsStopPanelExpanded(true);
               }}
               onMapClick={() => {
                  setSelectedBus(null);
                  setSelectedStopId(null);
               }}
            />

            {/* Overlays for Map */}
            <div className="absolute top-0 left-0 right-0 z-10 p-2 md:p-4 pointer-events-none flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              
              {/* Top Box Mobile / Desktop */}
              <div className={`${bgCard} rounded-2xl shadow-lg border p-3 md:p-4 flex flex-col gap-3 pointer-events-auto w-full md:w-96 transition-all`}>
                <div className="flex items-center justify-between font-extrabold text-xl tracking-tight" style={{ color: themeColor }}>
                  <div className="flex items-center gap-2">
                     <Bus className="w-5 h-5 md:w-6 md:h-6" />
                     <span className="text-lg md:text-xl">PKS Live</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                        onClick={handleManualRefresh}
                        className={`p-1.5 rounded-lg transition-all active:scale-90 relative ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} ${isManualRefreshing ? 'text-blue-500' : (isDark ? 'text-slate-600' : 'text-slate-300')}`}
                        title="Odśwież ręcznie"
                     >
                        <RefreshCw className={`w-4 h-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
                     </button>
                     {error ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                     ) : (
                        <span className="relative flex h-2.5 w-2.5" title="LIVE">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                     )}
                  </div>
                </div>
                
                <div className="relative shrink-0">
                  <Search className={`absolute left-3 top-2.5 h-4 w-4 opacity-60 ${textSub}`} />
                  <input
                    type="text"
                    className={`w-full py-2 pl-10 pr-10 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 transition-all font-medium placeholder-opacity-60 ${isDark ? 'bg-slate-800 text-white placeholder-slate-400' : 'bg-slate-100/50 text-slate-900 placeholder-slate-500'}`}
                    style={{ '--tw-ring-color': themeColor + '80' } as React.CSSProperties}
                    placeholder="Filtruj linię (np. 108)..."
                    value={filterRoute}
                    onChange={(e) => setFilterRoute(e.target.value)}
                  />
                  {filterRoute && (
                     <button onClick={() => setFilterRoute('')} className={`absolute right-3 top-2.5 opacity-60 hover:opacity-100 ${textSub}`}>
                        <X className="w-4 h-4" />
                     </button>
                  )}
                </div>
              </div>

              {/* Desktop Settings & Refresh Pill (Hidden on Mobile) */}
              <div className={`hidden md:flex ${bgCard} rounded-full shadow-lg border px-4 py-2 pointer-events-auto items-center gap-4 transition-all`}>
                 <button 
                    onClick={() => setActiveTab('stops')}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors mr-2 ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                 >
                    <List className="w-4 h-4" /> Przystanki
                 </button>
                 <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                 <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className={`p-2 -mr-2 rounded-full transition-colors border ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-400' : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-500'}`}
                    title="Ustawienia"
                 >
                    <Settings className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <AnimatePresence>
              {selectedBus && (
                <motion.div
                  key="bus-panel-map"
                  initial={{ y: "100%", opacity: 0.5 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "100%", opacity: 0.5 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className={`absolute bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto md:w-[400px] rounded-t-3xl md:rounded-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-l border-r md:border z-50 overflow-hidden flex flex-col max-h-[60vh] md:max-h-[85vh] md:mb-0 ${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50' : 'bg-white/90 backdrop-blur-xl border-slate-200/50') : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100')}`}
                >
                  <motion.div 
                     className="p-3 pb-5 md:p-6 md:pb-8 text-white relative shrink-0 cursor-pointer touch-none overflow-hidden" 
                     style={selectedBusHeaderStyle}
                     onClick={() => setIsBusPanelExpanded(!isBusPanelExpanded)}
                     drag="y"
                     dragConstraints={{ top: 0, bottom: 0 }}
                     dragElastic={0.1}
                     onDragEnd={(e, info) => {
                        if (info.offset.y > 20) setIsBusPanelExpanded(false);
                        else if (info.offset.y < -20) setIsBusPanelExpanded(true);
                     }}
                  >
                     <div 
                        className="w-12 h-1.5 rounded-full bg-white/40 hover:bg-white/60 mx-auto mb-3 transition-colors"
                     />
                     
                     <div className="flex items-baseline gap-2 mb-1 md:mb-1.5">
                        <span className="text-3xl md:text-5xl font-black tracking-tighter drop-shadow-sm">{selectedBus.routeShortName || '-'}</span>
                        <span className="uppercase tracking-widest text-[10px] md:text-xs font-bold text-white/90">Linia</span>
                     </div>
                     <h2 className="text-sm md:text-[17px] font-medium leading-tight opacity-100 drop-shadow-sm pr-12 relative z-20">
                       Kierunek: <span className="font-bold">{normalizeVehicleText(selectedBus.direction) || 'Nieustalony'}</span>
                     </h2>
                     <h3 className="text-[10px] md:text-xs font-medium leading-tight opacity-90 drop-shadow-sm mt-0.5 md:mt-1 relative z-20 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-white/80 uppercase tracking-[0.18em] font-semibold">{selectedBus.id && `Nr pojazdu: ${selectedBus.id}`}</span>
                        {selectedBusStatusLabel && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${selectedBus.status === 'break' ? 'bg-amber-400 text-slate-950' : selectedBus.status === 'cached' ? 'bg-white/20 text-white' : selectedBus.status === 'technical' ? 'bg-indigo-500/80 text-white' : 'bg-white/15 text-white'}`}>
                            {normalizeVehicleText(selectedBusStatusLabel)}
                          </span>
                        )}
                        {selectedBus.model && (
                          <span className="basis-full text-[12px] md:text-sm font-semibold leading-tight text-white/95">Model: {selectedBus.model}</span>
                        )}
                        {selectedBus.status === 'break' && breakCountdownLabel && (
                          <span className="px-1.5 py-0.5 rounded bg-black/20 text-white text-[9px] font-black uppercase tracking-tight">
                            Odjazd za: {breakCountdownLabel}
                          </span>
                        )}
                        {selectedBus.dataAgeSec !== undefined && selectedBus.dataAgeSec > 40 && (
                         <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black animate-pulse uppercase tracking-tight">
                           Brak sygnału: {selectedBus.dataAgeSec}s temu
                         </span>
                       )}
                     </h3>
                  </motion.div>
                  
                  <AnimatePresence initial={false}>
                    {isBusPanelExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                        className="flex flex-col min-h-0 overflow-hidden"
                      >
                        <div className={`p-2.5 md:p-4 flex flex-col gap-2.5 md:gap-4 overflow-y-auto -mt-3 md:-mt-4 rounded-t-xl md:rounded-t-2xl relative z-10 ${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur' : 'bg-slate-50/80 backdrop-blur') : bgMain}`}>
                        <div className="grid grid-cols-2 gap-2 md:gap-4 shrink-0 mt-1">
                        <div className={`flex flex-col justify-center p-2.5 md:p-3 rounded-xl md:rounded-2xl border shadow-[0_2px_12px_rgb(0,0,0,0.04)] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} ${!selectedBus.delay || Math.floor(Math.abs(selectedBus.delay) / 60) === 0 ? 'col-span-2' : ''}`}>
                           <div className={`flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 md:mb-1 ${textSub}`}>
                              <Navigation className="w-3 h-3 md:w-3.5 md:h-3.5" /> Prędkość
                           </div>
                           <span className={`text-base md:text-lg font-medium tracking-tight ${textMain}`}>
                              {selectedBus.status === 'break'
                                ? <span className="text-amber-500">Przerwa</span>
                                : selectedBus.status === 'cached'
                                  ? <span className="text-slate-500">Ostatnia pozycja</span>
                                  : selectedBus.speed === 0 || !selectedBus.speed
                                    ? <span className="text-amber-500">Postój</span>
                                    : `${Math.round(selectedBus.speed)} km/h`}
                           </span>
                        </div>
                        
                        {!!(selectedBus.delay && !isNaN(selectedBus.delay) && Math.floor(Math.abs(selectedBus.delay) / 60) > 0) && (
                           <div className={`flex flex-col justify-center p-2.5 md:p-3 rounded-xl md:rounded-2xl border shadow-[0_2px_12px_rgb(0,0,0,0.04)] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                              <div className={`flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold uppercase tracking-wider mb-0.5 md:mb-1 ${textSub}`}>
                                 <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" /> Punktualność
                              </div>
                              {(() => {
                                 let d = selectedBus.delay || 0;
                                 if (Math.abs(d) > 18000) d = 0; // Ignore absurd delays (e.g. > 5 hours) to prevent UI breakage
                                 const m = Math.floor(Math.abs(d) / 60);
                                 if (d < 0) return (
                                   <div className="flex flex-col text-emerald-500 items-start">
                                     <div className="flex items-baseline gap-1">
                                       <span className="text-xl font-bold leading-none">{m}</span>
                                       <span className="text-sm font-medium">min</span>
                                     </div>
                                     <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-90">Przed czasem</span>
                                   </div>
                                 );
                                 return (
                                   <div className="flex flex-col text-rose-500 items-start">
                                     <div className="flex items-baseline gap-1">
                                       <span className="text-xl font-bold leading-none">{m}</span>
                                       <span className="text-sm font-medium">min</span>
                                     </div>
                                     <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-90">Opóźniony</span>
                                   </div>
                                 );
                              })()}
                           </div>
                        )}
                      </div>
                      
                      {selectedBus.schedule && selectedBus.schedule.length > 0 && (
                       <div className={`flex flex-col gap-2 mt-1 border-t pt-4 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                          <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${textSub}`}>
                            <MapPin className="w-4 h-4" /> Nadchodzące przystanki
                          </h3>
                          <div className="flex flex-col gap-0 relative">
                             <div className={`absolute left-[9px] top-4 bottom-4 w-0.5 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>
                             {selectedBus.schedule.map((sch: any, idx: number) => {
                                const realTimeRaw = sch.real ? new Date(sch.real) : null;
                                const plannedTime = sch.planned ? new Date(sch.planned) : null;
                                let delayMin = 0; if (realTimeRaw && plannedTime) { delayMin = Math.round((realTimeRaw.getTime() - plannedTime.getTime()) / 60000); }
                                else if (plannedTime && selectedBus.delay) { delayMin = Math.round(selectedBus.delay / 60); }
                                const realTime = realTimeRaw || (plannedTime && selectedBus.delay ? new Date(plannedTime.getTime() + (selectedBus.delay * 1000)) : realTimeRaw);
                                const formatTime = (time: Date) => {
                                   const isTomorrow = time.getDate() !== new Date().getDate();
                                   const mm = time.getMinutes().toString().padStart(2, '0');
                                   const hh = time.getHours().toString().padStart(2, '0');
                                   if (isTomorrow) {
                                      const dd = time.getDate().toString().padStart(2, '0');
                                      const mo = (time.getMonth() + 1).toString().padStart(2, '0');
                                      return `${dd}.${mo} ${hh}:${mm}`;
                                   }
                                   return `${hh}:${mm}`;
                                };
                                const timeStr = realTime ? formatTime(realTime) : '--:--';
                                const plannedStr = plannedTime ? formatTime(plannedTime) : null;
                                const isHighlighted = sch.id?.toString() === selectedStopId;
                                const isPastStop = selectedBus.lastStopId && sch.id === selectedBus.lastStopId;
                                return (
                                  <div 
                                     key={`${sch.id || idx}-${idx}`} 
                                     onClick={() => { if (sch.id) setSelectedStopId(sch.id.toString()); }}
                                     className={`flex items-start gap-4 py-2 relative z-10 cursor-pointer transition-colors hover:bg-slate-500/10 rounded-xl px-2 -mx-2 ${isHighlighted ? (isDark ? 'bg-amber-500/20' : 'bg-amber-100') : ''} ${isPastStop ? 'opacity-50' : ''}`}
                                  >
                                     <div className={`w-5 h-5 rounded-full border-4 shrink-0 mt-0.5 shadow-sm leading-none transition-colors ${isHighlighted ? 'border-red-500' : (isDark ? 'border-slate-800' : 'border-white')}`} style={{ backgroundColor: isHighlighted ? themeColor : (isPastStop ? '#94a3b8' : themeColor) }}></div>
                                     <div className={`flex flex-col flex-1 pb-2 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-50'} ${isHighlighted ? 'border-transparent' : ''}`}>
                                        <span className={`text-[13px] font-semibold leading-tight pr-2 ${textMain}`}>{formatScheduleStopName(sch.name)}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                           <span className={`text-xs font-bold font-mono ${delayMin > 0 ? 'text-rose-500' : delayMin < 0 ? 'text-emerald-500' : textMain}`}>{timeStr}</span>
                                           {/* removed plannedStr */}
                                           {/* removed delay pill */}
                                        </div>
                                     </div>
                                  </div>
                                );
                              })}
                          </div>
                       </div>
                     )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

              {/* New Stop Overlay on Map */}
              <AnimatePresence>
                {activeTab === 'map' && selectedStopId && !selectedBus && (
                  <motion.div
                    key="stop-panel-map"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    drag="y"
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, info) => {
                       const swipeThreshold = 50;
                       if (info.offset.y > swipeThreshold) {
                          if (isStopPanelExpanded) setIsStopPanelExpanded(false);
                          else setSelectedStopId(null);
                       } else if (info.offset.y < -swipeThreshold) {
                          if (!isStopPanelExpanded) setIsStopPanelExpanded(true);
                       }
                    }}
                    className={`absolute bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto md:w-[380px] rounded-t-[32px] md:rounded-[32px] shadow-[0_-8px_40px_rgb(0,0,0,0.15)] border-t border-l border-r md:border z-40 overflow-hidden flex flex-col max-h-[55vh] md:max-h-[85vh] ${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur-2xl border-slate-700/50' : 'bg-white/90 backdrop-blur-2xl border-slate-200/50') : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100')}`}
                  >
                     {/* Header */}
                     <motion.div 
                        className="p-4 pb-6 text-white relative shrink-0 cursor-pointer" 
                        style={{ backgroundColor: themeColor }}
                        onClick={() => setIsStopPanelExpanded(!isStopPanelExpanded)}
                     >
                        <div 
                           className="w-12 h-1.5 rounded-full bg-white/30 hover:bg-white/50 mx-auto mb-4 transition-colors relative z-[51]"
                        />
                        <div className="flex justify-between items-start mt-2 px-1">
                           <h2 className="text-2xl md:text-3xl font-black leading-tight drop-shadow-md pr-4">
                              {stopsList.find(s => s.id === selectedStopId)?.name}
                           </h2>

                           <div className="flex items-center gap-2 relative z-[51]"></div>
                        </div>
                     </motion.div>

                     {/* Content */}
                     <AnimatePresence initial={false}>
                       {isStopPanelExpanded && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                           className="flex flex-col min-h-0 overflow-hidden"
                         >
                            <div className={`flex flex-col overflow-hidden -mt-5 shadow-2xl rounded-t-[32px] relative z-10 ${transparentUI ? (isDark ? 'bg-slate-900/95 backdrop-blur-3xl' : 'bg-slate-50/95 backdrop-blur-3xl') : bgMain}`}>
                               <div 
                                  className="overflow-y-auto custom-scrollbar px-4 md:px-5"
                                  onPointerDown={(e) => e.stopPropagation()}
                               >
                                  <div className="flex flex-col gap-2 pb-12 pt-5">
                                     {isFetchingDepartures ? (
                                        <div className="p-12 text-center flex flex-col items-center">
                                           <div className="w-10 h-10 mb-5 border-3 rounded-full animate-spin" style={{ borderColor: `${themeColor}20`, borderTopColor: themeColor }}></div>
                                           <p className={`text-sm font-bold tracking-tight ${textMain}`}>Pobieranie rozkładu...</p>
                                           <p className={`text-xs mt-1 ${textSub}`}>To może chwilę potrwać</p>
                                        </div>
                                     ) : processedDepartures.length === 0 ? (
                                        <div className={`p-10 rounded-[32px] border-2 border-dashed text-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                           <p className={`text-base font-bold ${textMain}`}>Brak odjazdów</p>
                                           <p className={`text-xs mt-1 ${textSub}`}>Sprawdź inne godziny lub dni</p>
                                         </div>
                                       ) : (
                                          (() => {
                                             const elements: any[] = [];
                                             let lastDayStr = '';
                                             const todayStr = new Date(now).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                                             
                                             processedDepartures.slice(0, 40).forEach((inc: any, idx: number) => {
                                                const d = new Date(inc.depTimeMs);
                                                const dayStr = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
                                                
                                                if (dayStr !== lastDayStr && dayStr !== todayStr.toUpperCase()) {
                                                   elements.push(
                                                      <div key={`day-marker-${idx}`} className={`mt-8 mb-5 text-[11px] font-black uppercase tracking-[0.15em] opacity-40 ml-1 ${textSub}`}>
                                                         {dayStr}
                                                      </div>
                                                   );
                                                }
                                                lastDayStr = dayStr;
                                                
                                                elements.push(
                                                   <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.97] ${isDark ? 'bg-slate-900/40 hover:bg-slate-800/60' : 'bg-white shadow-sm hover:shadow-md border border-slate-100 hover:border-slate-200'}`}>
                                                      <div className="flex items-center gap-4">
                                                         <div className="min-w-[50px] px-3 py-1.5 rounded-xl text-white font-black text-sm text-center shadow-md grow-0" style={{ backgroundColor: themeColor }}>
                                                            {String(inc.bus.routeShortName || '').trim().replace(/^MKS\s+/, '')}
                                                         </div>
                                                         <div className="flex flex-col">
                                                            <span className={`text-[15px] font-bold leading-tight ${textMain} max-w-[190px] md:max-w-none truncate`}>{inc.bus.direction}</span>
                                                         </div>
                                                      </div>
                                                      <div className="flex flex-col items-end">
                                                         <span className={`text-base font-black ${inc.diffMin <= 5 && inc.diffMin >= -1 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : textMain}`}>
                                                            {inc.diffMin <= 0 && inc.diffMin >= -1 ? 'Teraz' : (inc.diffMin > 0 && inc.diffMin <= 30 ? `${inc.diffMin} min` : inc.actualTimeStr)}
                                                         </span>
                                                      </div>
                                                   </div>
                                                );
                                             });
                                             return elements;
                                          })()
                                       )}
                                   </div>
                               </div>
                            </div>
                         </motion.div>
                       )}
                     </AnimatePresence>

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
         {/* ============== STOPS VIEW ============== */}
         <AnimatePresence mode="wait">
         {activeTab === 'stops' && (
         <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 700, damping: 35 }}
            className={`absolute inset-0 overflow-y-auto z-10 ${transparentUI ? (isDark ? 'bg-slate-900/60 backdrop-blur-md' : 'bg-slate-200/60 backdrop-blur-md') : bgMain}`}
         >
            <AnimatePresence mode="wait">
            {!selectedStopId ? (
               <motion.div 
                  key="stop-list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ type: "spring", stiffness: 700, damping: 35 }}
                  className={`flex flex-col h-full w-full max-w-2xl mx-auto shadow-sm ${transparentUI ? 'bg-transparent' : (isDark ? 'bg-slate-900' : 'bg-white')}`}
               >
                  <div className={`p-4 border-b sticky top-0 z-20 shadow-sm ${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur border-slate-800/50' : 'bg-white/80 backdrop-blur border-slate-200/50') : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100')}`}>
                     <div className="flex justify-between items-center mb-4">
                       <h2 className="text-xl font-black" style={{ color: themeColor }}>Znajdź Przystanek</h2>
                       <button className={`p-1 rounded ${textSub} ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} onClick={() => setActiveTab('map')}><X className="w-5 h-5"/></button>
                     </div>
                     <div className="relative">
                       <Search className={`absolute left-3 top-3 h-4 w-4 ${textSub}`} />
                       <input
                         type="text"
                         className={`w-full py-2.5 pl-10 pr-10 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 transition-all font-medium ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 placeholder-slate-400'}`}
                         style={{ '--tw-ring-color': themeColor + '80' } as React.CSSProperties}
                         placeholder="Wpisz nazwę (np. Rejtana)..."
                         value={stopsFilter}
                         onChange={(e) => setStopsFilter(e.target.value)}
                       />
                       {stopsFilter && (
                          <button onClick={() => setStopsFilter('')} className={`absolute right-3 top-3 opacity-60 hover:opacity-100 ${textSub}`}>
                             <X className="w-4 h-4" />
                          </button>
                       )}
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 pb-24">
                     {(() => {
                        const uniqueStops = [...filteredStopsList];
                        // Sort so that favorites are at the top
                        uniqueStops.sort((a, b) => {
                           const aFav = favsState.includes(a.id);
                           const bFav = favsState.includes(b.id);
                           if (aFav && !bFav) return -1;
                           if (!aFav && bFav) return 1;
                           // Alphabetical fallback
                           if (aFav && bFav) return a.name.localeCompare(b.name);
                           return 0; // Don't sort the rest if we don't have to, to keep original order which is somewhat alphabetical
                        });

                        return uniqueStops.slice(0, 150).map(stop => {
                           const isFav = favsState.includes(stop.id);
                           return (
                           <div key={stop.id} className={`w-full flex items-center justify-between group py-1 border-b ${transparentUI ? (isDark ? 'border-slate-700/30' : 'border-slate-300/30') : (isDark ? 'border-slate-800' : 'border-slate-50')}`}>
                              <button 
                                 onClick={() => setSelectedStopId(stop.id)}
                                 className={`flex-1 text-left py-2 px-4 flex items-center justify-between transition-colors rounded-l-lg ${transparentUI ? (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-white/50') : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50')}`}
                              >
                                 <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${transparentUI ? (isDark ? 'bg-slate-800/80' : 'bg-white/80') : (isDark ? 'bg-slate-800' : 'bg-slate-100')}`} style={{ color: themeColor }}>
                                       <MapPin className="w-4 h-4" />
                                    </div>
                        <span className={`font-semibold ${textMain}`}>{stop.name}</span>
                                 </div>
                              </button>
                              <motion.button
                                 whileTap={{ scale: 0.8 }}
                                 onClick={(e) => toggleFavoriteStop(stop.id, e)}
                                 className="p-3 mr-1"
                              >
                                 <motion.div
                                    animate={isFav ? { scale: [1, 1.4, 1] } : {}}
                                    transition={{ duration: 0.3 }}
                                 >
                                    <Star className={`w-5 h-5 transition-colors ${isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-300'}`} />
                                 </motion.div>
                              </motion.button>
                           </div>
                           );
                        });
                     })()}
                     {stopsList.length === 0 && (
                        <div className={`p-8 text-center text-sm ${textSub}`}>Wczytywanie bazy przystanków...</div>
                     )}
                  </div>
               </motion.div>
            ) : (
               <motion.div 
                  key="stop-details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ type: "spring", stiffness: 700, damping: 35 }}
                  className={`flex flex-col h-full w-full max-w-2xl mx-auto shadow-sm ${transparentUI ? 'bg-transparent' : (isDark ? 'bg-slate-900' : 'bg-white')}`}
               >
                  <div className="p-4 pb-8 relative z-[30] text-white transition-colors shrink-0" style={{ backgroundColor: themeColor }}>
                     <div className="flex justify-between items-start mb-2">
                        <button 
                           onClick={() => setSelectedStopId(null)}
                           className="p-2 hover:bg-white/20 rounded-full transition-colors inline-flex items-center justify-center relative z-20"
                           title="Wróć do listy"
                        >
                           <ArrowLeft className="w-6 h-6" />
                        </button>
                        
                         <div className="flex gap-2">
                            <button 
                               onClick={() => {
                                  const stop = stopsList.find(s => s.id === selectedStopId);
                                  if (stop && stop.lat !== undefined && stop.lon !== undefined) {
                                     setMapCenter([stop.lat, stop.lon]);
                                      setSelectedBus(null);
                                     setActiveTab('map');
                                  }
                               }}
                               className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-all flex items-center gap-2 text-xs font-bold"
                            >
                               <MapIcon className="w-3.5 h-3.5" /> Pokaż na mapie
                            </button>
                         </div>
                     </div>
                     <h2 className="text-2xl font-black leading-tight drop-shadow-sm pr-12 relative z-20">
                        {stopsList.find(s => s.id === selectedStopId)?.name}
                     </h2>
                  </div>
                  <div className={`flex-1 p-4 -mt-4 rounded-t-2xl relative z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] overflow-y-auto ${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur' : 'bg-slate-50/80 backdrop-blur') : bgMain}`}>
                     <div className="flex justify-between items-center mt-2 mb-4 pl-1">
                        <h3 className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${textSub}`}>
                           <Clock className="w-4 h-4" /> Najbliższe odjazdy
                        </h3>
                        {stopDepartures && stopDepartures.length > 0 && (
                           <div className="relative ml-auto">
                               <select 
                                  className={`appearance-none text-xs pl-3 pr-8 py-1.5 rounded-full font-bold outline-none cursor-pointer border shadow-sm transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'}`}
                                  value={departuresLineFilter}
                                  onChange={(e) => setDeparturesLineFilter(e.target.value)}
                               >
                                  <option value="">Wszystkie linie</option>
                                  {Array.from(new Set(stopDepartures.map(d => String(d.line_name || '').trim().replace(/^MKS\s+/, '')).filter(Boolean))).sort().map(line => (
                                     <option key={line} value={line}>{line}</option>
                                  ))}
                               </select>
                               <div className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                   <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                               </div>
                           </div>
                        )}
                     </div>
                     <div className="flex flex-col gap-3">
                        {(() => {
                           if (isFetchingDepartures) {
                              return (
                                 <div className="p-8 pb-12 rounded-2xl text-center flex flex-col items-center justify-center h-full">
                                    <div className="w-8 h-8 mb-4 border-4 rounded-full animate-spin" style={{ borderColor: `${themeColor}40`, borderTopColor: themeColor }}></div>
                                    <p className={`font-medium ${textSub}`}>Ładowanie rozkładu...</p>
                                 </div>
                              );
                           }

                           let incoming = processedDepartures;
                           
                           if (departuresLineFilter) {
                              incoming = incoming.filter((inc: any) => String(inc.bus.routeShortName || '').trim().replace(/^MKS\s+/, '') === departuresLineFilter);
                           }

                           if (incoming.length === 0) {
                              return (
                                 <div className={`p-8 rounded-2xl border-2 border-dashed text-center flex flex-col items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <Bus className={`w-8 h-8 mb-2 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                                    <p className={`font-medium ${textSub}`}>Brak odjazdów w najbliższym czasie</p>
                                    <p className={`text-xs mt-1 opacity-70 ${textSub}`}>Oczekuje na kolejne pojazdy na żywo...</p>
                                 </div>
                              );
                           }
                           let elements: any[] = [];
                           let currentDayStr = '';
                           
                           incoming.forEach((inc: any, i: number) => {
                               const d = new Date(inc.depTimeMs);
                               const dayStr = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                               
                               if (dayStr !== currentDayStr) {
                                  elements.push(
                                     <div key={`day-${i}`} className={`mt-4 mb-2 md:mt-6 first:mt-0 text-[11px] font-bold uppercase tracking-widest pl-1 opacity-70 ${textSub}`}>
                                        {dayStr}
                                     </div>
                                  );
                                  currentDayStr = dayStr;
                               }
                               
                               elements.push(
                                  <div key={`inc-${i}`} className={`flex items-center justify-between p-4 rounded-2xl border w-full shadow-sm transition-colors relative overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700 hover:border-slate-600' : 'bg-white border-slate-200/60 hover:border-slate-300'}`}>
                                     {inc.isDelayed === true && (
                                        <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-3xl flex items-center justify-center z-10" style={{ backgroundColor: themeColor }} title="Opóźniony">
                                            <Clock className="w-3 h-3 text-white ml-2 mb-2" />
                                        </div>
                                     )}
                                     <div className="flex flex-col gap-1.5 z-20">
                                        <div className="flex items-center gap-2">
                                           <span className="text-base font-black px-2 py-0.5 rounded shadow-sm text-white" style={{ backgroundColor: themeColor }}>
                                              {inc.bus.routeShortName}
                                           </span>
                                           <span className={`font-bold text-sm md:text-base leading-tight max-w-[140px] md:max-w-[200px] truncate ${textMain}`}>{inc.bus.direction || 'Zjazd'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                           <span className={`text-[10px] items-center flex font-bold uppercase tracking-wider ${textSub}`}>
                                              {inc.vehicleNum ? `Nr: ${inc.vehicleNum}` : ''}
                                           </span>
                                        </div>
                                     </div>
                                     <div className="text-right flex flex-col items-end justify-center h-full z-20 pr-1">
                                        <span className={`text-xl md:text-2xl font-black tracking-tight leading-none ${inc.diffMin < 30 ? (inc.diffMin <= 0 ? 'text-rose-500' : (isDark ? 'text-emerald-400' : 'text-emerald-600')) : textMain}`}>
                                           {inc.diffMin < 0 ? 'Odjechał' : (inc.diffMin === 0 ? 'Teraz' : (inc.diffMin < 30 ? `${inc.diffMin} min` : inc.actualTimeStr))}
                                        </span>
                                     </div>
                                  </div>
                               );
                           });
                           return elements;
                        })()}
                     </div>
                  </div>
               </motion.div>
            )}
            </AnimatePresence>
         </motion.div>
         )}
         </AnimatePresence>

      </div>

      {/* Bottom Navigation for Mobile */}
      <div className={`md:hidden flex-none border-t pb-safe relative z-[5000] transition-colors ${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50' : 'bg-white/90 backdrop-blur-md border-slate-100/50') : (isDark ? 'bg-slate-900 border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]' : 'bg-white border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]')}`}>
         <div className="flex justify-around items-center h-[60px] px-2">
            <button 
               onClick={() => { setActiveTab('map'); setSelectedBus(null); setSelectedStopId(null); }}
               className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'map' ? '' : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
               style={activeTab === 'map' ? { color: themeColor } : {}}
            >
               <MapIcon className="w-5 h-5 mb-0.5" />
               <span className="text-[10px] font-black uppercase tracking-wider">Mapa</span>
            </button>
            <button 
               onClick={() => { setActiveTab('stops'); setSelectedBus(null); setSelectedStopId(null); }}
               className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${activeTab === 'stops' ? '' : (isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}`}
               style={activeTab === 'stops' ? { color: themeColor } : {}}
            >
               <List className="w-5 h-5 mb-0.5" />
               <span className="text-[10px] font-black uppercase tracking-wider">Przystanki</span>
            </button>
            <button 
               onClick={() => setIsSettingsOpen(true)}
               className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
            >
               <Settings className="w-5 h-5 mb-0.5" />
               <span className="text-[10px] font-black uppercase tracking-wider">Opcje</span>
            </button>
         </div>
      </div>

      {/* Settings Modal (Overlay) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`absolute inset-0 z-[6000] flex justify-center items-end md:items-center ${isDark ? 'bg-black/60' : 'bg-slate-900/20 backdrop-blur-sm'}`}
            onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}
          >
            <motion.div 
               initial={{ y: "100%", opacity: 0, scale: 0.98 }}
               animate={{ y: 0, opacity: 1, scale: 1 }}
               exit={{ y: "100%", opacity: 0, scale: 0.96 }}
               transition={{ type: "spring", stiffness: 700, damping: 35 }}
               className={`w-full md:w-[480px] max-h-[90vh] shadow-2xl flex flex-col pointer-events-auto overflow-hidden rounded-t-3xl md:rounded-3xl backdrop-blur-3xl ${isDark ? 'bg-slate-900/85 text-white border-t border-slate-700/50 md:border md:border-slate-700/50' : 'bg-white/85 text-slate-900 md:border border-slate-200/50'}`}
            >
               <div className="flex items-center justify-between p-5 border-b border-inherit bg-inherit z-10 relative">
                  <h2 className="text-xl font-bold tracking-tight px-1">Opcje aplikacji</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>
                     <X className={`w-5 h-5`} />
                  </button>
               </div>
               
               <div className="p-4 flex flex-col gap-4 overflow-y-auto w-full relative z-0">
                  
                  {/* Appearance Bento Box */}
                  <div className={`p-4 rounded-3xl ${isDark ? 'bg-slate-800/40 outline outline-1 outline-white/5' : 'bg-slate-100/50 backdrop-blur-sm outline outline-1 outline-black/5'}`}>
                     <h3 className={`text-xs font-bold uppercase tracking-wider mb-4 px-1 ${textSub}`}>Wygląd i kolory</h3>
                     
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                        {[
                           { id: 'system', name: 'Systemowy', icon: <Monitor className="w-4 h-4 mr-1.5" /> },
                           { id: 'light', name: 'Jasny', icon: <Sun className="w-4 h-4 mr-1.5" /> },
                           { id: 'light-warm', name: 'Piaskowy', icon: <Sun className="w-4 h-4 mr-1.5" /> },
                           { id: 'dark', name: 'Ciemny', icon: <Moon className="w-4 h-4 mr-1.5" /> },
                           { id: 'dark-oled', name: 'AMOLED', icon: <Moon className="w-4 h-4 mr-1.5" /> },
                           { id: 'dark-aurora', name: 'Aurora', icon: <Sparkles className="w-4 h-4 mr-1.5" /> }
                        ].map(mode => (
                           <button
                              key={mode.id}
                              onClick={() => saveAppTheme(mode.id)}
                              className={`flex py-2.5 justify-center items-center rounded-2xl font-semibold text-sm transition-all ${appTheme === mode.id ? 'ring-2 shadow-sm' : ''} ${isDark ? 'bg-slate-800/80 hover:bg-slate-700' : 'bg-white hover:bg-slate-100 shadow-sm border border-slate-200/50'}`}
                              style={appTheme === mode.id ? { borderColor: themeColor, '--tw-ring-color': themeColor } as React.CSSProperties : {}}
                           >
                              {mode.icon}
                              {mode.name}
                           </button>
                        ))}
                     </div>

                     <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-2 rounded-2xl">
                        {[
                           { name: 'Teal', hex: '#00A3A2' },
                           { name: 'Blue', hex: '#3b82f6' },
                           { name: 'Purple', hex: '#8b5cf6' },
                           { name: 'Rose', hex: '#f43f5e' },
                           { name: 'Amber', hex: '#f59e0b' }
                        ].map(color => (
                           <button
                              key={color.name}
                              onClick={() => saveThemeColor(color.hex)}
                              className={`w-10 h-10 rounded-xl transition-all ${themeColor === color.hex ? 'ring-2 scale-110 shadow-md' : 'hover:scale-105'}`}
                              style={{ backgroundColor: color.hex, '--tw-ring-color': isDark ? '#ffffff' : color.hex, '--tw-ring-offset-color': isDark ? '#1e293b' : '#ffffff' } as React.CSSProperties}
                              title={color.name}
                           />
                        ))}
                     </div>
                  </div>

                  {/* Settings Bento Box */}
                  <div className={`p-1 flex flex-col gap-1 rounded-3xl ${isDark ? 'bg-slate-800/40 outline outline-1 outline-white/5' : 'bg-slate-100/50 backdrop-blur-sm outline outline-1 outline-black/5'}`}>
                     <label className={`flex items-center justify-between p-4 rounded-[20px] cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white shadow-sm'}`}>
                        <div className="flex flex-col pr-4">
                           <span className="font-bold">Efekt przezroczystości UI</span>
                           <span className={`text-[11px] leading-tight mt-1 ${textSub}`}>Rozmycie tła interfejsu (starsze urządzenia mogą zwolnić)</span>
                        </div>
                        <div className={`w-12 h-6 flex-shrink-0 rounded-full transition-colors relative ${transparentUI ? '' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`} style={{ backgroundColor: transparentUI ? themeColor : '' }}>
                           <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${transparentUI ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <input type="checkbox" className="hidden" checked={transparentUI} onChange={(e) => saveTransparentUI(e.target.checked)} />
                     </label>

                     <div className={`h-px w-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div>
                     
                     <label className={`flex items-center justify-between p-4 rounded-[20px] cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-800/80' : 'hover:bg-white shadow-sm'}`}>
                        <div className="flex flex-col pr-4">
                           <span className="font-bold">Pokaż autobusy bez przypisanej linii</span>
                           <span className={`text-[11px] leading-tight mt-1 ${textSub}`}>Pojazdy bez aktywnego kursu oraz ich ostatnia zapisana pozycja</span>
                        </div>
                        <div className={`w-12 h-6 flex-shrink-0 rounded-full transition-colors relative ${showInactive ? '' : (isDark ? 'bg-slate-700' : 'bg-slate-200')}`} style={{ backgroundColor: showInactive ? themeColor : '' }}>
                           <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${showInactive ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <input type="checkbox" className="hidden" checked={showInactive} onChange={(e) => saveInactive(e.target.checked)} />
                     </label>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
