import { useState, useEffect } from 'react'
import {
  getRegisteredVehicles,
  updateVehicle,
  deleteVehicle
} from '../services/vehicleService'
import RegistrationForm from '../components/vehicle/RegistrationForm'
import RegisteredVehiclesTable from '../components/vehicle/RegisteredVehiclesTable'
import EditVehicleModal from '../components/vehicle/EditVehicleModal'
import DeleteConfirmModal from '../components/vehicle/DeleteConfirmModal'

export default function RegistrationPage({
  slots = [],
  showToast
}) {
  // Registered vehicles state
  const [vehicles, setVehicles] = useState(() => getRegisteredVehicles())

  // Modals state
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [deletingVehicle, setDeletingVehicle] = useState(null)

  // Refresh vehicle list on mount
  useEffect(() => {
    setVehicles(getRegisteredVehicles())
  }, [])

  // Handle successful new vehicle registration
  const handleRegisterSuccess = () => {
    setVehicles(getRegisteredVehicles())
  }

  // Handle Edit Save from EditVehicleModal
  const handleSaveEdit = (id, updatedData) => {
    try {
      const updatedRecord = updateVehicle(id, updatedData)
      setVehicles(getRegisteredVehicles())
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
  const handleConfirmDelete = (id) => {
    try {
      const target = vehicles.find((v) => v.id === id)
      deleteVehicle(id, slots)
      setVehicles(getRegisteredVehicles())
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
            <span>Admin Registration Console</span>
          </div>
          <h1 className="rph-title">
            Student &amp; Vehicle <span className="gradient-text">Registration</span>
          </h1>
          <p className="rph-subtitle">
            Register campus students and their authorized vehicles. System automatically maps vehicle types to their designated parking floors under college regulations.
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

      {/* Main Registration Layout: Left Admin Form + Right Directory Table */}
      <div className="registration-content-grid">
        {/* Registration Form Component */}
        <RegistrationForm
          registeredVehicles={vehicles}
          onRegisterSuccess={handleRegisterSuccess}
          showToast={showToast}
        />

        {/* Registered Vehicles Directory Table */}
        <div className="directory-section-panel">
          <RegisteredVehiclesTable
            vehicles={vehicles}
            onEditVehicle={(vehicle) => setEditingVehicle(vehicle)}
            onDeleteVehicle={(vehicle) => setDeletingVehicle(vehicle)}
          />
        </div>
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
