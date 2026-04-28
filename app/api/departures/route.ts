import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stopId = searchParams.get('stopId');
  const areaId = searchParams.get('areaId');
  const code = searchParams.get('code');

  if (!stopId) {
    return NextResponse.json({ error: 'Missing stopId' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 sec timeout

    // Fetch nearest departures (limit ~10) which have realtime delay deviations
    const nearestRes = await fetch(`http://185.214.67.112/api/its/infoboard/nearest-departures/${stopId}`, { 
      headers: { 'Host': 'einfo.zgpks.rzeszow.pl' },
      signal: controller.signal 
    });
    let nearestData: any = { journeys: [] };
    if (nearestRes.ok) {
       nearestData = await nearestRes.json();
    }
    
    // Fetch the full static timetable for the end of the day
    if (areaId && code) {
       // Get current date in Warsaw timezone
       const now = new Date();
       const warsawSvc = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' });
       const todayIso = warsawSvc.format(now);
       
       const tomorrow = new Date(now.getTime() + 86400000);
       const tomorrowIso = warsawSvc.format(tomorrow);

       const [ttResT, ttResN] = await Promise.all([
          // Explicitly request the day to avoid timezone mismatches at midnight
          fetch(`http://einfo.zgpks.rzeszow.pl/api/stop-point-timetable/${areaId}?day=${todayIso}`, { headers: { 'Accept': 'application/json' }, signal: controller.signal }),
          fetch(`http://einfo.zgpks.rzeszow.pl/api/stop-point-timetable/${areaId}?day=${tomorrowIso}`, { headers: { 'Accept': 'application/json' }, signal: controller.signal })
       ]);
       
       clearTimeout(timeoutId);
       
       const ttDataT = ttResT.ok ? await ttResT.json() : { items: [] };
       const ttDataN = ttResN.ok ? await ttResN.json() : { items: [] };
       
       const codeToCompare = String(code).trim();
       
       const isJourneyRunning = (legends: string[], dateIso: string) => {
          if (!legends || legends.length === 0) return true;
          const dt = new Date(dateIso);
          const day = dt.getDay(); // 0=Sun, 6=Sat
          const month = dt.getMonth() + 1;
          const date = dt.getDate();
          
          // Polish holidays globally
          const isHoliday = (month===1 && date===1) || (month===1 && date===6) || 
                            (month===4 && date===5) || (month===4 && date===6) || 
                            (month===5 && date===1) || (month===5 && date===3) || 
                            (month===5 && date===24) || // Pentecost 2026
                            (month===6 && date===4) ||  // Corpus Christi 2026
                            (month===8 && date===15) || 
                            (month===11 && date===1) || (month===11 && date===11) || 
                            (month===12 && date===25) || (month===12 && date===26);

          const isSundayOrHoliday = day === 0 || isHoliday;
          const isWeekendOrHoliday = day === 0 || day === 6 || isHoliday;
          
          const baseLegends = ['D', '(D)', 'S', 'E', 'C', '+', '6ś', '6', '7', '1-4', '2-5', '5', '5/6', '6/7'];
          const hasBaseLegend = legends.some(l => baseLegends.includes(l));
          
          if (!hasBaseLegend) return true; // if only exclusions or route variants, assume it runs
          
          let runs = false;
          for (const l of legends) {
             if (l === 'D' && !isWeekendOrHoliday) runs = true;
             if (l === '(D)' && !isWeekendOrHoliday) runs = true;
             if (l === 'S' && !isWeekendOrHoliday) runs = true; // School days
             if (l === 'E' && !isSundayOrHoliday) runs = true; // Mon-Sat
             if (l === 'C' && isWeekendOrHoliday) runs = true; // Sat-Sun
             if (l === '6ś' && day === 6 && !isHoliday) runs = true; // Sat (not holidays)
             if (l === '6' && day === 6) runs = true; // Sat
             if (l === '+' && isSundayOrHoliday) runs = true; // Sun/Holidays
             if (l === '7' && isSundayOrHoliday) runs = true; // Sun
             if (l === '5' && day === 5 && !isHoliday) runs = true; // Friday
             if (l === '1-4' && day >= 1 && day <= 4 && !isHoliday) runs = true; // Mon-Thu
             if (l === '2-5' && day >= 2 && day <= 5 && !isHoliday) runs = true; // Tue-Fri
             if (l === '5/6' && day === 5) runs = true; // Fri night
             if (l === '6/7' && day === 6) runs = true; // Sat night
          }
          return runs;
       };
       
       const processTimetable = (ttData: any, dayIso: string) => {
         if (!ttData || !ttData.items) return [];
         const mapped: any[] = [];
         ttData.items.forEach((item: any) => {
            if (item.journeys) {
               item.journeys.forEach((j: any) => {
                  const jCode = String(j.stop_point_code).trim();
                  // Match exact code or numeric match (e.g., "01" vs "1")
                  const isMatch = jCode === codeToCompare || 
                                  (!isNaN(parseInt(jCode, 10)) && !isNaN(parseInt(codeToCompare, 10)) && parseInt(jCode, 10) === parseInt(codeToCompare, 10));
                                  
                  if (isMatch && isJourneyRunning(j.legends || [], dayIso)) {
                     // Using ISO 8601 local format (T delimiter) correctly parses in all browsers
                     mapped.push({
                        timetable_time: `${dayIso}T${j.time}:00`,
                        past: false,
                        deviation: null,
                        legends: j.legends,
                        route_description: item.description,
                        line_name: item.line_name,
                        vias: item.vias,
                        operator_short_name: j.operator
                     });
                  }
               });
            }
         });
         return mapped;
       };
       
       const mappedT = processTimetable(ttDataT, todayIso);
       const mappedN = processTimetable(ttDataN, tomorrowIso);
       
       // Combine both today and tomorrow to ensure we show courses past midnight
       const combinedMapped = [...mappedT, ...mappedN];

       // merge nearest defaults with timetable
       // IMPORTANT: Cache the original live journeys to check against, so we don't accidentally
       // deduplicate static courses against other static courses!
       const originalLiveJourneys = [...(nearestData.journeys || [])].map(j => ({
           ...j,
           timetable_time: j.timetable_time.replace(' ', 'T')
       }));
       const combinedJourneys = [...originalLiveJourneys];
       
       combinedMapped.forEach(j => {
          const jTimeMs = new Date(j.timetable_time).getTime();
          // Check if there is already a corresponding LIVE journey on this line 
          const isDuplicate = originalLiveJourneys.some((live: any) => {
              if (live.line_name !== j.line_name) return false;
              // Narrow window (e.g. 2 minutes instead of 15) to prevent deleting genuine frequent courses
              const liveTimeMs = new Date(live.timetable_time).getTime();
              const timeDiff = Math.abs(liveTimeMs - jTimeMs);
              return timeDiff <= 2 * 60000; 
          });

          if (!isDuplicate) {
             combinedJourneys.push(j);
          }
       });
       
       nearestData.journeys = combinedJourneys;
       
       // Sort by time
       if (nearestData.journeys) {
           nearestData.journeys.sort((a: any, b: any) => new Date(a.timetable_time).getTime() - new Date(b.timetable_time).getTime());
       }
    }

    return NextResponse.json(nearestData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch departures', details: String(error) }, { status: 500 });
  }
}
