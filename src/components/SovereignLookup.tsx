import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ArrowRightLeft, 
  Plus, 
  Trash2, 
  FileCode, 
  Download, 
  Upload, 
  Info, 
  BookOpen, 
  Sparkles, 
  FileSpreadsheet, 
  RefreshCw, 
  Database,
  ArrowRight,
  Maximize2
} from 'lucide-react';
import { bindTouchTap } from '../utils/touchUtils';

export interface Relation {
  id: string;
  source: string;
  relation: string;
  target: string;
}

interface SovereignLookupProps {
  lang: 'en' | 'zh';
  onClose?: () => void;
}

const PRE_SEEDED_DATASETS: Record<string, { nameZh: string; nameEn: string; data: Omit<Relation, 'id'>[] }> = {
  rpg_cooking: {
    nameZh: '🎮 幻想RPG烹饪配方 (RPG Cooking)',
    nameEn: '🎮 Fantasy Cooking Recipes',
    data: [
      { source: '牛奶蛋糕 (Milk Cake)', relation: '需要 (Requires) x2', target: '小麦 (Wheat)' },
      { source: '牛奶蛋糕 (Milk Cake)', relation: '需要 (Requires) x2', target: '香料调味剂 (Seasoning)' },
      { source: '牛奶蛋糕 (Milk Cake)', relation: '需要 (Requires) x1', target: '甜牛奶 (Sweet Milk)' },
      { source: '麦芽啤酒 (Malt Beer)', relation: '需要 (Requires) x3', target: '小麦 (Wheat)' },
      { source: '麦芽啤酒 (Malt Beer)', relation: '需要 (Requires) x1', target: '纯净泉水 (Spring Water)' },
      { source: '苹果果酱 (Apple Jam)', relation: '需要 (Requires) x4', target: '红苹果 (Red Apple)' },
      { source: '苹果果酱 (Apple Jam)', relation: '需要 (Requires) x2', target: '甘蔗甜糖 (Sugar)' },
      { source: '水果甜馅饼 (Fruit Pie)', relation: '需要 (Requires) x1', target: '苹果果酱 (Apple Jam)' },
      { source: '水果甜馅饼 (Fruit Pie)', relation: '需要 (Requires) x2', target: '小麦 (Wheat)' },
      { source: '香甜热牛奶 (Sweet Milk)', relation: '需要 (Requires) x1', target: '鲜牛奶 (Fresh Milk)' },
      { source: '香甜热牛奶 (Sweet Milk)', relation: '需要 (Requires) x1', target: '甘蔗甜糖 (Sugar)' },
    ]
  },
  minecraft_craft: {
    nameZh: '🧱 极简沙盒工艺图谱 (Minecraft Crafting)',
    nameEn: '🧱 Sandbox Building & Tools',
    data: [
      { source: '钻石剑 (Diamond Sword)', relation: '制作需要 (Crafts with) x2', target: '钻石 (Diamond)' },
      { source: '钻石剑 (Diamond Sword)', relation: '制作需要 (Crafts with) x1', target: '木棍 (Stick)' },
      { source: '钻石胸甲 (Diamond Chestplate)', relation: '制作需要 (Crafts with) x8', target: '钻石 (Diamond)' },
      { source: '工作台 (Crafting Table)', relation: '分解需要 (Planks needed) x4', target: '木板 (Wood Planks)' },
      { source: '木板 (Wood Planks)', relation: '原木加工 (Logs from) x1', target: '橡木原木 (Oak Log)' },
      { source: '木棍 (Stick)', relation: '木板合成 (Planks crafted) x2', target: '木板 (Wood Planks)' },
      { source: '铁镐 (Iron Pickaxe)', relation: '制作需要 (Crafts with) x3', target: '铁锭 (Iron Ingot)' },
      { source: '铁镐 (Iron Pickaxe)', relation: '需要把柄 (Handle of) x2', target: '木棍 (Stick)' },
      { source: '铁锭 (Iron Ingot)', relation: '熔炼需要 (Smelted from) x1', target: '铁矿石 (Iron Ore)' },
      { source: '铁矿石 (Iron Ore)', relation: '开采设备 (Requires) x1', target: '石镐 (Stone Pickaxe)' },
    ]
  }
};

export function SovereignLookup({ lang, onClose }: SovereignLookupProps) {
  const [relations, setRelations] = useState<Relation[]>(() => {
    const saved = localStorage.getItem('sov_lookup_relations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved relations', e);
      }
    }
    // Default seed
    return PRE_SEEDED_DATASETS.rpg_cooking.data.map((item, idx) => ({
      ...item,
      id: `seed_rel_${idx}_${Date.now()}`
    }));
  });

  // Search input
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom manual entry states
  const [newSource, setNewSource] = useState('');
  const [newRelation, setNewRelation] = useState('Requires x1');
  const [newTarget, setNewTarget] = useState('');
  
  // Bulk import string
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'csv' | 'list' | 'md'>('list');
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Save relations locally Whenever updated
  useEffect(() => {
    localStorage.setItem('sov_lookup_relations', JSON.stringify(relations));
  }, [relations]);

  // Clean success/error alerts
  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('');
        setSuccessMsg('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg, successMsg]);

  // Handle adding custom manual relation
  const handleAddRelation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) {
      setErrorMsg(lang === 'zh' ? '源节点和目标节点不能为空！' : 'Source and Target nodes cannot be empty!');
      return;
    }

    const rel: Relation = {
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: newSource.trim(),
      relation: newRelation.trim() || (lang === 'zh' ? '包含' : 'Requires'),
      target: newTarget.trim()
    };

    setRelations(prev => [rel, ...prev]);
    setNewSource('');
    setNewTarget('');
    setSuccessMsg(lang === 'zh' ? '已成功添加一对关联关系！' : 'Relationship added successfully!');
  };

  // Delete a specific relation
  const handleDeleteRelation = (id: string) => {
    setRelations(prev => prev.filter(r => r.id !== id));
  };

  // Clear all data
  const handleClearAll = () => {
    if (window.confirm(lang === 'zh' ? '⚠ 确定要清空目前的配方黄页数据库吗？该操作不可逆。' : '⚠ Are you sure you want to dry-wipe the recipe database? This cannot be undone.')) {
      setRelations([]);
      setSuccessMsg(lang === 'zh' ? '黄页库已彻底清空。' : 'Database wiped successfully.');
    }
  };

  // Import mock seeds
  const handleLoadSeed = (key: string) => {
    const dataset = PRE_SEEDED_DATASETS[key];
    if (!dataset) return;
    
    if (window.confirm(lang === 'zh' ? `确定要载入模板【${dataset.nameZh}】吗？这会覆盖当前的所有已有数据。` : `Load dataset [${dataset.nameEn}]? This will replace your current lookup graph.`)) {
      const seeded = dataset.data.map((item, idx) => ({
        ...item,
        id: `seed_${key}_${idx}_${Date.now()}`
      }));
      setRelations(seeded);
      setSuccessMsg(lang === 'zh' ? '模板数据已加载！' : 'Template loaded successfully!');
    }
  };

  // Bidirectional Lookup Logic (The bidirectional graph search engine!)
  const filteredRelations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return relations;

    return relations.filter(r => {
      const matchesSource = r.source.toLowerCase().includes(query);
      const matchesTarget = r.target.toLowerCase().includes(query);
      const matchesRelation = r.relation.toLowerCase().includes(query);
      return matchesSource || matchesTarget || matchesRelation;
    });
  }, [relations, searchQuery]);

  // Quick stats computed on the fly
  const graphStats = useMemo(() => {
    const uniqueNodes = new Set<string>();
    relations.forEach(r => {
      uniqueNodes.add(r.source);
      uniqueNodes.add(r.target);
    });
    return {
      nodeCount: uniqueNodes.size,
      edgeCount: relations.length
    };
  }, [relations]);

  // Parser: Auto-parsing logic for CSV/TXT/MD
  const handleImportData = () => {
    if (!importText.trim()) {
      setErrorMsg(lang === 'zh' ? '请输入或粘贴任何文本。' : 'Please input some text representation first.');
      return;
    }

    const lines = importText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const parsed: Relation[] = [];
    let count = 0;

    lines.forEach((line) => {
      // 1. Skip separator dividers (Markdown tables)
      if (line.startsWith('|') && (line.includes('---') || line.includes(':---'))) {
        return;
      }

      let src = '';
      let rel = lang === 'zh' ? '包含' : 'Requires';
      let tgt = '';

      // Markdown Table Parser:
      // | Source | Relation | Target |
      if (line.startsWith('|') && line.endsWith('|')) {
        const columns = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (columns.length >= 2) {
          src = columns[0];
          if (columns.length === 2) {
            tgt = columns[1];
          } else {
            rel = columns[1] || rel;
            tgt = columns[2];
          }
        }
      } 
      // CSV parser (comma or semicolon split):
      else if (line.includes(',') || line.includes(';')) {
        const delimiter = line.includes(';') ? ';' : ',';
        const parts = line.split(delimiter).map(p => p.trim());
        if (parts.length >= 2) {
          src = parts[0];
          if (parts.length === 2) {
            tgt = parts[1];
          } else {
            rel = parts[1] || rel;
            tgt = parts[2];
          }
        }
      } 
      // Arrow syntax solver, e.g. "Milk Cake -> Sweet Milk" or "Wheat = Alcohol" or "Milk Cake = wheat + seasoning"
      else if (line.includes('->') || line.includes('─') || line.includes('=')) {
        let separator = '=';
        if (line.includes('->')) separator = '->';
        else if (line.includes('─')) separator = '─';
        
        const sides = line.split(separator).map(s => s.trim());
        if (sides.length === 2) {
          src = sides[0];
          // Check if right side has list e.g. "2 wheat, 2 seasoning" or "+ "
          const rightSide = sides[1];
          // If it has multiple tokens mixed with + or ,
          if (rightSide.includes('+') || rightSide.includes(',')) {
            const splitChar = rightSide.includes('+') ? '+' : ',';
            const items = rightSide.split(splitChar).map(item => item.trim());
            items.forEach(it => {
              // Regex Match quantity (e.g. "2 wheat" or "wheat x2")
              let qty = 'x1';
              let cleanedIt = it;
              const matchesQty = it.match(/^(?:x)?\s*(\d+x?|x\d+)\s+(.+)$/i) || it.match(/^(.+?)\s+(?:x)?\s*(\d+x?|x\d+)$/i);
              if (matchesQty) {
                if (/\d/.test(matchesQty[1])) {
                  qty = `x${matchesQty[1].replace(/x/g, '')}`;
                  cleanedIt = matchesQty[2];
                } else {
                  qty = `x${matchesQty[2].replace(/x/g, '')}`;
                  cleanedIt = matchesQty[1];
                }
              }
              parsed.push({
                id: `import_${Date.now()}_${count++}`,
                source: src,
                relation: lang === 'zh' ? `精选原料: ${qty}` : `Craft component: ${qty}`,
                target: cleanedIt
              });
            });
            return; // Already processed!
          } else {
            tgt = rightSide;
          }
        }
      }
      // Colon text notes list (QuickNote/CheatSheet format like: "Milk Cake: 2 wheat, 2 seasoning")
      else if (line.includes(':')) {
        const parts = line.split(':').map(p => p.trim());
        if (parts.length === 2) {
          src = parts[0];
          const right = parts[1];
          if (right.includes(',') || right.includes('，')) {
            const items = right.split(/,|，/).map(i => i.trim());
            items.forEach(it => {
              parsed.push({
                id: `import_${Date.now()}_${count++}`,
                source: src,
                relation: lang === 'zh' ? '原料' : 'Component',
                target: it
              });
            });
            return;
          } else {
            tgt = right;
          }
        }
      }

      // If safely gathered node data, add relation
      if (src && tgt) {
        // Strip out some markdown list markers if present (e.g. "- Milk Cake" -> "Milk Cake")
        const cleanNode = (n: string) => n.replace(/^[-*+\s\d.]+\s*/, '').trim();
        parsed.push({
          id: `import_${Date.now()}_${count++}`,
          source: cleanNode(src),
          relation: rel,
          target: cleanNode(tgt)
        });
      }
    });

    if (parsed.length === 0) {
      setErrorMsg(lang === 'zh' 
        ? '没有识别出任何合规的关联配方！请检查分割词是否包含冒号、等号或逗号。' 
        : 'Could not resolve any relational patterns. Check format delimiters.'
      );
      return;
    }

    setRelations(prev => [...parsed, ...prev]);
    setSuccessMsg(lang === 'zh' 
      ? `解析导入成功！新增了 ${parsed.length} 条网络关联关系。` 
      : `Imported ${parsed.length} new connections successfully!`
    );
    setImportText('');
    setShowImportPanel(false);
  };

  // Exporters
  const handleExportFile = (format: 'csv' | 'txt' | 'md') => {
    let content = '';
    let filename = `Sovereign_Lookup_${Date.now()}`;

    if (format === 'csv') {
      filename += '.csv';
      content = 'Source Node,Relation Description,Target Node\n';
      relations.forEach(r => {
        // sanitize commas
        const esc = (val: string) => `"${val.replace(/"/g, '""')}"`;
        content += `${esc(r.source)},${esc(r.relation)},${esc(r.target)}\n`;
      });
    } else if (format === 'md') {
      filename += '.md';
      content = `# Sovereign Bidirectional Relation Sheets (主权双向数据图谱)\n\n`;
      content += `| ${lang === 'zh' ? '源节点/实体' : 'Source Entity'} | ${lang === 'zh' ? '关系描述' : 'Relation'} | ${lang === 'zh' ? '目标实体/配项' : 'Target Item'} |\n`;
      content += `| :--- | :--- | :--- |\n`;
      relations.forEach(r => {
        content += `| ${r.source} | ${r.relation} | ${r.target} |\n`;
      });
    } else {
      filename += '.txt';
      relations.forEach(r => {
        content += `${r.source} = [${r.relation}] => ${r.target}\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSuccessMsg(lang === 'zh' ? '文件已生成，离线下载已触发！' : 'Relations exported securely!');
  };

  // Perform quick jump clicking on node tags inside lists (Hop navigation)
  const handleHopNode = (nodeName: string) => {
    setSearchQuery(nodeName);
  };

  return (
    <div id="sovereign-lookup-panel" className="flex flex-col h-full bg-slate-900 text-slate-100 flex-1 relative overflow-hidden font-sans select-none">
      {/* 1. Header status info panel */}
      <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-500 rounded-xl text-slate-900 shadow-md">
            <ArrowRightLeft className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-white uppercase flex items-center gap-1.5">
              {lang === 'zh' ? '主权配方关系倒查黄页' : 'Sovereign Reverse Lookup'}
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-amber-500 font-mono">OFFLINE ENGINE</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {lang === 'zh' 
                ? '双向图谱配方对查引擎 · 本身不上传或保存任何外界网络数据' 
                : 'Bidirectional graph network browser · Encrypted local local storage only'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {onClose && (
            <button 
              {...bindTouchTap(onClose)}
              className="p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 rounded-xl transition font-mono text-xs cursor-pointer min-h-[38px] flex items-center justify-center font-bold px-4"
            >
              ← {lang === 'zh' ? '退出主页' : 'Back Home'}
            </button>
          )}
        </div>
      </div>

      {/* Quick stats floating bar */}
      <div className="bg-slate-920 border-b border-slate-800 px-5 py-2.5 flex flex-wrap justify-between items-center text-xs text-slate-400 flex-shrink-0 gap-2">
        <div className="flex items-center space-x-3 font-mono text-[10px] uppercase">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
            <span>{lang === 'zh' ? '实体节点：' : 'Nodes:'} <strong className="text-white font-black">{graphStats.nodeCount}</strong></span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block"></span>
            <span>{lang === 'zh' ? '双向关联链：' : 'Edges:'} <strong className="text-white font-black">{graphStats.edgeCount}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            {...bindTouchTap(() => handleLoadSeed('rpg_cooking'))}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-all cursor-pointer"
          >
            {lang === 'zh' ? 'RPG烹饪预设' : 'RPG Preset'}
          </button>
          <button
            {...bindTouchTap(() => handleLoadSeed('minecraft_craft'))}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 rounded-lg transition-all cursor-pointer"
          >
            {lang === 'zh' ? '沙盒工艺预设' : 'Minecraft'}
          </button>
          <button
            {...bindTouchTap(handleClearAll)}
            className="px-2 py-1 bg-rose-900/40 border border-rose-800 text-rose-300 hover:bg-rose-800 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
          >
            {lang === 'zh' ? '一键清空' : 'Wipe Clean'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="absolute top-16 left-4 right-4 bg-rose-600/90 text-white font-bold p-3.5 rounded-xl text-center shadow-lg backdrop-blur-xs z-50 animate-bounce duration-300">
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="absolute top-16 left-4 right-4 bg-emerald-600/90 text-white font-bold p-3.5 rounded-xl text-center shadow-lg backdrop-blur-xs z-50 animate-fade-in duration-300">
          ✨ {successMsg}
        </div>
      )}

      {/* Main Core Layout: Split Search Display (left-60%) & Add/Edit Forms (right-40%) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* LEFT SEARCH & SEARCH RESULTS GRID PANEL */}
        <div className="flex-1 flex flex-col p-4 md:p-5 border-r border-slate-800 overflow-hidden h-full">
          
          {/* Reactive search bar component */}
          <div className="relative mb-4 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'zh' 
                ? "输入节点名或关系... (如输入 '小麦' 查看所有需要小麦的配方，或相反)" 
                : "Type keyword to lookup... (e.g. type 'Wheat' to check ingredient relations)"
              }
              className="block w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans text-xs transition duration-150"
            />
            {searchQuery && (
              <button
                {...bindTouchTap(() => setSearchQuery(''))}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 text-xs font-black"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick interactive guide banner */}
          <div className="bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 px-4 py-3 rounded-xl flex gap-3 text-xs text-amber-100 flex-shrink-0 mb-4 transition duration-200">
            <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong>{lang === 'zh' ? '💡 双向倒查法则：' : '💡 Bidirectional Lookup Principle:'}</strong>
              <p className="mt-1 text-slate-400 leading-relaxed text-[11px]">
                {lang === 'zh'
                  ? '配方数据是双向链接的。在下方检索框中搜索“牛奶蛋糕”，可以直接列出它包含的所有原材料。而在搜索中输入“小麦”，系统会智能反转倒查，自动揪出所有把“小麦”当做作料配方制作的上位食物（如蛋糕、啤酒等）！点击卡片中的名字节点可以直接跳转穿梭检索。'
                  : 'Recipe items form a perfect network. Query for "Milk Cake" to find its components. Query "Wheat" to find other delicious dishes that require wheat as ingredients! Click node tags in the cards to crawl recursively.'
                }
              </p>
            </div>
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0 min-w-0">
            {filteredRelations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Database className="w-12 h-12 text-slate-700 mb-3" />
                <p className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  {lang === 'zh' ? '暂无匹配的关联对谱' : 'No relation mappings matched'}
                </p>
                <p className="text-[11px] text-slate-600 mt-1 max-w-sm">
                  {lang === 'zh'
                    ? '没有匹配当前词条！请清空搜索或在右侧手动新增、导入配方关系表格。'
                    : 'Clear your active query filters or import markdown files to seed matching cards.'
                  }
                </p>
                {searchQuery && (
                  <button
                    {...bindTouchTap(() => setSearchQuery(''))}
                    className="mt-3.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition cursor-pointer"
                  >
                    {lang === 'zh' ? '重置搜索框' : 'Reset Search'}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                {filteredRelations.map((rel) => {
                  const isKeywordInSource = searchQuery && rel.source.toLowerCase().includes(searchQuery.toLowerCase());
                  const isKeywordInTarget = searchQuery && rel.target.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  return (
                    <div 
                      key={rel.id} 
                      className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 group shadow-sm"
                    >
                      {/* Diagram connection flow display line */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
                          {/* Source Node Hop Button */}
                          <button
                            {...bindTouchTap(() => handleHopNode(rel.source))}
                            className={`px-2.5 py-1.5 text-xs rounded-lg font-bold transition hover:scale-105 active:scale-95 truncate text-left max-w-full cursor-pointer ${
                              isKeywordInSource 
                                ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400' 
                                : 'bg-slate-850 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-amber-500/20'
                            }`}
                            title={lang === 'zh' ? '点击此节点，检索其下位关联' : 'Jump to look up this node'}
                          >
                            {rel.source}
                          </button>

                          {/* Relationship indicator arrow */}
                          <div className="flex items-center space-x-1 text-slate-500 px-0.5 flex-shrink-0">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>

                          {/* Target Node Hop Button */}
                          <button
                            {...bindTouchTap(() => handleHopNode(rel.target))}
                            className={`px-2.5 py-1.5 text-xs rounded-lg font-bold transition hover:scale-105 active:scale-95 truncate text-left max-w-full cursor-pointer ${
                              isKeywordInTarget 
                                ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400' 
                                : 'bg-slate-850 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 border border-indigo-400/20'
                            }`}
                            title={lang === 'zh' ? '点击此基础原料，反向倒查所有上位产物' : 'Reverse look up this component'}
                          >
                            {rel.target}
                          </button>
                        </div>

                        {/* Delete action button */}
                        <button
                          {...bindTouchTap(() => handleDeleteRelation(rel.id))}
                          className="sm:opacity-0 group-hover:opacity-100 p-1.5 bg-slate-850 border border-slate-800 hover:bg-rose-950 hover:border-rose-800 hover:text-rose-400 text-slate-500 rounded-lg transition-all text-[11px] self-end sm:self-center cursor-pointer"
                          title={lang === 'zh' ? '删除该关联' : 'Delete this mapping'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Connection Label Info */}
                      <div className="mt-3 pt-2.5 border-t border-slate-900 flex justify-between items-center text-[10.5px]">
                        <span className="text-slate-500 font-mono font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {lang === 'zh' ? '关系属性:' : 'Attribute:'} <strong className="text-slate-300 font-mono">{rel.relation}</strong>
                        </span>
                        
                        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest hidden sm:inline">
                          ID: {rel.id.substring(0, 8)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT INPUT PANEL & BULK DATA IMPORTER (right-40%) */}
        <div className="w-full md:w-[350px] lg:w-[390px] p-4 md:p-5 bg-slate-950 border-t md:border-t-0 border-slate-800 flex flex-col justify-between flex-shrink-0 overflow-y-auto">
          
          <div className="space-y-5">
            {/* Action headers tab layout */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xs font-black tracking-wider text-slate-100 uppercase flex items-center space-x-1.5">
                <Plus className="w-4 h-4 text-emerald-500" />
                <span>{lang === 'zh' ? '新增关联配方' : 'Add Entity Link'}</span>
              </h2>

              <button
                {...bindTouchTap(() => setShowImportPanel(!showImportPanel))}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 text-[10.5px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                {lang === 'zh' ? 'TXT/CSV批量导入' : 'Bulk Import'}
              </button>
            </div>

            {/* MANUALLY ADD INPUT PANEL */}
            {!showImportPanel ? (
              <form onSubmit={handleAddRelation} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {lang === 'zh' ? '主件 (上位物品 / 比如: 牛奶蛋糕)' : 'Source Host (e.g. Milk Cake)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder={lang === 'zh' ? "配方制成品名称..." : "E.g. Sweet Butter..."}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {lang === 'zh' ? '关联属性或材料用量 (比如: 需要 x2 或 配方需要)' : 'Relation Value (e.g. Requires x2)'}
                  </label>
                  <input
                    type="text"
                    value={newRelation}
                    onChange={(e) => setNewRelation(e.target.value)}
                    placeholder={lang === 'zh' ? "比如: 需要、合成得到、原料为..." : "e.g. Crafted with..."}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {lang === 'zh' ? '子属件 (原材料 / 比如: 小麦)' : 'Target Ingredient (e.g. Wheat)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder={lang === 'zh' ? "原料或属性值名称..." : "E.g. Fine Sugar..."}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-xl text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-700 min-h-[40px] shadow-sm active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  {lang === 'zh' ? '立即录入本地数据库' : 'Verify and Add Connection'}
                </button>
              </form>
            ) : (
              /* TEXT AREA IMPORTER DRAWER */
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-lg text-[10.5px]">
                  <span className="text-slate-400 font-bold">{lang === 'zh' ? '导入语法格式支持:' : 'Format Support:'}</span>
                  <select 
                    value={importFormat} 
                    onChange={(e) => setImportFormat(e.target.value as any)}
                    className="bg-transparent border-0 outline-none font-bold text-indigo-400 text-[10.5px]"
                  >
                    <option value="list">{lang === 'zh' ? '自适应文稿列表 (QuickNoted)' : 'Quick Lists (: / =)'}</option>
                    <option value="csv">Standard CSV (, / ;)</option>
                    <option value="md">Markdown Table (|)</option>
                  </select>
                </div>

                {/* Parsing Format Explanatory text */}
                <div className="text-[10px] font-mono text-slate-500 bg-slate-900 p-2.5 rounded-lg leading-relaxed">
                  {importFormat === 'csv' && (
                    <p>
                      <strong>Format:</strong> Source,Relation,Target<br/>
                      <strong>Example:</strong><br/>
                      Milk Cake,Requires x2,Wheat<br/>
                      Beer,Requires x1,Spring Water
                    </p>
                  )}
                  {importFormat === 'md' && (
                    <p>
                      <strong>Format:</strong> Row column tables separation<br/>
                      <strong>Example:</strong><br/>
                      | Cake | Ingredients | Wheat |<br/>
                      | Beer | Spring Water |
                    </p>
                  )}
                  {importFormat === 'list' && (
                    <p>
                      <strong>Supported Formats:</strong><br/>
                      • <code>Milk Cake: 2 wheat, 2 seasoning</code> (split components)<br/>
                      • <code>Pineapple Bun = wheat + sugar</code><br/>
                      • <code>Bread -&gt; wheat</code> (one-to-one pairs)
                    </p>
                  )}
                </div>

                <div>
                  <textarea
                    rows={8}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder={lang === 'zh' ? "在此行粘贴您的配方文本、表格行或从 csv 中复制的代码..." : "Paste recipe codes, custom inventories texts or raw CSV content here..."}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-mono placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="flex space-x-2.5">
                  <button
                    {...bindTouchTap(handleImportData)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    {lang === 'zh' ? '确认解析导入' : 'Parse Import'}
                  </button>
                  <button
                    {...bindTouchTap(() => setShowImportPanel(false))}
                    className="px-3.5 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-300 text-xs rounded-xl transition cursor-pointer"
                  >
                    {lang === 'zh' ? '返回' : 'Back'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* EXPORTS DRAWER COMPONENT */}
          <div className="border-t border-slate-800 pt-4.5 mt-6 space-y-3 flex-shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {lang === 'zh' ? '安全离线备份与下载' : 'Secured Offline Backup'}
            </h3>
            
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {lang === 'zh' 
                ? '所有黄页数据均在您所操纵的独立应用端本地运行（LocalStorage）。您可以通过以下按钮，直接将图谱导出在安全文件中保存。' 
                : 'Every mapping record lives in local state (LocalStorage). Avoid data loss by downloading file archives.'
              }
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                {...bindTouchTap(() => handleExportFile('csv'))}
                className="py-1.5 bg-slate-905 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 text-[10px] font-bold rounded-lg transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[44px]"
                title={lang === 'zh' ? '导出 CSV 数据报表' : 'Export as Spreadsheet CSV'}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                <span>EXPORT CSV</span>
              </button>

              <button
                {...bindTouchTap(() => handleExportFile('md'))}
                className="py-1.5 bg-slate-905 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 text-[10px] font-bold rounded-lg transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[44px]"
                title={lang === 'zh' ? '导出 Markdown 关系表格' : 'Export standard Markdown'}
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>MARKDOWN</span>
              </button>

              <button
                {...bindTouchTap(() => handleExportFile('txt'))}
                className="py-1.5 bg-slate-905 hover:bg-slate-850 border border-slate-800 hover:border-slate-705 text-slate-300 text-[10px] font-bold rounded-lg transition text-center flex flex-col items-center justify-center gap-1 cursor-pointer min-h-[44px]"
                title={lang === 'zh' ? '导出等号列表格式' : 'Export list format'}
              >
                <Download className="w-3.5 h-3.5 text-pink-500" />
                <span>TEXT MAPPING</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
