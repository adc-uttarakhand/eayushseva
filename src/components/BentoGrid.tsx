import { UserCheck, Stethoscope, Video, MapPin, Star, ClipboardList } from 'lucide-react';
import { motion } from 'motion/react';

interface BentoGridProps {
  onFindDoctor: () => void;
  onFindNearby: () => void;
  onRate: () => void;
  onDemands?: () => void;
  isLoggedIn?: boolean;
}

export default function BentoGrid({ onFindDoctor, onFindNearby, onRate, onDemands, isLoggedIn }: BentoGridProps) {
  return (
    <section className="px-4 sm:px-8 py-4">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 h-[300px] md:h-[240px]">
        
        <motion.div 
          whileHover={{ scale: 0.98 }}
          onClick={onFindNearby}
          className="col-span-2 row-span-1 md:col-span-2 md:row-span-2 bg-emerald-600 border border-emerald-500 rounded-2xl p-4 flex flex-col justify-between cursor-pointer text-white shadow-lg shadow-emerald-100"
        >
          <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Nearby Hospitals</h3>
            <p className="text-xs text-emerald-100 mt-1">Find facilities within 10km</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 0.98 }}
          onClick={onFindDoctor}
          className="col-span-2 row-span-1 md:col-span-1 md:row-span-2 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between cursor-pointer"
        >
          <div className="bg-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Stethoscope size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Find a Doctor</h3>
            <p className="text-xs text-slate-500 mt-1">Connect with practitioners</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-3 col-span-2 md:col-span-1 md:row-span-2">
          {isLoggedIn && onDemands ? (
            <motion.div 
              whileHover={{ scale: 0.98 }}
              onClick={onDemands}
              className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-between cursor-pointer h-full"
            >
              <div className="bg-emerald-600 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                <ClipboardList size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Medicine Demands</h3>
            </motion.div>
          ) : (
            <motion.div 
              whileHover={{ scale: 0.98 }}
              onClick={() => window.open('https://bcputtarakhand.in/application/login.php', '_blank')}
              className="bg-neutral-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between cursor-pointer h-full"
            >
              <div className="bg-white w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 border border-gray-100">
                <UserCheck size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Verify Practitioner</h3>
            </motion.div>
          )}

          <motion.div 
            whileHover={{ scale: 0.98 }}
            onClick={() => window.open('https://esanjeevani.mohfw.gov.in/#/patient/signin', '_blank')}
            className="bg-slate-900 border border-gray-100 rounded-2xl p-4 flex flex-col justify-between cursor-pointer text-white h-full"
          >
            <div className="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center text-white">
              <Video size={16} />
            </div>
            <h3 className="text-sm font-bold leading-tight">Teleconsultation</h3>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
