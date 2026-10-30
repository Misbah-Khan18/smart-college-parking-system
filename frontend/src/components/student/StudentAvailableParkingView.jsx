import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/auth'; // Adjust path if needed
import { collection, onSnapshot } from 'firebase/firestore';
import { isValidCanonicalSlotId, sortSlots } from '../../services/parkingService';
import {
  CheckIcon,
  PlusCircleIcon,
  LoaderIcon
} from '../Icons';

export default function StudentAvailableParkingView({
  userProfile,
  onOpenBooking
}) {
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Real-time Firestore subscription
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(db, 'parking_slots'),
      (snapshot) => {
        const updatedSlots = [];
        snapshot.forEach((doc) => {
          if (isValidCanonicalSlotId(doc.id)) {
            updatedSlots.push({ id: doc.id, ...doc.data() });
          }
        });
        setSlots(sortSlots(updatedSlots));
        setLoading(false);
      },
      (err) => {
        console.error("Firestore subscription error:", err);
        setError("Failed to load parking slots");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const availableSlots = useMemo(() => {
    return slots.filter((s) => (s.status || '').toLowerCase() === 'available');
  }, [slots]);

  const groundAvailable = availableSlots.filter((s) => s.floor === 'Ground Floor' || s.id?.startsWith('G-')).length
  const basementAvailable = availableSlots.filter((s) => s.floor === 'Basement' || s.id?.startsWith('B-')).length

  // Filter slots based on dropdown and floor selection
  const filteredSlots = useMemo(() => {
    return availableSlots.filter((s) => {
      // If a specific section is chosen in dropdown
      if (selectedSection !== 'all') {
        if (selectedSection === 'ground-all') return s.floor === 'Ground Floor'
        if (selectedSection === 'basement-all') return s.floor === 'Basement'
        return s.section === selectedSection
      }
      // Otherwise match floor filter
      if (selectedFloor !== 'all') {
        return s.floor === selectedFloor
      }
      return true
    })
  }, [availableSlots, selectedFloor, selectedSection])

  // Get active section info for display banner
  const sectionInfo = useMemo(() => {
    if (selectedSection === 'ground-all' || (selectedFloor === 'Ground Floor' && selectedSection === 'all')) {
      return {
        icon: '🛵',
        title: 'Ground Floor &bull; Scooties (All Sections)',
        description: 'Designated exclusively for student & staff scooties (Bays G-01 to G-80)',
        count: groundAvailable,
        total: 80
      }
    }
    if (selectedSection === 'basement-all' || (selectedFloor === 'Basement' && selectedSection === 'all')) {
      return {
        icon: '🏍️',
        title: 'Basement &bull; Bikes (All Rows)',
        description: 'Designated exclusively for student & staff motorcycles (Bays B-01 to B-80)',
        count: basementAvailable,
        total: 80
      }
    }
    if (selectedSection !== 'all') {
      const isGround = selectedSection.includes('Accounts') || selectedSection.includes('Exam')
      return {
        icon: isGround ? '🛵' : '🏍️',
        title: `${isGround ? 'Ground Floor' : 'Basement'} &bull; ${selectedSection}`,
        description: isGround ? 'Scooty parking wing with dedicated surveillance' : 'Motorcycle row with IoT sensor telemetry',
        count: filteredSlots.length,
        total: 20
      }
    }
    return {
      icon: '🅿️',
      title: 'All Campus Parking Wings (Ground + Basement)',
      description: 'Showing all open parking bays across SOCMAC Smart Park campus',
      count: availableSlots.length,
      total: 160
    }
  }, [selectedSection, selectedFloor, groundAvailable, basementAvailable, filteredSlots.length, availableSlots.length])

  const handleDropdownChange = (val) => {
    setSelectedSection(val)
    if (val === 'all') {
      setSelectedFloor('all')
    } else if (val === 'ground-all' || val.includes('Accounts') || val.includes('Exam')) {
      setSelectedFloor('Ground Floor')
    } else if (val === 'basement-all' || val.includes('Basement')) {
      setSelectedFloor('Basement')
    }
  }

  return (
    <div className="student-page-container">
      {/* Mobile-optimized loading state */}
      {loading && (
        <div className="loading-state glass-card p-5 text-center">
          <LoaderIcon className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted">Loading parking bays...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="error-state glass-card p-5 text-center">
          <span className="text-danger">⚠️</span>
          <p className="text-danger">{error}</p>
          <button 
            className="btn btn-secondary btn-sm mt-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Parking selector bar */}
      <div className="parking-section-selector-bar glass-card mb-4 p-3 sm:p-4">
        <select
          id="section-select"
          className="section-dropdown-select w-full"
          value={selectedSection}
          onChange={(e) => handleDropdownChange(e.target.value)}
          aria-label="Select Parking Floor or Section"
        >
          <optgroup label="🌟 All Campus Parking">
          <option value="all">🌐 All Open Bays ({availableSlots.length} available)</option>
          </optgroup>

          <optgroup label="🛵 Ground Floor — Scooties (80 Bays)">
            <option value="ground-all">🛵 Ground Floor &bull; All Scooty Sections ({groundAvailable} open)</option>
            <option value="Accounts Department - Front Side">
              🛵 Ground: Accounts Dept - Front Side (G-01 to G-20)
            </option>
            <option value="Accounts Department - Opposite Side">
              🛵 Ground: Accounts Dept - Opposite Side (G-21 to G-40)
            </option>
            <option value="Exam IT Department - Front Side">
              🛵 Ground: Exam IT Dept - Front Side (G-41 to G-60)
            </option>
            <option value="Exam IT Department - Opposite Side">
              🛵 Ground: Exam IT Dept - Opposite Side (G-61 to G-80)
            </option>
          </optgroup>

          <optgroup label="🏍️ Basement — Bikes (80 Bays)">
            <option value="basement-all">🏍️ Basement &bull; All Bike Rows ({basementAvailable} open)</option>
            <option value="Basement Row 1">
              🏍️ Basement: Row 1 (B-01 to B-20)
            </option>
            <option value="Basement Row 2">
              🏍️ Basement: Row 2 (B-21 to B-40)
            </option>
            <option value="Basement Row 3">
              🏍️ Basement: Row 3 (B-41 to B-60)
            </option>
            <option value="Basement Row 4">
              🏍️ Basement: Row 4 (B-61 to B-80)
            </option>
          </optgroup>
        </select>
      </div>

      {/* Active Section Info Header */}
      <div className="section-active-badge-header">
        <div className="sabh-left">
          <span className="sabh-icon">{sectionInfo.icon}</span>
          <div>
            <h4
              className="sabh-title"
              dangerouslySetInnerHTML={{ __html: sectionInfo.title }}
            ></h4>
            <p className="sabh-desc">{sectionInfo.description}</p>
          </div>
        </div>
        <div className="sabh-count-pill">
          <CheckIcon className="w-4 h-4 text-emerald" />
          <span>{filteredSlots.length} Open Bays</span>
          {userProfile?.vehicleType && (
            <span className="text-xs opacity-80 font-normal">
              &bull; {userProfile.vehicleType === 'scooty' ? 'Ground' : 'Basement'} Assigned
            </span>
          )}
        </div>
      </div>

      {/* Available Slots Grid */}
      <div className="available-slots-grid">
        {filteredSlots.length === 0 ? (
          <div className="empty-state glass-card p-5 text-center col-span-full">
            <span className="empty-icon">🅿️</span>
            <h4>No available slots in this section</h4>
            <p className="text-muted">All bays in this specific section are currently occupied or reserved. Try selecting another section from the dropdown.</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-3"
              onClick={() => handleDropdownChange('all')}
            >
              <span>View All Campus Open Bays</span>
            </button>
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const isScooty = slot.floor === 'Ground Floor' || slot.type === 'scooty'
            return (
            <div key={slot.id} className="available-slot-card glass-card p-3 sm:p-4">
                <div className="asc-top">
                  <div className="flex justify-between items-start">
                    <span className="slot-id-pill font-mono text-sm sm:text-base">{slot.id}</span>
                    <span className={`floor-tag ${isScooty ? 'floor-ground' : 'floor-basement'}`}>
                      {isScooty ? '🛵 Ground' : '🏍️ Basement'}
                    </span>
                  </div>
                </div>

                <div className="asc-section text-xs text-muted truncate">
                  {slot.section || 'Campus Two-Wheeler Area'}
                </div>

                <div className="asc-status-row">
                  <span className="status-pill available">🟢 Open</span>
                  {slot.isEv && <span className="ev-badge">⚡ EV Ready</span>}
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm w-full mt-2 sm:mt-3"
                  onClick={() => onOpenBooking && onOpenBooking(slot, 'slot')}
                  disabled={slot.isBooked}
                >
                  <PlusCircleIcon className="w-3.5 h-3.5" />
                  <span>{slot.isBooked ? 'Already Reserved' : 'Reserve Bay'}</span>
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
