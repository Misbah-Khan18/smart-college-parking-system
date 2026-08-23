import { BikeIcon, CheckIcon, CarIcon, ShieldIcon } from './Icons'

export default function StatsOverview({ slots = [] }) {
  const total = slots.length || 160
  const occupied = slots.filter((s) => s.status === 'occupied').length
  const reserved = slots.filter((s) => s.status === 'reserved').length
  const available = slots.filter((s) => s.status === 'available').length

  const groundSlots = slots.filter((s) => s.floor === 'Ground Floor')
  const groundAvail = groundSlots.filter((s) => s.status === 'available').length

  const basementSlots = slots.filter((s) => s.floor === 'Basement')
  const basementAvail = basementSlots.filter((s) => s.status === 'available').length

  const occupancyRate = Math.round(((occupied + reserved) / total) * 100) || 0

  return (
    <section className="stats-grid simple-stats">
      {/* 1. Overall Available Bays */}
      <div className="stat-card stat-available">
        <div className="stat-icon-box bg-emerald-glow">
          <CheckIcon className="w-5 h-5 text-emerald" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Total Available</span>
          <div className="stat-value-group">
            <span className="stat-number text-emerald">{available}</span>
            <span className="stat-total">/ {total} Bays</span>
          </div>
          <span className="stat-sub-info">{100 - occupancyRate}% capacity free</span>
        </div>
      </div>

      {/* 2. Ground Floor (Girls Scooty) */}
      <div className="stat-card stat-ground">
        <div className="stat-icon-box bg-cyan-glow">
          <BikeIcon className="w-5 h-5 text-cyan" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Ground Floor &bull; Girls Scooty</span>
          <div className="stat-value-group">
            <span className="stat-number text-cyan">{groundAvail}</span>
            <span className="stat-total">/ {groundSlots.length || 80} Open</span>
          </div>
          <span className="stat-sub-info">Accounts &amp; Exam IT Sections</span>
        </div>
      </div>

      {/* 3. Basement (Boys Parking) */}
      <div className="stat-card stat-basement">
        <div className="stat-icon-box bg-indigo-glow">
          <CarIcon className="w-5 h-5 text-indigo" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Basement &bull; Boys Parking</span>
          <div className="stat-value-group">
            <span className="stat-number text-indigo">{basementAvail}</span>
            <span className="stat-total">/ {basementSlots.length || 80} Open</span>
          </div>
          <span className="stat-sub-info">Rows 1 to 4 Parking Grid</span>
        </div>
      </div>

      {/* 4. Occupancy Rate & Active Vehicles */}
      <div className="stat-card stat-occupied">
        <div className="stat-icon-box bg-rose-glow">
          <ShieldIcon className="w-5 h-5 text-rose" />
        </div>
        <div className="stat-details">
          <span className="stat-label">Campus Load Rate</span>
          <div className="stat-value-group">
            <span className="stat-number text-rose">{occupancyRate}%</span>
            <span className="stat-total">({occupied + reserved} Parked)</span>
          </div>
          <span className="stat-sub-info">{occupied} Occupied &bull; {reserved} Reserved</span>
        </div>
      </div>
    </section>
  )
}
