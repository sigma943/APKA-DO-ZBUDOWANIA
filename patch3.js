import fs from 'fs';

let content = fs.readFileSync('app/page.tsx', 'utf8');

content = content.replace(
  /className=\{`absolute bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto md:w-\[380px\] rounded-t-\[32px\] md:rounded-\[32px\] shadow-\[0_-8px_40px_rgb\(0,0,0,0\.15\)\] border-t border-l border-r md:border z-40 overflow-hidden flex flex-col max-h-\[80vh\] md:max-h-\[85vh\]/g,
  'className={`absolute bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto md:w-[380px] rounded-t-[32px] md:rounded-[32px] shadow-[0_-8px_40px_rgb(0,0,0,0.15)] border-t border-l border-r md:border z-40 overflow-hidden flex flex-col max-h-[55vh] md:max-h-[85vh]'
);

// Second replacment: change the padding for custom-scrollbar so it's flush
content = content.replace(
  /<div className="p-5 overflow-y-auto custom-scrollbar flex-1">/g,
  '<div className="overflow-y-auto custom-scrollbar flex-1 px-4 md:px-5">'
);

content = content.replace(
  /<div className="flex flex-col gap-2 pb-10">/g,
  '<div className="flex flex-col gap-2 pb-12 pt-5">'
);

// Third replacement: remove the redundant "Pokaż na mapie" button from the STOP panel (we remove ALL occurrences of it inside activeTab === 'map' if possible, or just string replace that section)
const mapStrToRemove = `<button 
                                  onClick={(e) => { 
                                     e.stopPropagation(); 
                                     const stop = stopsList.find(s => s.id === selectedStopId);
                                     if (stop && stop.lat && stop.lon) {
                                        setMapCenter([stop.lat, stop.lon]);
                                        setActiveTab('map');
                                     }
                                  }}
                                  className="px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-[11px] font-bold flex items-center gap-2 hover:bg-white/30 transition-all"
                               >
                                  <MapIcon className="w-3.5 h-3.5" /> Pokaż na mapie
                               </button>`;

// A robust way to do this with regex:
content = content.replace(/<button[^>]*>\s*<MapIcon[^>]*\/> Pokaż na mapie\s*<\/button>/g, (match, offset) => {
  // Only remove it if it's somewhere around the bottom panel, say offset > 30000
  if (offset > 40000) return '';
  return match;
});

fs.writeFileSync('app/page.tsx', content);
