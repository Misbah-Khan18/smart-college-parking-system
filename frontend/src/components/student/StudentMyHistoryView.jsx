import ParkingHistoryView from '../ParkingHistoryView'
import { INITIAL_PARKING_HISTORY } from '../../data/initialSlots'

export default function StudentMyHistoryView({
  user,
  userProfile,
  history
}) {
  const records = history && history.length > 0 ? history : INITIAL_PARKING_HISTORY

  return (
    <ParkingHistoryView
      history={records}
      user={user}
      userProfile={userProfile}
    />
  )
}
