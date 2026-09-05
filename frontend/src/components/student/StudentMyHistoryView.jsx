import { useMemo } from 'react'
import {
  UserIcon,
  IdCardIcon,
  ActivityIcon,
  CheckIcon
} from '../Icons'
import { INITIAL_PARKING_HISTORY } from '../../data/initialSlots'
import { getFloorForVehicleType } from '../../services/vehicleService'

export default function StudentMyHistoryView({
  user,
  userProfile
}) {
  const displayName = userProfile?.displayName || user?.displayName || 'Alzuni Shaikh'
  const email = userProfile?.email || user?.email || 'alzuni.shaikh@college.edu'
  const rollNumber = userProfile?.campusId || userProfile?.rollNumber || 'S2410701'
  const vehiclePlate = userProfile?.defaultPlate || userProfile?.vehicleNumber || 'MH-12-AB-1234'
  const vehicleType = userProfile?.vehicleType || 'scooty'
  const stream = userProfile?.stream || 'BCA (Bachelor of Computer Applications)'
  const phone = userProfile?.phoneNumber || '+91 98765 43210'
  const assignedFloor = getFloorForVehicleType(vehicleType)

  // Student specific mock history records
  const studentHistory = useMemo(() => {
    return [
      {
        id: 'HIST-2026-092',
        date: '04 Sep 2026',
        slotId: vehicleType === 'scooty' ? 'G-12' : 'B-18',
        floor: assignedFloor,
        entryTime: '08:30 AM',
        exitTime: '12:45 PM',
        duration: '04 Hours 15 Mins',
        status: 'Completed',
        fee: '₹0 (Free Campus Permit)'
      },
      {
        id: 'HIST-2026-079',
        date: '02 Sep 2026',
        slotId: vehicleType === 'scooty' ? 'G-05' : 'B-24',
        floor: assignedFloor,
        entryTime: '09:00 AM',
        exitTime: '02:30 PM',
        duration: '05 Hours 30 Mins',
        status: 'Completed',
        fee: '₹0 (Free Campus Permit)'
      },
      {
        id: 'HIST-2026-064',
        date: '28 Aug 2026',
        slotId: vehicleType === 'scooty' ? 'G-21' : 'B-03',
        floor: assignedFloor,
        entryTime: '08:45 AM',
        exitTime: '11:15 AM',
        duration: '02 Hours 30 Mins',
        status: 'Completed',
        fee: '₹0 (Free Campus Permit)'
      }
    ]
  }, [vehicleType, assignedFloor])

  return (
    <div className="student-page-container">
      {/* Header */}
      <div className="page-section-header glass-card">
        <div className="psh-badge">
          <span>📜 STUDENT PROFILE &amp; ARCHIVE</span>
        </div>
        <h1 className="psh-title">
          My Parking <span className="gradient-text">History &amp; Profile</span>
        </h1>
        <p className="psh-subtitle">
          View your registered campus student profile credentials and past parking session records.
        </p>
      </div>

      <div className="student-history-grid">
        {/* Profile Details Card */}
        <div className="profile-summary-card glass-card">
          <div className="card-header-clean">
            <h3>Student Profile Credentials</h3>
            <span className="roll-badge font-mono">{rollNumber}</span>
          </div>

          <div className="profile-hero-chip">
            <div className="profile-big-avatar">{displayName.slice(0, 2).toUpperCase()}</div>
            <div>
              <h2 className="profile-name-title">{displayName}</h2>
              <span className="text-muted text-xs font-mono">{email}</span>
            </div>
          </div>

          <div className="vd-info-list mt-3">
            <div className="vd-info-row">
              <span className="vd-label">Roll Number</span>
              <span className="vd-val font-mono text-cyan font-bold">{rollNumber}</span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Department / Stream</span>
              <span className="vd-val">{stream}</span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Registered Vehicle</span>
              <span className="plate-badge-mono font-mono">{vehiclePlate}</span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Vehicle Type</span>
              <span className="vd-val">
                {vehicleType === 'scooty' ? '🛵 Scooty' : '🏍️ Bike'} ({assignedFloor})
              </span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Phone Contact</span>
              <span className="vd-val font-mono">{phone}</span>
            </div>
            <div className="vd-info-row">
              <span className="vd-label">Permit Status</span>
              <span className="status-pill available">Active 2026-2027</span>
            </div>
          </div>
        </div>

        {/* Completed History Table */}
        <div className="history-list-card glass-card">
          <div className="card-header-clean">
            <div className="flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-emerald" />
              <h3>Completed Parking Sessions</h3>
            </div>
            <span className="count-badge">{studentHistory.length} Sessions</span>
          </div>

          <div className="table-responsive-wrapper mt-2">
            <table className="reg-data-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Date</th>
                  <th>Bay &amp; Level</th>
                  <th>Time &amp; Duration</th>
                  <th>Permit Fee</th>
                </tr>
              </thead>
              <tbody>
                {studentHistory.map((item) => (
                  <tr key={item.id} className="reg-table-row">
                    <td>
                      <span className="font-mono text-xs text-muted">{item.id}</span>
                    </td>
                    <td>
                      <strong>{item.date}</strong>
                    </td>
                    <td>
                      <span className="slot-id-pill font-mono">{item.slotId}</span>{' '}
                      <span className="text-xs text-muted">({item.floor})</span>
                    </td>
                    <td>
                      <div className="text-xs">
                        <span className="font-mono">{item.entryTime} - {item.exitTime}</span>
                        <div className="text-emerald font-mono">{item.duration}</div>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-muted">{item.fee}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
