const fs = require('fs');
let code = fs.readFileSync('app/page.tsx', 'utf8');

const targetRegex = /\{selectedBus\.schedule\.map[^{]+\{[^}]*(?:(?!\}\)\})[\s\S])*\}\)\}/;
let startIndex = code.indexOf('{selectedBus.schedule.map');
if (startIndex !== -1) {
  let count = 1;
  let endIndex = startIndex + 1;
  while (count > 0 && endIndex < code.length) {
    if (code[endIndex] === '{') count++;
    if (code[endIndex] === '}') count--;
    endIndex++;
  }
  const toReplace = code.substring(startIndex, endIndex);

const replacement = `{selectedBus.schedule.map((sch: any, idx: number) => {
                                const realTime = sch.real ? new Date(sch.real) : null;
                                const plannedTime = sch.planned ? new Date(sch.planned) : null;
                                let delayMin = 0; if (realTime && plannedTime) { delayMin = Math.round((realTime.getTime() - plannedTime.getTime()) / 60000); }
                                const formatTime = (time) => {
                                   const isTomorrow = time.getDate() !== new Date().getDate();
                                   const mm = time.getMinutes().toString().padStart(2, '0');
                                   const hh = time.getHours().toString().padStart(2, '0');
                                   if (isTomorrow) {
                                      const dd = time.getDate().toString().padStart(2, '0');
                                      const mo = (time.getMonth() + 1).toString().padStart(2, '0');
                                      return \`\${dd}.\${mo} \${hh}:\${mm}\`;
                                   }
                                   return \`\${hh}:\${mm}\`;
                                };
                                const timeStr = realTime ? formatTime(realTime) : '--:--';
                                const plannedStr = plannedTime ? formatTime(plannedTime) : null;
                                const isHighlighted = sch.id?.toString() === selectedStopId;
                                const isPastStop = selectedBus.lastStopId && sch.id === selectedBus.lastStopId;
                                return (
                                  <div 
                                     key={\`\${sch.id || idx}-\${idx}\`} 
                                     onClick={() => { if (sch.id) setSelectedStopId(sch.id.toString()); }}
                                     className={\`flex items-start gap-4 py-2 relative z-10 cursor-pointer transition-colors hover:bg-slate-500/10 rounded-xl px-2 -mx-2 \${isHighlighted ? (isDark ? 'bg-amber-500/20' : 'bg-amber-100') : ''} \${isPastStop ? 'opacity-50' : ''}\`}
                                  >
                                     <div className={\`w-5 h-5 rounded-full border-4 shrink-0 mt-0.5 shadow-sm leading-none transition-colors \${isHighlighted ? 'border-amber-400' : (isDark ? 'border-slate-800' : 'border-white')}\`} style={{ backgroundColor: isHighlighted || isPastStop ? '#94a3b8' : themeColor }}></div>
                                     <div className={\`flex flex-col flex-1 pb-2 border-b \${isDark ? 'border-slate-700/50' : 'border-slate-50'} \${isHighlighted ? 'border-transparent' : ''}\`}>
                                        <span className={\`text-[13px] font-semibold leading-tight pr-2 \${textMain}\`}>{sch.name || 'Przystanek nieznany'}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                           <span className={\`text-xs font-bold font-mono \${delayMin > 0 ? 'text-rose-500' : delayMin < 0 ? 'text-emerald-500' : textMain}\`}>{timeStr}</span>
                                           {plannedStr && delayMin !== 0 && ( <span className={\`text-[10px] line-through font-mono opacity-60 \${textSub}\`}>{plannedStr}</span> )}
                                           {delayMin !== 0 && ( <span className={\`text-[10px] font-bold px-1.5 py-0.5 rounded-md \${delayMin > 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}\`}>{delayMin > 0 ? \`+\${delayMin}m\` : \`\${delayMin}m\`}</span> )}
                                        </div>
                                     </div>
                                  </div>
                                );
                              })}`;

    fs.writeFileSync('app/page.tsx', code.replace(toReplace, replacement));
    console.log('Success regex!');
} else {
    console.log('Not found');
}
