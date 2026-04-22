import { Star, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

interface FacilityCardProps {
  key?: React.Key;
  id?: number | string;
  name: string;
  rating: number;
  ratingCount?: number;
  district: string;
  image: string;
  system: string;
  isAdmin?: boolean;
  onEdit?: () => void;
  onRate?: (rating: number) => void;
  hideRateOption?: boolean;
}

export default function FacilityCard({ name, rating, ratingCount = 0, district, image, system, isAdmin, onEdit, onRate, hideRateOption }: FacilityCardProps) {
  const [showRating, setShowRating] = React.useState(false);

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="min-w-[280px] sm:min-w-[320px] bg-white rounded-3xl overflow-hidden border border-gray-100 group cursor-pointer relative"
    >
      {isAdmin && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-2 rounded-full text-emerald-600 shadow-sm hover:bg-emerald-600 hover:text-white transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
      )}
      <div className="relative h-48 bg-neutral-100 overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider text-emerald-700">
            {system}
          </span>
        </div>
        
        {!hideRateOption && (
          <div 
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setShowRating(true);
            }}
          >
            <span className="bg-white text-emerald-600 px-4 py-2 rounded-full font-bold text-sm">Rate this Centre</span>
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 leading-tight">{name}</h3>
            <div className="flex items-center gap-1 text-slate-500 mt-1">
              <MapPin size={6} />
              <span className="text-sm">{district}, Uttarakhand</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            {rating > 0 && (
              <>
                <div className="flex items-center gap-1 bg-neutral-50 px-2 py-1 rounded-lg">
                  <Star size={6} className="fill-amber-400 text-amber-400" />
                  <span className="text-sm font-bold">{(Number(rating) || 0).toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold mt-1">({ratingCount} reviews)</span>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showRating && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 bg-white z-20 p-6 flex flex-col items-center justify-center"
          >
            <h4 className="font-bold text-slate-900 mb-4">Rate your experience</h4>
            <div className="flex gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((s) => (
                <button 
                  key={s}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate?.(s);
                    setShowRating(false);
                  }}
                  className="p-2 hover:scale-110 transition-transform"
                >
                  <Star size={32} className="text-amber-400 hover:fill-amber-400" />
                </button>
              ))}
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowRating(false);
              }}
              className="text-slate-400 text-sm font-bold uppercase tracking-widest"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
