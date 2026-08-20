import { motion } from 'framer-motion';
import { Car, Bike } from 'lucide-react';

export default function ParkingMap({ slots, onSlotClick }) {
  const groundSlots = slots.filter((s) => s.floor === 'ground');
  const basementSlots = slots.filter((s) => s.floor === 'basement');

  return (
    <div className="space-y-6">
      <FloorSection
        title="Ground Floor"
        subtitle="Scooties"
        icon={<Bike className="w-5 h-5" />}
        accent="emerald"
        slots={groundSlots}
        onSlotClick={onSlotClick}
      />
      <FloorSection
        title="Basement"
        subtitle="Bikes"
        icon={<Car className="w-5 h-5" />}
        accent="orange"
        slots={basementSlots}
        onSlotClick={onSlotClick}
      />
    </div>
  );
}

function FloorSection({ title, subtitle, icon, accent, slots, onSlotClick }) {
  const accentBg = accent === 'emerald' ? 'bg-emerald' : 'bg-orange';
  const accentText = accent === 'emerald' ? 'text-emerald' : 'text-orange';
  const accentSoft = accent === 'emerald' ? 'bg-emerald/10' : 'bg-orange/10';

  return (
    <div className="bg-white rounded-3xl shadow-soft p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-10 h-10 rounded-2xl ${accentSoft} ${accentText} flex items-center justify-center`}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-navy text-lg leading-tight">{title}</h3>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className={`ml-auto h-2 w-16 rounded-full ${accentBg} opacity-20`} />
      </div>

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-100" />
          <span className="text-[10px] font-medium text-slate-300 uppercase tracking-wider">
            Entrance
          </span>
          <div className="flex-1 h-2 rounded-full bg-slate-100" />
        </div>

        <div className="grid grid-cols-4 gap-3 sm:gap-4">
          {slots.map((slot, idx) => (
            <SlotBlock
              key={slot.id}
              slot={slot}
              onClick={() => onSlotClick(slot)}
              index={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SlotBlock({ slot, onClick, index }) {
  const available = slot.status === 'available';

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={
        available
          ? { scale: 1.08, y: -4 }
          : { scale: 1.03 }
      }
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`group relative aspect-[4/5] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 ${
        available
          ? 'border-emerald/40 bg-emerald/5 hover:bg-emerald/15 hover:border-emerald hover:shadow-glow cursor-pointer'
          : 'border-red-300 bg-red-50 hover:bg-red-100 cursor-pointer'
      }`}
      aria-label={`Slot ${slot.slot_code} — ${slot.status}`}
    >
      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-slate-200 rounded-r" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-slate-200 rounded-l" />

      <span
        className={`text-base sm:text-lg font-bold ${
          available ? 'text-emerald-dark' : 'text-red-600'
        }`}
      >
        {slot.slot_code}
      </span>
      <div
        className={`w-2 h-2 rounded-full ${
          available ? 'bg-emerald group-hover:animate-pulse' : 'bg-red-500'
        }`}
      />
      <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">
        {available ? 'Free' : 'Taken'}
      </span>
    </motion.button>
  );
}
