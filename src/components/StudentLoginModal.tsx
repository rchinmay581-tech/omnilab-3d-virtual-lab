import React, { useState } from 'react';
import {
  Cloud,
  Hash,
  Loader2,
  Printer,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { labAudio } from '../audio/LabAudioEngine';
import {
  MAX_DISPLAY_NAME_LEN,
  MAX_ROLL_NUMBER_LEN,
  isValidRollNumber,
} from '../services/studentCloudService';

interface StudentLoginModalProps {
  onSignInWithGoogle: (overrides?: { displayName?: string; rollNumber?: string }) => Promise<void>;
  onUnlockAudio: () => void;
}

export const StudentLoginModal: React.FC<StudentLoginModalProps> = ({
  onSignInWithGoogle,
  onUnlockAudio,
}) => {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rollValid = isValidRollNumber(rollNumber);

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signingIn) return;
    setError(null);

    if (!rollValid) {
      labAudio.playSafetyBuzz();
      setError('Roll Number may only contain letters, numbers, spaces, -, _, ., and /.');
      return;
    }

    try {
      onUnlockAudio();
    } catch {
      // Audio unlock must never block login
    }

    setSigningIn(true);
    try {
      await onSignInWithGoogle({
        displayName: name.trim() || undefined,
        rollNumber: rollNumber.trim() || undefined,
      });
      labAudio.playMetallicTick(2200, 0.45);
    } catch (err) {
      labAudio.playSafetyBuzz();
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('Google sign-in popup was closed before completing. Click Continue with Google to try again.');
      } else if (code === 'auth/popup-blocked') {
        setError('Your browser blocked the Google sign-in popup. Allow popups for this site and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setError(
          `Domain "${window.location.hostname}" is not authorized in Firebase Auth yet. Add "${window.location.hostname}" in Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/network-request-failed') {
        setError('Network error while contacting Google sign-in. Check your connection and retry.');
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError('Unable to complete Google sign-in. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/55">
      <div className="w-full max-w-[430px] rounded-xl bg-[#0b1120]/94 border border-slate-700/85 shadow-2xl overflow-hidden">
        {/* Top Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400" />

        <form onSubmit={handleGoogleSignIn} noValidate className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-white">
                OmniLab 3D
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-700/70 text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>90-Lab Cloud Portal</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in once with your Google account to save your completed experiments, observations, viva marks, and exam records to the cloud across all devices.
            </p>
          </div>

          {/* Optional Student Details */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Student Name <span className="text-slate-500">(optional — uses Google name if blank)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  maxLength={MAX_DISPLAY_NAME_LEN}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950/95 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                School / Roll Number <span className="text-slate-500">(optional — printed on lab sheet)</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  maxLength={MAX_ROLL_NUMBER_LEN}
                  value={rollNumber}
                  onChange={(e) => {
                    setRollNumber(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 12-SCI-042"
                  className={`w-full pl-9 pr-3 py-2 text-xs font-mono-tabular bg-slate-950/95 border rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none ${
                    rollNumber && !rollValid
                      ? 'border-amber-600/80 focus:border-amber-400'
                      : 'border-slate-700 focus:border-cyan-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Cloud Benefits Summary */}
          <div className="grid grid-cols-3 gap-2 pt-0.5">
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-center space-y-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 mx-auto" />
              <div className="text-[10px] font-medium text-slate-300">No OTP Needed</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-center space-y-1">
              <Cloud className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
              <div className="text-[10px] font-medium text-slate-300">Cloud Auto-Save</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-center space-y-1">
              <Printer className="w-3.5 h-3.5 text-sky-400 mx-auto" />
              <div className="text-[10px] font-medium text-slate-300">Verified Records</div>
            </div>
          </div>

          {error && (
            <div className="text-[11px] px-3 py-2 rounded-lg bg-rose-950/80 border border-rose-700/70 text-rose-200 leading-snug">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={signingIn || !rollValid}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-100 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-sm cursor-pointer"
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                <span>Connecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.88Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.05 1.15-3.12 0-5.76-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.11Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4.01 3.11C6.24 6.88 8.88 4.77 12 4.77Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
