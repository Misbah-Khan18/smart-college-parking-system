import StudentWrongParkingReport from './StudentWrongParkingReport'

/**
 * Dedicated Student Reports Page View
 * Displays Wrong Parking enforcement reporting form & student report history tracking
 */
export default function StudentReportsPageView({
  user,
  userProfile,
  slots = [],
  showToast,
  initialTab = 'form'
}) {
  return (
    <StudentWrongParkingReport
      isPage={true}
      user={user}
      userProfile={userProfile}
      slots={slots}
      showToast={showToast}
      initialTab={initialTab}
    />
  )
}
