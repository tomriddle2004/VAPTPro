import { useState, useEffect } from 'react';
import { X, ExternalLink, Shield, AlertTriangle, Clock, Info, ChevronDown, ChevronRight } from 'lucide-react';

interface CVSSMetric {
  cvssData: {
    version: string;
    vectorString: string;
    baseScore: number;
    baseSeverity: string;
    attackVector?: string;
    attackComplexity?: string;
    privilegesRequired?: string;
    userInteraction?: string;
    scope?: string;
    confidentialityImpact?: string;
    integrityImpact?: string;
    availabilityImpact?: string;
  };
  exploitabilityScore?: number;
  impactScore?: number;
}

interface NVDCve {
  id: string;
  published: string;
  lastModified: string;
  vulnStatus: string;
  descriptions: { lang: string; value: string }[];
  metrics?: {
    cvssMetricV31?: CVSSMetric[];
    cvssMetricV30?: CVSSMetric[];
    cvssMetricV2?: { cvssData: { baseScore: number; vectorString: string } }[];
  };
  weaknesses?: { description: { lang: string; value: string }[] }[];
  references?: { url: string; source?: string; tags?: string[] }[];
}

interface Props {
  cveId: string | null;
  onClose: () => void;
}

const CVSS_LABELS: Record<string, Record<string, string>> = {
  AV: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' },
  AC: { L: 'Low', H: 'High' },
  PR: { N: 'None', L: 'Low', H: 'High' },
  UI: { N: 'None', R: 'Required' },
  S: { U: 'Unchanged', C: 'Changed' },
  C: { N: 'None', L: 'Low', H: 'High' },
  I: { N: 'None', L: 'Low', H: 'High' },
  A: { N: 'None', L: 'Low', H: 'High' },
};

const CVSS_NAMES: Record<string, string> = {
  AV: 'Attack Vector', AC: 'Attack Complexity', PR: 'Privileges Required',
  UI: 'User Interaction', S: 'Scope', C: 'Confidentiality', I: 'Integrity', A: 'Availability',
};

function parseCVSSVector(vector: string): Record<string, string> {
  const result: Record<string, string> = {};
  const parts = vector.split('/').slice(1); // skip "CVSS:3.x"
  for (const part of parts) {
    const [key, val] = part.split(':');
    result[key] = CVSS_LABELS[key]?.[val] ?? val;
  }
  return result;
}

function tagColor(tag: string): string {
  if (tag.toLowerCase().includes('patch') || tag.toLowerCase().includes('fix')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (tag.toLowerCase().includes('exploit') || tag.toLowerCase().includes('proof')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (tag.toLowerCase().includes('advisory')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-slate-700 text-slate-400 border-slate-600';
}

export default function CVEModal({ cveId, onClose }: Props) {
  const [cve, setCve] = useState<NVDCve | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVector, setShowVector] = useState(false);

  useEffect(() => {
    if (!cveId) { setCve(null); return; }
    setLoading(true);
    setError(null);
    setCve(null);
    const controller = new AbortController();
    fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${cveId}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(r => { if (!r.ok) throw new Error(`NVD API returned ${r.status}`); return r.json(); })
      .then(data => {
        const vuln = data?.vulnerabilities?.[0]?.cve;
        if (!vuln) throw new Error('CVE not found in NVD database');
        setCve(vuln);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setError(`${err.message}. NVD API may be rate-limited — try again in 30 seconds.`);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [cveId]);

  if (!cveId) return null;

  const metric = cve?.metrics?.cvssMetricV31?.[0] ?? cve?.metrics?.cvssMetricV30?.[0];
  const cvssData = metric?.cvssData;
  const score = cvssData?.baseScore ?? cve?.metrics?.cvssMetricV2?.[0]?.cvssData?.baseScore;
  const severity = cvssData?.baseSeverity;
  const vector = cvssData?.vectorString;
  const parsed = vector ? parseCVSSVector(vector) : {};
  const description = cve?.descriptions.find(d => d.lang === 'en')?.value ?? '';

  const scoreColor = !score ? 'text-slate-400' :
    score >= 9 ? 'text-red-400' : score >= 7 ? 'text-orange-400' :
    score >= 4 ? 'text-yellow-400' : 'text-blue-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0b1426] border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-bold font-mono text-lg">{cveId}</h2>
              <p className="text-slate-500 text-xs">NVD — National Vulnerability Database</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-slate-400 text-sm">Fetching from NVD API...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Failed to fetch CVE data</p>
                <p className="text-red-400/70 text-xs mt-1">{error}</p>
                <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 text-xs mt-2 hover:underline">
                  View on NVD website <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {cve && (
            <>
              {/* CVSS Score */}
              {score !== undefined && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center gap-5">
                  <div className="text-center flex-shrink-0">
                    <div className={`text-5xl font-bold font-mono ${scoreColor}`}>{score.toFixed(1)}</div>
                    <div className={`text-xs font-bold mt-1 ${scoreColor}`}>{severity}</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${
                        score >= 9 ? 'bg-red-500' : score >= 7 ? 'bg-orange-500' : score >= 4 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} style={{ width: `${(score / 10) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                      <span>0.0 None</span><span>4.0 Low</span><span>7.0 High</span><span>9.0 Critical 10.0</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {metric?.exploitabilityScore && (
                        <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-400">
                          Exploitability: <span className="text-white">{metric.exploitabilityScore}</span>
                        </span>
                      )}
                      {metric?.impactScore && (
                        <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-400">
                          Impact: <span className="text-white">{metric.impactScore}</span>
                        </span>
                      )}
                      <span className="text-xs bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-400">
                        Status: <span className="text-emerald-400">{cve.vulnStatus}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CVSS Vector */}
              {vector && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                  <button onClick={() => setShowVector(!showVector)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300 text-sm font-semibold">CVSS Vector Breakdown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">{vector}</code>
                      {showVector ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    </div>
                  </button>
                  {showVector && (
                    <div className="grid grid-cols-2 gap-1 p-3 pt-0 border-t border-slate-800">
                      {Object.entries(CVSS_NAMES).map(([key, label]) => parsed[key] && (
                        <div key={key} className="flex items-center justify-between py-1.5 px-2 bg-black/20 rounded">
                          <span className="text-slate-500 text-xs">{label}</span>
                          <span className="text-white text-xs font-medium">{parsed[key]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">Description</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
              </div>

              {/* Weaknesses */}
              {cve.weaknesses && cve.weaknesses.length > 0 && (
                <div>
                  <h3 className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">Weaknesses (CWE)</h3>
                  <div className="flex flex-wrap gap-2">
                    {cve.weaknesses.map((w, i) =>
                      w.description.filter(d => d.lang === 'en').map((d, j) => (
                        <span key={`${i}-${j}`} className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded font-mono">
                          {d.value}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* References */}
              {cve.references && cve.references.length > 0 && (
                <div>
                  <h3 className="text-slate-400 text-xs font-mono uppercase tracking-wider mb-2">
                    References & Patches ({cve.references.length})
                  </h3>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {cve.references.map((ref, i) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 bg-black/20 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                        <a href={ref.url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs truncate flex-1 font-mono leading-5">
                          {ref.url}
                        </a>
                        <div className="flex flex-wrap gap-1 flex-shrink-0">
                          {ref.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${tagColor(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Published dates */}
              <div className="flex items-center gap-4 text-xs text-slate-600 border-t border-slate-800 pt-3">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Published: {new Date(cve.published).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Modified: {new Date(cve.lastModified).toLocaleDateString()}</span>
                <a href={`https://nvd.nist.gov/vuln/detail/${cveId}`} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-blue-400 hover:text-blue-300">
                  Full NVD entry <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
