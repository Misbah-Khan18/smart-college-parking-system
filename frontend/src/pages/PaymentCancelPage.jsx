import { AlertCircleIcon } from '../components/Icons'

export default function PaymentCancelPage() {
  const queryParams = new URLSearchParams(window.location.search)
  const plate = queryParams.get('plate') || 'Vehicle'

  return (
    <div className="payment-return-container">
      <div className="payment-card glass-card text-center">
        <div className="payment-status-icon warning">
          <AlertCircleIcon className="w-8 h-8 text-amber" />
        </div>

        <span className="payment-badge-status warning">CHECKOUT CANCELLED</span>
        <h1 className="payment-title">Payment Not Completed</h1>
        <p className="payment-subtitle">
          Your parking permit registration for <strong className="text-cyan">{plate}</strong> was not finalized and no charges were made.
        </p>

        <div className="payment-help-box text-left">
          <h4>What happens next?</h4>
          <ul className="text-muted text-xs mt-2 pl-4">
            <li>Your vehicle slot remains unreserved until payment is confirmed.</li>
            <li>You can restart the registration anytime from the Registration Console.</li>
            <li>If you encountered a card issue, check with your issuing bank or try another card.</li>
          </ul>
        </div>

        <div className="payment-actions-row mt-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            &larr; Try Registration Again
          </button>
        </div>
      </div>
    </div>
  )
}
