import { Redirect } from 'expo-router';

export default function Index() {
  // Ensure the app always starts at the login screen
  return <Redirect href="/login" />;
}
