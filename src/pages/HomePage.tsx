import { Navigate } from 'react-router-dom'

/** The study screen is the app's home; `/` simply lands there. */
export function HomePage() {
  return <Navigate to="/review" replace />
}
