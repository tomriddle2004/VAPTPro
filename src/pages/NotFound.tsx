import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
        <Shield className="w-10 h-10 text-slate-600" />
      </div>
      <div>
        <div className="text-6xl font-bold font-mono text-slate-700 mb-2">404</div>
        <h1 className="text-xl font-semibold text-white mb-1">Page Not Found</h1>
        <p className="text-slate-400 text-sm">This resource does not exist or has been moved.</p>
      </div>
      <Link
        to="/"
        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}
