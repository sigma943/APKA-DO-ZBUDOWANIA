
const replace = require('replace-in-file');
const fs = require('fs');

const options = {
  files: 'app/page.tsx',
  from: /<Clock className="w-3\.5 h-3\.5" \/> Najbliższe odjazdy[\s\S]+?Pokaż pełny rozkład[\s\S]+?<\/button>[\s\S]+?<\/div>[\s\S]+?<\/div>[\s\S]+?<\/div>[\s\S]+?<\/div>/,
  to: `<Clock className="w-3.5 h-3.5" /> Najbliższe odjazdy
                         </h3>
                      </div>

                      <div className="flex flex-col gap-1.5 pb-2">
                         {isFetchingDepartures ? (
                            <div className="p-8 text-center flex flex-col items-center">
                               <div className="w-6 h-6 mb-2 border-2 rounded-full animate-spin" style={{ borderColor: \`\${themeColor}40\`, borderTopColor: themeColor }}></div>
                               <p className={\`text-[11px] \${textSub}\`}>Wczytywanie...</p>
                            </div>
                         ) : processedDepartures.length === 0 ? (
                            <div className={\`p-6 rounded-2xl border-2 border-dashed text-center \${isDark ? 'border-slate-800' : 'border-slate-200'}\`}>
                               <p className={\`text-xs \${textSub}\`}>Brak odjazdów</p>
                             </div>
                           ) : (
                              (() => {
                                 const elements: any[] = [];
                                 let lastDayStr = '';
                                 const todayStr = new Date(now).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                                 
                                 processedDepartures.slice(0, 10).forEach((inc: any, idx: number) => {
                                    const d = new Date(inc.depTimeMs);
                                    const dayStr = d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                                    
                                    if (dayStr !== lastDayStr && dayStr !== todayStr) {
                                       elements.push(
                                          <div key={\`day-marker-\${idx}\`} className={\`mt-3 mb-1 text-[9px] font-bold uppercase tracking-widest pl-1 opacity-60 \${textSub}\`}>
                                             {dayStr}
                                          </div>
                                       );
                                    }
                                    lastDayStr = dayStr;
                                    
                                    elements.push(
                                       <div key={idx} className={\`flex items-center justify-between p-2 rounded-2xl border \${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}\`}>
                                          <div className="flex items-center gap-2 scale-[0.9] origin-left">
                                             <div className="px-2 py-0.5 rounded-lg text-white font-black text-[11px]" style={{ backgroundColor: themeColor }}>
                                                {String(inc.bus.routeShortName || '').trim().replace(/^MKS\\s+/, '')}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className={\`text-[11px] font-bold leading-tight \${textMain} max-w-[150px] truncate\`}>{inc.bus.direction}</span>
                                             </div>
                                          </div>
                                          <div className="flex flex-col items-end">
                                             <span className={\`text-[11px] font-black \${inc.diffMin <= 5 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : textMain}\`}>
                                                {inc.diffMin <= 0 ? 'Teraz' : (inc.diffMin <= 30 ? \`\${inc.diffMin} min\` : inc.actualTimeStr)}
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 });
                                 return elements;
                              })()
                           )}
                          <button 
                             onClick={() => setActiveTab('stops')}
                             className="mt-1 py-3 rounded-2xl border border-dashed text-[11px] font-bold transition-all active:scale-95 border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/50"
                          >
                             Pokaż pełny rozkład
                          </button>
                       </div>
                    </motion.div>
                  )}
               </AnimatePresence>`,
};

try {
  const results = replace.sync(options);
  console.log('Replacement results:', results);
}
catch (error) {
  console.error('Error occurred:', error);
}
