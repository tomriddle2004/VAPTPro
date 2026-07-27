import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllScans } from '@/lib/storage';
import { Scan } from '@/types';
import { Network, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';

interface PhysicsNode {
  id: string;
  ip: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  risk: string;
  scan: Scan;
  findings_count: number;
  radius: number;
  subnet: string;
}

type Edge = [string, string];

const RISK_STYLE: Record<string, { fill: string; stroke: string; text: string }> = {
  Critical: { fill: '#450a0a', stroke: '#ef4444', text: '#fca5a5' },
  High:     { fill: '#431407', stroke: '#f97316', text: '#fdba74' },
  Medium:   { fill: '#422006', stroke: '#eab308', text: '#fde047' },
  Low:      { fill: '#172554', stroke: '#3b82f6', text: '#93c5fd' },
  Clean:    { fill: '#022c22', stroke: '#10b981', text: '#6ee7b7' },
  Unknown:  { fill: '#1e293b', stroke: '#475569', text: '#94a3b8' },
};

const W = 900, H = 520;

function stepPhysics(nodes: PhysicsNode[], edges: Edge[]): PhysicsNode[] {
  const next = nodes.map(n => ({ ...n }));
  const cx = W / 2, cy = H / 2;
  const REPULSE = 14000, ATTRACT = 0.004, IDEAL = 180, GRAV = 0.0008, DAMP = 0.82;

  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const dx = next[i].x - next[j].x, dy = next[i].y - next[j].y;
      const d = Math.sqrt(dx * dx + dy * dy) + 0.5;
      const f = REPULSE / (d * d);
      next[i].vx += f * dx / d; next[i].vy += f * dy / d;
      next[j].vx -= f * dx / d; next[j].vy -= f * dy / d;
    }
  }

  for (const [s, t] of edges) {
    const si = next.find(n => n.id === s), ti = next.find(n => n.id === t);
    if (!si || !ti) continue;
    const dx = ti.x - si.x, dy = ti.y - si.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.5;
    const f = ATTRACT * (d - IDEAL);
    si.vx += f * dx / d; si.vy += f * dy / d;
    ti.vx -= f * dx / d; ti.vy -= f * dy / d;
  }

  for (const n of next) {
    n.vx += (cx - n.x) * GRAV; n.vy += (cy - n.y) * GRAV;
    n.vx *= DAMP; n.vy *= DAMP;
    n.x = Math.max(n.radius + 10, Math.min(W - n.radius - 10, n.x + n.vx));
    n.y = Math.max(n.radius + 10, Math.min(H - n.radius - 10, n.y + n.vy));
  }
  return next;
}

export default function NetworkTopology() {
  const [nodes, setNodes] = useState<PhysicsNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hovered, setHovered] = useState<PhysicsNode | null>(null);
  const [selected, setSelected] = useState<PhysicsNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [settled, setSettled] = useState(false);
  const physRef = useRef<PhysicsNode[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const animRef = useRef<number>();
  const navigate = useNavigate();

  useEffect(() => {
    const scans = getAllScans().filter(s => s.status !== 'failed');
    const ipMap = new Map<string, Scan>();
    for (const s of scans) {
      const ex = ipMap.get(s.target_ip);
      if (!ex || s.start_time > ex.start_time) ipMap.set(s.target_ip, s);
    }
    const count = ipMap.size || 1;
    const step = (2 * Math.PI) / count;
    const r = Math.min(200, Math.max(100, count * 45));

    const newNodes: PhysicsNode[] = Array.from(ipMap.entries()).map(([ip, scan], i) => ({
      id: scan.id, ip, scan,
      x: W / 2 + r * Math.cos(i * step - Math.PI / 2),
      y: H / 2 + r * Math.sin(i * step - Math.PI / 2),
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
      risk: scan.risk_rating ?? 'Unknown',
      findings_count: scan.findings_count ?? 0,
      radius: 28 + Math.min(12, (scan.findings_count ?? 0) * 2),
      subnet: ip.split('.').slice(0, 3).join('.'),
    }));

    const newEdges: Edge[] = [];
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        if (newNodes[i].subnet === newNodes[j].subnet) {
          newEdges.push([newNodes[i].id, newNodes[j].id]);
        }
      }
    }

    physRef.current = newNodes;
    edgesRef.current = newEdges;
    setNodes([...newNodes]);
    setEdges(newEdges);

    let tick = 0;
    const animate = () => {
      tick++;
      physRef.current = stepPhysics(physRef.current, edgesRef.current);
      if (tick % 2 === 0) setNodes([...physRef.current]);
      if (tick < 200) animRef.current = requestAnimationFrame(animate);
      else setSettled(true);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current!);
  }, []);

  const resetLayout = useCallback(() => {
    const count = physRef.current.length || 1;
    const step = (2 * Math.PI) / count;
    const r = Math.min(200, Math.max(100, count * 45));
    physRef.current = physRef.current.map((n, i) => ({
      ...n,
      x: W / 2 + r * Math.cos(i * step - Math.PI / 2),
      y: H / 2 + r * Math.sin(i * step - Math.PI / 2),
      vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
    }));
    setSettled(false);
    let tick = 0;
    const animate = () => {
      tick++;
      physRef.current = stepPhysics(physRef.current, edgesRef.current);
      if (tick % 2 === 0) setNodes([...physRef.current]);
      if (tick < 200) animRef.current = requestAnimationFrame(animate);
      else setSettled(true);
    };
    cancelAnimationFrame(animRef.current!);
    animRef.current = requestAnimationFrame(animate);
  }, []);

  const nodeById = (id: string) => nodes.find(n => n.id === id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Network className="w-4 h-4 text-purple-400" />
            </div>
            Network Topology Map
          </h1>
          <p className="text-slate-400 text-sm mt-1">Force-directed graph of all scanned hosts • {nodes.length} node{nodes.length !== 1 ? 's' : ''} • {edges.length} subnet link{edges.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.2))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetLayout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors text-sm">
            <RotateCcw className="w-4 h-4" />Reset
          </button>
          {!settled && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Simulating…
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(RISK_STYLE).map(([risk, s]) => (
          <div key={risk} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: s.stroke }} />
            <span className="text-slate-400 text-xs">{risk}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-600">
          <Info className="w-3 h-3" />Dashed lines = same /24 subnet
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="bg-[#060d1a] border border-slate-800 rounded-xl overflow-hidden" style={{ height: `${H + 2}px` }}>
        {nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Network className="w-12 h-12 text-slate-700" />
            <p className="text-slate-500 text-sm">No completed scans to display.</p>
            <Link to="/scan/new" className="text-emerald-400 text-sm hover:underline">Launch a scan to see topology →</Link>
          </div>
        ) : (
          <svg
            width="100%" height={H}
            viewBox={`${W / 2 - (W / 2) / zoom} ${H / 2 - (H / 2) / zoom} ${W / zoom} ${H / zoom}`}
            style={{ cursor: 'crosshair' }}
          >
            {/* Grid pattern */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f172a" strokeWidth="0.5" />
              </pattern>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <rect width={W} height={H} fill="url(#grid)" />

            {/* Edges */}
            {edges.map(([s, t]) => {
              const sn = nodeById(s), tn = nodeById(t);
              if (!sn || !tn) return null;
              return (
                <line key={`${s}-${t}`} x1={sn.x} y1={sn.y} x2={tn.x} y2={tn.y}
                  stroke="#334155" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.6" />
              );
            })}

            {/* Subnet label areas */}
            {edges.length > 0 && (() => {
              const subnets = new Map<string, PhysicsNode[]>();
              for (const n of nodes) {
                const list = subnets.get(n.subnet) ?? [];
                list.push(n); subnets.set(n.subnet, list);
              }
              return Array.from(subnets.entries()).filter(([, ns]) => ns.length > 1).map(([subnet, ns]) => {
                const cx = ns.reduce((s, n) => s + n.x, 0) / ns.length;
                const cy = ns.reduce((s, n) => s + n.y, 0) / ns.length;
                return (
                  <text key={subnet} x={cx} y={cy - 55} textAnchor="middle"
                    fill="#1e3a5f" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    {subnet}.0/24
                  </text>
                );
              });
            })()}

            {/* Nodes */}
            {nodes.map(node => {
              const style = RISK_STYLE[node.risk] ?? RISK_STYLE.Unknown;
              const isHov = hovered?.id === node.id;
              const isSel = selected?.id === node.id;
              return (
                <g key={node.id}
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(selected?.id === node.id ? null : node)}
                  onDoubleClick={() => navigate(`/scan/${node.id}`)}
                  style={{ cursor: 'pointer' }}>
                  {/* Outer pulse ring for active/hovered */}
                  {(isHov || isSel) && (
                    <circle cx={node.x} cy={node.y} r={node.radius + 10}
                      fill="none" stroke={style.stroke} strokeWidth="1.5" opacity="0.4"
                      style={isHov ? { animation: 'none' } : {}} />
                  )}
                  {/* Risk glow */}
                  <circle cx={node.x} cy={node.y} r={node.radius + 4}
                    fill={style.fill} opacity="0.3" />
                  {/* Main node */}
                  <circle cx={node.x} cy={node.y} r={node.radius}
                    fill={style.fill} stroke={style.stroke}
                    strokeWidth={isSel ? 3 : isHov ? 2.5 : 1.5}
                    filter={isHov || isSel ? 'url(#glow)' : undefined} />
                  {/* IP label */}
                  <text x={node.x} y={node.y + 4} textAnchor="middle"
                    fill={style.text} fontSize={Math.max(9, 12 - node.ip.length * 0.3)}
                    fontFamily="monospace" fontWeight="600">{node.ip}</text>
                  {/* Findings count badge */}
                  {node.findings_count > 0 && (
                    <g>
                      <circle cx={node.x + node.radius - 4} cy={node.y - node.radius + 4} r={9}
                        fill={node.risk === 'Critical' || node.risk === 'High' ? '#ef4444' : '#f97316'}
                        stroke="#060d1a" strokeWidth="2" />
                      <text x={node.x + node.radius - 4} y={node.y - node.radius + 8}
                        textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        {node.findings_count > 9 ? '9+' : node.findings_count}
                      </text>
                    </g>
                  )}
                  {/* Risk label below node */}
                  <text x={node.x} y={node.y + node.radius + 14} textAnchor="middle"
                    fill={style.stroke} fontSize="9" fontFamily="monospace" opacity="0.8">
                    {node.risk?.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Hover tooltip */}
            {hovered && (() => {
              const style = RISK_STYLE[hovered.risk] ?? RISK_STYLE.Unknown;
              const tx = Math.min(hovered.x + hovered.radius + 12, W - 170);
              const ty = Math.max(hovered.y - 60, 10);
              return (
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={tx} y={ty} width={160} height={80} rx={8}
                    fill="#0b1426" stroke={style.stroke} strokeWidth="1.5" opacity="0.97" />
                  <text x={tx + 10} y={ty + 18} fill={style.text} fontSize="12" fontWeight="bold" fontFamily="monospace">{hovered.ip}</text>
                  <text x={tx + 10} y={ty + 34} fill="#64748b" fontSize="9" fontFamily="monospace">Risk: {hovered.risk}</text>
                  <text x={tx + 10} y={ty + 48} fill="#64748b" fontSize="9" fontFamily="monospace">
                    Findings: {hovered.findings_count}</text>
                  <text x={tx + 10} y={ty + 62} fill="#475569" fontSize="9" fontFamily="monospace">
                    {hovered.scan.scan_type} • {new Date(hovered.scan.start_time).toLocaleDateString()}
                  </text>
                  <text x={tx + 10} y={ty + 74} fill={style.stroke} fontSize="8" fontFamily="monospace" opacity="0.7">
                    Double-click to view details
                  </text>
                </g>
              );
            })()}
          </svg>
        )}
      </div>

      {/* Selected node details */}
      {selected && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ background: (RISK_STYLE[selected.risk] ?? RISK_STYLE.Unknown).stroke }} />
              <span className="text-white font-mono font-bold text-lg">{selected.ip}</span>
              <span className={`text-xs px-2 py-0.5 rounded border font-bold font-mono ${
                selected.risk === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                selected.risk === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                selected.risk === 'Clean' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                'bg-slate-700 text-slate-300 border-slate-600'
              }`}>{selected.risk}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Scan Type', value: selected.scan.scan_type },
                { label: 'Findings', value: String(selected.findings_count) },
                { label: 'Subnet', value: `${selected.subnet}.0/24` },
                { label: 'Scan Date', value: new Date(selected.scan.start_time).toLocaleDateString() },
              ].map(r => (
                <div key={r.label} className="bg-black/20 border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-500 text-[10px] font-mono">{r.label}</div>
                  <div className="text-white text-sm font-medium mt-0.5">{r.value}</div>
                </div>
              ))}
            </div>
          </div>
          <Link to={`/scan/${selected.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-colors flex-shrink-0">
            View Scan Report →
          </Link>
        </div>
      )}
    </div>
  );
}
