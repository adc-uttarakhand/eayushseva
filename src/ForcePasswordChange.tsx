import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Eye, EyeOff, Loader2, KeyRound, X, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserSession } from './LoginModal';

interface ForcePasswordChangeProps {
  session: UserSession;
  onPasswordChanged: () => void;
}

// Weak passwords that must be changed
const WEAK_PASSWORDS = [
  'ayush@123', 'ayush123', 'ABCD_1234', 'abcd1234',
  'password', 'password123', '123456', '12345678',
  'admin@123', 'admin123', 'test@123', '1234'
];

export function isWeakPassword(password: string): boolean {
  if (!password) return true;
  return WEAK_PASSWORDS.includes(password.toLowerCase()) || 
         WEAK_PASSWORDS.includes(password);
}

interface PasswordRule {
  label: string;
  test: (pwd: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Minimum 8 characters', test: (p) => p.length >= 8 },
  { label: 'Ek uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Ek number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Ek special character (!@#$%)', test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 1) return { score: 25, label: 'Bahut Kamzor', color: '#ef4444' };
  if (passed === 2) return { score: 50, label: 'Kamzor', color: '#f97316' };
  if (passed === 3) return { score: 75, label: 'Theek Hai', color: '#eab308' };
  return { score: 100, label: 'Mazboot', color: '#22c55e' };
}

function generateStrongPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%';
  const all = upper + lower + numbers + special;
  
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export default function ForcePasswordChange({ session, onPasswordChanged }: ForcePasswordChangeProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const allRulesPassed = PASSWORD_RULES.every(r => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const isCommonPassword = WEAK_PASSWORDS.includes(newPassword);

  const handleGenerate = () => {
    const pwd = generateStrongPassword();
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowNew(true);
    // Copy to clipboard
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleSubmit = async () => {
    setError('');

    if (!allRulesPassed) {
      setError('Password saari requirements meet nahi karta!');
      return;
    }

    if (isCommonPassword) {
      setError('Ye password allowed nahi hai — koi unique password choose karo!');
      return;
    }

    if (!passwordsMatch) {
      setError('Dono passwords match nahi kar rahe!');
      return;
    }

    setLoading(true);

    try {
      let updateError = null;

      if (session.role === 'SUPER_ADMIN' || session.role === 'STATE_ADMIN' || 
          session.role === 'DISTRICT_ADMIN' || session.role === 'DISTRICT_MEDICINE_INCHARGE' ||
          session.role === 'PHARMACY_MANAGER') {
        // Admin password update
        const { error } = await supabase
          .from('admin_logins')
          .update({ admin_password: newPassword })
          .eq('id', session.id);
        updateError = error;
      } else if (session.role === 'HOSPITAL') {
        // Hospital password update
        const { error } = await supabase
          .from('hospitals')
          .update({ hospital_password: newPassword })
          .eq('hospital_id', session.id);
        updateError = error;
      } else if (session.role === 'STAFF') {
        // Staff password update
        const { error } = await supabase
          .from('staff')
          .update({ login_password: newPassword })
          .eq('id', session.id);
        updateError = error;
      }

      if (updateError) throw updateError;

      onPasswordChanged();
    } catch (err: any) {
      setError(err.message || 'Password update mein error aaya. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <KeyRound size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Password Change Zaroori</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Security audit compliance ke liye</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 mt-4">
            <p className="text-sm text-emerald-50">
              Namaste <strong>{session.name}</strong>! Aapka current password insecure hai. 
              App use karne se pehle naya secure password set karna zaroori hai.
            </p>
          </div>
        </div>

        <div className="p-6">
          {/* Generate Password Button */}
          <button
            onClick={handleGenerate}
            className="w-full mb-4 py-3 px-4 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} />
            {copied ? '✅ Password Copied!' : '✨ Secure Password Generate Karo'}
          </button>

          {/* New Password */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
              Naya Password
            </label>
            <div className="relative mt-1">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Naya secure password"
                className="w-full bg-neutral-50 border border-gray-200 rounded-2xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength Bar */}
            {newPassword.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-slate-400">Password Strength</span>
                  <span className="text-[10px] font-bold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: strength.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${strength.score}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Password Rules */}
          {newPassword.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-3 mb-3">
              {PASSWORD_RULES.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  {rule.test(newPassword) 
                    ? <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                    : <XCircle size={12} className="text-red-400 flex-shrink-0" />
                  }
                  <span className={`text-[11px] ${rule.test(newPassword) ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {rule.label}
                  </span>
                </div>
              ))}
              {isCommonPassword && (
                <div className="flex items-center gap-2 py-0.5">
                  <XCircle size={12} className="text-red-400 flex-shrink-0" />
                  <span className="text-[11px] text-red-500">Common/weak password not allowed</span>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">
              Password Confirm Karo
            </label>
            <div className="relative mt-1">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Password dobara likho"
                className={`w-full bg-neutral-50 border rounded-2xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 transition-all font-mono text-sm ${
                  confirmPassword.length > 0
                    ? passwordsMatch 
                      ? 'border-emerald-400 focus:ring-emerald-500/20' 
                      : 'border-red-300 focus:ring-red-500/20'
                    : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword.length > 0 && (
              <p className={`text-[11px] mt-1 ml-1 ${passwordsMatch ? 'text-emerald-500' : 'text-red-400'}`}>
                {passwordsMatch ? '✅ Passwords match kar rahe hain!' : '❌ Passwords match nahi kar rahe!'}
              </p>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4"
            >
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </motion.div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !allRulesPassed || !passwordsMatch || isCommonPassword}
            className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading 
              ? <><Loader2 className="animate-spin" size={18} /> Updating...</>
              : <><ShieldCheck size={18} /> Password Update Karo</>
            }
          </button>

          <p className="text-center text-[10px] text-slate-400 mt-3">
            Ye password sirf aapke paas hona chahiye — kisi ko share mat karo
          </p>
        </div>
      </motion.div>
    </div>
  );
}
