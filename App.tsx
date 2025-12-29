import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Users, RefreshCw, Minus, Plus, Grid, GitMerge, ArrowLeft, Trash2, PlusCircle, AlertCircle, Save, Download, FileDown, Settings, Edit3, X, Check, UserRound, Users as UsersIcon, PenLine, FileText, Trash, LayoutList, ChevronRight, FolderOpen, MoreVertical, ChevronDown } from 'lucide-react';

// --- 型別定義 ---
type MatchType = 'single' | 'double' | 'team';
type TournamentType = 'elimination' | 'roundRobin';

interface Player {
    id: string;
    name: string;
    // 循環賽積分用
    played?: number;
    won?: number;
    lost?: number;
    draw?: number;
    netSets?: number;
    totalWonPoints?: number;
    totalLostPoints?: number;
    setRatio?: string;
}

interface SubMatch {
    id: number;
    type: MatchType;
    p1SubName: string;
    p1PartnerName: string;
    p2SubName: string;
    p2PartnerName: string;
    sets: { s1: string; s2: string }[];
}

interface Match {
    id: string;
    roundIndex?: number;
    matchIndex?: number; // for elimination
    p1Index?: number; // for RR
    p2Index?: number; // for RR
    p1: string;
    p1Partner?: string;
    p2: string;
    p2Partner?: string;
    s1: string | number;
    s2: string | number;
    winner: number | null; // 0 for p1, 1 for p2
    subMatches: SubMatch[];
    isChampion?: boolean; // for elim final block
    winnerName?: string;
    winnerPartner?: string;
}

interface RRGroup {
    id: string;
    name: string;
    players: Player[];
    matches: Match[];
}

interface TournamentConfig {
    winCondition: number; // 0=1局, 2=3戰2勝, 3=5戰3勝, 4=7戰4勝
    elimType: MatchType; // for elim
    elimPointsCount: number; // for team elim
    pointsCount: number; // for RR (points per match)
    rrSize?: number; // default size for new groups
}

interface Tournament {
    id: string;
    name: string;
    type: TournamentType;
    config: TournamentConfig;
    data: any; // Elimination: bracket array[][]; RR: { groups: RRGroup[] }
}

// --- 自定義確認對話框 ---
const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200 print:hidden" style={{ fontFamily: '"Inter", "Noto Sans TC", sans-serif' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all scale-100 border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-50 p-3 rounded-full text-red-600 shadow-sm">
                <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">確認操作</h3>
        </div>
        <p className="text-gray-600 mb-6 pl-1">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium">取消</button>
          <button onClick={onConfirm} className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium shadow-sm shadow-red-200">確定執行</button>
        </div>
      </div>
    </div>
  );
};

// --- 新增賽事選擇對話框 (新) ---
const AddTournamentDialog = ({ isOpen, onClose, onAdd }: any) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200 print:hidden" style={{ fontFamily: '"Inter", "Noto Sans TC", sans-serif' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><PlusCircle size={24} /></div>
                  新增賽事類型
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={20} /></button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
              <button 
                  onClick={() => onAdd('elimination')} 
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 hover:shadow-md transition-all group text-left"
              >
                  <div className="bg-purple-100 p-3 rounded-full text-purple-600 group-hover:bg-purple-200 group-hover:text-purple-700 transition-colors">
                      <GitMerge size={28} />
                  </div>
                  <div>
                      <div className="font-bold text-lg text-gray-800 group-hover:text-purple-900">淘汰賽</div>
                      <div className="text-sm text-gray-500 group-hover:text-purple-700/70">建立樹狀對戰圖 (單/雙/團體)</div>
                  </div>
              </button>

              <button 
                  onClick={() => onAdd('roundRobin')} 
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md transition-all group text-left"
              >
                  <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 group-hover:bg-emerald-200 group-hover:text-emerald-700 transition-colors">
                      <Grid size={28} />
                  </div>
                  <div>
                      <div className="font-bold text-lg text-gray-800 group-hover:text-emerald-900">循環賽</div>
                      <div className="text-sm text-gray-500 group-hover:text-emerald-700/70">建立分組積分表</div>
                  </div>
              </button>
          </div>
        </div>
      </div>
    );
  };

// --- 存檔命名對話框 ---
const SaveDialog = ({ isOpen, onClose, onSave, defaultName }: any) => {
    const [fileName, setFileName] = useState(defaultName || "");
    
    useEffect(() => {
        if (isOpen && defaultName) setFileName(defaultName);
    }, [isOpen, defaultName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200 print:hidden" style={{ fontFamily: '"Inter", "Noto Sans TC", sans-serif' }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Save size={20} /></div>
                    儲存專案
                </h3>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">請輸入專案名稱</label>
                    <input 
                        type="text" 
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="例如：2023 冬季冠軍賽"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium">取消</button>
                    <button 
                        onClick={() => {
                            if(fileName.trim()) {
                                onSave(fileName);
                            }
                        }} 
                        disabled={!fileName.trim()}
                        className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- 讀取檔案對話框 ---
const LoadDialog = ({ isOpen, onClose, onLoad, saves, onDelete }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200 print:hidden" style={{ fontFamily: '"Inter", "Noto Sans TC", sans-serif' }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 flex flex-col max-h-[80vh] border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><FolderOpen size={20} /></div>
                    讀取專案
                </h3>
                
                {saves.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 mb-4">
                        <FileText size={48} className="mx-auto mb-2 opacity-20" />
                        <p>目前沒有任何存檔</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-3 custom-scrollbar">
                        {saves.map((save: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-all group shadow-sm hover:shadow-md cursor-pointer" onClick={() => onLoad(save)}>
                                <div className="flex-1 text-left">
                                    <div className="font-bold text-gray-800 flex items-center gap-2">
                                        {save.projectTitle || save.saveName}
                                        {save.isLegacyBackup && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">舊版</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                        {save.timestamp}
                                        <span className="mx-1">•</span>
                                        {save.tournaments?.length || (save.bracket || save.rrGroups ? 1 : 0)} 個賽事
                                    </div>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(index);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="刪除此存檔"
                                >
                                    <Trash size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button onClick={onClose} className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium">關閉</button>
                </div>
            </div>
        </div>
    );
};

// --- 通用組件：比分控制器 ---
const ScoreControl = ({ score, onChange, readOnly, colorClass, maxScore, onClick, variant = 'normal', showButtons = true }: any) => {
  const currentScore = score === '' ? 0 : parseInt(score);
  
  const isSmall = variant === 'small';
  const btnSizeClass = isSmall ? 'w-6 h-6 rounded' : 'w-9 h-9 rounded-lg';
  const iconSize = isSmall ? 10 : 16;
  const inputContainerClass = isSmall ? 'h-6 min-w-[1.8rem] text-xs' : 'h-9 min-w-[3rem] text-xl';
  const inputClass = isSmall ? 'h-6 w-7 text-xs' : 'h-9 w-12 text-xl';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const valStr = e.target.value;
      if (valStr === '') {
          onChange('');
          return;
      }
      if (!/^\d*$/.test(valStr)) return;

      const val = parseInt(valStr);
      let finalVal = Math.max(0, val);
      if (maxScore > 0 && finalVal > maxScore) finalVal = maxScore;
      onChange(finalVal);
  };

  return (
    <div className="flex items-center gap-0.5">
      {showButtons && !readOnly && (
        <button 
            onClick={(e) => { e.stopPropagation(); onChange(Math.max(0, currentScore - 1)); }} 
            className={`${btnSizeClass} flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-l-md transition-colors active:bg-gray-300 print:hidden`}
            title="減少"
        >
            <Minus size={iconSize} />
        </button>
      )}
      
      {onClick ? (
        <div 
            onClick={onClick}
            className={`${inputContainerClass} flex items-center justify-center font-mono font-bold border-y border-gray-200 bg-white ${colorClass} ${readOnly ? 'rounded-md border-x px-2' : ''} cursor-pointer hover:bg-blue-50 transition-colors`}
        >
            {score === '' ? '-' : score}
        </div>
      ) : (
        <input 
            type="text" 
            inputMode="numeric"
            pattern="[0-9]*"
            value={score}
            onChange={handleInputChange}
            disabled={readOnly}
            className={`${inputClass} text-center font-mono font-bold border-y border-gray-200 bg-white outline-none focus:bg-blue-50 ${colorClass} ${readOnly ? 'rounded-md border-x' : ''}`}
        />
      )}

      {showButtons && !readOnly && (
        <button 
            onClick={(e) => {
                e.stopPropagation();
                if (maxScore > 0 && currentScore >= maxScore) return; 
                onChange(currentScore + 1);
            }}
            className={`${btnSizeClass} flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-r-md transition-colors active:bg-blue-200 print:hidden ${maxScore > 0 && currentScore >= maxScore ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="增加"
        >
            <Plus size={iconSize} />
        </button>
      )}
    </div>
  );
};

// --- 團體賽詳細戰況 Modal ---
const TeamMatchModal = ({ isOpen, onClose, matchData, p1Name, p2Name, pointsCount, winCondition, onSave, defaultType = 'single', p1PartnerName, p2PartnerName }: any) => {
    if (!isOpen) return null;

    const maxSets = winCondition === 0 ? 1 : (winCondition * 2 - 1);
    const [subMatches, setSubMatches] = useState<SubMatch[]>(() => {
        const initial = matchData.subMatches || [];
        const result = Array.from({ length: pointsCount }, (_, i) => {
            const isInitial = !initial[i];
            const base = initial[i] || {
                id: i,
                type: defaultType, 
                p1SubName: '', p1PartnerName: '',
                p2SubName: '', p2PartnerName: '',
                sets: Array.from({ length: maxSets }, () => ({ s1: '', s2: '' }))
            };
            
            if (isInitial && pointsCount === 1) {
                base.p1SubName = typeof p1Name === 'string' ? p1Name : '';
                base.p2SubName = typeof p2Name === 'string' ? p2Name : '';
                if (defaultType === 'double') {
                    base.p1PartnerName = p1PartnerName || '';
                    base.p2PartnerName = p2PartnerName || '';
                }
            }
            return base;
        });
        
        return result.map(m => {
            const currentSets = m.sets || [];
            if (currentSets.length !== maxSets) {
                return {
                    ...m,
                    sets: Array.from({ length: maxSets }, (_, si) => currentSets[si] || { s1: '', s2: '' })
                };
            }
            return m;
        });
    });

    useEffect(() => {
        setSubMatches(prev => prev.map(m => {
            if (pointsCount === 1) {
                return {
                    ...m,
                    p1SubName: p1Name,
                    p2SubName: p2Name,
                    p1PartnerName: defaultType === 'double' ? p1PartnerName : m.p1PartnerName,
                    p2PartnerName: defaultType === 'double' ? p2PartnerName : m.p2PartnerName,
                };
            }
            return m;
        }));
    }, [p1Name, p2Name, p1PartnerName, p2PartnerName, pointsCount, defaultType]);

    const calculateSetScore = (sub: any) => {
        let sets1 = 0;
        let sets2 = 0;
        sub.sets.forEach((set: any) => {
            const s1 = parseInt(set.s1);
            const s2 = parseInt(set.s2);
            if (!isNaN(s1) && !isNaN(s2)) {
                if (s1 > s2) sets1++;
                if (s2 > s1) sets2++;
            }
        });
        return { sets1, sets2 };
    };

    const calculateTotalScore = (currentSubMatches: any[]) => {
        let score1 = 0;
        let score2 = 0;
        currentSubMatches.forEach(sub => {
            const { sets1, sets2 } = calculateSetScore(sub);
            if (winCondition > 0) {
                if (sets1 >= winCondition) score1++;
                else if (sets2 >= winCondition) score2++;
            } else {
                if (sets1 > sets2) score1++;
                else if (sets2 > sets1) score2++;
            }
        });
        return { s1: score1, s2: score2 };
    };

    const currentTotal = calculateTotalScore(subMatches);

    const handleSubChange = (index: number, field: string, value: string) => {
        const newSub = [...subMatches];
        (newSub[index] as any)[field] = value;
        setSubMatches(newSub);
    };

    const handleSetScoreChange = (subIndex: number, setIndex: number, team: string, value: string) => {
        let val: any = parseInt(value);
        if (isNaN(val)) val = ''; 
        else val = Math.max(0, val);

        const newSub = [...subMatches];
        (newSub[subIndex].sets[setIndex] as any)[team] = val;
        setSubMatches(newSub);
    };

    const handleConfirm = () => {
        let finalS1 = currentTotal.s1;
        let finalS2 = currentTotal.s2;

        if (pointsCount === 1 && subMatches.length > 0) {
             const { sets1, sets2 } = calculateSetScore(subMatches[0]);
             finalS1 = sets1;
             finalS2 = sets2;
        }

        onSave(matchData.id, subMatches, finalS1, finalS2);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4 animate-in fade-in duration-200 print:hidden" style={{ fontFamily: '"Inter", "Noto Sans TC", sans-serif' }}>
            <style>{`
                .no-spin::-webkit-outer-spin-button,
                .no-spin::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .no-spin {
                    -moz-appearance: textfield;
                }
            `}</style>

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="bg-blue-600 text-white p-4 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Edit3 size={20} /> 詳細戰況登錄
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <div className="bg-blue-50 p-3 flex justify-between items-center text-blue-900 border-b border-blue-100 shrink-0">
                    <div className="font-bold text-lg flex items-center gap-4">
                        <span>{typeof p1Name === 'string' ? p1Name : '選手1'}</span> 
                        <span className="text-2xl font-mono bg-white px-4 py-1 rounded shadow-sm border border-blue-100">{currentTotal.s1} : {currentTotal.s2}</span> 
                        <span>{typeof p2Name === 'string' ? p2Name : '選手2'}</span>
                    </div>
                    <div className="text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100">
                        賽制: {winCondition === 0 ? "一局決勝" : `${winCondition * 2 - 1} 戰 ${winCondition} 勝`}
                    </div>
                </div>

                <div className="p-4 overflow-y-auto bg-gray-50">
                    <div className="space-y-3">
                        <div className="grid grid-cols-[60px_80px_1fr_180px_80px_1fr] gap-2 text-sm font-bold text-gray-500 px-4 text-center items-center">
                            <div>點數</div><div>類型</div><div className="text-left pl-2">{typeof p1Name === 'string' ? p1Name : '選手1'}</div><div>各局小分</div><div>總局數</div><div className="text-right pr-2">{typeof p2Name === 'string' ? p2Name : '選手2'}</div>
                        </div>

                        {subMatches.map((sub, idx) => {
                            const { sets1, sets2 } = calculateSetScore(sub);
                            const pointWinner = winCondition > 0 
                                ? (sets1 >= winCondition ? 0 : sets2 >= winCondition ? 1 : null)
                                : (sets1 > sets2 ? 0 : sets2 > sets1 ? 1 : null);

                            const rowStyle = pointWinner !== null ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200';
                            
                            const getP1Style = () => {
                                if (pointWinner === 0) return "bg-orange-100 border-orange-300 text-orange-800 font-bold shadow-sm";
                                if (pointWinner === 1) return "bg-transparent border-gray-300 text-gray-400";
                                return "bg-white border-gray-300 text-gray-700";
                            };
                            const getP2Style = () => {
                                if (pointWinner === 1) return "bg-orange-100 border-orange-300 text-orange-800 font-bold shadow-sm";
                                if (pointWinner === 0) return "bg-transparent border-gray-300 text-gray-400";
                                return "bg-white border-gray-300 text-gray-700";
                            };

                            return (
                                <div key={idx} className={`grid grid-cols-[60px_80px_1fr_auto_80px_1fr] gap-3 items-center p-3 rounded-lg border shadow-sm transition-colors ${rowStyle}`}>
                                    <div className="text-center font-bold text-gray-400 bg-white/50 rounded py-1 text-xs">第 {idx + 1} 點</div>
                                    
                                    <div className="relative">
                                        {pointsCount > 1 ? (
                                            <>
                                                <select 
                                                    value={sub.type}
                                                    onChange={(e) => handleSubChange(idx, 'type', e.target.value)}
                                                    className="w-full appearance-none bg-white border border-gray-300 text-gray-700 text-sm rounded py-1 pl-2 pr-6 focus:outline-none focus:border-blue-500 font-medium"
                                                >
                                                    <option value="single">單打</option><option value="double">雙打</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500">
                                                    {sub.type === 'single' ? <UserRound size={12} /> : <UsersIcon size={12} />}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1.5 w-full bg-gray-100 text-gray-600 border border-gray-200 text-sm rounded py-1 font-medium">
                                                {sub.type === 'single' ? <UserRound size={14} /> : <UsersIcon size={14} />}
                                                <span>{sub.type === 'single' ? '單打' : '雙打'}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col gap-1 items-start">
                                        <input type="text" placeholder="選手 A" value={sub.p1SubName} onChange={(e) => handleSubChange(idx, 'p1SubName', e.target.value)} className={`w-2/3 p-1.5 rounded border text-sm focus:ring-1 focus:ring-blue-400 outline-none ${getP1Style()}`} />
                                        {sub.type === 'double' && (
                                            <input type="text" placeholder="選手 B" value={sub.p1PartnerName} onChange={(e) => handleSubChange(idx, 'p1PartnerName', e.target.value)} className={`w-2/3 p-1.5 rounded border text-sm focus:ring-1 focus:ring-blue-400 outline-none ${getP1Style()}`} />
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 px-2">
                                        {sub.sets.map((set: any, sIdx: number) => {
                                            const s1 = parseInt(set.s1); const s2 = parseInt(set.s2);
                                            const s1Win = !isNaN(s1) && !isNaN(s2) && s1 > s2;
                                            const s2Win = !isNaN(s1) && !isNaN(s2) && s2 > s1;
                                            return (
                                                <div key={sIdx} className="flex flex-col gap-1 items-center">
                                                    <input type="number" value={set.s1} placeholder="-" onChange={(e) => handleSetScoreChange(idx, sIdx, 's1', e.target.value)} className={`w-10 h-9 text-center border rounded text-lg font-mono p-0 focus:border-blue-500 outline-none transition-colors no-spin ${s1Win ? 'bg-orange-100 border-orange-400 text-red-700 font-bold' : 'bg-white border-gray-300 text-gray-600'}`} />
                                                    <div className="h-px w-full bg-gray-200"></div>
                                                    <input type="number" value={set.s2} placeholder="-" onChange={(e) => handleSetScoreChange(idx, sIdx, 's2', e.target.value)} className={`w-10 h-9 text-center border rounded text-lg font-mono p-0 focus:border-blue-500 outline-none transition-colors no-spin ${s2Win ? 'bg-orange-100 border-orange-400 text-red-700 font-bold' : 'bg-white border-gray-300 text-gray-600'}`} />
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded px-3 py-1 shadow-inner">
                                        <span className={`text-xl font-bold font-mono ${pointWinner === 0 ? 'text-red-600' : 'text-gray-400'}`}>{sets1}</span>
                                        <div className="h-px w-4 bg-gray-200 my-0.5"></div>
                                        <span className={`text-xl font-bold font-mono ${pointWinner === 1 ? 'text-red-600' : 'text-gray-400'}`}>{sets2}</span>
                                    </div>

                                    <div className="flex flex-col gap-1 items-end">
                                        <input type="text" placeholder="選手 A" value={sub.p2SubName} onChange={(e) => handleSubChange(idx, 'p2SubName', e.target.value)} className={`w-2/3 p-1.5 rounded border text-right text-sm focus:ring-1 focus:ring-blue-400 outline-none ${getP2Style()}`} />
                                        {sub.type === 'double' && (
                                            <input type="text" placeholder="選手 B" value={sub.p2PartnerName} onChange={(e) => handleSubChange(idx, 'p2PartnerName', e.target.value)} className={`w-2/3 p-1.5 rounded border text-right text-sm focus:ring-1 focus:ring-blue-400 outline-none ${getP2Style()}`} />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">取消</button>
                    <button onClick={handleConfirm} className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-md transition-colors flex items-center gap-2"><Check size={18} /> 儲存戰況</button>
                </div>
            </div>
        </div>
    );
};

// --- 淘汰賽 Match Component ---
const MatchCard = ({ match, roundIndex, rIndex, onNameChange, onScoreChange, winCondition, onEditClick, elimType }: any) => {
    const isDouble = elimType === 'double';
    const scoreVariant = isDouble ? 'small' : 'normal';
    // 縮小高度
    const rowHeightClass = isDouble ? 'h-20' : 'h-14';

    return (
        <div className={`match-card-wrapper bg-white border-2 border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col w-64 z-10 relative group break-inside-avoid`}>
            
            <button 
                onClick={() => onEditClick(match)}
                className="absolute top-1/2 left-1 -translate-y-1/2 bg-white border border-gray-200 p-1 rounded-full shadow-sm text-gray-400 hover:text-blue-600 hover:border-blue-300 z-30 transition-all hover:scale-105 print:hidden"
                title="詳細戰況"
            >
                <Edit3 size={12} />
            </button>

            {/* Player 1 Row */}
            <div className={`flex items-center justify-between pl-7 border-b border-gray-100 transition-colors ${rowHeightClass} ${isDouble ? 'py-1.5' : 'p-2'} ${match.winner === 0 ? 'bg-orange-100 border-l-4 border-orange-400' : 'border-l-4 border-transparent'}`}>
                <div className="flex items-center flex-1 min-w-0 mr-1">
                    <div className="w-5 text-center text-[10px] font-bold text-gray-400 flex-shrink-0">
                        {rIndex === 0 ? (match.matchIndex * 2 + 1) : ''}
                    </div>

                    <div className="flex flex-col w-full gap-0.5">
                        <input 
                            type="text" 
                            value={match.p1 || ''} 
                            onChange={(e) => rIndex === 0 && onNameChange(rIndex, match.matchIndex, 'p1', e.target.value)} 
                            disabled={rIndex !== 0} 
                            placeholder={rIndex === 0 ? (isDouble ? `選手 ${match.matchIndex * 2 + 1}A` : (elimType === 'team' ? "隊伍 A" : "選手 1")) : ""} 
                            className={`w-full bg-transparent border-none focus:ring-0 truncate ${isDouble ? 'text-xs py-1 ml-[1px]' : 'text-base'} ${match.winner === 0 ? 'font-bold text-orange-900' : 'text-gray-800'}`} 
                        />
                        {isDouble && (
                            <input 
                                type="text" 
                                value={match.p1Partner || ''} 
                                onChange={(e) => rIndex === 0 && onNameChange(rIndex, match.matchIndex, 'p1Partner', e.target.value)} 
                                disabled={rIndex !== 0} 
                                placeholder={rIndex === 0 ? `選手 ${match.matchIndex * 2 + 1}B` : ""} 
                                className={`w-full bg-transparent border-none focus:ring-0 truncate text-xs py-1 ml-[1px] ${match.winner === 0 ? 'text-orange-800' : 'text-gray-500'}`} 
                            />
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 -ml-[1px]">
                    <ScoreControl 
                        score={match.s1} 
                        onChange={(val: any) => onScoreChange(rIndex, match.matchIndex, 's1', val)} 
                        colorClass={match.winner === 0 ? 'text-orange-900 font-bold' : 'text-gray-800'} 
                        maxScore={winCondition} 
                        variant={scoreVariant}
                        showButtons={true} 
                    />
                </div>
            </div>

            {/* Player 2 Row */}
            <div className={`flex items-center justify-between pl-7 transition-colors ${rowHeightClass} ${isDouble ? 'py-1.5' : 'p-2'} ${match.winner === 1 ? 'bg-orange-100 border-l-4 border-orange-400' : 'border-l-4 border-transparent'}`}>
                <div className="flex items-center flex-1 min-w-0 mr-1">
                    <div className="w-5 text-center text-[10px] font-bold text-gray-400 flex-shrink-0">
                        {rIndex === 0 ? (match.matchIndex * 2 + 2) : ''}
                    </div>
                    
                    <div className="flex flex-col w-full gap-0.5">
                        <input 
                            type="text" 
                            value={match.p2 || ''} 
                            onChange={(e) => rIndex === 0 && onNameChange(rIndex, match.matchIndex, 'p2', e.target.value)} 
                            disabled={rIndex !== 0} 
                            placeholder={rIndex === 0 ? (isDouble ? `選手 ${match.matchIndex * 2 + 2}A` : (elimType === 'team' ? "隊伍 B" : "選手 2")) : ""} 
                            className={`w-full bg-transparent border-none focus:ring-0 truncate ${isDouble ? 'text-xs py-1 ml-[1px]' : 'text-base'} ${match.winner === 1 ? 'font-bold text-orange-900' : 'text-gray-800'}`} 
                        />
                        {isDouble && (
                            <input 
                                type="text" 
                                value={match.p2Partner || ''} 
                                onChange={(e) => rIndex === 0 && onNameChange(rIndex, match.matchIndex, 'p2Partner', e.target.value)} 
                                disabled={rIndex !== 0} 
                                placeholder={rIndex === 0 ? `選手 ${match.matchIndex * 2 + 2}B` : ""} 
                                className={`w-full bg-transparent border-none focus:ring-0 truncate text-xs py-1 ml-[1px] ${match.winner === 1 ? 'text-orange-800' : 'text-gray-500'}`} 
                            />
                        )}
                    </div>
                </div>

                <div className="flex-shrink-0 -ml-[1px]">
                    <ScoreControl 
                        score={match.s2} 
                        onChange={(val: any) => onScoreChange(rIndex, match.matchIndex, 's2', val)} 
                        colorClass={match.winner === 1 ? 'text-orange-900 font-bold' : 'text-gray-800'} 
                        maxScore={winCondition} 
                        variant={scoreVariant}
                        showButtons={true}
                    />
                </div>
            </div>
        </div>
    );
};

// --- SVG 多邊形視覺化組件 ---
const RoundRobinPolygon = ({ group }: any) => {
  const numPlayers = group.players.length;
  // 增加 ViewBox 以避免文字被裁切，並保持原有半徑比例
  const radius = 130; 
  const centerX = 200; // 移動中心點
  const centerY = 200;

  const getCoordinates = (index: number, total: number) => {
    // 4人特殊佈局：正方形 (2x2)
    if (total === 4) {
        // 內縮 Padding：原本 70，改為 80 縮小方形範圍，避免裁切
        const padding = 80;
        const size = 400;
        // 左上 (0), 右上 (1), 左下 (2), 右下 (3)
        // 確保符合閱讀順序：第一排 0, 1，第二排 2, 3
        switch(index) {
            case 0: return { x: padding, y: padding }; // Top Left
            case 1: return { x: size - padding, y: padding }; // Top Right
            case 2: return { x: padding, y: size - padding }; // Bottom Left
            case 3: return { x: size - padding, y: size - padding }; // Bottom Right
            default: return { x: centerX, y: centerY };
        }
    }

    // 其他人數維持圓形佈局
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2; 
    return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  };

  const playerCoords = group.players.map((_: any, i: number) => getCoordinates(i, numPlayers));

  return (
    <div className="flex justify-center items-center py-6 pointer-events-none w-full max-w-[480px] aspect-square mx-auto">
      <svg viewBox="0 0 400 400" className="pointer-events-auto w-full h-full">
        {group.matches.map((match: any) => {
          const p1 = playerCoords[match.p1Index];
          const p2 = playerCoords[match.p2Index];
          const hasScore = match.s1 !== '' && match.s2 !== '';
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          
          const s1Pos = { x: p1.x + dx * 0.32, y: p1.y + dy * 0.32 };
          const s2Pos = { x: p1.x + dx * 0.68, y: p1.y + dy * 0.68 };

          return (
            <g key={match.id}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={hasScore ? "#3b82f6" : "#e5e7eb"} strokeWidth={hasScore ? 3 : 1.5} />
              {hasScore && (
                <>
                  <g transform={`translate(${s1Pos.x}, ${s1Pos.y})`}>
                    <circle r="14" fill="white" stroke="#3b82f6" strokeWidth="2" className="drop-shadow-sm"/>
                    <text textAnchor="middle" dominantBaseline="middle" className="font-bold fill-blue-700 pointer-events-none" style={{ fontSize: '13px', fontWeight: '800' }} dy="1">{match.s1}</text>
                  </g>
                  <g transform={`translate(${s2Pos.x}, ${s2Pos.y})`}>
                    <circle r="14" fill="white" stroke="#3b82f6" strokeWidth="2" className="drop-shadow-sm"/>
                    <text textAnchor="middle" dominantBaseline="middle" className="font-bold fill-blue-700 pointer-events-none" style={{ fontSize: '13px', fontWeight: '800' }} dy="1">{match.s2}</text>
                  </g>
                </>
              )}
            </g>
          );
        })}
        {playerCoords.map((coord: any, i: number) => {
          const playerName = group.players[i].name;
          // 放大 1.1 倍 (原計算方式 x 1.1)
          const rectWidth = Math.max(77, playerName.length * 11 + 22); 
          const rectHeight = 32; // 原本 28 -> 32
          return (
            <g key={i}>
              <rect x={coord.x - rectWidth / 2} y={coord.y - rectHeight / 2} width={rectWidth} height={rectHeight} rx="6" fill="white" stroke="#64748b" strokeWidth="2" className="drop-shadow-md"/>
              <text x={coord.x} y={coord.y} dy="1" textAnchor="middle" dominantBaseline="middle" className="font-bold fill-gray-800 pointer-events-none" style={{ fontSize: '15px' }}>{playerName}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// --- 初始數據生成器 ---
const generateInitialBracket = (numParticipants: number) => {
  const rounds = [];
  let currentRoundSize = numParticipants / 2;
  const totalRounds = Math.log2(numParticipants);

  for (let r = 0; r < totalRounds; r++) {
    const matches = [];
    for (let m = 0; m < currentRoundSize; m++) {
      matches.push({
        id: `r${r}-m${m}`,
        roundIndex: r,
        matchIndex: m,
        p1: '',
        p1Partner: '', 
        p2: '', 
        p2Partner: '', 
        s1: '', s2: '', winner: null,
        subMatches: []
      });
    }
    rounds.push(matches);
    currentRoundSize /= 2;
  }
  rounds.push([{ id: `champion`, isChampion: true, winnerName: "待定冠軍", winnerPartner: "" }]);
  return rounds;
};

const createSingleGroup = (name: string, numPlayers: number) => {
    const id = Date.now() + Math.random();
    const players = Array.from({ length: numPlayers }, (_, i) => ({ id: `p-${id}-${i}`, name: `隊伍 ${i + 1}` }));
    const matches = [];
    for (let i = 0; i < numPlayers; i++) {
      for (let j = i + 1; j < numPlayers; j++) {
        matches.push({ 
            id: `m-${id}-${i}-${j}`, 
            p1Index: i, 
            p2Index: j, 
            s1: '', 
            s2: '', 
            winner: null,
            subMatches: [] 
        });
      }
    }
    return { id, name, players, matches };
};

// 計算循環賽積分
const calculateGroupStandings = (group: any) => {
  const standings = group.players.map((p: any) => ({ ...p, played: 0, won: 0, lost: 0, draw: 0, netSets: 0, setRatio: 0 }));
  group.matches.forEach((m: any) => {
    const s1 = m.s1 === '' ? -1 : parseInt(m.s1); 
    const s2 = m.s2 === '' ? -1 : parseInt(m.s2);
    if (s1 !== -1 && s2 !== -1) {
      const p1 = standings[m.p1Index];
      const p2 = standings[m.p2Index];
      p1.played++; p2.played++;
      
      p1.netSets += (s1 - s2);
      p2.netSets += (s2 - s1);

      p1.totalWonPoints = (p1.totalWonPoints || 0) + s1;
      p1.totalLostPoints = (p1.totalLostPoints || 0) + s2;
      p2.totalWonPoints = (p2.totalWonPoints || 0) + s2;
      p2.totalLostPoints = (p2.totalLostPoints || 0) + s1;

      if (s1 > s2) { p1.won++; p2.lost++; }
      else if (s2 > s1) { p2.won++; p1.lost++; }
      else { p1.draw++; p2.draw++; }
    }
  });

  standings.forEach((p: any) => {
      if (p.totalLostPoints && p.totalLostPoints > 0) {
          p.setRatio = (p.totalWonPoints / p.totalLostPoints).toFixed(2);
      } else if (p.totalWonPoints > 0) {
          p.setRatio = "MAX";
      } else {
          p.setRatio = "-";
      }
  });

  return standings.sort((a: any, b: any) => {
    if (b.won !== a.won) return b.won - a.won;
    if (b.netSets !== a.netSets) return b.netSets - a.netSets;
    if (b.setRatio !== a.setRatio) {
        if(b.setRatio === "MAX") return 1;
        if(a.setRatio === "MAX") return -1;
        const ratioA = parseFloat(a.setRatio === "-" ? 0 : a.setRatio);
        const ratioB = parseFloat(b.setRatio === "-" ? 0 : b.setRatio);
        return ratioB - ratioA;
    }
    return 0;
  });
};

const TournamentManager = () => {
  const [projectTitle, setProjectTitle] = useState("我的賽事專案");
  const [isClient, setIsClient] = useState(false);
  
  // 核心專案資料
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
  
  // 循環賽 Drill-down 狀態
  const [activeRrGroupIndex, setActiveRrGroupIndex] = useState<number | null>(null);

  const [confirmState, setConfirmState] = useState<{isOpen: boolean, message: string, onConfirm: any}>({ isOpen: false, message: '', onConfirm: null });
  const [toast, setToast] = useState<string | null>(null);
  
  const [matchModalData, setMatchModalData] = useState<any>(null);
  
  // 存檔與讀取狀態
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);

  // 新增賽事按鈕選單狀態 (使用 Modal 控制，這裡改為 isAddModalOpen)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 切換賽事時，重置循環賽選中組別
  useEffect(() => {
      setActiveRrGroupIndex(null);
  }, [activeTournamentId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- 專案邏輯 ---

  const addTournament = (type: TournamentType) => {
      const id = Date.now().toString();
      const count = tournaments.filter(t => t.type === type).length + 1;
      const name = type === 'elimination' ? `淘汰賽 ${count}` : `循環賽 ${String.fromCharCode(65 + count - 1)}`;
      
      let newTournament: Tournament;

      if (type === 'elimination') {
          newTournament = {
              id,
              name,
              type,
              config: {
                  winCondition: 2,
                  elimType: 'single',
                  elimPointsCount: 3,
                  pointsCount: 1 // unused
              },
              data: generateInitialBracket(8)
          };
      } else {
          // 循環賽：初始化包含一個預設組別
          newTournament = {
              id,
              name,
              type,
              config: {
                  winCondition: 2,
                  pointsCount: 5,
                  elimType: 'single', // unused
                  elimPointsCount: 3, // unused
                  rrSize: 3
              },
              data: { groups: [createSingleGroup('A 組', 3)] }
          };
      }

      setTournaments([...tournaments, newTournament]);
      setActiveTournamentId(id);
      setIsAddModalOpen(false); // Close Modal
  };

  const deleteTournament = (e: any, id: string) => {
      e.stopPropagation();
      setConfirmState({
          isOpen: true, 
          message: "確定要刪除這個賽事嗎？此操作無法復原。",
          onConfirm: () => {
            const newTournaments = tournaments.filter(t => t.id !== id);
            setTournaments(newTournaments);
            if (activeTournamentId === id) {
                setActiveTournamentId(newTournaments.length > 0 ? newTournaments[0].id : null);
            }
            setConfirmState({ isOpen: false, message: '', onConfirm: null });
          }
      });
  };

  const updateTournamentConfig = (id: string, key: keyof TournamentConfig, value: any) => {
      setTournaments(prev => prev.map(t => {
          if (t.id === id) {
              const newConfig = { ...t.config, [key]: value };
              return { ...t, config: newConfig };
          }
          return t;
      }));
  };

  const handleElimResize = (id: string, size: number) => {
      setConfirmState({
        isOpen: true, 
        message: "調整參賽人數將會重置此淘汰賽的所有比分。確定要繼續嗎？",
        onConfirm: () => {
            setTournaments(prev => prev.map(t => {
                if (t.id === id) {
                    return { ...t, data: generateInitialBracket(size) };
                }
                return t;
            }));
            setConfirmState({ isOpen: false, message: '', onConfirm: null });
        }
      });
  };

  // 循環賽設定調整：這會影響「新增組別」時的預設人數
  const handleRrConfigChange = (id: string, key: keyof TournamentConfig, value: any) => {
     updateTournamentConfig(id, key, value);
  };

  // --- 循環賽多組別管理 ---

  const addRrGroup = (tournamentId: string) => {
      setTournaments(prev => prev.map(t => {
          if (t.id !== tournamentId) return t;
          const currentGroups = t.data.groups;
          const nextLetter = String.fromCharCode(65 + currentGroups.length);
          const newGroup = createSingleGroup(`${nextLetter} 組`, t.config.rrSize || 3);
          return { ...t, data: { ...t.data, groups: [...currentGroups, newGroup] } };
      }));
  };

  const deleteRrGroup = (e: any, tournamentId: string, groupIndex: number) => {
      e.stopPropagation(); // 阻止點擊事件冒泡，避免進入詳情頁
      setConfirmState({
          isOpen: true, 
          message: "確定要刪除此分組嗎？此操作無法復原。",
          onConfirm: () => {
            setTournaments(prev => prev.map(t => {
                if (t.id !== tournamentId) return t;
                const newGroups = t.data.groups.filter((_: any, idx: number) => idx !== groupIndex);
                return { ...t, data: { ...t.data, groups: newGroups } };
            }));
            if (activeRrGroupIndex === groupIndex) {
                setActiveRrGroupIndex(null);
            } else if (activeRrGroupIndex !== null && activeRrGroupIndex > groupIndex) {
                 setActiveRrGroupIndex(activeRrGroupIndex - 1);
            }
            setConfirmState({ isOpen: false, message: '', onConfirm: null });
          }
      });
  };

  // --- 存檔/讀取 ---

  const handleSaveClick = () => {
      setIsSaveModalOpen(true);
  };

  const confirmSave = (saveName: string) => {
      const timestamp = new Date().toLocaleString();
      const newData = {
          saveName, // 為了相容舊結構
          projectTitle: saveName, 
          timestamp,
          tournaments 
      };

      const existingSavesStr = localStorage.getItem('tournament_saves');
      let saves = existingSavesStr ? JSON.parse(existingSavesStr) : [];
      
      const existingIndex = saves.findIndex((s: any) => s.projectTitle === saveName || s.saveName === saveName);
      if (existingIndex !== -1) {
          saves[existingIndex] = newData;
      } else {
          saves.unshift(newData);
      }
      
      localStorage.setItem('tournament_saves', JSON.stringify(saves));
      setProjectTitle(saveName);
      setIsSaveModalOpen(false);
      showToast(`✅ 專案已儲存：${saveName}`);
  };

  const handleLoadClick = () => {
      try {
        const existingSavesStr = localStorage.getItem('tournament_saves');
        let saves = existingSavesStr ? JSON.parse(existingSavesStr) : [];
        
        // --- 檢查是否有舊版 Legacy 備份 ---
        const legacyBackup = localStorage.getItem('tournament_backup');
        if (legacyBackup) {
            try {
                const legacyData = JSON.parse(legacyBackup);
                // 將其包裝成一個可讀取的選項，但不直接存入 saves，除非使用者重新存檔
                saves.push({
                    saveName: "自動備份 (舊版)",
                    projectTitle: "自動備份 (舊版)",
                    timestamp: legacyData.timestamp || "Unknown Date",
                    isLegacyBackup: true,
                    ...legacyData // Spread legacy props directly
                });
            } catch(e) {
                console.warn("Legacy backup found but corrupted");
            }
        }

        setSavedFiles(saves);
        setIsLoadModalOpen(true);
      } catch (e) {
        showToast("⚠️ 讀取存檔列表失敗");
        setSavedFiles([]);
      }
  };

  const confirmLoad = (saveData: any) => {
      if(window.confirm(`確定要讀取專案「${saveData.projectTitle || saveData.saveName}」嗎？目前的未儲存進度將會遺失。`)) {
        try {
            let migratedTournaments: Tournament[] = [];

            // 1. 舊版單一檔案格式 (Single File Format, often found in 'tournament_backup')
            if (!saveData.tournaments && (saveData.mode || saveData.bracket || saveData.rrGroups)) {
                 const id = Date.now().toString();
                 let convertedTournament: Tournament;
                 if (saveData.mode === 'elimination' || (saveData.bracket && !saveData.rrGroups)) {
                     convertedTournament = {
                         id, name: '淘汰賽', type: 'elimination',
                         config: {
                             winCondition: saveData.winCondition || 2,
                             elimType: saveData.elimType || 'single',
                             elimPointsCount: saveData.elimPointsCount || 3,
                             pointsCount: 1
                         },
                         data: saveData.bracket || generateInitialBracket(8)
                     };
                 } else {
                     // 舊版循環賽遷移：將單一 group 轉換為 groups 陣列
                     const group = saveData.rrGroups && saveData.rrGroups.length > 0 ? saveData.rrGroups[0] : createSingleGroup("循環賽", 3);
                     convertedTournament = {
                        id, name: group.name || "循環賽", type: 'roundRobin',
                        config: {
                            winCondition: saveData.winCondition || 2,
                            pointsCount: group.pointsCount || 5,
                            elimType: 'single', elimPointsCount: 3, rrSize: group.players ? group.players.length : 3
                        },
                        data: { groups: [group] }
                     };
                 }
                 migratedTournaments = [convertedTournament];
            } 
            // 2. 新版專案格式 (Project Format)
            else if (Array.isArray(saveData.tournaments)) {
                migratedTournaments = saveData.tournaments.map((t: any) => {
                    // 檢查是否需要遷移舊版 RoundRobin 結構 (data.groups vs data as Group)
                    if (t.type === 'roundRobin') {
                         // 如果是舊的單一組別格式，轉換為 { groups: [] }
                        if (!t.data.groups && (t.data as any).players) {
                            return { ...t, data: { groups: [t.data] } };
                        }
                    }
                    return t;
                });
            }

            if (migratedTournaments.length === 0) {
                 showToast("⚠️ 檔案內容為空或格式無法識別");
                 return;
            }

            setTournaments(migratedTournaments);
            setActiveTournamentId(migratedTournaments[0].id);
            setProjectTitle(saveData.projectTitle || saveData.title || saveData.saveName || "未命名專案");
            
            setIsLoadModalOpen(false);
            showToast(`📂 已讀取專案`);
        } catch (error) {
            console.error("Load Error:", error);
            showToast("❌ 讀取失敗：檔案可能已損毀");
        }
      }
  };

  const handleDeleteSave = (index: number) => {
      if(window.confirm("確定要刪除這個存檔嗎？")) {
          const newSaves = [...savedFiles];
          newSaves.splice(index, 1);
          setSavedFiles(newSaves);
          // Only sync real saves to storage, exclude legacy injection
          const realSaves = newSaves.filter(s => !s.isLegacyBackup);
          localStorage.setItem('tournament_saves', JSON.stringify(realSaves));
      }
  };

  // --- 資料更新處理 (Propagate Updates) ---

  const handleNameChange = (tournamentId: string, roundIndex: number, matchIndex: number, field: string, newName: string) => {
    setTournaments(prev => prev.map(t => {
        if (t.id !== tournamentId) return t;
        const newBracket = JSON.parse(JSON.stringify(t.data)); // Deep copy
        newBracket[roundIndex][matchIndex][field] = newName;
        propagateUpdates(newBracket, roundIndex, matchIndex, t.config.elimType);
        return { ...t, data: newBracket };
    }));
  };

  const handleElimScoreChange = (tournamentId: string, roundIndex: number, matchIndex: number, scoreKey: string, newScore: string) => {
    setTournaments(prev => prev.map(t => {
        if (t.id !== tournamentId) return t;
        const newBracket = JSON.parse(JSON.stringify(t.data));
        const match = newBracket[roundIndex][matchIndex];
        match[scoreKey] = newScore;
        
        const s1 = match.s1 === '' ? -1 : parseInt(match.s1);
        const s2 = match.s2 === '' ? -1 : parseInt(match.s2);
        let winnerIndex = null;

        if (s1 !== -1 && s2 !== -1) {
            if (s1 > s2) winnerIndex = 0;
            else if (s2 > s1) winnerIndex = 1;
        }
        match.winner = winnerIndex;
        
        updateWinnerNames(newBracket, roundIndex, matchIndex, t.config.elimType);
        propagateUpdates(newBracket, roundIndex, matchIndex, t.config.elimType);

        return { ...t, data: newBracket };
    }));
  };
  
  const updateWinnerNames = (bracket: any[], rIdx: number, mIdx: number, elimType: MatchType) => {
       const match = bracket[rIdx][mIdx];
       let winnerName = null;
       let winnerPartner = null;
       
       if (match.winner === 0) { winnerName = match.p1; winnerPartner = match.p1Partner; }
       else if (match.winner === 1) { winnerName = match.p2; winnerPartner = match.p2Partner; }
       
       const nextRoundIndex = rIdx + 1;
       if (nextRoundIndex < bracket.length) {
          if (bracket[nextRoundIndex][0].isChampion) {
              bracket[nextRoundIndex][0].winnerName = winnerName || "待定冠軍";
              if (elimType === 'double') bracket[nextRoundIndex][0].winnerPartner = winnerPartner;
          } else {
              const nextMatchIndex = Math.floor(mIdx / 2);
              const playerSlot = mIdx % 2 === 0 ? 'p1' : 'p2';
              const partnerSlot = mIdx % 2 === 0 ? 'p1Partner' : 'p2Partner';
              bracket[nextRoundIndex][nextMatchIndex][playerSlot] = winnerName;
              if (elimType === 'double') bracket[nextRoundIndex][nextMatchIndex][partnerSlot] = winnerPartner;
          }
       }
  };

  const propagateUpdates = (currentBracket: any[], rIdx: number, mIdx: number, elimType: MatchType) => {
     if (rIdx >= currentBracket.length - 1) return;
     updateWinnerNames(currentBracket, rIdx, mIdx, elimType);
     
     const nextRoundIndex = rIdx + 1;
     // simple propagation
  };

  const handleElimDetailSave = (tournamentId: string, matchId: string, subMatches: any[], totalS1: number, totalS2: number) => {
      setTournaments(prev => prev.map(t => {
          if (t.id !== tournamentId) return t;
          const newBracket = JSON.parse(JSON.stringify(t.data));
          
          let found = false;
          for(let r = 0; r < newBracket.length - 1; r++) {
              const matchIndex = newBracket[r].findIndex((m: any) => m.id === matchId);
              if (matchIndex !== -1) {
                  const match = newBracket[r][matchIndex];
                  match.subMatches = subMatches;
                  match.s1 = totalS1;
                  match.s2 = totalS2;
                  
                  if (t.config.elimType !== 'team' && subMatches.length > 0) {
                      const sub = subMatches[0];
                      if (sub.p1SubName) match.p1 = sub.p1SubName;
                      if (sub.p2SubName) match.p2 = sub.p2SubName;
                      if (t.config.elimType === 'double') {
                          if (sub.p1PartnerName) match.p1Partner = sub.p1PartnerName;
                          if (sub.p2PartnerName) match.p2Partner = sub.p2PartnerName;
                      }
                  }

                  if (totalS1 > totalS2) match.winner = 0;
                  else if (totalS2 > totalS1) match.winner = 1;
                  else match.winner = null;

                  updateWinnerNames(newBracket, r, matchIndex, t.config.elimType);
                  propagateUpdates(newBracket, r, matchIndex, t.config.elimType);
                  found = true;
                  break;
              }
          }
          if (!found) return t;
          return { ...t, data: newBracket };
      }));
  };

  // --- 循環賽更新 (支援 groupIndex) ---
  
  const handleRrNameChange = (tournamentId: string, groupIndex: number, playerIndex: number, newName: string) => {
      setTournaments(prev => prev.map(t => {
          if (t.id !== tournamentId) return t;
          const newGroups = [...t.data.groups];
          newGroups[groupIndex].players[playerIndex].name = newName;
          return { ...t, data: { ...t.data, groups: newGroups } };
      }));
  };

  const handleRrScoreChange = (tournamentId: string, groupIndex: number, matchId: string, scoreKey: string, newScore: string) => {
      setTournaments(prev => prev.map(t => {
          if (t.id !== tournamentId) return t;
          const newGroups = [...t.data.groups];
          const group = newGroups[groupIndex];
          const match = group.matches.find((m: any) => m.id === matchId);
          if (match) {
              match[scoreKey] = newScore;
              const s1 = match.s1 === '' ? -1 : parseInt(match.s1);
              const s2 = match.s2 === '' ? -1 : parseInt(match.s2);
              if (s1 !== -1 && s2 !== -1) {
                  if (s1 > s2) match.winner = 0; else if (s2 > s1) match.winner = 1; else match.winner = -1;
              } else { match.winner = null; }
          }
          return { ...t, data: { ...t.data, groups: newGroups } };
      }));
  };

  const handleRrDetailSave = (tournamentId: string, matchId: string, subMatches: any[], totalS1: number, totalS2: number) => {
      setTournaments(prev => prev.map(t => {
          if (t.id !== tournamentId) return t;
          const newGroups = [...t.data.groups];
          // Find which group contains this match
          for (let i = 0; i < newGroups.length; i++) {
              const match = newGroups[i].matches.find((m: any) => m.id === matchId);
              if (match) {
                  match.subMatches = subMatches;
                  match.s1 = totalS1;
                  match.s2 = totalS2;
                  if (totalS1 > totalS2) match.winner = 0;
                  else if (totalS2 > totalS1) match.winner = 1;
                  else match.winner = -1;
                  break;
              }
          }
          return { ...t, data: { ...t.data, groups: newGroups } };
      }));
  };

  const handleDetailSave = (matchId: string, subMatches: any[], totalS1: number, totalS2: number) => {
      const activeT = tournaments.find(t => t.id === activeTournamentId);
      if (!activeT) return;

      if (activeT.type === 'elimination') {
          handleElimDetailSave(activeT.id, matchId, subMatches, totalS1, totalS2);
      } else {
          // 對於循環賽，我們需要知道目前操作的是哪個組別
          // 這裡簡化處理：因為 matchId 是唯一的，所以我們會遍歷所有組別
          handleRrDetailSave(activeT.id, matchId, subMatches, totalS1, totalS2);
      }
  };

  const activeTournament = tournaments.find(t => t.id === activeTournamentId);
  // Restore larger height for match card (140/120 was scaled, reverting to approx original + some buffer for readability)
  const BASE_MATCH_HEIGHT = activeTournament?.config.elimType === 'double' ? 160 : 140; 

  const closeConfirm = () => { setConfirmState({ isOpen: false, message: '', onConfirm: null }); };

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 selection:bg-blue-200" style={{ fontFamily: '"Inter", "Noto Sans TC", sans-serif' }}>
      
      <ConfirmDialog isOpen={confirmState.isOpen} message={confirmState.message} onConfirm={confirmState.onConfirm} onCancel={closeConfirm} />
      <SaveDialog isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={confirmSave} defaultName={projectTitle} />
      <LoadDialog isOpen={isLoadModalOpen} onClose={() => setIsLoadModalOpen(false)} onLoad={confirmLoad} saves={savedFiles} onDelete={handleDeleteSave} />
      <AddTournamentDialog isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={addTournament} />
      
      {matchModalData && activeTournament && (
          <TeamMatchModal 
            isOpen={true}
            onClose={() => setMatchModalData(null)}
            matchData={matchModalData.match}
            p1Name={matchModalData.p1Name}
            p2Name={matchModalData.p2Name}
            p1PartnerName={matchModalData.p1PartnerName}
            p2PartnerName={matchModalData.p2PartnerName}
            pointsCount={activeTournament.type === 'elimination' ? (activeTournament.config.elimType === 'team' ? activeTournament.config.elimPointsCount : 1) : activeTournament.config.pointsCount} 
            defaultType={activeTournament.config.elimType === 'double' ? 'double' : 'single'}
            winCondition={activeTournament.config.winCondition}
            onSave={handleDetailSave}
          />
      )}

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-full shadow-lg z-[200] animate-in fade-in slide-in-from-bottom-4 print:hidden font-medium border border-gray-700">{toast}</div>}

      {/* --- Header redesign (Scaled up 1.2x) --- */}
      <header className="bg-slate-900 text-slate-200 shadow-md sticky top-0 z-20 print:hidden border-b border-slate-700/50">
        {/* 1. 專案標題與全域功能 (Dark Theme) */}
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl text-white shadow-lg shadow-blue-900/20"><LayoutList size={28} /></div>
                <div className="flex flex-col">
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-0.5">Project Name</span>
                    <div className="flex items-center gap-2 group">
                        <input 
                            type="text" 
                            value={projectTitle} 
                            onChange={(e) => setProjectTitle(e.target.value)} 
                            className="text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:ring-0 w-56 sm:w-72 transition-all outline-none pb-0.5 placeholder-slate-600"
                            placeholder="輸入專案名稱..."
                        />
                        <PenLine size={18} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={handleSaveClick} className="flex items-center gap-2.5 px-5 py-2.5 text-base font-medium bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg transition-all border border-slate-700/50 hover:border-slate-600" title="儲存專案"><Save size={22} /> <span className="hidden sm:inline">儲存</span></button>
                <button onClick={handleLoadClick} className="flex items-center gap-2.5 px-5 py-2.5 text-base font-medium bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg transition-all border border-slate-700/50 hover:border-slate-600" title="讀取專案"><FileDown size={22} /> <span className="hidden sm:inline">讀取</span></button>
                <div className="h-8 w-px bg-slate-700 mx-1"></div>
                <button onClick={() => window.print()} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors" title="匯出 PDF"><Download size={24} /></button>
            </div>
        </div>

        {/* 2. 比賽分頁 (Tabs - Dark Theme) - 高度調整 (0.9x: py-4 -> py-3) */}
        <div className="bg-slate-950/30 backdrop-blur-sm border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-5 pt-1.5 flex gap-3 items-center overflow-x-auto hide-scrollbar pb-0">
                {tournaments.map((t) => (
                    <div 
                        key={t.id}
                        onClick={() => setActiveTournamentId(t.id)}
                        className={`group relative flex items-center gap-3 px-6 py-3 rounded-t-lg text-base font-bold cursor-pointer transition-all border-t shrink-0 select-none
                            ${activeTournamentId === t.id 
                                ? 'bg-slate-800 text-white border-t-4 border-t-blue-500 border-x border-x-transparent z-10' 
                                : 'bg-transparent text-slate-400 border-t-transparent border-x-transparent hover:text-slate-200 hover:bg-slate-800/50'}`}
                    >
                        {t.type === 'elimination' ? <GitMerge size={20} /> : <Grid size={20} />}
                        {t.name}
                        {activeTournamentId === t.id && (
                             <button 
                                onClick={(e) => deleteTournament(e, t.id)}
                                className="ml-3 bg-white/20 text-white hover:bg-red-600 hover:text-white rounded-full p-1 transition-all shadow-sm flex items-center justify-center"
                                title="刪除此賽事"
                             >
                                <X size={14} strokeWidth={3} />
                             </button>
                        )}
                        {/* Tab Active Bottom Mask is removed as requested by style clean up */}
                    </div>
                ))}
                
                {/* 統一的「新增賽事」按鈕 (放大 1.1x) - 改為開啟 Modal */}
                <div className="relative ml-2 py-2 mb-1 z-50">
                     <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-lg hover:shadow-blue-500/30 transform scale-110 font-bold border border-blue-400"
                     >
                        <Plus size={18} /> 新增賽事
                     </button>
                </div>
            </div>
        </div>
      </header>

      {/* 3. 情境式工具列 (Light Sub-header) - 改為純白背景 */}
      {activeTournament && (
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-[136px] z-10 print:hidden">
                <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar py-1">
                        {/* 比賽名稱編輯 */}
                        <div className="flex items-center gap-3 pr-6 border-r border-gray-200">
                            <div className={`p-2 rounded-md ${activeTournament.type === 'elimination' ? 'bg-purple-100 text-purple-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                {activeTournament.type === 'elimination' ? <GitMerge size={20} /> : <Grid size={20} />}
                            </div>
                            <input 
                                value={activeTournament.name}
                                onChange={(e) => setTournaments(prev => prev.map(t => t.id === activeTournament.id ? { ...t, name: e.target.value } : t))}
                                className="bg-transparent border-none text-lg font-bold text-gray-800 focus:ring-0 w-40 focus:bg-gray-50 rounded transition-colors"
                            />
                        </div>

                        {/* 設定控制項群組 */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-white hover:shadow-sm px-3 py-2 rounded-lg border border-gray-200 transition-all">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">賽制</span>
                                <select 
                                    value={activeTournament.config.winCondition} 
                                    onChange={(e) => updateTournamentConfig(activeTournament.id, 'winCondition', parseInt(e.target.value))}
                                    className="bg-transparent border-none text-base font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-1"
                                >
                                    <option value={0}>一局決勝</option>
                                    <option value={2}>三戰兩勝</option>
                                    <option value={3}>五戰三勝</option>
                                    <option value={4}>七戰四勝</option>
                                </select>
                            </div>

                            {/* 淘汰賽專屬設定 */}
                            {activeTournament.type === 'elimination' && (
                                <>
                                    <div className="flex items-center gap-2 bg-white hover:shadow-sm px-3 py-2 rounded-lg border border-gray-200 transition-all">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">模式</span>
                                        <select 
                                            value={activeTournament.config.elimType} 
                                            onChange={(e) => updateTournamentConfig(activeTournament.id, 'elimType', e.target.value)}
                                            className="bg-transparent border-none text-base font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-1"
                                        >
                                            <option value="single">單打</option><option value="double">雙打</option><option value="team">團體</option>
                                        </select>
                                    </div>
                                    
                                    {activeTournament.config.elimType === 'team' && (
                                        <div className="flex items-center gap-2 bg-white hover:shadow-sm px-3 py-2 rounded-lg border border-gray-200 transition-all">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">點數</span>
                                            <select 
                                                value={activeTournament.config.elimPointsCount} 
                                                onChange={(e) => updateTournamentConfig(activeTournament.id, 'elimPointsCount', parseInt(e.target.value))}
                                                className="bg-transparent border-none text-base font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-1"
                                            >
                                                <option value={3}>3點</option><option value={5}>5點</option><option value={7}>7點</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 bg-white hover:shadow-sm px-3 py-2 rounded-lg border border-gray-200 transition-all">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">人數</span>
                                        <select 
                                            onChange={(e) => handleElimResize(activeTournament.id, parseInt(e.target.value))}
                                            value={Math.pow(2, Math.log2(activeTournament.data[0].length * 2))}
                                            className="bg-transparent border-none text-base font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-1"
                                        >
                                            <option value={4}>4人</option><option value={8}>8人</option><option value={16}>16人</option><option value={32}>32人</option>
                                            <option value={64}>64人</option><option value={128}>128人</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* 循環賽專屬設定 */}
                            {activeTournament.type === 'roundRobin' && (
                                <>
                                    <div className="flex items-center gap-2 bg-white hover:shadow-sm px-3 py-2 rounded-lg border border-gray-200 transition-all">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">點數</span>
                                        <select 
                                            value={activeTournament.config.pointsCount} 
                                            onChange={(e) => updateTournamentConfig(activeTournament.id, 'pointsCount', parseInt(e.target.value))}
                                            className="bg-transparent border-none text-base font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-1"
                                        >
                                            <option value={1}>單點</option><option value={3}>3點制</option><option value={5}>5點制</option>
                                        </select>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200 mx-1"></div>
                                    <button 
                                        onClick={() => addRrGroup(activeTournament.id)}
                                        className="flex items-center gap-1 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-bold transition-colors border border-blue-200 shadow-sm"
                                    >
                                        <PlusCircle size={18} /> 新增組別
                                    </button>
                                    <div className="flex items-center gap-2 bg-white hover:shadow-sm px-3 py-2 rounded-lg border border-gray-200 transition-all">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">人數</span>
                                        <select 
                                            value={activeTournament.config.rrSize || 3}
                                            onChange={(e) => handleRrConfigChange(activeTournament.id, 'rrSize', parseInt(e.target.value))}
                                            className="bg-transparent border-none text-base font-bold text-gray-900 focus:ring-0 cursor-pointer py-0 pl-1"
                                        >
                                            <option value={3}>3人</option><option value={4}>4人</option><option value={5}>5人</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <button className="lg:hidden p-2 text-gray-400">
                        <MoreVertical size={24} />
                    </button>
                </div>
            </div>
        )}

      {/* 列印時顯示標題 - 修正樣式以配合第一頁顯示規則 */}
      <div className="hidden print:block text-center p-4 print-title">
        <h1 className="text-3xl font-bold">{projectTitle}</h1>
        {activeTournament && <h2 className="text-xl text-gray-600">{activeTournament.name}</h2>}
      </div>

      <main ref={contentRef} className="p-4 overflow-x-auto min-h-[500px] bg-gray-50 print:bg-white print:overflow-visible print:min-h-0 print:w-auto print:block">
        {!activeTournament ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-8 rounded-full shadow-sm mb-6">
                    <Trophy size={64} className="text-gray-200" />
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">開始管理您的賽事</h2>
                <p className="text-gray-500 mb-8">請選擇上方頁籤或建立一個新的賽程</p>
                <div className="relative z-0">
                     <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-xl hover:shadow-blue-500/30 transform hover:scale-105 font-bold text-lg"
                     >
                        <Plus size={24} /> 新增賽事
                     </button>
                </div>
            </div>
        ) : activeTournament.type === 'elimination' ? (
          // --- 淘汰賽視圖 ---
          // 加入 className="bracket-container" 以便 CSS @media print 針對性控制
          <div 
            className="bracket-container flex gap-12 min-w-max mx-auto px-4 pb-12 pt-12 justify-start items-stretch print:p-0 print:gap-4"
            style={{ minHeight: `${BASE_MATCH_HEIGHT * ((activeTournament.data[0].length * 2)/2)}px` }} 
          >
            {activeTournament.data.map((round: any, rIndex: number) => {
              const isChampionRound = rIndex === activeTournament.data.length - 1;
              const matches = round;
              
              if (isChampionRound) {
                  return (
                    <div key="champ" className="bracket-round-column flex flex-col justify-center items-center relative min-w-[240px] break-inside-avoid">
                        <div className="absolute -top-10 w-full text-center text-lg font-bold text-gray-400">最終冠軍</div>
                        <div className="bg-gradient-to-br from-yellow-50 to-white border-4 border-yellow-400 rounded-xl p-4 text-center shadow-xl w-60 transform scale-90">
                            <Trophy size={36} className="mx-auto text-yellow-500 mb-2" />
                            <div className="text-[10px] text-yellow-600 font-bold uppercase mb-0.5">WINNER</div>
                            <div className="text-lg font-bold text-gray-900 break-words flex flex-col items-center leading-tight">
                                <span>{matches[0].winnerName}</span>
                                {activeTournament.config.elimType === 'double' && matches[0].winnerPartner && (
                                    <span className="text-sm text-gray-600 mt-0.5">{matches[0].winnerPartner}</span>
                                )}
                            </div>
                        </div>
                    </div>
                  );
              }

              const currentMatchHeight = BASE_MATCH_HEIGHT * Math.pow(2, rIndex);

              return (
                <div key={rIndex} className="bracket-round-column flex flex-col relative min-w-[260px] break-inside-avoid">
                  {/* 輪次標籤放大1.5倍並調整位置 */}
                  <div className="absolute -top-10 left-0 w-full text-center text-lg font-bold text-gray-500 bg-gray-100/50 rounded-full py-1">
                    {rIndex === activeTournament.data.length - 2 ? '總決賽' : rIndex === activeTournament.data.length - 3 ? '準決賽' : `第 ${rIndex + 1} 輪`}
                  </div>

                  <div className="flex flex-col flex-1 justify-around"> 
                    {matches.map((match: any, mIndex: number) => (
                        <div 
                            key={match.id} 
                            className="flex flex-col justify-center items-center relative"
                            style={{ height: `${currentMatchHeight}px` }} 
                        >
                            <MatchCard 
                                match={match} 
                                roundIndex={rIndex} 
                                rIndex={rIndex} 
                                onNameChange={(r: number, m: number, f: string, v: string) => handleNameChange(activeTournament.id, r, m, f, v)}
                                onScoreChange={(r: number, m: number, k: string, v: string) => handleElimScoreChange(activeTournament.id, r, m, k, v)} 
                                winCondition={activeTournament.config.winCondition} 
                                elimType={activeTournament.config.elimType}
                                onEditClick={(m: any) => setMatchModalData({ 
                                    match: m, 
                                    p1Name: m.p1 || "選手1", 
                                    p2Name: m.p2 || "選手2",
                                    p1PartnerName: m.p1Partner,
                                    p2PartnerName: m.p2Partner
                                })}
                            />

                            {/* 連接線 */}
                            {rIndex < activeTournament.data.length - 2 && (
                                <>
                                    {mIndex % 2 === 0 && (
                                        <div className="absolute right-[-1.5rem] top-1/2 w-6 border-r-2 border-t-2 border-gray-300 rounded-tr-md pointer-events-none" style={{ height: `${currentMatchHeight / 2}px` }}>
                                            <div className="absolute -bottom-[2px] -right-6 w-6 h-[2px] bg-gray-300"></div>
                                        </div>
                                    )}
                                    {mIndex % 2 !== 0 && (
                                        <div className="absolute right-[-1.5rem] bottom-1/2 w-6 border-r-2 border-b-2 border-gray-300 rounded-br-md pointer-events-none" style={{ height: `${currentMatchHeight / 2}px` }}></div>
                                    )}
                                </>
                            )}
                            
                            {/* 總決賽連接線 */}
                            {rIndex === activeTournament.data.length - 2 && (
                                <div className="absolute right-[-1.5rem] top-1/2 -translate-y-1/2 w-6 h-0 pointer-events-none">
                                    <div className="absolute top-0 right-0 w-full h-0.5 bg-gray-300"></div>
                                </div>
                            )}
                        </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // --- 循環賽視圖 (Multi-Group Drill-down) ---
          <div className="max-w-6xl mx-auto min-h-[60vh]">
             {activeRrGroupIndex === null ? (
                // 1. Overview Grid
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-300">
                    {activeTournament.data.groups.map((group: RRGroup, groupIndex: number) => (
                        <div 
                            key={group.id} 
                            onClick={() => setActiveRrGroupIndex(groupIndex)}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group relative flex flex-col"
                        >
                             <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                                {/* Simplified Group Name: Just the Letter */}
                                <h3 className="font-black text-4xl text-gray-800 flex items-center justify-center w-full">
                                    {String.fromCharCode(65 + groupIndex)}
                                </h3>
                                <button 
                                    onClick={(e) => deleteRrGroup(e, activeTournament.id, groupIndex)}
                                    className="absolute top-4 right-4 text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                    title="刪除組別"
                                >
                                    <Trash2 size={20} />
                                </button>
                             </div>
                             
                             <div className="flex-1 flex items-center justify-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200 overflow-hidden">
                                 {/* Enlarged Polygon Preview (1.5x) */}
                                 <div className="w-full h-full max-w-[320px] max-h-[320px] pointer-events-none transform scale-[1.4]">
                                     <RoundRobinPolygon group={group} />
                                 </div>
                             </div>
                        </div>
                    ))}
                    
                    {/* Empty State / Add Button Card */}
                    {activeTournament.data.groups.length === 0 && (
                        <button 
                            onClick={() => addRrGroup(activeTournament.id)}
                            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all min-h-[300px]"
                        >
                            <PlusCircle size={48} className="mb-4" />
                            <span className="font-bold text-lg">新增第一個組別</span>
                        </button>
                    )}
                </div>
             ) : (
                // 2. Detail View
                <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                     <button 
                        onClick={() => setActiveRrGroupIndex(null)}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:border-gray-300"
                     >
                         <ArrowLeft size={20} /> 返回分組列表
                     </button>
                     
                     {/* Detail Content */}
                     {(() => {
                         const group = activeTournament.data.groups[activeRrGroupIndex];
                         const groupIndex = activeRrGroupIndex;
                         if (!group) return <div>找不到該組別</div>;

                         return (
                            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">{String.fromCharCode(65 + groupIndex)}組 詳細戰況</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-1">
                                    {/* 1. 積分榜 */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 order-2 lg:order-1 break-inside-avoid">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Trophy size={20} className="text-yellow-500" />積分榜</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-base text-left">
                                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-3 py-3 w-12">排名</th>
                                                        <th className="px-3 py-3 w-1/4">隊伍</th>
                                                        <th className="px-3 py-3 text-center">賽</th>
                                                        <th className="px-3 py-3 text-center">勝</th>
                                                        <th className="px-3 py-3 text-center">負</th>
                                                        <th className="px-3 py-3 text-center">淨局</th>
                                                        <th className="px-3 py-3 text-center font-bold text-blue-600">得失局比</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {calculateGroupStandings(group).map((p: any, idx: number) => (
                                                        <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                                                            <td className="px-3 py-3 font-bold text-gray-400">{idx === 0 ? <Trophy size={16} className="text-yellow-400 inline" /> : idx + 1}</td>
                                                            <td className="px-3 py-3 font-medium text-gray-900">
                                                                <input 
                                                                    type="text" 
                                                                    value={p.name} 
                                                                    onChange={(e) => handleRrNameChange(activeTournament.id, groupIndex, group.players.findIndex((pl:any) => pl.id === p.id), e.target.value)}
                                                                    className="bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 w-full p-0 text-base font-medium transition-colors"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-3 text-center">{p.played}</td>
                                                            <td className="px-3 py-3 text-center text-green-600 font-bold">{p.won}</td>
                                                            <td className="px-3 py-3 text-center text-red-400">{p.lost}</td>
                                                            <td className="px-3 py-3 text-center text-gray-500">{p.netSets > 0 ? `+${p.netSets}` : p.netSets}</td>
                                                            <td className="px-3 py-3 text-center font-bold text-blue-600">{p.setRatio}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* 2. 對戰列表 (字體與比分放大1.1倍) */}
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 order-1 lg:order-2 break-inside-avoid">
                                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Grid size={20} className="text-purple-500" />對戰賽程</h3>
                                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {group.matches.map((match: any) => (
                                                <div key={match.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all bg-white">
                                                    <button 
                                                        onClick={() => setMatchModalData({ match, p1Name: group.players[match.p1Index].name, p2Name: group.players[match.p2Index].name })}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors mr-2 print:hidden"
                                                        title="編輯詳細戰況"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    
                                                    {/* 隊伍1 (放大) */}
                                                    <div className={`flex-1 text-right pr-4 font-medium text-base truncate ${match.winner === 0 ? 'text-green-600 font-bold' : 'text-gray-700'}`}>{group.players[match.p1Index].name}</div>
                                                    
                                                    {/* 比分控制 (放大) */}
                                                    <div className="flex items-center gap-2 shrink-0 transform scale-110 origin-center px-2">
                                                        <ScoreControl score={match.s1} onChange={(val: any) => handleRrScoreChange(activeTournament.id, groupIndex, match.id, 's1', val)} colorClass={match.winner === 0 ? 'text-green-600' : ''} variant="small" />
                                                        <span className="text-gray-300 font-bold text-sm">:</span>
                                                        <ScoreControl score={match.s2} onChange={(val: any) => handleRrScoreChange(activeTournament.id, groupIndex, match.id, 's2', val)} colorClass={match.winner === 1 ? 'text-green-600' : ''} variant="small" />
                                                    </div>
                                                    
                                                    {/* 隊伍2 (放大) */}
                                                    <div className={`flex-1 text-left pl-4 font-medium text-base truncate ${match.winner === 1 ? 'text-green-600 font-bold' : 'text-gray-700'}`}>{group.players[match.p2Index].name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* 3. 視覺化圖表 */}
                                    <div className="col-span-1 lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex justify-center break-inside-avoid">
                                        <RoundRobinPolygon group={group} />
                                    </div>
                                </div>
                            </div>
                         );
                     })()}
                </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TournamentManager;