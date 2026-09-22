import ParkingHistoryView from '../ParkingHistoryView'

export default function StudentMyHistoryView({
  user,
  userProfile,
  history = []
}) {
  const records = Array.isArray(history) ? history : []

  return (
    <ParkingHistoryView
      history={records}
      user={user}
      userProfile={userProfile}
    />
  )
}

