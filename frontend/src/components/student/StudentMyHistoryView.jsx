import ParkingHistoryView from '../ParkingHistoryView'

export default function StudentMyHistoryView({
  user,
  userProfile,
  history = [],
  activeReservation = null
}) {
  const records = Array.isArray(history) ? history : []

  return (
    <ParkingHistoryView
      history={records}
      user={user}
      userProfile={userProfile}
      activeReservation={activeReservation}
    />
  )
}

