
const fs = require('fs');
const content = fs.readFileSync('app/page.tsx', 'utf8');

const markerStart = '              {/* New Stop Overlay on Map */}';
const markerEnd = '         {/* ============== STOPS VIEW ============== */}';

const startIdx = content.indexOf(markerStart);
const endIdx = content.indexOf(markerEnd);

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = content.substring(0, startIdx) + `              {/* New Stop Overlay on Map */}
              <AnimatePresence>
                {activeTab === 'map' && selectedStopId && !selectedBus && (
                  <motion.div
                    key="stop-panel-map"
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                    className={\`absolute bottom-0 left-0 right-0 md:bottom-4 md:left-4 md:right-auto md:w-[380px] rounded-t-3xl md:rounded-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-l border-r md:border z-40 overflow-hidden flex flex-col max-h-[85vh] md:max-h-[85vh] md:mb-0 \${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur-xl border-slate-700/50' : 'bg-white/90 backdrop-blur-xl border-slate-200/50') : (isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100')}\`}
                  >
                     <motion.div 
                        className="p-4 pb-6 text-white relative shrink-0 cursor-pointer touch-none" 
                        style={{ backgroundColor: themeColor }}
                        onClick={() => setIsStopPanelExpanded(!isStopPanelExpanded)}
                     >
                        <div 
                           className="w-12 h-1.5 rounded-full bg-white/40 hover:bg-white/60 mx-auto mb-3 transition-colors"
                        />
                        
                        <div className="flex items-center gap-2 mb-0.5">
                           <MapPin className="w-3.5 h-3.5 text-white/90" />
                           <span className="uppercase tracking-widest text-[9px] font-bold text-white/90">Przystanek</span>
                        </div>
                        <h2 className="text-lg font-black leading-tight drop-shadow-sm pr-10 relative z-20">
                           {stopsList.find(s => s.id === selectedStopId)?.name}
                        </h2>
                     </motion.div>

                     <AnimatePresence initial={false}>
                       {isStopPanelExpanded && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: "auto", opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ type: "spring", stiffness: 400, damping: 35 }}
                           className="flex flex-col min-h-0 overflow-hidden"
                         >
                            <div className={\`p-3 flex flex-col gap-3 overflow-y-auto max-h-[50vh] md:max-h-[60vh] -mt-3 shadow-inner rounded-t-2xl relative z-10 \${transparentUI ? (isDark ? 'bg-slate-900/80 backdrop-blur-xl' : 'bg-slate-50/80 backdrop-blur-xl') : bgMain}\`}>
                               <div className="flex justify-between items-center mt-1 mb-1">
                                  <h3 className={\`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 \${textSub}\`}>
                                     <Clock className="w-3.5 h-3.5" /> Najbliższe odjazdy
                                  </h3>
                               </div>

                               <div className="flex flex-col gap-1.5 pb-2">
                                  {isFetchingDepartures ? (
                                     <div className="p-8 text-center flex flex-col items-center">
                                        <div className="w-6 h-6 mb-4 border-2 rounded-full animate-spin" style={{ borderColor: \`\${themeColor}40\`, borderTopColor: themeColor }}></div>
                                        <p className={\`text-[11px] \${textSub}\`}>Wczytywanie...</p>
                                     </div>
                                  ) : processedDepartures.length === 0 ? (
                                     <div className={\`p-6 rounded-2xl border-2 border-dashed text-center \${isDark ? 'border-slate-800' : 'border-slate-200'}\`}>
                                        <p className={\`text-xs \${textSub}\`}>Brak odjazdów</p>
                                      </div>
                                    ) : (
                                       (() => {
                                          const elements = [];
                                          let lastDayStr = '';
                                          const todayStr = new Date(now).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
                                          
                                          processedDepartures.slice(0, 10).forEach((inc, idx) => {
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
                                      className={\`mt-1 py-3 rounded-2xl border border-dashed text-[11px] font-bold transition-all active:scale-95 \${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-800/50' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}\`}
                                   >
                                      Pokaż pełny rozkład
                                   </button>
                                </div>
                            </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
` + content.substring(endIdx);
    fs.writeFileSync('app/page.tsx', newContent);
    console.log('Patch applied successfully');
} else {
    console.error('Markers not found', { startIdx, endIdx });
}
