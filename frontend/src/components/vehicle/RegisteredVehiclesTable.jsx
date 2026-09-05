import { useMemo } from 'react'
import { getFloorForVehicleType } from '../../services/vehicleService'
import VehicleSearch from './VehicleSearch'

export default function RegisteredVehiclesTable({
  vehicles = [],
  onEditVehicle,
  onDeleteVehicle,
  searchQuery = '',
  onSearchChange,
  showSearch = false
}) {
  const filteredVehicles = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return vehicles

    const q = searchQuery.toLowerCase().trim()
    const cleanQ = q.replace(/[^a-z0-9]/g, '')

    return vehicles.filter((v) => {
      const name = (v.studentName || '').toLowerCase()
      const roll = (v.rollNumber || '').toLowerCase()
      const plate = (v.vehicleNumber || '').toLowerCase()
      const cleanPlate = plate.replace(/[^a-z0-9]/g, '')
      const stream = (v.stream || '').toLowerCase()

      return (
        name.includes(q) ||
        roll.includes(q) ||
        plate.includes(q) ||
        (cleanQ && cleanPlate.includes(cleanQ)) ||
        stream.includes(q)
      )
    })
  }, [vehicles, searchQuery])

  return (
    <div className="registered-vehicles-container glass-card">
      {/* Table Section Header */}
      <div className="table-header-row">
        <div className="table-title-box">
          <h3 className="section-title">
            Registered Vehicles{' '}
            <span className="count-badge">{filteredVehicles.length}</span>
          </h3>
          <p className="section-subtitle">
            Directory of campus-authorized student vehicles &amp; allocated parking zones
          </p>
        </div>

        {showSearch && (
          <VehicleSearch
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
        )}
      </div>

      {/* Responsive Table Wrapper */}
      <div className="table-responsive-wrapper">
        {filteredVehicles.length === 0 ? (
          <div className="table-empty-state">
            <div className="empty-icon">📋</div>
            <h4>No registered vehicles found</h4>
            <p className="text-muted">
              {searchQuery
                ? `No student or vehicle matches "${searchQuery}". Try a different keyword.`
                : 'No vehicles have been registered yet. Use the form above to add a new registration.'}
            </p>
          </div>
        ) : (
          <table className="reg-data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Vehicle Number</th>
                <th>Vehicle Type</th>
                <th>Allocated Floor</th>
                <th>Stream</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((v) => {
                const floorLabel = getFloorForVehicleType(v.vehicleType)
                const isGround = floorLabel.toLowerCase().includes('ground')

                return (
                  <tr key={v.id} className="reg-table-row">
                    {/* Student Name */}
                    <td className="student-col">
                      <div className="student-avatar-chip">
                        <div className="student-mini-avatar">
                          {(v.studentName || 'U').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="student-meta">
                          <strong className="student-name">{v.studentName}</strong>
                          {v.phoneNumber && (
                            <span className="student-phone font-mono text-xs text-muted">
                              {v.phoneNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Roll Number */}
                    <td>
                      <span className="roll-badge font-mono">{v.rollNumber}</span>
                    </td>

                    {/* Vehicle Number */}
                    <td>
                      <span className="plate-badge-mono font-mono font-bold">
                        {v.vehicleNumber}
                      </span>
                    </td>

                    {/* Vehicle Type */}
                    <td>
                      <div className="vehicle-type-badge-box">
                        <span className="vtype-emoji">
                          {v.vehicleType === 'scooty'
                            ? '🛵'
                            : v.vehicleType === 'bike'
                            ? '🏍️'
                            : '🚗'}
                        </span>
                        <span className="vtype-label">
                          {v.vehicleType ? v.vehicleType.charAt(0).toUpperCase() + v.vehicleType.slice(1) : 'Scooty'}
                        </span>
                      </div>
                    </td>

                    {/* Allocated Floor */}
                    <td>
                      <span
                        className={`floor-tag ${isGround ? 'floor-ground' : 'floor-basement'}`}
                      >
                        {floorLabel}
                      </span>
                    </td>

                    {/* Stream / Class */}
                    <td>
                      <span className="stream-badge-tag" title={v.stream}>
                        {v.stream || 'N/A'}
                      </span>
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="actions-col text-right">
                      <div className="table-actions-group">
                        <button
                          type="button"
                          className="action-btn edit-btn"
                          onClick={() => onEditVehicle && onEditVehicle(v)}
                          title="Edit vehicle details"
                        >
                          <span>✏️ Edit</span>
                        </button>
                        <button
                          type="button"
                          className="action-btn delete-btn"
                          onClick={() => onDeleteVehicle && onDeleteVehicle(v)}
                          title="Delete vehicle registration"
                        >
                          <span>🗑️ Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
