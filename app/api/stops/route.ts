import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let stopsCache: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 1000 * 60; // 1 minute cache

export async function GET() {
  try {
    if (stopsCache && Date.now() - lastCacheTime < CACHE_TTL_MS) {
      return NextResponse.json(stopsCache, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('http://einfo.zgpks.rzeszow.pl/api/stop-point', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stops: ${response.status}`);
    }

    const data = await response.json();
    const compressedMap: Record<string, { n: string, lat: number, lon: number, areaId?: string, code?: string }> = {};
    
    // Simple helper to Title Case a string properly without merging or dropping words
    const toTitleCase = (str: string) => {
      if (!str) return '';
      return str.trim().toLowerCase().replace(/\s+/g, ' ').replace(/(?:^|[\s,\/\.\-])\S/g, (match) => match.toUpperCase());
    };

    if (data && data.items) {
      for (const stop of data.items) {
        if (stop.location && stop.location.lat) {
          const areaName = stop.stop_area_name ? stop.stop_area_name.trim() : '';
          const name = stop.name ? stop.name.trim() : '';
          const finalNameRaw = areaName || name;
          let formattedName = toTitleCase(finalNameRaw);

          if (stop.stop_point_code && stop.stop_point_code.trim()) {
            let code = stop.stop_point_code.trim();
            
            const isRzeszow = formattedName.includes('Rzeszów');
            const isRzeszowDA = isRzeszow && (formattedName.includes('D.A.') || formattedName.toLowerCase().includes('dworzec'));

            // Normalize "01", "02" to "1", "2" ONLY if NOT a D.A. stop or if it's not Rzeszów
            if (!isRzeszowDA && /^0\d$/.test(code)) {
               code = code.substring(1);
            }
            
            // Remove any trailing codes already in the string to avoid duplicates or unwanted numbers
            const words = formattedName.split(' ');
            const lastWord = words[words.length - 1];
            if (lastWord === code || lastWord === `0${code}` || (code.length === 1 && lastWord === `0${code}`)) {
               formattedName = words.slice(0, -1).join(' ').trim();
            }

            // User request: Rzeszów stops should have numbers. 
            // In the main stops list, D.A./Dworzec SHOULD have "st." prefix to distinguish them.
            // Village stops (non-Rzeszów) should also have numbers to distinguish directions in the list.
            if (isRzeszow) {
              if (isRzeszowDA) {
                if (!formattedName.toLowerCase().includes('st.')) {
                   formattedName += ` st. ${code}`;
                }
              } else {
                const displayCode = stop.stop_point_code.trim();
                formattedName += ` ${displayCode}`;
              }
            } else {
               // For non-Rzeszów stops, append code if it exists to distinguish directions
               if (code) {
                 formattedName += ` ${code}`;
               }
            }
          }
          
          compressedMap[String(stop.stop_point_id)] = {
            n: formattedName,
            lat: stop.location.lat,
            lon: stop.location.lon,
            areaId: String(stop.stop_area_id),
            code: stop.stop_point_code ? String(stop.stop_point_code).trim() : ''
          };
        }
      }
    }

    stopsCache = compressedMap;
    lastCacheTime = Date.now();

    return NextResponse.json(compressedMap, {
       headers: {
         'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
       },
    });

  } catch (error) {
    console.error('Error fetching stops:', error);
    return NextResponse.json({ error: 'Failed to fetch stops' }, { 
      status: 500,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}

