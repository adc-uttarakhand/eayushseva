import { Search, MapPin, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

const UTTARAKHAND_DISTRICTS = [
  "Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", 
  "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", 
  "Udham Singh Nagar", "Uttarkashi"
];

export default function SearchBar() {
  return (
    <div className="sticky top-4 z-50 px-4 w-full max-w-3xl mx-auto">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 flex items-center p-2 pl-6 gap-2"
      >
        <div className="flex-1 flex flex-col justify-center border-r border-gray-100 pr-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">District</span>
          <select className="text-sm font-medium focus:outline-none bg-transparent appearance-none cursor-pointer">
            <option value="">Search Uttarakhand...</option>
            {UTTARAKHAND_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        
        <div className="flex-1 hidden sm:flex flex-col justify-center border-r border-gray-100 pr-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System</span>
          <select className="text-sm font-medium focus:outline-none bg-transparent appearance-none cursor-pointer">
            <option>Ayurveda</option>
            <option>Yoga</option>
            <option>Unani</option>
            <option>Siddha</option>
            <option>Homeopathy</option>
          </select>
        </div>

        <button className="bg-emerald-600 text-white p-3 rounded-full hover:bg-emerald-700 transition-colors flex items-center justify-center">
          <Search size={18} strokeWidth={2.5} />
        </button>
      </motion.div>
    </div>
  );
}
