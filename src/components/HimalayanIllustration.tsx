import React from 'react';
import { motion } from 'motion/react';

export default function HimalayanIllustration() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <svg
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Sky Gradient */}
        <defs>
          <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="100%" stopColor="#BAE6FD" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="2" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Mountains */}
        <motion.path
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          d="M0 600L150 250L300 450L450 150L650 400L800 200V600H0Z"
          fill="#94A3B8"
          opacity="0.3"
        />
        
        {/* Midground Mountains */}
        <motion.path
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          d="M-50 600L200 300L400 500L600 250L850 550V600H-50Z"
          fill="#64748B"
          opacity="0.5"
        />

        {/* Snake-like Road */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.5, delay: 1, ease: "easeInOut" }}
          d="M450 150C450 150 480 200 420 250C360 300 500 350 400 400C300 450 550 500 450 550"
          stroke="#475569"
          strokeWidth="12"
          strokeLinecap="round"
          fill="none"
        />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, delay: 1, ease: "easeInOut" }}
          d="M450 150C450 150 480 200 420 250C360 300 500 350 400 400C300 450 550 500 450 550"
          stroke="white"
          strokeWidth="1"
          strokeDasharray="10 15"
          fill="none"
        />

        {/* Village Houses */}
        <g filter="url(#shadow)">
          {/* House 1 */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <rect x="420" y="530" width="30" height="30" fill="#CBD5E1" />
            <path d="M415 530L435 510L455 530H415Z" fill="#94A3B8" />
          </motion.g>
          {/* House 2 */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            <rect x="470" y="540" width="25" height="25" fill="#E2E8F0" />
            <path d="M465 540L482.5 525L500 540H465Z" fill="#64748B" />
          </motion.g>
          {/* House 3 */}
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 2.4 }}
          >
            <rect x="390" y="550" width="20" height="20" fill="#94A3B8" />
            <path d="M385 550L400 540L415 550H385Z" fill="#475569" />
          </motion.g>
        </g>

        {/* Ayurvedic Hospital (Yellow-Brown) */}
        <motion.g
          initial={{ scale: 0, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 2.8 
          }}
        >
          {/* Main Building */}
          <rect x="430" y="510" width="50" height="45" fill="#B45309" rx="2" />
          <rect x="435" y="515" width="40" height="35" fill="#F59E0B" rx="1" />
          
          {/* Roof */}
          <path d="M425 510L455 485L485 510H425Z" fill="#78350F" />
          
          {/* Windows */}
          <motion.rect 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            x="440" y="520" width="8" height="8" fill="#FEF3C7" rx="1" 
          />
          <motion.rect 
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            x="462" y="520" width="8" height="8" fill="#FEF3C7" rx="1" 
          />
          
          {/* Door */}
          <rect x="450" y="535" width="10" height="15" fill="#451A03" />
          
          {/* Sign/Symbol */}
          <circle cx="455" cy="500" r="6" fill="white" />
          <path d="M455 496V504M451 500H459" stroke="#059669" strokeWidth="2" />
        </motion.g>

        {/* Clouds */}
        <motion.g
          animate={{ x: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          opacity="0.6"
        >
          <circle cx="100" cy="100" r="20" fill="white" />
          <circle cx="130" cy="100" r="25" fill="white" />
          <circle cx="160" cy="100" r="20" fill="white" />
        </motion.g>
        
        <motion.g
          animate={{ x: [0, -40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          opacity="0.4"
        >
          <circle cx="600" cy="150" r="15" fill="white" />
          <circle cx="625" cy="150" r="20" fill="white" />
          <circle cx="650" cy="150" r="15" fill="white" />
        </motion.g>

        {/* Birds */}
        <motion.g
          animate={{ 
            x: [0, 800],
            y: [0, -50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <path d="M10 50C15 45 20 50 25 45" stroke="#475569" strokeWidth="1" fill="none" />
          <path d="M30 60C35 55 40 60 45 55" stroke="#475569" strokeWidth="1" fill="none" />
        </motion.g>

      </svg>
    </div>
  );
}
