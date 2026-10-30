import { useState, useEffect } from 'react'
import {
  getRegisteredVehicles,
  subscribeToRegisteredVehicles,
  updateVehicle,
  deleteVehicle
} from '../services/vehicleService'
import RegisteredVehiclesTable from '../components/vehicle/RegisteredVehiclesTable'
import EditVehicleModal from '../components/vehicle/EditVehicleModal'
import DeleteConfirmModal from '../components/vehicle/DeleteConfirmModal'

export default function RegistrationPage({
  slots = [],
  registeredVehicles = [],
  showToast
}) {
  // Registered vehicles state (synced with props or service listener)
  const [vehicles, setVehicles] = useState(() => registeredVehicles.length > 0 ? registeredVehicles : getRegisteredVehicles())
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)

  // Real-time subscription fallback
  useEffect(() => {
    const unsubscribe = subscribeToRegisteredVehicles(
      (liveVehicles) => {
        setVehicles(liveVehicles)
      },
      (err) => console.warn('[RegistrationPage] Vehicle subscription notice:', err?.message),
      { isAdmin: true }
    )
    return () => unsubscribe()
  }, [])

  // Handle Edit Save from EditVehicleModal
  const handleSaveEdit = async (id, updatedData) => {
    try {
      const updatedRecord = await updateVehicle(id, updatedData)
      if (showToast) {
        showToast(
          'Registration Updated',
          `Details for ${updatedRecord.studentName} (${updatedRecord.vehicleNumber}) updated successfully.`,
          'success'
        )
      }
    } catch (err) {
      if (showToast) {
        showToast('Update Failed', err.message || 'Could not update registration.', 'error')
      }
      throw err
    }
  }

  // Handle Delete Confirmation from DeleteConfirmModal
  const handleConfirmDelete = async (id) => {
    try {
      const target = vehicles.find((v) => v.id === id)
      await deleteVehicle(id, slots)
      if (showToast) {
        showToast(
          'Registration Removed',
          `Vehicle registration for ${target?.studentName || 'Student'} (${target?.vehicleNumber || ''}) has been deleted.`,
          'info'
        )
      }
    } catch (err) {
      if (showToast) {
        showToast(
          'Deletion Blocked',
          err.message || 'This vehicle is currently parked and cannot be removed.',
          'error'
        )
      }
    }
  }

  return (
    <div className="registration-page-container">
      {/* Page Header */}
      <div className="registration-page-header glass-card">
        <div className="rph-content">
          <div className="rph-badge">
            <span className="badge-icon">📋</span>
            <span>Campus Vehicle Registry</span>
          </div>
          <h1 className="rph-title">
            Registered <span className="gradient-text">Vehicles</span>
          </h1>
          <p className="rph-subtitle">
            Directory of campus-authorized student vehicles &amp; allocated parking zones
          </p>
        </div>

        {/* Quick Stats Strip */}
        <div className="rph-stats-strip">
          <div className="rph-stat-pill">
            <span className="stat-num">{vehicles.length}</span>
            <span className="stat-lbl">Registered</span>
          </div>
          <div className="rph-stat-pill">
            <span className="stat-num">
              {vehicles.filter((v) => v.vehicleType === 'scooty').length}
            </span>
            <span className="stat-lbl">Scooties (Ground)</span>
          </div>
          <div className="rph-stat-pill">
            <span className="stat-num">
              {vehicles.filter((v) => v.vehicleType === 'bike').length}
            </span>
            <span className="stat-lbl">Bikes (Basement)</span>
          </div>
        </div>
      </div>

      {/* Main Registered Vehicles Directory Section (Full Width) */}
      <div className="registered-vehicles-full-section">
        <RegisteredVehiclesTable
          vehicles={vehicles}
          onEditVehicle={(vehicle) => setEditingVehicle(vehicle)}
          onDeleteVehicle={(vehicle) => setDeletingVehicle(vehicle)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={true}
        />
      </div>

      {/* Edit Vehicle Modal */}
      <EditVehicleModal
        isOpen={Boolean(editingVehicle)}
        vehicle={editingVehicle}
        registeredVehicles={vehicles}
        onSave={handleSaveEdit}
        onClose={() => setEditingVehicle(null)}
      />

      {/* Delete Confirmation Modal (Guarded with parking slot checks) */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingVehicle)}
        vehicle={deletingVehicle}
        slots={slots}
        onConfirmDelete={handleConfirmDelete}
        onClose={() => setDeletingVehicle(null)}
      />
    </div>
  )
}
